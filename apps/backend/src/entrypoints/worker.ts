import { fileURLToPath } from 'node:url';
import path from 'node:path';
import crypto from 'node:crypto';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { eq, and } from 'drizzle-orm';
import {
  createBossClient,
  initBossQueues,
  withTransactionalIntake,
  TELEGRAM_CONTENT_QUALIFICATION_QUEUE,
  TELEGRAM_SEMANTIC_RELEVANCE_QUEUE,
  TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
  type TelegramContentQualificationJobData,
  type TelegramSemanticRelevanceJobData,
  type TelegramTopicAssignmentJobData,
} from '../adapters/jobs/boss-client.js';
import { createDbPool, createDbClient, type DbClient } from '../adapters/db/client.js';
import {
  districts,
  telegramIntakeRecords,
  aiOperations,
  aiProviderAttempts,
  ensureDefaultAiProfiles,
} from '../adapters/db/schema/index.js';
import { qualifyTelegramContent } from '../modules/telegram-intake/telegram-content-qualification.js';
import { AiGateway, type AiGatewayPort } from '../modules/ai/ai-gateway.js';
import { SemanticRelevanceEvaluator } from '../modules/ai/semantic-relevance-evaluator.js';
import {
  getMahallaDailySnapshot,
  type AcceptedEvidenceItem,
} from '../modules/ai/context-snapshot.js';

let activeBossInstance: PgBoss | null = null;
let internalPool: pg.Pool | null = null;

