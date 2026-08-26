import crypto from 'node:crypto';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { eq, and } from 'drizzle-orm';
import type { DbClient } from '../../../adapters/db/client.js';
import {
  districts,
  telegramIntakeRecords,
  aiOperations,
  aiProviderAttempts,
  topics,
  acceptedEvidence,
} from '../../../adapters/db/schema/index.js';
import {
  TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
  TELEGRAM_TOPIC_PROJECTION_QUEUE,
  withTransactionalIntake,
  JobSingletonKeys,
  type TelegramTopicAssignmentJobData,
  type TelegramTopicProjectionJobData,
} from '../../../adapters/jobs/boss-client.js';
import {
  TopicMatchingEvaluator,
  findDirectReplyTopic,
} from '../topic-matching-evaluator.js';
import type { TopicMatchingResult } from '../../ai/topic-matching-contracts.js';
import {
  getMahallaDailySnapshot,
  verifySnapshotIntegrity,
  assertSnapshotRevision,
  StaleSnapshotRevisionError,
  type AcceptedEvidenceItem,
} from '../../ai/context-snapshot.js';
import { calculateRetentionDeadline } from '../../retention/index.js';
import { clearPendingRetryFlag } from '../../issues/retry-service.js';

export interface TopicAssignmentJobDeps {
  db: DbClient;
  pool: pg.Pool;
  boss: PgBoss;
  topicMatchingEvaluator: TopicMatchingEvaluator;
  injectedEvidenceResolver?: (
    districtId: string,
    mahallaName: string,
    calendarDay: string,
  ) => Promise<AcceptedEvidenceItem[] | undefined>;
}

export async function processTopicAssignmentJobs(
  jobs: PgBoss.Job<TelegramTopicAssignmentJobData>[],
  deps: TopicAssignmentJobDeps,
): Promise<void> {
  const { db, pool, boss, topicMatchingEvaluator } = deps;
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

              // AD-5: Verify snapshot cryptographic integrity
              verifySnapshotIntegrity(latestSnapshot);

              // AD-6: CAS optimistic concurrency assertion
              try {
                assertSnapshotRevision(latestSnapshot.contextRevision, initialRevision);
                if (latestSnapshot.snapshotFingerprint !== initialFingerprint) {
                  throw new StaleSnapshotRevisionError(
                    latestSnapshot.contextRevision,
                    initialRevision,
                  );
                }
              } catch (casErr) {
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
                const retentionExpiresAt = calculateRetentionDeadline(latestEvidenceTime);
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
                const singletonKey = JobSingletonKeys.forTopicProjection(targetTopicId, nextGeneration);
                await enqueueJob(TELEGRAM_TOPIC_PROJECTION_QUEUE, projectionJobData, {
                  singletonKey,
                  retryLimit: 3,
                  retryDelay: 5,
                  retryBackoff: true,
                });
              } else if (matchingDecision.decision === 'NEW_TOPIC') {
                const newTopicId = `top_${crypto.randomUUID()}`;
                const retentionExpiresAt = calculateRetentionDeadline(candidateDate);

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
                const singletonKey = JobSingletonKeys.forTopicProjection(newTopicId, 1);
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
          } finally {
            if (job.data?.issueId) {
              await clearPendingRetryFlag(db, job.data.issueId);
            }
          }
        }
      }




export async function registerTopicAssignmentJobHandler(
  boss: PgBoss,
  deps: TopicAssignmentJobDeps,
): Promise<void> {
  await boss.work<TelegramTopicAssignmentJobData>(
    TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
    { newJobCheckInterval: 50 } as any,
    (jobs) => processTopicAssignmentJobs(jobs, deps),
  );
}
