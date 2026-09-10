import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { eq, and, inArray, sql, gt, lt, desc } from 'drizzle-orm';
import type { DbClient } from '../../../adapters/db/client.js';
import {
  districts,
  telegramIntakeRecords,
  aiOperations,
} from '../../../adapters/db/schema/index.js';
import {
  TELEGRAM_SEMANTIC_RELEVANCE_QUEUE,
  TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
  withTransactionalIntake,
  JobSingletonKeys,
  type TelegramSemanticRelevanceJobData,
  type TelegramTopicAssignmentJobData,
} from '../../../adapters/jobs/boss-client.js';
import { insertAiProviderAttempts } from '../ai-operation-repository.js';
import {
  getMahallaDailySnapshot,
  type AcceptedEvidenceItem,
} from '../context-snapshot.js';
import type {
  SemanticRelevanceEvaluator,
  PrecedingMessageContext,
} from '../semantic-relevance-evaluator.js';
import { clearPendingRetryFlag } from '../../issues/retry-service.js';

export interface SemanticRelevanceJobDeps {
  db: DbClient;
  pool: pg.Pool;
  boss: PgBoss;
  relevanceEvaluator: SemanticRelevanceEvaluator;
  injectedEvidenceResolver?: (
    districtId: string,
    mahallaName: string,
    calendarDay: string,
  ) => Promise<AcceptedEvidenceItem[] | undefined>;
}

