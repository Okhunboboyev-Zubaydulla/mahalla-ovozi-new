import crypto from 'node:crypto';
import { eq, and, or, asc, inArray, sql } from 'drizzle-orm';
import type PgBoss from 'pg-boss';
import { DbClient } from '../../adapters/db/client.js';
import {
  DISTRICT_BACKUP_EXPIRY_QUEUE,
  JobSingletonKeys,
  sendQueueJob,
} from '../../adapters/jobs/boss-client.js';
import {
  districts,
  districtSubscriptions,
  districtDeletionRecords,
  topicProjections,
  acceptedEvidence,
  topics,
  aiOperations,
  districtAnalysisSettingsDrafts,
  districtAnalysisSettingsVersions,
  telegramIntakeRecords,
  operationalIssues,
  userDashboardVisits,
  accounts,
  districtTelegramGroups,
  districtTelegramBots,
  auditEvents,
  DistrictDeletionRecordEntity,
} from '../../adapters/db/schema/index.js';
import {
  DistrictDeletionRecord,
  DistrictDeletionRecordSchema,
} from '@mahalla-ovozi/api-contracts';
import { DistrictNotFoundError } from '../districts/districts-service.js';
import { recordAuditEvent } from '../audit/audit-service.js';
import type { BackupRetentionVerifier } from './ports/backup-retention-verifier.js';

export class DeletionRecordNotFoundError extends Error {
  readonly code = 'DELETION_RECORD_NOT_FOUND' as const;
  readonly statusCode = 404;
  readonly districtId: string;

  constructor(districtId: string) {
    super(`Туманнинг ўчирилганлик маълумотномаси топилмади (ID: ${districtId}).`);
    this.name = 'DeletionRecordNotFoundError';
    this.districtId = districtId;
  }
}

export class DistrictAlreadyDeletedError extends Error {
  readonly code = 'DISTRICT_ALREADY_DELETED' as const;
  readonly statusCode = 409;
  readonly districtId: string;

  constructor(districtId: string) {
    super(
      `Туман тизимдан бутунлай ўчирилган (ID: ${districtId}). Бу туман бўйича амалларни бажариш мумкин эмас.`,
    );
    this.name = 'DistrictAlreadyDeletedError';
    this.districtId = districtId;
  }
}

export class DistrictNotEligibleForDeletionError extends Error {
  readonly code = 'DISTRICT_NOT_ELIGIBLE_FOR_DELETION' as const;
  readonly statusCode = 409;
  readonly districtId: string;

  constructor(districtId: string, message?: string) {
    super(
      message ??
        `Туман ўчириш талабларига жавоб бермайди ёки 30 кунлик кутиш муддати ҳали тугамаган (ID: ${districtId}).`,
    );
    this.name = 'DistrictNotEligibleForDeletionError';
    this.districtId = districtId;
  }
}

/**
 * Validates that an explicit districtId is present and non-empty.
 * Throws INVALID_DISTRICT_SCOPE to guarantee multi-tenant boundary safety (AC 3, AD-9).
 */
export function validateDistrictScope(districtId: string): void {
  if (!districtId || typeof districtId !== 'string' || districtId.trim() === '') {
    throw new Error(
      'INVALID_DISTRICT_SCOPE: districtId is strictly required and cannot be empty or omitted',
    );
  }
}

