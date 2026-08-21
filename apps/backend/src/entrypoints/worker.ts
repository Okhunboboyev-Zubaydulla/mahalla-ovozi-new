import { fileURLToPath } from 'node:url';
import path from 'node:path';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { eq } from 'drizzle-orm';
import {
  createBossClient,
  initBossQueues,
  TELEGRAM_CONTENT_QUALIFICATION_QUEUE,
  TELEGRAM_SEMANTIC_RELEVANCE_QUEUE,
  type TelegramContentQualificationJobData,
  type TelegramSemanticRelevanceJobData,
} from '../adapters/jobs/boss-client.js';
import { createDbPool, createDbClient, type DbClient } from '../adapters/db/client.js';
import { districts, telegramIntakeRecords } from '../adapters/db/schema/index.js';
import { qualifyTelegramContent } from '../modules/telegram-intake/telegram-content-qualification.js';

let activeBossInstance: PgBoss | null = null;
let internalPool: pg.Pool | null = null;

export interface StartWorkerOptions {
  boss?: PgBoss;
  db?: DbClient;
  pool?: pg.Pool;
}

export async function startWorker(options?: StartWorkerOptions): Promise<PgBoss> {
  const boss = options?.boss || createBossClient();
  activeBossInstance = boss;

  let pool = options?.pool;
  let db = options?.db;

  if (!db) {
    if (!pool) {
      pool = createDbPool();
      internalPool = pool;
    }
    db = createDbClient(pool);
  }

  boss.on('error', (error) => {
    console.error('[worker:pg-boss] Background queue error:', error);
  });

  await boss.start();
  await initBossQueues(boss);

  // Register worker for telegram-content-qualification (Story 2.2)
  await boss.work<TelegramContentQualificationJobData>(
    TELEGRAM_CONTENT_QUALIFICATION_QUEUE,
    async (jobs) => {
      for (const job of jobs) {
        const { intakeId, districtId, mahallaName, telegramChatId, telegramMessageId } = job.data;
        const startTime = performance.now();

        try {
          // 1. Fetch raw intake record from database
          const [record] = await db
            .select()
            .from(telegramIntakeRecords)
            .where(eq(telegramIntakeRecords.id, intakeId))
            .limit(1);

          if (!record) {
            console.warn(
              JSON.stringify({
                event: 'TELEGRAM_INTAKE_RECORD_NOT_FOUND',
                intakeId,
                districtId,
                telegramChatId,
                telegramMessageId,
              }),
            );
            throw new Error(
              `Telegram intake record ${intakeId} not found in database (district: ${districtId}, chat: ${telegramChatId}, message: ${telegramMessageId})`,
            );
          }

          // 2. Lifecycle Recheck: verify district is ACTIVE and accessEligible !== false (AC 7 & AD-9)
          const [district] = await db
            .select({
              id: districts.id,
              status: districts.status,
              accessEligible: districts.accessEligible,
            })
            .from(districts)
            .where(eq(districts.id, districtId))
            .limit(1);

          if (!district || district.status !== 'ACTIVE' || district.accessEligible === false) {
            const durationMs = Math.round(performance.now() - startTime);
            console.log(
              JSON.stringify({
                event: 'TELEGRAM_QUALIFICATION_DROPPED_INACTIVE_DISTRICT',
                districtId,
                mahallaName,
                telegramChatId,
                telegramMessageId,
                districtStatus: district?.status ?? 'NOT_FOUND',
                accessEligible: district?.accessEligible ?? false,
                durationMs,
              }),
            );
            continue;
          }

          // 3. Pure Content Qualification Evaluation (AC 1-5, 8, 10)
          const qualification = qualifyTelegramContent(record);
          const durationMs = Math.round(performance.now() - startTime);

          if (qualification.status === 'SUPPORTED') {
            // 4. Enqueue downstream semantic relevance job with deduplicating singleton key (AC 6, 8)
            const candidateData: TelegramSemanticRelevanceJobData = qualification.candidate;
            const singletonKey = `rel:${districtId}:${telegramChatId}:${telegramMessageId}`;

            await boss.send(TELEGRAM_SEMANTIC_RELEVANCE_QUEUE, candidateData, {
              singletonKey,
              retryLimit: 3,
              retryDelay: 5,
              retryBackoff: true,
            });

            // 5. Emit privacy-safe structured telemetry (AD-11 / AC 9)
            console.log(
              JSON.stringify({
                event: 'TELEGRAM_CONTENT_QUALIFIED',
                districtId,
                mahallaName,
                telegramChatId,
                telegramMessageId,
                status: 'SUPPORTED',
                contentType: qualification.candidate.contentType,
                durationMs,
              }),
            );
          } else {
            // Structurally excluded: discard content without enqueuing downstream AI job (AC 3, 4, 9)
            console.log(
              JSON.stringify({
                event: 'TELEGRAM_CONTENT_EXCLUDED',
                districtId,
                mahallaName,
                telegramChatId,
                telegramMessageId,
                status: 'EXCLUDED',
                reason: qualification.reason,
                durationMs,
              }),
            );
          }
        } catch (err) {
          console.error(
            JSON.stringify({
              event: 'TELEGRAM_CONTENT_QUALIFICATION_ERROR',
              intakeId,
              districtId,
              telegramChatId,
              telegramMessageId,
              error: err instanceof Error ? err.message : String(err),
            }),
          );
          throw err; // Re-throw to trigger pg-boss retry policy for transient errors
        }
      }
    },
  );

  console.log('[worker] Mahalla Ovozi worker process started successfully');
  return boss;
}

export async function stopWorker(bossInstance?: PgBoss): Promise<void> {
  const boss = bossInstance || activeBossInstance;
  if (boss) {
    console.log('[worker] Stopping pg-boss worker gracefully...');
    await boss.stop({ graceful: true, timeout: 30000 });
    console.log('[worker] pg-boss worker stopped.');
    if (activeBossInstance === boss) {
      activeBossInstance = null;
    }
  }

  if (internalPool) {
    await internalPool.end();
    internalPool = null;
  }
}

// Graceful shutdown handling for standalone process
const isMainModule =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMainModule) {
  startWorker().catch((err) => {
    console.error('[worker] Failed to start worker:', err);
    process.exit(1);
  });

  let isShuttingDown = false;
  const handleShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`[worker] Received ${signal}, initiating graceful shutdown...`);
    await stopWorker();
    process.exit(0);
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}
