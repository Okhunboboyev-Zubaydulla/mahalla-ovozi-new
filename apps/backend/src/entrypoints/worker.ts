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
  TELEGRAM_TOPIC_PROJECTION_QUEUE,
  TELEGRAM_TOPIC_RETENTION_QUEUE,
  type TelegramContentQualificationJobData,
  type TelegramSemanticRelevanceJobData,
  type TelegramTopicAssignmentJobData,
  type TelegramTopicProjectionJobData,
  type TelegramTopicRetentionJobData,
} from '../adapters/jobs/boss-client.js';
import { createDbPool, createDbClient, type DbClient } from '../adapters/db/client.js';
import {
  districts,
  telegramIntakeRecords,
  aiOperations,
  aiProviderAttempts,
  topics,
  acceptedEvidence,
  topicProjections,
  ensureDefaultAiProfiles,
} from '../adapters/db/schema/index.js';
import { qualifyTelegramContent } from '../modules/telegram-intake/telegram-content-qualification.js';
import { AiGateway, type AiGatewayPort } from '../modules/ai/ai-gateway.js';
import { SemanticRelevanceEvaluator } from '../modules/ai/semantic-relevance-evaluator.js';
import {
  TopicMatchingEvaluator,
  findDirectReplyTopic,
} from '../modules/topics/topic-matching-evaluator.js';
import type { TopicMatchingResult } from '../modules/ai/topic-matching-contracts.js';
import { TopicProjectionEvaluator } from '../modules/topics/topic-projection-evaluator.js';
import type { QualifyingLane } from '../modules/ai/semantic-relevance-contracts.js';
import {
  getMahallaDailySnapshot,
  type AcceptedEvidenceItem,
} from '../modules/ai/context-snapshot.js';
import { TopicRetentionService } from '../modules/retention/index.js';

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
  const topicMatchingEvaluator = new TopicMatchingEvaluator(aiGateway);
  const topicProjectionEvaluator = new TopicProjectionEvaluator(aiGateway);


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

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Worker for telegram-topic-assignment (Story 2.4)
  // ──────────────────────────────────────────────────────────────────────────
  if (shouldWork(TELEGRAM_TOPIC_ASSIGNMENT_QUEUE)) {
    await boss.work<TelegramTopicAssignmentJobData>(
      TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
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
            aiOperationId,
            relevantLanes,
            reasoning,
          } = job.data;

          const startTime = performance.now();

          try {
            // 1. Deduplication / Idempotency Check: if accepted_evidence already exists, skip cleanly (AC 16 / Matrix #26)
            const [existingEvidence] = await db
              .select({
                id: acceptedEvidence.id,
                topicId: acceptedEvidence.topicId,
              })
              .from(acceptedEvidence)
              .where(
                and(
                  eq(acceptedEvidence.districtId, districtId),
                  eq(acceptedEvidence.telegramChatId, telegramChatId),
                  eq(acceptedEvidence.telegramMessageId, telegramMessageId),
                ),
              )
              .limit(1);

            if (existingEvidence) {
              const durationMs = Math.round(performance.now() - startTime);
              console.log(
                JSON.stringify({
                  event: 'TELEGRAM_TOPIC_ASSIGNMENT_SKIPPED_DUPLICATE',
                  intakeId,
                  districtId,
                  mahallaName,
                  telegramChatId,
                  telegramMessageId,
                  existingEvidenceId: existingEvidence.id,
                  topicId: existingEvidence.topicId,
                  durationMs,
                }),
              );
              continue;
            }

            // 2. Gate 1: Pre-AI District Lifecycle Verification (AC 1, 13 / AD-9 / Matrix #22)
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
                  event: 'TELEGRAM_TOPIC_ASSIGNMENT_DROPPED_INACTIVE_DISTRICT',
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

            // 3. Fast Direct Reply Evaluation (AC 2, 3 / Pure DB resolution)
            let directReplyTopicId: string | null = null;
            if (replyMetadata?.replyToMessageId && !replyMetadata.replyToIsForwarded) {
              directReplyTopicId = await findDirectReplyTopic(
                db,
                districtId,
                mahallaName,
                calendarDay,
                telegramChatId,
                replyMetadata.replyToMessageId,
              );
            }

            // 4. Topic Matching Decision (Direct Reply vs AI Snapshot Evaluation)
            let matchingDecision: TopicMatchingResult;
            let isDirectReply = false;
            let initialRevision = 0;
            let initialFingerprint = 'sha256_empty_v1';
            let matchingAiResult: any = null;

            if (directReplyTopicId) {
              // Direct Telegram reply takes absolute priority with zero AI calls (AC 2)
              isDirectReply = true;
              matchingDecision = {
                decision: 'MATCH_EXISTING_TOPIC',
                matched_topic_id: directReplyTopicId,
                primary_lane: null,
                reasoning: 'Direct Telegram reply to existing same-day accepted evidence',
              };
            } else {
              // Fallback to same-day snapshot assembly & AI matching (AC 4, 14)
              let injectedEvidence: AcceptedEvidenceItem[] | undefined;
              if (options?.injectedEvidenceResolver) {
                injectedEvidence = await options.injectedEvidenceResolver(
                  districtId,
                  mahallaName,
                  calendarDay,
                );
              }

              const snapshot = await getMahallaDailySnapshot(
                db,
                districtId,
                mahallaName,
                calendarDay,
                injectedEvidence,
              );
              initialRevision = snapshot.contextRevision;
              initialFingerprint = snapshot.snapshotFingerprint;

              // Execute AI Gateway outside DB transaction (AD-5, AD-8 / AC 14)
              matchingAiResult = await topicMatchingEvaluator.evaluateTopicAssignment({
                candidateText: verbatimText,
                telegramMessageId,
                originalTimestamp,
                contentType,
                replyMetadata,
                relevantLanes,
                relevanceReasoning: reasoning,
                snapshot,
              });

              matchingDecision = matchingAiResult.data;
            }

            // 5. Gate 2: Pre-Commit District Lifecycle Verification (AC 1, 13 / AD-9 / Matrix #23)
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
                  event: 'TELEGRAM_TOPIC_ASSIGNMENT_COMMIT_ABORTED_INACTIVE_DISTRICT',
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

            // 6. CAS Optimistic Concurrency Check (AC 12 / AD-6 / Matrix #21)
            if (!isDirectReply) {
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
                    event: 'TELEGRAM_TOPIC_ASSIGNMENT_STALE_SNAPSHOT',
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
                  `STALE_SNAPSHOT: Mahalla context advanced from revision ${initialRevision} to ${latestSnapshot.contextRevision}. Retrying candidate topic assignment.`,
                );
              }
            }

            // 7. Atomic PostgreSQL Commit Block (AC 6, 7, 8, 10, 16, 17)
            const [intakeRec] = await db
              .select({ rawPayload: telegramIntakeRecords.rawPayload })
              .from(telegramIntakeRecords)
              .where(eq(telegramIntakeRecords.id, intakeId))
              .limit(1);

            const raw = intakeRec?.rawPayload as Record<string, any> | undefined;
            const fromUser = raw?.from || raw?.message?.from;
            const userMetadata = fromUser
              ? {
                  telegramUserId: fromUser.id ? String(fromUser.id) : telegramUserId,
                  username: fromUser.username,
                  firstName: fromUser.first_name,
                  lastName: fromUser.last_name,
                }
              : telegramUserId
                ? { telegramUserId }
                : null;

            const candidateDate = new Date(originalTimestamp);
            const topicMatchingOpId = isDirectReply ? null : `aiop_${crypto.randomUUID()}`;

            let linkedAiOpId: string | null = topicMatchingOpId;
            if (!linkedAiOpId && aiOperationId) {
              const [existingAiOp] = await db
                .select({ id: aiOperations.id })
                .from(aiOperations)
                .where(eq(aiOperations.id, aiOperationId))
                .limit(1);
              if (existingAiOp) {
                linkedAiOpId = existingAiOp.id;
              }
            }

            await withTransactionalIntake(pool, boss, async ({ tx, enqueueJob }) => {
              // Log AI operation and provider attempts if AI matching occurred
              if (topicMatchingOpId && matchingAiResult) {
                await tx.insert(aiOperations).values({
                  id: topicMatchingOpId,
                  districtId,
                  mahallaName,
                  calendarDay,
                  operationType: 'TOPIC_MATCHING',
                  targetId: intakeId,
                  pinnedProfileId: matchingAiResult.profileId,
                  contextRevision: initialRevision,
                  snapshotFingerprint: initialFingerprint,
                  finalStatus:
                    matchingDecision.decision === 'UNASSIGNABLE_VAGUE'
                      ? 'COMPLETED_IRRELEVANT'
                      : 'COMPLETED_RELEVANT',
                  resultPayload: matchingDecision,
                });

                const attemptsToInsert =
                  matchingAiResult.attempts && matchingAiResult.attempts.length > 0
                    ? matchingAiResult.attempts
                    : [
                        {
                          attemptNumber: 1,
                          provider: matchingAiResult.provider,
                          modelId: matchingAiResult.modelId,
                          providerRequestId: matchingAiResult.providerRequestId,
                          durationMs: matchingAiResult.durationMs,
                          inputTokens: matchingAiResult.tokens.inputTokens,
                          outputTokens: matchingAiResult.tokens.outputTokens,
                          cachedTokens: matchingAiResult.tokens.cachedTokens,
                          estimatedCostUsd: matchingAiResult.estimatedCostUsd.toString(),
                          status: 'SUCCESS' as const,
                        },
                      ];

                for (const att of attemptsToInsert) {
                  await tx.insert(aiProviderAttempts).values({
                    id: `att_${crypto.randomUUID()}`,
                    operationId: topicMatchingOpId,
                    attemptNumber: att.attemptNumber,
                    provider: att.provider,
                    modelId: att.modelId,
                    providerRequestId: att.providerRequestId,
                    durationMs: att.durationMs,
                    inputTokens: att.inputTokens,
                    outputTokens: att.outputTokens,
                    cachedTokens: att.cachedTokens,
                    estimatedCostUsd:
                      att.estimatedCostUsd ?? matchingAiResult.estimatedCostUsd.toString(),
                    status: att.status,
                    errorCode: att.errorCode,
                    sanitizedErrorMessage: att.sanitizedErrorMessage,
                  });
                }
              }

              if (matchingDecision.decision === 'MATCH_EXISTING_TOPIC') {
                const targetTopicId = matchingDecision.matched_topic_id!;

                // Fetch existing topic
                const [existingTopic] = await tx
                  .select()
                  .from(topics)
                  .where(eq(topics.id, targetTopicId))
                  .limit(1);

                if (!existingTopic) {
                  throw new Error(
                    `Topic ${targetTopicId} not found in database for MATCH_EXISTING_TOPIC`,
                  );
                }

                // Arithmetic for retention & generation
                const latestEvidenceTime = new Date(
                  Math.max(
                    existingTopic.latestRelevantEvidenceTimestamp.getTime(),
                    candidateDate.getTime(),
                  ),
                );
                const retentionExpiresAt = new Date(
                  latestEvidenceTime.getTime() + 90 * 24 * 60 * 60 * 1000,
                );
                const nextGeneration = existingTopic.requiredDerivedGeneration + 1;

                // Update Topic
                await tx
                  .update(topics)
                  .set({
                    latestRelevantEvidenceTimestamp: latestEvidenceTime,
                    retentionExpiresAt,
                    requiredDerivedGeneration: nextGeneration,
                    updatedAt: new Date(),
                  })
                  .where(eq(topics.id, targetTopicId));

                // Insert Accepted Evidence
                const evidenceId = `evi_${crypto.randomUUID()}`;
                await tx.insert(acceptedEvidence).values({
                  id: evidenceId,
                  topicId: targetTopicId,
                  districtId,
                  mahallaName,
                  calendarDay,
                  intakeRecordId: intakeId,
                  telegramChatId,
                  telegramMessageId,
                  telegramUserId,
                  originalTimestamp: candidateDate,
                  verbatimText,
                  contentType,
                  userMetadata,
                  replyMetadata,
                  aiOperationId: linkedAiOpId,
                });

                // Enqueue downstream projection job (AC 17)
                const projectionJobData: TelegramTopicProjectionJobData = {
                  topicId: targetTopicId,
                  districtId,
                  mahallaName,
                  calendarDay,
                  generation: nextGeneration,
                };
                const singletonKey = `proj:${targetTopicId}:${nextGeneration}`;
                await enqueueJob(TELEGRAM_TOPIC_PROJECTION_QUEUE, projectionJobData, {
                  singletonKey,
                  retryLimit: 3,
                  retryDelay: 5,
                  retryBackoff: true,
                });
              } else if (matchingDecision.decision === 'NEW_TOPIC') {
                const newTopicId = `top_${crypto.randomUUID()}`;
                const retentionExpiresAt = new Date(
                  candidateDate.getTime() + 90 * 24 * 60 * 60 * 1000,
                );

                // Insert new Topic record
                await tx.insert(topics).values({
                  id: newTopicId,
                  districtId,
                  mahallaName,
                  calendarDay,
                  primaryLane: matchingDecision.primary_lane!,
                  status: 'ACTIVE',
                  latestRelevantEvidenceTimestamp: candidateDate,
                  retentionExpiresAt,
                  requiredDerivedGeneration: 1,
                  appliedDerivedGeneration: 0,
                });

                // Insert Accepted Evidence record
                const evidenceId = `evi_${crypto.randomUUID()}`;
                await tx.insert(acceptedEvidence).values({
                  id: evidenceId,
                  topicId: newTopicId,
                  districtId,
                  mahallaName,
                  calendarDay,
                  intakeRecordId: intakeId,
                  telegramChatId,
                  telegramMessageId,
                  telegramUserId,
                  originalTimestamp: candidateDate,
                  verbatimText,
                  contentType,
                  userMetadata,
                  replyMetadata,
                  aiOperationId: linkedAiOpId,
                });

                // Enqueue downstream projection job (AC 17)
                const projectionJobData: TelegramTopicProjectionJobData = {
                  topicId: newTopicId,
                  districtId,
                  mahallaName,
                  calendarDay,
                  generation: 1,
                };
                const singletonKey = `proj:${newTopicId}:1`;
                await enqueueJob(TELEGRAM_TOPIC_PROJECTION_QUEUE, projectionJobData, {
                  singletonKey,
                  retryLimit: 3,
                  retryDelay: 5,
                  retryBackoff: true,
                });
              } else if (matchingDecision.decision === 'UNASSIGNABLE_VAGUE') {
                // Sanitize raw payload in DB and purge verbatimText from memory (AC 7 / AD-11)
                await tx
                  .update(telegramIntakeRecords)
                  .set({
                    rawPayload: {
                      status: 'EXCLUDED',
                      reason: 'UNASSIGNABLE_VAGUE',
                      purgedAt: new Date().toISOString(),
                    },
                    updatedAt: new Date(),
                  })
                  .where(eq(telegramIntakeRecords.id, intakeId));

                verbatimText = ''; // Memory purge
              }
            });

            const durationMs = Math.round(performance.now() - startTime);

            // Privacy-safe structured telemetry (AD-11 / AC 8)
            console.log(
              JSON.stringify({
                event:
                  matchingDecision.decision === 'UNASSIGNABLE_VAGUE'
                    ? 'TELEGRAM_TOPIC_ASSIGNMENT_VAGUE_DISCARDED'
                    : 'TELEGRAM_TOPIC_ASSIGNMENT_COMMITTED',
                districtId,
                mahallaName,
                calendarDay,
                telegramChatId,
                telegramMessageId,
                decision: matchingDecision.decision,
                matchedTopicId: matchingDecision.matched_topic_id,
                primaryLane: matchingDecision.primary_lane,
                isDirectReply,
                durationMs,
              }),
            );
          } catch (err: any) {
            // Handle unique violation gracefully for duplicate replays (AC 16 / Matrix #26)
            if (
              err?.code === '23505' &&
              (String(err?.constraint).includes('accepted_evidence_district_chat_msg_idx') ||
                String(err?.detail).includes('already exists'))
            ) {
              console.log(
                JSON.stringify({
                  event: 'TELEGRAM_TOPIC_ASSIGNMENT_IGNORED_DUPLICATE_VIOLATION',
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
                event: 'TELEGRAM_TOPIC_ASSIGNMENT_ERROR',
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

  // ──────────────────────────────────────────────────────────────────────────
  // 4. Worker for telegram-topic-projection (Story 2.5)
  // ──────────────────────────────────────────────────────────────────────────
  if (shouldWork(TELEGRAM_TOPIC_PROJECTION_QUEUE)) {
    await boss.work<TelegramTopicProjectionJobData>(
      TELEGRAM_TOPIC_PROJECTION_QUEUE,
      { newJobCheckInterval: 50 } as any,
      async (jobs) => {
        for (const job of jobs) {
          const { topicId, districtId, mahallaName, calendarDay, generation } = job.data;
          const startTime = performance.now();

          try {
            // 1. Lifecycle Gate 1 (Pre-AI): Verify district is ACTIVE and accessEligible !== false (AC 1, 19 / AD-9)
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
                  event: 'TELEGRAM_TOPIC_PROJECTION_DROPPED_INACTIVE_DISTRICT',
                  districtId,
                  mahallaName,
                  calendarDay,
                  topicId,
                  generation,
                  districtStatus: district?.status ?? 'NOT_FOUND',
                  accessEligible: district?.accessEligible ?? false,
                  durationMs,
                }),
              );
              continue;
            }

            // 2. Fetch target Topic from database
            const [targetTopic] = await db
              .select()
              .from(topics)
              .where(eq(topics.id, topicId))
              .limit(1);

            if (!targetTopic) {
              const durationMs = Math.round(performance.now() - startTime);
              console.log(
                JSON.stringify({
                  event: 'TELEGRAM_TOPIC_PROJECTION_DROPPED_EXPIRED',
                  topicId,
                  districtId,
                  mahallaName,
                  calendarDay,
                  generation,
                  durationMs,
                }),
              );
              continue;
            }

            // 3. Out-of-order drop check (AC 3, Matrix #14 / AD-7)
            if (generation <= targetTopic.appliedDerivedGeneration) {
              const durationMs = Math.round(performance.now() - startTime);
              console.log(
                JSON.stringify({
                  event: 'TELEGRAM_TOPIC_PROJECTION_DROPPED_SUPERSEDED',
                  districtId,
                  mahallaName,
                  calendarDay,
                  topicId,
                  jobGeneration: generation,
                  appliedDerivedGeneration: targetTopic.appliedDerivedGeneration,
                  durationMs,
                }),
              );
              continue; // Drop with 0 AI calls, 0 DB writes
            }

            // 4. Deterministic same-day Mahalla context snapshot (AC 2 / AD-5)
            const injected = options?.injectedEvidenceResolver
              ? await options.injectedEvidenceResolver(districtId, mahallaName, calendarDay)
              : undefined;

            const snapshot = await getMahallaDailySnapshot(
              db,
              districtId,
              mahallaName,
              calendarDay,
              injected,
            );

            // In-flight coalescing: target topic's newest required generation at execution time (AC 4, Matrix #15)
            const targetGeneration = Math.max(generation, targetTopic.requiredDerivedGeneration);

            // 5. AI Projection Evaluation executed outside DB transaction (AC 10 / AD-8)
            const evaluation = await topicProjectionEvaluator.evaluateTopicProjection({
              topicId,
              primaryLane: targetTopic.primaryLane as QualifyingLane,
              generation: targetGeneration,
              snapshot,
            });

            // 6. Lifecycle Gate 2 (Pre-Commit): Re-verify district active status (AC 1, Matrix #20 / AD-9)
            const [gate2District] = await db
              .select({
                id: districts.id,
                status: districts.status,
                accessEligible: districts.accessEligible,
              })
              .from(districts)
              .where(eq(districts.id, districtId))
              .limit(1);

            if (
              !gate2District ||
              gate2District.status !== 'ACTIVE' ||
              gate2District.accessEligible === false
            ) {
              const durationMs = Math.round(performance.now() - startTime);
              console.log(
                JSON.stringify({
                  event: 'TELEGRAM_TOPIC_PROJECTION_ABORTED_INACTIVE_DISTRICT_PRECOMMIT',
                  districtId,
                  mahallaName,
                  calendarDay,
                  topicId,
                  generation: targetGeneration,
                  districtStatus: gate2District?.status ?? 'NOT_FOUND',
                  accessEligible: gate2District?.accessEligible ?? false,
                  durationMs,
                }),
              );
              continue;
            }

            // 7. Atomic Transactional Commit with CAS Generation Advancement (AC 12, 13, 14, 16 / AD-3, AD-7)
            const projectionOpId = `aiop_${crypto.randomUUID()}`;
            const opTargetId = `${topicId}:${targetGeneration}`;

            await withTransactionalIntake(pool, boss, async ({ tx }) => {
              // Row lock topic
              const [lockedTopic] = await tx
                .select()
                .from(topics)
                .where(eq(topics.id, topicId))
                .for('update')
                .limit(1);

              if (!lockedTopic) {
                console.log(
                  JSON.stringify({
                    event: 'TELEGRAM_TOPIC_PROJECTION_DROPPED_EXPIRED',
                    topicId,
                    districtId,
                    targetGeneration,
                  }),
                );
                return;
              }

              // CAS stale check (AC 13, Matrix #16)
              if (lockedTopic.appliedDerivedGeneration >= targetGeneration) {
                console.log(
                  JSON.stringify({
                    event: 'TELEGRAM_TOPIC_PROJECTION_STALE_CAS_ABORT',
                    topicId,
                    districtId,
                    targetGeneration,
                    appliedDerivedGeneration: lockedTopic.appliedDerivedGeneration,
                  }),
                );
                return;
              }

              // 7a. Record ai_operations with targetId = `${topicId}:${generation}` (AC 10)
              await tx.insert(aiOperations).values({
                id: projectionOpId,
                districtId,
                mahallaName,
                calendarDay,
                operationType: 'TOPIC_DERIVED_PROJECTION',
                targetId: opTargetId,
                pinnedProfileId: evaluation.aiResult.profileId,
                contextRevision: snapshot.contextRevision,
                snapshotFingerprint: snapshot.snapshotFingerprint,
                finalStatus: 'COMPLETED',
                resultPayload: {
                  summary: evaluation.summary,
                  lanes: evaluation.lanes,
                  anchorEvidenceId: evaluation.anchorEvidenceId,
                  isHokimRelated: evaluation.isHokimRelated,
                },
              });

              // 7b. Record ai_provider_attempts
              const attemptsToInsert =
                evaluation.aiResult.attempts && evaluation.aiResult.attempts.length > 0
                  ? evaluation.aiResult.attempts
                  : [
                      {
                        attemptNumber: 1,
                        provider: evaluation.aiResult.provider,
                        modelId: evaluation.aiResult.modelId,
                        providerRequestId: evaluation.aiResult.providerRequestId,
                        durationMs: evaluation.aiResult.durationMs,
                        inputTokens: evaluation.aiResult.tokens.inputTokens,
                        outputTokens: evaluation.aiResult.tokens.outputTokens,
                        cachedTokens: evaluation.aiResult.tokens.cachedTokens,
                        estimatedCostUsd: evaluation.aiResult.estimatedCostUsd.toString(),
                        status: 'SUCCESS' as const,
                      },
                    ];

              for (const att of attemptsToInsert) {
                await tx.insert(aiProviderAttempts).values({
                  id: `att_${crypto.randomUUID()}`,
                  operationId: projectionOpId,
                  attemptNumber: att.attemptNumber,
                  provider: att.provider,
                  modelId: att.modelId,
                  providerRequestId: att.providerRequestId,
                  durationMs: att.durationMs,
                  inputTokens: att.inputTokens,
                  outputTokens: att.outputTokens,
                  cachedTokens: att.cachedTokens,
                  estimatedCostUsd:
                    att.estimatedCostUsd ?? evaluation.aiResult.estimatedCostUsd.toString(),
                  status: att.status,
                  errorCode: att.errorCode,
                  sanitizedErrorMessage: att.sanitizedErrorMessage,
                });
              }

              // 7c. Upsert into topic_projections table (1:1 with topics)
              const projectionRecordId = `prj_${crypto.randomUUID()}`;
              await tx
                .insert(topicProjections)
                .values({
                  id: projectionRecordId,
                  topicId,
                  districtId,
                  mahallaName,
                  calendarDay,
                  summary: evaluation.summary,
                  lanes: evaluation.lanes,
                  primaryLane: lockedTopic.primaryLane,
                  anchorEvidenceId: evaluation.anchorEvidenceId,
                  anchorQuote: evaluation.anchorQuote,
                  latestMeaningfulActivityTimestamp: new Date(
                    evaluation.latestMeaningfulActivityTimestamp,
                  ),
                  attribution: evaluation.attribution,
                  isHokimRelated: evaluation.isHokimRelated,
                  generation: targetGeneration,
                  aiProfileId: evaluation.aiResult.profileId,
                  aiOperationId: projectionOpId,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                })
                .onConflictDoUpdate({
                  target: topicProjections.topicId,
                  set: {
                    summary: evaluation.summary,
                    lanes: evaluation.lanes,
                    anchorEvidenceId: evaluation.anchorEvidenceId,
                    anchorQuote: evaluation.anchorQuote,
                    latestMeaningfulActivityTimestamp: new Date(
                      evaluation.latestMeaningfulActivityTimestamp,
                    ),
                    attribution: evaluation.attribution,
                    isHokimRelated: evaluation.isHokimRelated,
                    generation: targetGeneration,
                    aiProfileId: evaluation.aiResult.profileId,
                    aiOperationId: projectionOpId,
                    updatedAt: new Date(),
                  },
                });

              // 7d. Advance topics.appliedDerivedGeneration and updatedAt
              await tx
                .update(topics)
                .set({
                  appliedDerivedGeneration: targetGeneration,
                  updatedAt: new Date(),
                })
                .where(eq(topics.id, topicId));
            });

            const durationMs = Math.round(performance.now() - startTime);

            // 8. Privacy-safe structured telemetry (AC 18 / AD-11)
            console.log(
              JSON.stringify({
                event: 'TELEGRAM_TOPIC_PROJECTION_COMMITTED',
                districtId,
                mahallaName,
                calendarDay,
                topicId,
                generation: targetGeneration,
                primaryLane: targetTopic.primaryLane,
                lanes: evaluation.lanes,
                isHokimRelated: evaluation.isHokimRelated,
                anchorEvidenceId: evaluation.anchorEvidenceId,
                aiOperationId: projectionOpId,
                durationMs,
              }),
            );
          } catch (err) {
            console.error(
              JSON.stringify({
                event: 'TELEGRAM_TOPIC_PROJECTION_ERROR',
                topicId,
                districtId,
                mahallaName,
                calendarDay,
                generation,
                error: err instanceof Error ? err.message : String(err),
              }),
            );
            throw err; // Trigger pg-boss retry policy with backoff (AC 15)
          }
        }
      },
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Worker for telegram-topic-retention (Story 2.6)
  // ──────────────────────────────────────────────────────────────────────────
  if (shouldWork(TELEGRAM_TOPIC_RETENTION_QUEUE)) {
    const retentionService = new TopicRetentionService(pool, boss, db);

    if (!options?.queues) {
      await boss.schedule(
        TELEGRAM_TOPIC_RETENTION_QUEUE,
        '0 * * * *',
        {},
        { tz: 'Asia/Tashkent' },
      );
    }

    await boss.work<TelegramTopicRetentionJobData>(
      TELEGRAM_TOPIC_RETENTION_QUEUE,
      { newJobCheckInterval: 50 } as any,
      async (jobs) => {
        for (const job of jobs) {
          const startTime = performance.now();
          const { districtId } = job.data;

          try {
            if (districtId) {
              // 1. Gate 1: Check district lifecycle (AC 12)
              const [district] = await db
                .select()
                .from(districts)
                .where(eq(districts.id, districtId))
                .limit(1);

              if (!district || district.status !== 'ACTIVE' || !district.accessEligible) {
                const durationMs = Math.round(performance.now() - startTime);
                console.log(
                  JSON.stringify({
                    event: 'TELEGRAM_TOPIC_RETENTION_DROPPED_INACTIVE_DISTRICT',
                    districtId,
                    districtStatus: district?.status ?? 'NOT_FOUND',
                    accessEligible: district?.accessEligible ?? false,
                    durationMs,
                  }),
                );
                continue;
              }

              const result = await retentionService.purgeDistrictExpiredTopicsBatch(districtId);
              const durationMs = Math.round(performance.now() - startTime);
              console.log(
                JSON.stringify({
                  event: 'TELEGRAM_TOPIC_RETENTION_SCAN_COMPLETED',
                  districtId,
                  topicsEvaluated: result.topicsEvaluated,
                  topicsPurged: result.topicsPurged,
                  evidencePurged: result.evidencePurged,
                  projectionsPurged: result.projectionsPurged,
                  durationMs,
                }),
              );
            } else {
              // Scheduled scan across all active districts (AC 13)
              const activeDistricts = await db
                .select({ id: districts.id })
                .from(districts)
                .where(and(eq(districts.status, 'ACTIVE'), eq(districts.accessEligible, true)));

              let totalEvaluated = 0;
              let totalPurged = 0;
              let totalEvidence = 0;
              let totalProjections = 0;

              for (const d of activeDistricts) {
                const result = await retentionService.purgeDistrictExpiredTopicsBatch(d.id);
                totalEvaluated += result.topicsEvaluated;
                totalPurged += result.topicsPurged;
                totalEvidence += result.evidencePurged;
                totalProjections += result.projectionsPurged;
              }

              const durationMs = Math.round(performance.now() - startTime);
              console.log(
                JSON.stringify({
                  event: 'TELEGRAM_TOPIC_RETENTION_SCAN_COMPLETED',
                  districtsScanned: activeDistricts.length,
                  topicsEvaluated: totalEvaluated,
                  topicsPurged: totalPurged,
                  evidencePurged: totalEvidence,
                  projectionsPurged: totalProjections,
                  durationMs,
                }),
              );
            }
          } catch (err) {
            console.error(
              JSON.stringify({
                event: 'TELEGRAM_TOPIC_RETENTION_ERROR',
                districtId: districtId ?? 'ALL',
                error: err instanceof Error ? err.message : String(err),
              }),
            );
            throw err;
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