export function formatDistrictDeletionRecord(
  row: DistrictDeletionRecordEntity,
): DistrictDeletionRecord {
  return DistrictDeletionRecordSchema.parse({
    id: row.id,
    districtId: row.districtId,
    districtName: row.districtName,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : undefined,
    cancelledById: row.cancelledById ?? undefined,
    cancellationReason: row.cancellationReason ?? undefined,
    scheduledLiveDeletionAt: row.scheduledLiveDeletionAt.toISOString(),
    actualLiveDeletionAt: row.actualLiveDeletionAt.toISOString(),
    liveDeletionStatus: row.liveDeletionStatus as 'COMPLETED' | 'FAILED',
    protectedBackupExpiryDeadline: row.protectedBackupExpiryDeadline.toISOString(),
    backupExpiryStatus: row.backupExpiryStatus as 'PENDING' | 'VERIFIED' | 'FAILED',
    backupExpiryVerifiedAt: row.backupExpiryVerifiedAt
      ? row.backupExpiryVerifiedAt.toISOString()
      : undefined,
    restoreReconciliationStatus:
      (row.restoreReconciliationStatus as 'PENDING' | 'RECONCILED' | 'FAILED' | null) ?? undefined,
    restoreReconciliationVerifiedAt: row.restoreReconciliationVerifiedAt
      ? row.restoreReconciliationVerifiedAt.toISOString()
      : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function getDistrictDeletionRecord(
  db: DbClient,
  districtId: string,
): Promise<DistrictDeletionRecord | null> {
  validateDistrictScope(districtId);
  const [row] = await db
    .select()
    .from(districtDeletionRecords)
    .where(eq(districtDeletionRecords.districtId, districtId))
    .limit(1);

  return row ? formatDistrictDeletionRecord(row) : null;
}

export interface ExecuteDistrictLiveDeletionOptions {
  bypassDeadlineCheck?: boolean;
  actor?: { id?: string | null; role?: string | null };
  context?: { ipAddress?: string | null; userAgent?: string | null };
  boss?: PgBoss;
}

export async function executeDistrictLiveDeletion(
  db: DbClient,
  districtId: string,
  options?: ExecuteDistrictLiveDeletionOptions,
): Promise<DistrictDeletionRecord | null> {
  validateDistrictScope(districtId);
  // 1. Fast-path idempotency check: if already deleted with completed tombstone, return existing record
  const existingTombstone = await getDistrictDeletionRecord(db, districtId);
  if (existingTombstone && existingTombstone.liveDeletionStatus === 'COMPLETED') {
    return existingTombstone;
  }

  let finalRecord: DistrictDeletionRecordEntity | undefined;

  await db.transaction(async (tx) => {
    const now = new Date();

    // 2. Lock districts row first (consistent lock order: districts -> district_subscriptions)
    const lockDistrictResult = await tx.execute<{
      id: string;
      name: string;
      status: string;
      region: string | null;
    }>(sql`SELECT id, name, status, region FROM districts WHERE id = ${districtId} FOR UPDATE`);

    const lockedDistrict = lockDistrictResult.rows[0];

    // Lock-unblocking concurrency protection: If districts row missing under lock, check tombstone
    if (!lockedDistrict) {
      const [tombstoneUnderTx] = await tx
        .select()
        .from(districtDeletionRecords)
        .where(eq(districtDeletionRecords.districtId, districtId))
        .limit(1);

      if (tombstoneUnderTx && tombstoneUnderTx.liveDeletionStatus === 'COMPLETED') {
        finalRecord = tombstoneUnderTx;
        return;
      }

      throw new DistrictNotFoundError(districtId);
    }

    // 3. Lock district_subscriptions row second
    const lockSubResult = await tx.execute<{
      id: string;
      district_id: string;
      status: string;
      status_started_at: Date | null;
      scheduled_transition_at: Date | null;
      scheduled_transition_type: string | null;
      internal_note: string | null;
      updated_by_id: string | null;
    }>(
      sql`SELECT id, district_id, status, status_started_at, scheduled_transition_at, scheduled_transition_type, internal_note, updated_by_id FROM district_subscriptions WHERE district_id = ${districtId} FOR UPDATE`,
    );

    const lockedSub = lockSubResult.rows[0];

    // 4. Stale-job safeguard: Authoritatively verify status is still CANCELLED
    if (
      lockedDistrict.status !== 'CANCELLED' ||
      (lockedSub && lockedSub.status !== 'CANCELLED')
    ) {
      // District has been reactivated or recovered (SETUP_INCOMPLETE, ACTIVE, GRACE, SUSPENDED). Abort safely.
      return;
    }

    // 5. Deadline check: unless bypassed, verify scheduled deletion deadline has arrived
    if (!options?.bypassDeadlineCheck) {
      if (!lockedSub?.scheduled_transition_at) {
        throw new DistrictNotEligibleForDeletionError(
          districtId,
          'Туманни ўчириш муддати белгиланмаган.',
        );
      }
      const deadlineMs = new Date(lockedSub.scheduled_transition_at).getTime();
      const nowMs = now.getTime();
      // 60-second clock skew tolerance
      if (deadlineMs > nowMs + 60000) {
        throw new DistrictNotEligibleForDeletionError(
          districtId,
          `Туманни ўчириш муддати ҳали етиб келмаган. Режадаги вақт: ${lockedSub.scheduled_transition_at}`,
        );
      }
    }

    // 6. Extract cancellation metadata and compute tombstone parameters
    const cancelledAt = lockedSub?.status_started_at
      ? new Date(lockedSub.status_started_at)
      : now;
    const cancelledById = lockedSub?.updated_by_id ?? null;
    const cancellationReason = lockedSub?.internal_note ?? null;
    const scheduledLiveDeletionAt = lockedSub?.scheduled_transition_at
      ? new Date(lockedSub.scheduled_transition_at)
      : now;
    const actualLiveDeletionAt = now;
    const protectedBackupExpiryDeadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const tombstoneId = `del_rec_${crypto.randomUUID()}`;

    // 7. Insert surviving deletion tombstone
    await tx
      .insert(districtDeletionRecords)
      .values({
        id: tombstoneId,
        districtId,
        districtName: lockedDistrict.name,
        cancelledAt,
        cancelledById,
        cancellationReason,
        scheduledLiveDeletionAt,
        actualLiveDeletionAt,
        liveDeletionStatus: 'COMPLETED',
        protectedBackupExpiryDeadline,
        backupExpiryStatus: 'PENDING',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: districtDeletionRecords.districtId });

    // 8. Execute comprehensive multi-table live data purge in strict topological dependency order
    // 1. topic_projections
    await tx.delete(topicProjections).where(eq(topicProjections.districtId, districtId));

    // 2. accepted_evidence
    await tx.delete(acceptedEvidence).where(eq(acceptedEvidence.districtId, districtId));

    // 3. topics
    await tx.delete(topics).where(eq(topics.districtId, districtId));

    // 4. ai_provider_attempts
    await tx.execute(
      sql`DELETE FROM ai_provider_attempts WHERE operation_id IN (SELECT id FROM ai_operations WHERE district_id = ${districtId})`,
    );

    // 5. ai_operations
    await tx.delete(aiOperations).where(eq(aiOperations.districtId, districtId));

    // 6. telegram_intake_records
    await tx.delete(telegramIntakeRecords).where(eq(telegramIntakeRecords.districtId, districtId));

    // 7. district_analysis_settings_drafts
    await tx
      .delete(districtAnalysisSettingsDrafts)
      .where(eq(districtAnalysisSettingsDrafts.districtId, districtId));

    // 8. district_analysis_settings_versions
    await tx
      .delete(districtAnalysisSettingsVersions)
      .where(eq(districtAnalysisSettingsVersions.districtId, districtId));

    // 9. operational_issues (both district-scoped and global failure tracking issues)
    await tx
      .delete(operationalIssues)
      .where(
        or(
          eq(operationalIssues.districtId, districtId),
          eq(operationalIssues.logicalKey, `del_fail:${districtId}`),
        ),
      );

    // 10. user_dashboard_visits
    await tx.delete(userDashboardVisits).where(eq(userDashboardVisits.districtId, districtId));

    // 11. sessions (Hokim user accounts assigned to this district)
    await tx.execute(
      sql`DELETE FROM sessions WHERE account_id IN (SELECT id FROM accounts WHERE district_id = ${districtId})`,
    );

    // 12. accounts (Hokim user accounts assigned to this district)
    await tx.delete(accounts).where(eq(accounts.districtId, districtId));

    // 13. district_telegram_groups
    await tx.delete(districtTelegramGroups).where(eq(districtTelegramGroups.districtId, districtId));

    // 14. district_telegram_bots
    await tx.delete(districtTelegramBots).where(eq(districtTelegramBots.districtId, districtId));

    // 15. audit_events (District-scoped audit history)
    await tx.delete(auditEvents).where(eq(auditEvents.districtId, districtId));

    // 16. district_subscriptions
    await tx
      .delete(districtSubscriptions)
      .where(eq(districtSubscriptions.districtId, districtId));

    // 17. districts (parent district row)
    await tx.delete(districts).where(eq(districts.id, districtId));

    // 9. Append global system audit log with privacy-safe metadata
    await recordAuditEvent(tx, {
      districtId: null,
      actorId: options?.actor?.id ?? null,
      actorRole: (options?.actor?.role as 'PRODUCT_OWNER' | 'SYSTEM' | null) ?? 'SYSTEM',
      action: 'DISTRICT_LIVE_DELETED',
      ipAddress: options?.context?.ipAddress ?? null,
      userAgent: options?.context?.userAgent ?? null,
      metadata: {
        deletedDistrictId: districtId,
        deletedDistrictName: lockedDistrict.name,
        scheduledLiveDeletionAt: scheduledLiveDeletionAt.toISOString(),
        actualLiveDeletionAt: actualLiveDeletionAt.toISOString(),
        protectedBackupExpiryDeadline: protectedBackupExpiryDeadline.toISOString(),
        reason: cancellationReason ?? null,
      },
    });

    const [createdTombstone] = await tx
      .select()
      .from(districtDeletionRecords)
      .where(eq(districtDeletionRecords.districtId, districtId))
      .limit(1);

    finalRecord = createdTombstone;
  });

  if (finalRecord && options?.boss) {
    try {
      const nowMs = Date.now();
      const deadlineMs = finalRecord.protectedBackupExpiryDeadline.getTime();
      const delaySeconds = Math.max(0, Math.floor((deadlineMs - nowMs) / 1000));
      await sendQueueJob(
        options.boss,
        DISTRICT_BACKUP_EXPIRY_QUEUE,
        { districtId },
        {
          startAfter: delaySeconds,
          singletonKey: JobSingletonKeys.forBackupExpiry(districtId),
        },
      );
    } catch (jobErr) {
      console.error(
        JSON.stringify({
          event: 'ENQUEUE_BACKUP_EXPIRY_JOB_FAILED',
          districtId,
          error: (jobErr as Error).message,
        }),
      );
    }
  }

  return finalRecord ? formatDistrictDeletionRecord(finalRecord) : null;
}

export interface VerifyDistrictBackupExpiryOptions {
  actor?: { id?: string | null; role?: string | null };
  context?: { ipAddress?: string | null; userAgent?: string | null };
}

export async function verifyDistrictBackupExpiry(
  db: DbClient,
  verifier: BackupRetentionVerifier,
  districtId: string,
  options?: VerifyDistrictBackupExpiryOptions,
): Promise<{ deletionRecord: DistrictDeletionRecord; isExpired: boolean; message: string }> {
  validateDistrictScope(districtId);

  const [initialTombstone] = await db
    .select()
    .from(districtDeletionRecords)
    .where(eq(districtDeletionRecords.districtId, districtId))
    .limit(1);

  if (!initialTombstone) {
    throw new DeletionRecordNotFoundError(districtId);
  }

  if (initialTombstone.liveDeletionStatus !== 'COMPLETED') {
    throw new DistrictNotEligibleForDeletionError(
      districtId,
      'Туманни жонли тизимдан ўчириш жараёни якунланмаган.',
    );
  }

  // Idempotency guard: if already VERIFIED, return immediately
  if (initialTombstone.backupExpiryStatus === 'VERIFIED') {
    return {
      deletionRecord: formatDistrictDeletionRecord(initialTombstone),
      isExpired: true,
      message: 'Туманнинг заҳира нусхалари муддати олдин тасдиқланган (Verified).',
    };
  }

  const actualLiveDeletionAt = initialTombstone.actualLiveDeletionAt;
  const protectedBackupExpiryDeadline = initialTombstone.protectedBackupExpiryDeadline;

  // 2. Perform authoritative backup repository inspection OUTSIDE of database transaction
  let result: Awaited<ReturnType<typeof verifier.verifyDistrictBackupExpiry>>;
  try {
    result = await verifier.verifyDistrictBackupExpiry({
      districtId,
      actualLiveDeletionAt,
      protectedBackupExpiryDeadline,
    });
  } catch (verErr) {
    const errorMsg = verErr instanceof Error ? verErr.message : String(verErr);
    result = {
      isExpired: false,
      oldestActiveBackupTimestamp: null,
      verificationMethod: 'VERIFIER_EXCEPTION',
      error: errorMsg,
    };
  }

  const now = new Date();
  const isOverdue = now.getTime() >= protectedBackupExpiryDeadline.getTime();
  const hasError = Boolean(result.error);

  // 3. Persist milestone updates inside short transaction with row lock
  return await db.transaction(async (tx) => {
    // Lock deletion record row for concurrent mutation safety
    const [currentTombstone] = await tx
      .select()
      .from(districtDeletionRecords)
      .where(eq(districtDeletionRecords.districtId, districtId))
      .for('update')
      .limit(1);

    if (!currentTombstone) {
      throw new DeletionRecordNotFoundError(districtId);
    }

    // Re-check idempotency under lock
    if (currentTombstone.backupExpiryStatus === 'VERIFIED') {
      return {
        deletionRecord: formatDistrictDeletionRecord(currentTombstone),
        isExpired: true,
        message: 'Туманнинг заҳира нусхалари муддати олдин тасдиқланган (Verified).',
      };
    }

    if (result.isExpired && !hasError) {
      // Branch 1: Authoritative Expiry Verified
      await tx
        .update(districtDeletionRecords)
        .set({
          backupExpiryStatus: 'VERIFIED',
          backupExpiryVerifiedAt: now,
          updatedAt: now,
        })
        .where(eq(districtDeletionRecords.districtId, districtId));

      // Automatically resolve active operational issue
      await tx
        .update(operationalIssues)
        .set({
          status: 'RESOLVED',
          resolvedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(operationalIssues.logicalKey, `del_backup_fail:${districtId}`),
            eq(operationalIssues.status, 'ACTIVE'),
          ),
        );

      // Record global audit event
      await recordAuditEvent(tx, {
        districtId: null,
        actorId: options?.actor?.id ?? null,
        actorRole: (options?.actor?.role as 'PRODUCT_OWNER' | 'SYSTEM' | null) ?? 'SYSTEM',
        action: 'DISTRICT_BACKUP_EXPIRY_VERIFIED',
        ipAddress: options?.context?.ipAddress ?? null,
        userAgent: options?.context?.userAgent ?? null,
        metadata: {
          deletedDistrictId: districtId,
          deletedDistrictName: currentTombstone.districtName,
          actualLiveDeletionAt: actualLiveDeletionAt.toISOString(),
          protectedBackupExpiryDeadline: protectedBackupExpiryDeadline.toISOString(),
          backupExpiryVerifiedAt: now.toISOString(),
          oldestActiveBackupTimestamp: result.oldestActiveBackupTimestamp?.toISOString() ?? null,
          verificationMethod: result.verificationMethod,
          outcome: 'SUCCESS',
        },
      });

      const [updatedTombstone] = await tx
        .select()
        .from(districtDeletionRecords)
        .where(eq(districtDeletionRecords.districtId, districtId))
        .limit(1);

      return {
        deletionRecord: formatDistrictDeletionRecord(updatedTombstone!),
        isExpired: true,
        message: 'Туманнинг заҳира нусхалари муддати муваффақиятли тасдиқланди (Verified).',
      };
    }

    if (!result.isExpired && !isOverdue && !hasError) {
      // Branch 2: Unexpired Pre-Deadline (normal retention window active)
      return {
        deletionRecord: formatDistrictDeletionRecord(currentTombstone),
        isExpired: false,
        message: 'Туманнинг заҳира нусхалари ҳали 30 кунлик сақлаш муддати ичида (Pending).',
      };
    }

    // Branch 3: Overdue or Verifier Error
    const previousStatus = currentTombstone.backupExpiryStatus;
    await tx
      .update(districtDeletionRecords)
      .set({
        backupExpiryStatus: 'FAILED',
        updatedAt: now,
      })
      .where(eq(districtDeletionRecords.districtId, districtId));

    const logicalKey = `del_backup_fail:${districtId}`;
    const issueTitle = 'Туманнинг заҳира нусхалари муддати ўтган ёки хатолик юз берди';
    const issueDescription = result.error
      ? `Заҳира омборини текширишда хатолик: ${result.error}`
      : '30 кунлик муддат ўтган бўлса-да, заҳира омборида туман маълумотларига эга нусхалар мавжуд.';

    const [existingIssue] = await tx
      .select()
      .from(operationalIssues)
      .where(
        and(
          eq(operationalIssues.logicalKey, logicalKey),
          eq(operationalIssues.status, 'ACTIVE'),
        ),
      )
      .limit(1);

    if (existingIssue) {
      await tx
        .update(operationalIssues)
        .set({
          latestCheckAt: now,
          sanitizedDescription: issueDescription,
          updatedAt: now,
          metadata: {
            deletedDistrictId: districtId,
            deletedDistrictName: currentTombstone.districtName,
            protectedBackupExpiryDeadline: protectedBackupExpiryDeadline.toISOString(),
            actualLiveDeletionAt: actualLiveDeletionAt.toISOString(),
            oldestActiveBackupTimestamp: result.oldestActiveBackupTimestamp?.toISOString() ?? null,
            error: result.error ?? null,
          },
        })
        .where(eq(operationalIssues.id, existingIssue.id));
    } else {
      await tx
        .insert(operationalIssues)
        .values({
          id: `iss_${crypto.randomUUID()}`,
          logicalKey,
          scope: 'GLOBAL',
          districtId: null, // Foreign key safety: district row was deleted from districts table
          component: 'scheduled_deletion',
          issueCategory: 'BACKUP_EXPIRY_DELAY',
          severity: 'Critical',
          status: 'ACTIVE',
          healthStatus: 'DEGRADED',
          sanitizedTitle: issueTitle,
          sanitizedDescription: issueDescription,
          recommendedAction:
            'Заҳира тизими (pgBackRest) сиёсатини ва омборни текшириб, эски нусхалар тозаланганини тасдиқланг.',
          metadata: {
            deletedDistrictId: districtId,
            deletedDistrictName: currentTombstone.districtName,
            protectedBackupExpiryDeadline: protectedBackupExpiryDeadline.toISOString(),
            actualLiveDeletionAt: actualLiveDeletionAt.toISOString(),
            oldestActiveBackupTimestamp: result.oldestActiveBackupTimestamp?.toISOString() ?? null,
            error: result.error ?? null,
          },
          startedAt: now,
          latestCheckAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: operationalIssues.logicalKey,
          targetWhere: sql`${operationalIssues.status} = 'ACTIVE'`,
          set: {
            latestCheckAt: now,
            sanitizedDescription: issueDescription,
            updatedAt: now,
          },
        });
    }

    // Record failure audit event only on state transition to FAILED or on-demand user verification
    const isInteractiveActor = options?.actor?.role && options.actor.role !== 'SYSTEM';
    if (previousStatus !== 'FAILED' || isInteractiveActor) {
      await recordAuditEvent(tx, {
        districtId: null,
        actorId: options?.actor?.id ?? null,
        actorRole: (options?.actor?.role as 'PRODUCT_OWNER' | 'SYSTEM' | null) ?? 'SYSTEM',
        action: 'DISTRICT_BACKUP_EXPIRY_FAILED',
        ipAddress: options?.context?.ipAddress ?? null,
        userAgent: options?.context?.userAgent ?? null,
        metadata: {
          deletedDistrictId: districtId,
          deletedDistrictName: currentTombstone.districtName,
          actualLiveDeletionAt: actualLiveDeletionAt.toISOString(),
          protectedBackupExpiryDeadline: protectedBackupExpiryDeadline.toISOString(),
          oldestActiveBackupTimestamp: result.oldestActiveBackupTimestamp?.toISOString() ?? null,
          verificationMethod: result.verificationMethod,
          error: result.error ?? null,
          outcome: 'FAILURE',
        },
      });
    }

    const [failedTombstone] = await tx
      .select()
      .from(districtDeletionRecords)
      .where(eq(districtDeletionRecords.districtId, districtId))
      .limit(1);

    return {
      deletionRecord: formatDistrictDeletionRecord(failedTombstone!),
      isExpired: false,
      message: result.error
        ? `Заҳира муддатини текширишда хатолик: ${result.error}`
        : '30 кунлик муддат ўтган бўлса-да, заҳира омборида эски нусхалар мавжуд (Failed).',
    };
  });
}

export async function processOverdueBackupExpiries(
  db: DbClient,
  verifier: BackupRetentionVerifier,
): Promise<{ processedCount: number; errors: Array<{ districtId: string; error: string }> }> {
  const pendingRecords = await db
    .select({ districtId: districtDeletionRecords.districtId })
    .from(districtDeletionRecords)
    .where(
      and(
        eq(districtDeletionRecords.liveDeletionStatus, 'COMPLETED'),
        inArray(districtDeletionRecords.backupExpiryStatus, ['PENDING', 'FAILED']),
      ),
    )
    .orderBy(asc(districtDeletionRecords.protectedBackupExpiryDeadline))
    .limit(100);

  let processedCount = 0;
  const errors: Array<{ districtId: string; error: string }> = [];

  for (const item of pendingRecords) {
    try {
      const res = await verifyDistrictBackupExpiry(db, verifier, item.districtId, {
        actor: { id: null, role: 'SYSTEM' },
      });
      if (res) {
        processedCount++;
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      errors.push({ districtId: item.districtId, error: errorMsg });
      console.error(
        JSON.stringify({
          event: 'OVERDUE_BACKUP_EXPIRY_VERIFICATION_FAILED',
          districtId: item.districtId,
          error: errorMsg,
        }),
      );
    }
  }

  return { processedCount, errors };
}

export async function processOverdueCancelledDistricts(
  db: DbClient,
  boss?: PgBoss,
): Promise<{ processedCount: number; errors: Array<{ districtId: string; error: string }> }> {
  const overdue = await db
    .select({ districtId: districtSubscriptions.districtId })
    .from(districtSubscriptions)
    .where(
      and(
        eq(districtSubscriptions.status, 'CANCELLED'),
        eq(districtSubscriptions.scheduledTransitionType, 'LIVE_DELETION'),
        sql`${districtSubscriptions.scheduledTransitionAt} <= NOW()`,
      ),
    )
    .orderBy(asc(districtSubscriptions.scheduledTransitionAt))
    .limit(100);

  let processedCount = 0;
  const errors: Array<{ districtId: string; error: string }> = [];

  for (const item of overdue) {
    try {
      const res = await executeDistrictLiveDeletion(db, item.districtId, { boss });
      if (res) {
        processedCount++;
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      errors.push({ districtId: item.districtId, error: errorMsg });
      console.error(
        JSON.stringify({
          event: 'OVERDUE_CANCELLED_DISTRICT_LIVE_DELETION_FAILED',
          districtId: item.districtId,
          error: errorMsg,
        }),
      );
    }
  }

  return { processedCount, errors };
}

