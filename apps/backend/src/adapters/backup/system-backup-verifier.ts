import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type {
  BackupRetentionVerifier,
  BackupVerificationResult,
} from '../../modules/subscriptions/ports/backup-retention-verifier.js';

const execFileAsync = promisify(execFile);

export interface PgBackRestTimestamp {
  start: number; // Unix epoch seconds
  stop: number; // Unix epoch seconds
}

export interface PgBackRestBackupInfo {
  label: string;
  type: 'full' | 'diff' | 'incr';
  timestamp: PgBackRestTimestamp;
  prior?: string | null;
  reference?: string[];
}

export interface PgBackRestStanzaInfo {
  name: string;
  status: { code: number; message: string; lock?: { held: boolean } };
  backup?: PgBackRestBackupInfo[];
}

export interface SystemBackupRetentionVerifierOptions {
  stanza?: string;
  repoPath?: string;
  command?: string;
  commandArgs?: string[];
  timeoutMs?: number;
  backupInfoResolver?: () => Promise<PgBackRestStanzaInfo[]>;
}

export class SystemBackupRetentionVerifier implements BackupRetentionVerifier {
  private readonly stanza: string;
  private readonly repoPath?: string;
  private readonly command: string;
  private readonly commandArgs: string[];
  private readonly timeoutMs: number;
  private readonly backupInfoResolver?: () => Promise<PgBackRestStanzaInfo[]>;

  constructor(options?: SystemBackupRetentionVerifierOptions) {
    this.stanza =
      options?.stanza ||
      process.env.PGBACKREST_STANZA ||
      'mahalla_ovozi';
    this.repoPath =
      options?.repoPath ||
      process.env.PGBACKREST_REPO_PATH;
    this.command =
      options?.command ||
      process.env.BACKUP_INFO_COMMAND ||
      'pgbackrest';
    this.commandArgs =
      options?.commandArgs ||
      ['info', '--output=json', `--stanza=${this.stanza}`];
    this.timeoutMs = options?.timeoutMs ?? 5000;
    this.backupInfoResolver = options?.backupInfoResolver;
  }