export async function processSemanticRelevanceJobs(
  jobs: PgBoss.Job<TelegramSemanticRelevanceJobData>[],
  deps: SemanticRelevanceJobDeps,
): Promise<void> {
  const { db, pool, boss, relevanceEvaluator } = deps;
  const options = deps;
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
          burstMessages,
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
            (districtGate1.status !== 'ACTIVE' && districtGate1.status !== 'GRACE') ||
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

          // Resolve Immediate Preceding Message (N-1) in this chat, bridging the queue race condition
          let immediatePrecedingMessage: PrecedingMessageContext | null = null;
          const candidateTimestamp = new Date(originalTimestamp);
          const candidateTimeMs = candidateTimestamp.getTime();
          const fifteenMinutesAgo = new Date(candidateTimeMs - 15 * 60 * 1000);

          try {
            const [recentRelevantOp] = await db
              .select({
                id: aiOperations.id,
                resultPayload: aiOperations.resultPayload,
                rawPayload: telegramIntakeRecords.rawPayload,
                telegramMessageId: telegramIntakeRecords.telegramMessageId,
                originalTimestamp: telegramIntakeRecords.originalTimestamp,
              })
              .from(aiOperations)
              .innerJoin(telegramIntakeRecords, eq(aiOperations.targetId, telegramIntakeRecords.id))
              .where(
                and(
                  eq(telegramIntakeRecords.districtId, districtId),
                  eq(telegramIntakeRecords.telegramChatId, telegramChatId),
                  eq(aiOperations.finalStatus, 'COMPLETED_RELEVANT'),
                  gt(telegramIntakeRecords.originalTimestamp, fifteenMinutesAgo),
                  lt(telegramIntakeRecords.originalTimestamp, candidateTimestamp),
                ),
              )
              .orderBy(desc(telegramIntakeRecords.originalTimestamp))
              .limit(1);

            if (recentRelevantOp) {
              const raw = recentRelevantOp.rawPayload as Record<string, unknown> | null;
              const msg = raw?.message as Record<string, unknown> | undefined;
              const prevText =
                (typeof msg?.text === 'string'
                  ? msg.text
                  : typeof msg?.caption === 'string'
                    ? msg.caption
                    : '') || '';
              const payload = recentRelevantOp.resultPayload as Record<string, unknown> | null;
              const lanes = payload?.relevant_lanes as string[] | undefined;
              const prevLane = lanes && lanes.length > 0 ? lanes[0] : null;

              if (prevText) {
                immediatePrecedingMessage = {
                  telegramMessageId: recentRelevantOp.telegramMessageId,
                  originalTimestamp: recentRelevantOp.originalTimestamp.toISOString(),
                  verbatimText: prevText,
                  lane: prevLane,
                };
              }
            }
          } catch (queryErr) {
            console.warn(
              JSON.stringify({
                event: 'TELEGRAM_SEMANTIC_PRECEDING_MESSAGE_LOOKUP_FAILED',
                districtId,
                telegramChatId,
                error: (queryErr as Error).message,
              }),
            );
          }

          // Execute AI Gateway outside DB transaction (AD-5, AD-8 / AC 1, 9)
          const aiResult = await relevanceEvaluator.evaluateRelevance({
            candidateText: verbatimText,
            telegramMessageId,
            originalTimestamp,
            contentType,
            replyMetadata,
            snapshot,
            burstMessages,
            immediatePrecedingMessage,
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
            (districtGate2.status !== 'ACTIVE' && districtGate2.status !== 'GRACE') ||
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

          const acceptedIds = new Set(
            Array.isArray(aiResult.data.accepted_message_ids) &&
            aiResult.data.accepted_message_ids.length > 0
              ? aiResult.data.accepted_message_ids
              : burstMessages && burstMessages.length > 0
                ? burstMessages.map((m) => m.telegramMessageId)
                : [telegramMessageId],
          );

          // Atomic PostgreSQL commit + downstream enqueue via withTransactionalIntake
          await withTransactionalIntake(pool, boss, async ({ tx, enqueueJob }) => {
            // 1. Insert ai_operations record for all messages in the burst
            const allBurstIntakes =
              burstMessages && burstMessages.length > 0
                ? burstMessages
                : [{ intakeId, telegramMessageId }];

            for (const item of allBurstIntakes) {
              const opId =
                item.intakeId === intakeId ? aiOperationId : `aiop_${crypto.randomUUID()}`;
              const isItemAccepted =
                isRelevant &&
                (item.telegramMessageId ? acceptedIds.has(item.telegramMessageId) : true);
              const itemFinalStatus = isItemAccepted ? 'COMPLETED_RELEVANT' : 'COMPLETED_IRRELEVANT';

              await tx
                .insert(aiOperations)
                .values({
                  id: opId,
                  districtId,
                  mahallaName,
                  calendarDay,
                  operationType: 'SEMANTIC_RELEVANCE',
                  targetId: item.intakeId,
                  pinnedProfileId: aiResult.profileId,
                  contextRevision: initialRevision,
                  snapshotFingerprint: initialFingerprint,
                  finalStatus: itemFinalStatus,
                  resultPayload: aiResult.data,
                })
                .onConflictDoNothing();
            }

            // 2. Insert ai_provider_attempts records (persisting all attempts & retry lineage)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tx from withTransactionalIntake is structurally DbOrTx; module-identity mismatch in TS
            await insertAiProviderAttempts(tx as any, aiOperationId, aiResult);

            if (isRelevant) {
              // 3. Enqueue Story 2.4 Topic Assignment job (AC 3, 9)
              const filteredBurstMessages = burstMessages
                ? burstMessages.filter((m) => acceptedIds.has(m.telegramMessageId))
                : undefined;

              const excludedBurstItems = burstMessages
                ? burstMessages.filter((m) => !acceptedIds.has(m.telegramMessageId))
                : [];

              if (excludedBurstItems.length > 0) {
                const excludedIntakeIds = excludedBurstItems.map((m) => m.intakeId);
                const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
                const exclusionMeta = JSON.stringify({
                  status: 'EXCLUDED',
                  exclusionReason: 'GENERAL_CHATTER',
                  reasoning:
                    'Кетма-кет ёзилган хабарлардан ушбу қисмда соҳага оид муаммо ёки манзил аниқланмади',
                  expiresAt,
                  purgedAt: null,
                });
                await tx
                  .update(telegramIntakeRecords)
                  .set({
                    rawPayload: sql`COALESCE(${telegramIntakeRecords.rawPayload}, '{}'::jsonb) || ${exclusionMeta}::jsonb`,
                    updatedAt: new Date(),
                  })
                  .where(inArray(telegramIntakeRecords.id, excludedIntakeIds));
              }

              const primaryAcceptedItem =
                filteredBurstMessages && filteredBurstMessages.length > 0
                  ? filteredBurstMessages[0]!
                  : null;

              const effectiveIntakeId = primaryAcceptedItem ? primaryAcceptedItem.intakeId : intakeId;
              const effectiveMessageId = primaryAcceptedItem
                ? primaryAcceptedItem.telegramMessageId
                : telegramMessageId;
              const effectiveUserMetadata =
                primaryAcceptedItem?.userMetadata ?? job.data.userMetadata ?? null;

              const topicJobData: TelegramTopicAssignmentJobData = {
                intakeId: effectiveIntakeId,
                districtId,
                mahallaName,
                calendarDay,
                telegramChatId,
                telegramMessageId: effectiveMessageId,
                telegramUserId,
                originalTimestamp: primaryAcceptedItem
                  ? primaryAcceptedItem.originalTimestamp
                  : originalTimestamp,
                contentType: primaryAcceptedItem ? primaryAcceptedItem.contentType : contentType,
                verbatimText,
                replyMetadata,
                userMetadata: effectiveUserMetadata,
                aiOperationId,
                relevantLanes: aiResult.data.relevant_lanes,
                reasoning: aiResult.data.reasoning,
                burstMessages:
                  filteredBurstMessages && filteredBurstMessages.length > 0
                    ? filteredBurstMessages
                    : undefined,
              };

              const singletonKey = JobSingletonKeys.forTopicAssignment(
                districtId,
                telegramChatId,
                effectiveMessageId,
              );
              await enqueueJob(TELEGRAM_TOPIC_ASSIGNMENT_QUEUE, topicJobData, {
                singletonKey,
                retryLimit: 3,
                retryDelay: 5,
                retryBackoff: true,
              });
            } else {
              // 4. Retain bounded debug payload in DB for 14 days and purge memory (Decision 1 / Bounded Debug Retention)
              const allIntakeIds =
                burstMessages && burstMessages.length > 0
                  ? burstMessages.map((m) => m.intakeId)
                  : [intakeId];

              const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
              const exclusionMeta = JSON.stringify({
                status: 'EXCLUDED',
                exclusionReason: aiResult.data.exclusion_reason,
                verbatimText,
                reasoning: aiResult.data.reasoning,
                expiresAt,
                purgedAt: null,
              });

              await tx
                .update(telegramIntakeRecords)
                .set({
                  rawPayload: sql`COALESCE(${telegramIntakeRecords.rawPayload}, '{}'::jsonb) || ${exclusionMeta}::jsonb`,
                  updatedAt: new Date(),
                })
                .where(inArray(telegramIntakeRecords.id, allIntakeIds));

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
              error: err instanceof Error ? err.message : String(err),
            }),
          );
          throw err; // Trigger pg-boss retry policy
        } finally {
          if (job.data?.issueId) {
            await clearPendingRetryFlag(db, job.data.issueId);
          }
        }
      }
    }





export async function registerSemanticRelevanceJobHandler(
  boss: PgBoss,
  deps: SemanticRelevanceJobDeps,
): Promise<void> {
  await boss.work<TelegramSemanticRelevanceJobData>(
    TELEGRAM_SEMANTIC_RELEVANCE_QUEUE,
    { newJobCheckInterval: 50, batchSize: 1 } as any,
    (jobs) => processSemanticRelevanceJobs(jobs, deps),
  );
}