export interface StartWorkerOptions {
  boss?: PgBoss;
  db?: DbClient;
  pool?: pg.Pool;
  aiGateway?: AiGatewayPort;
  queues?: string[];
  injectedEvidenceResolver?: (
    districtId: string,
    mahallaName: string,
    calendarDay: string,
  ) => Promise<AcceptedEvidenceItem[] | undefined>;
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
  } else if (!pool) {
    pool = createDbPool();
    internalPool = pool;
  }

  boss.on('error', (error) => {
    console.error('[worker:pg-boss] Background queue error:', error);
  });

  await boss.start();
  await initBossQueues(boss);
  await ensureDefaultAiProfiles(db);

  const aiGateway: AiGatewayPort = options?.aiGateway || new AiGateway({ db });
  const relevanceEvaluator = new SemanticRelevanceEvaluator(aiGateway);

  const shouldWork = (queueName: string) =>
    !options?.queues || options.queues.includes(queueName);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. Worker for telegram-content-qualification (Story 2.2)
  // ──────────────────────────────────────────────────────────────────────────
  if (shouldWork(TELEGRAM_CONTENT_QUALIFICATION_QUEUE)) {
    await boss.work<TelegramContentQualificationJobData>(
      TELEGRAM_CONTENT_QUALIFICATION_QUEUE,
      { newJobCheckInterval: 50 } as any,
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
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Worker for telegram-semantic-relevance (Story 2.3)
  // ──────────────────────────────────────────────────────────────────────────
  if (shouldWork(TELEGRAM_SEMANTIC_RELEVANCE_QUEUE)) {
    await boss.work<TelegramSemanticRelevanceJobData>(
      TELEGRAM_SEMANTIC_RELEVANCE_QUEUE,
      { newJobCheckInterval: 50 } as any,
      async (jobs) => {
      for (const job of jobs) {
        let {
          intakeId,
          districtId,
          mahallaName,
          calendarDay,
          telegramChatId,
          telegramMessageId,
          telegramUserId,
          originalTimestamp,
          contentType,
          verbatimText,
          replyMetadata,
        } = job.data;

        const startTime = performance.now();

        try {
          // Idempotency check: if this intake already has a completed AI relevance decision, skip
          const [existingOp] = await db
            .select({
              id: aiOperations.id,
              finalStatus: aiOperations.finalStatus,
            })
            .from(aiOperations)
            .where(
              and(
                eq(aiOperations.districtId, districtId),
                eq(aiOperations.operationType, 'SEMANTIC_RELEVANCE'),
                eq(aiOperations.targetId, intakeId),
              ),
            )
            .limit(1);

          if (existingOp) {
            const durationMs = Math.round(performance.now() - startTime);
            console.log(
              JSON.stringify({
                event: 'TELEGRAM_SEMANTIC_RELEVANCE_SKIPPED_DUPLICATE',
                intakeId,
                districtId,
                mahallaName,
                telegramChatId,
                telegramMessageId,
                existingOperationId: existingOp.id,
                finalStatus: existingOp.finalStatus,
                durationMs,
              }),
            );
            continue;
          }

          // Gate 1: Pre-AI District Lifecycle Verification (AC 13 / Matrix #20)
          const [districtGate1] = await db
            .select({
              id: districts.id,
              status: districts.status,
              accessEligible: districts.accessEligible,
            })
            .from(districts)
            .where(eq(districts.id, districtId))
            .limit(1);

          if (
            !districtGate1 ||
            districtGate1.status !== 'ACTIVE' ||
            districtGate1.accessEligible === false
          ) {
            const durationMs = Math.round(performance.now() - startTime);
            console.log(
              JSON.stringify({
                event: 'TELEGRAM_SEMANTIC_DROPPED_INACTIVE_DISTRICT',
                districtId,
                mahallaName,
                telegramChatId,
                telegramMessageId,
                districtStatus: districtGate1?.status ?? 'NOT_FOUND',
                accessEligible: districtGate1?.accessEligible ?? false,
                durationMs,
              }),
            );
            continue;
          }

          // Fetch injected evidence if provided (e.g. In tests), otherwise query DB
          let injectedEvidence: AcceptedEvidenceItem[] | undefined;
          if (options?.injectedEvidenceResolver) {
            injectedEvidence = await options.injectedEvidenceResolver(
              districtId,
              mahallaName,
              calendarDay,
            );
          }

          // Assemble same-day Mahalla context snapshot (AC 5, 14)
          const snapshot = await getMahallaDailySnapshot(
            db,
            districtId,
            mahallaName,
            calendarDay,
            injectedEvidence,
          );
          const initialRevision = snapshot.contextRevision;
          const initialFingerprint = snapshot.snapshotFingerprint;

          // Execute AI Gateway outside DB transaction (AD-5, AD-8 / AC 1, 9)
          const aiResult = await relevanceEvaluator.evaluateRelevance({
            candidateText: verbatimText,
            telegramMessageId,
            originalTimestamp,
            contentType,
            replyMetadata,
            snapshot,
          });

          // Gate 2: Pre-Commit District Lifecycle Verification (AC 13 / Matrix #21)
          const [districtGate2] = await db
            .select({
              id: districts.id,
              status: districts.status,
              accessEligible: districts.accessEligible,
            })
            .from(districts)
            .where(eq(districts.id, districtId))
            .limit(1);

          if (
            !districtGate2 ||
            districtGate2.status !== 'ACTIVE' ||
            districtGate2.accessEligible === false
          ) {
            const durationMs = Math.round(performance.now() - startTime);
            console.log(
              JSON.stringify({
                event: 'TELEGRAM_SEMANTIC_COMMIT_ABORTED_INACTIVE_DISTRICT',
                districtId,
                mahallaName,
                telegramChatId,
                telegramMessageId,
                districtStatus: districtGate2?.status ?? 'NOT_FOUND',
                accessEligible: districtGate2?.accessEligible ?? false,
                durationMs,
              }),
            );
            continue;
          }

          // CAS Check: Verify context has not advanced during AI evaluation (AD-6 / AC 10 / Matrix #19)
          const latestSnapshot = await getMahallaDailySnapshot(
            db,
            districtId,
            mahallaName,
            calendarDay,
            options?.injectedEvidenceResolver
              ? await options.injectedEvidenceResolver(districtId, mahallaName, calendarDay)
              : undefined,
          );

          if (
            latestSnapshot.contextRevision !== initialRevision ||
            latestSnapshot.snapshotFingerprint !== initialFingerprint
          ) {
            const durationMs = Math.round(performance.now() - startTime);
            console.warn(
              JSON.stringify({
                event: 'TELEGRAM_SEMANTIC_STALE_SNAPSHOT',
                districtId,
                mahallaName,
                calendarDay,
                telegramChatId,
                telegramMessageId,
                initialRevision,
                currentRevision: latestSnapshot.contextRevision,
                durationMs,
              }),
            );
            throw new Error(
              `STALE_SNAPSHOT: Mahalla context advanced from revision ${initialRevision} to ${latestSnapshot.contextRevision}. Retrying candidate analysis.`,
            );
          }

          const aiOperationId = `aiop_${crypto.randomUUID()}`;
          const isRelevant = aiResult.data.is_relevant;
          const finalStatus = isRelevant ? 'COMPLETED_RELEVANT' : 'COMPLETED_IRRELEVANT';

          // Atomic PostgreSQL commit + downstream enqueue via withTransactionalIntake
          await withTransactionalIntake(pool, boss, async ({ tx, enqueueJob }) => {
            // 1. Insert ai_operations record
            await tx.insert(aiOperations).values({
              id: aiOperationId,
              districtId,
              mahallaName,
              calendarDay,
              operationType: 'SEMANTIC_RELEVANCE',
              targetId: intakeId,
              pinnedProfileId: aiResult.profileId,
              contextRevision: initialRevision,
              snapshotFingerprint: initialFingerprint,
              finalStatus,
              resultPayload: aiResult.data,
            });

            // 2. Insert ai_provider_attempts records (persisting all attempts & retry lineage)
            const attemptsToInsert =
              aiResult.attempts && aiResult.attempts.length > 0
                ? aiResult.attempts
                : [
                    {
                      attemptNumber: 1,
                      provider: aiResult.provider,
                      modelId: aiResult.modelId,
                      providerRequestId: aiResult.providerRequestId,
                      durationMs: aiResult.durationMs,
                      inputTokens: aiResult.tokens.inputTokens,
                      outputTokens: aiResult.tokens.outputTokens,
                      cachedTokens: aiResult.tokens.cachedTokens,
                      estimatedCostUsd: aiResult.estimatedCostUsd.toString(),
                      status: 'SUCCESS' as const,
                    },
                  ];

            for (const att of attemptsToInsert) {
              await tx.insert(aiProviderAttempts).values({
                id: `att_${crypto.randomUUID()}`,
                operationId: aiOperationId,
                attemptNumber: att.attemptNumber,
                provider: att.provider,
                modelId: att.modelId,
                providerRequestId: att.providerRequestId,
                durationMs: att.durationMs,
                inputTokens: att.inputTokens,
                outputTokens: att.outputTokens,
                cachedTokens: att.cachedTokens,
                estimatedCostUsd: att.estimatedCostUsd ?? aiResult.estimatedCostUsd.toString(),
                status: att.status,
                errorCode: att.errorCode,
                sanitizedErrorMessage: att.sanitizedErrorMessage,
              });
            }

            if (isRelevant) {
              // 3. Enqueue Story 2.4 Topic Assignment job (AC 3, 9)
              const topicJobData: TelegramTopicAssignmentJobData = {
                intakeId,
                districtId,
                mahallaName,
                calendarDay,
                telegramChatId,
                telegramMessageId,
                telegramUserId,
                originalTimestamp,
                contentType,
                verbatimText,
                replyMetadata,
                aiOperationId,
                relevantLanes: aiResult.data.relevant_lanes,
                reasoning: aiResult.data.reasoning,
              };

              const singletonKey = `topic:${districtId}:${telegramChatId}:${telegramMessageId}`;
              await enqueueJob(TELEGRAM_TOPIC_ASSIGNMENT_QUEUE, topicJobData, {
                singletonKey,
                retryLimit: 3,
                retryDelay: 5,
                retryBackoff: true,
              });
            } else {
              // 4. Sanitize raw_payload in DB and purge verbatimText from memory (AC 7, 8 / AD-11)
              await tx
                .update(telegramIntakeRecords)
                .set({
                  rawPayload: {
                    status: 'EXCLUDED',
                    exclusionReason: aiResult.data.exclusion_reason,
                    purgedAt: new Date().toISOString(),
                  },
                  updatedAt: new Date(),
                })
                .where(eq(telegramIntakeRecords.id, intakeId));

              verbatimText = ''; // Memory purge
            }
          });

          const durationMs = Math.round(performance.now() - startTime);

          // Privacy-safe telemetry log (AD-11 / AC 12)
          console.log(
            JSON.stringify({
              event: isRelevant
                ? 'TELEGRAM_SEMANTIC_RELEVANT_COMMITTED'
                : 'TELEGRAM_SEMANTIC_EXCLUDED_COMMITTED',
              districtId,
              mahallaName,
              calendarDay,
              telegramChatId,
              telegramMessageId,
              aiOperationId,
              finalStatus,
              relevantLanes: aiResult.data.relevant_lanes,
              exclusionReason: aiResult.data.exclusion_reason,
              inputTokens: aiResult.tokens.inputTokens,
              outputTokens: aiResult.tokens.outputTokens,
              durationMs,
            }),
          );
        } catch (err: any) {
          // Handle unique violation gracefully for duplicate replays (AC 8 / Matrix #25)
          if (err?.code === '23505' && String(err?.constraint).includes('ai_ops_district_op_target_idx')) {
            console.log(
              JSON.stringify({
                event: 'TELEGRAM_SEMANTIC_RELEVANCE_IGNORED_DUPLICATE_VIOLATION',
                intakeId,
                districtId,
                telegramChatId,
                telegramMessageId,
              }),
            );
            continue;
          }

          console.error(
            JSON.stringify({
              event: 'TELEGRAM_SEMANTIC_RELEVANCE_ERROR',
              intakeId,
              districtId,
              telegramChatId,
              telegramMessageId,
              error: err instanceof Error ? err.message : String(err),
            }),
          );
          throw err; // Trigger pg-boss retry policy
        }
      }
    },
  );
  }

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