  async verifyDistrictBackupExpiry(params: {
    districtId: string;
    actualLiveDeletionAt: Date;
    protectedBackupExpiryDeadline: Date;
  }): Promise<BackupVerificationResult> {
    const { actualLiveDeletionAt } = params;

    try {
      let stanzaList: PgBackRestStanzaInfo[];

      if (this.backupInfoResolver) {
        stanzaList = await this.backupInfoResolver();
      } else {
        const args = [...this.commandArgs];
        if (this.repoPath && !args.some((a) => a.startsWith('--repo-path='))) {
          args.push(`--repo-path=${this.repoPath}`);
        }

        try {
          const { stdout } = await execFileAsync(this.command, args, {
            timeout: this.timeoutMs,
            maxBuffer: 5 * 1024 * 1024,
          });

          stanzaList = JSON.parse(stdout.trim()) as PgBackRestStanzaInfo[];
        } catch (execErr: unknown) {
          const errMessage =
            execErr instanceof Error ? execErr.message : String(execErr);

          // If pgbackrest is not installed / not configured in dev/test environment without resolver
          if (
            process.env.NODE_ENV !== 'production' &&
            (errMessage.includes('ENOENT') || errMessage.includes('not found'))
          ) {
            return {
              isExpired: true,
              oldestActiveBackupTimestamp: null,
              totalBackupsCount: 0,
              verificationMethod: 'PGBACKREST_DEV_STUB',
              rawDetails: {
                notice:
                  'pgbackrest CLI not found in non-production environment; default stub returned.',
                error: errMessage,
              },
            };
          }

          return {
            isExpired: false,
            oldestActiveBackupTimestamp: null,
            verificationMethod: 'PGBACKREST_CLI_EXECUTION_FAILED',
            error: `Failed to execute pgbackrest command: ${errMessage}`,
            rawDetails: {
              command: this.command,
              args,
              error: errMessage,
            },
          };
        }
      }

      if (!Array.isArray(stanzaList)) {
        return {
          isExpired: false,
          oldestActiveBackupTimestamp: null,
          verificationMethod: 'PGBACKREST_INVALID_PAYLOAD',
          error: 'pgBackRest output is not an array of stanzas',
          rawDetails: { rawOutput: stanzaList },
        };
      }

      if (stanzaList.length === 0) {
        return {
          isExpired: false,
          oldestActiveBackupTimestamp: null,
          verificationMethod: 'PGBACKREST_NO_STANZAS',
          error: 'No stanzas found in pgBackRest repository',
          rawDetails: { rawOutput: stanzaList },
        };
      }

      // Filter matching stanzas (by configured stanza name if specified)
      const targetStanzas = this.stanza
        ? stanzaList.filter((s) => s.name === this.stanza)
        : stanzaList;

      if (targetStanzas.length === 0) {
        return {
          isExpired: false,
          oldestActiveBackupTimestamp: null,
          verificationMethod: 'PGBACKREST_STANZA_NOT_FOUND',
          error: `Stanza '${this.stanza}' not found in repository output`,
          rawDetails: {
            configuredStanza: this.stanza,
            availableStanzas: stanzaList.map((s) => s.name),
          },
        };
      }

      // Validate stanza status codes
      for (const stanza of targetStanzas) {
        if (stanza.status && typeof stanza.status.code === 'number' && stanza.status.code !== 0) {
          return {
            isExpired: false,
            oldestActiveBackupTimestamp: null,
            verificationMethod: 'PGBACKREST_STANZA_ERROR',
            error: `pgBackRest stanza '${stanza.name}' reported error status code ${stanza.status.code}: ${stanza.status.message || 'Unknown stanza error'}`,
            rawDetails: {
              stanza: stanza.name,
              status: stanza.status,
            },
          };
        }
      }

      // Collect all active backups across matching stanzas
      const allBackups: PgBackRestBackupInfo[] = [];
      for (const stanza of targetStanzas) {
        if (stanza.backup && Array.isArray(stanza.backup)) {
          allBackups.push(...stanza.backup);
        }
      }

      if (allBackups.length === 0) {
        // Zero active backups in valid repository stanza: no historical snapshots contain the deleted district
        return {
          isExpired: true,
          oldestActiveBackupTimestamp: null,
          totalBackupsCount: 0,
          verificationMethod: 'PGBACKREST_STANZA_INSPECTION',
          rawDetails: {
            stanzasCount: targetStanzas.length,
            totalBackupsCount: 0,
          },
        };
      }

      // Find the oldest active backup timestamp (start of backup in milliseconds)
      let oldestTimestampMs = Number.POSITIVE_INFINITY;
      let hasPreDeletionBackup = false;

      const liveDeletionTimeMs = actualLiveDeletionAt.getTime();

      for (const backup of allBackups) {
        const startSec = backup.timestamp?.start;
        if (typeof startSec !== 'number' || !Number.isFinite(startSec)) {
          return {
            isExpired: false,
            oldestActiveBackupTimestamp: null,
            verificationMethod: 'PGBACKREST_INVALID_TIMESTAMP',
            error: `Invalid backup timestamp encountered in backup payload: ${JSON.stringify(backup.timestamp)}`,
            rawDetails: {
              backupLabel: backup.label,
              timestamp: backup.timestamp,
            },
          };
        }

        const backupStartMs = startSec * 1000;
        if (backupStartMs < oldestTimestampMs) {
          oldestTimestampMs = backupStartMs;
        }

        // A backup contains or may contain data of the deleted district if it started BEFORE or AT live deletion time
        if (backupStartMs <= liveDeletionTimeMs) {
          hasPreDeletionBackup = true;
        }
      }

      const oldestActiveDate =
        Number.isFinite(oldestTimestampMs) ? new Date(oldestTimestampMs) : null;

      // Expiry is satisfied if and only if all active backups in repository are strictly newer than actualLiveDeletionAt
      const isExpired = !hasPreDeletionBackup;

      return {
        isExpired,
        oldestActiveBackupTimestamp: oldestActiveDate,
        totalBackupsCount: allBackups.length,
        verificationMethod: 'PGBACKREST_STANZA_INSPECTION',
        rawDetails: {
          stanzasCount: targetStanzas.length,
          totalBackupsCount: allBackups.length,
          oldestActiveBackupTimestamp: oldestActiveDate?.toISOString() ?? null,
          actualLiveDeletionAt: actualLiveDeletionAt.toISOString(),
          hasPreDeletionBackup,
        },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        isExpired: false,
        oldestActiveBackupTimestamp: null,
        verificationMethod: 'PGBACKREST_VERIFICATION_ERROR',
        error: errorMsg,
      };
    }
  }
}
