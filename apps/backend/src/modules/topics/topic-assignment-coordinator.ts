import crypto from 'node:crypto';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { eq, and, inArray } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from '../../adapters/db/schema/index.js';
import {
  districts,
  telegramIntakeRecords,
  aiOperations,
  topics,
  acceptedEvidence,
} from '../../adapters/db/schema/index.js';
import type { DbClient } from '../../adapters/db/client.js';
import {
  TELEGRAM_TOPIC_PROJECTION_QUEUE,
  withTransactionalIntake,
  JobSingletonKeys,
  extractTelegramUserMetadata,
  type TelegramTopicProjectionJobData,
  type BurstMessageItem,
  type SenderProfileMetadata,
} from '../../adapters/jobs/boss-client.js';
import { insertAiProviderAttempts } from '../ai/ai-operation-repository.js';
import {
  TopicMatchingEvaluator,
  findDirectReplyTopic,
  type TopicMatchingResult,
} from './topic-matching-evaluator.js';
import {
  getMahallaDailySnapshot,
  groupSnapshotByTopic,
  verifySnapshotIntegrity,
  assertSnapshotRevision,
  StaleSnapshotRevisionError,
  type AcceptedEvidenceItem,
} from '../ai/context-snapshot.js';
import { resolveTargetTopic } from './topic-matching-resolver.js';
import { calculateRetentionDeadline } from '../retention/index.js';
import type { QualifyingLane, TelegramReplyMetadata } from '@mahalla-ovozi/api-contracts';

export interface TopicAssignmentCommand {
  intakeId: string;
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  telegramChatId: string;
  telegramMessageId: string;
  telegramUserId: string | null | undefined;
  originalTimestamp: string;
  contentType: 'TEXT' | 'MEDIA_CAPTION';
  verbatimText: string;
  replyMetadata: TelegramReplyMetadata | null | undefined;
  userMetadata: SenderProfileMetadata | null | undefined;
  aiOperationId: string | null | undefined;
  relevantLanes: QualifyingLane[] | null | undefined;
  reasoning: string | null | undefined;
  burstMessages: BurstMessageItem[] | null | undefined;
  issueId: string | null | undefined;
}

export type TopicAssignmentOutcome =
  | {
      status: 'ASSIGNED_EXISTING';
      topicId: string;
      generation: number;
      evidenceCount: number;
      isDirectReply: boolean;
      method: 'DIRECT_REPLY' | 'INDEX' | 'EXACT' | 'FUZZY' | 'LANE_CONSOLIDATION';
    }
  | {
      status: 'CREATED_NEW';
      topicId: string;
      primaryLane: QualifyingLane;
      evidenceCount: number;
    }
  | {
      status: 'UNASSIGNABLE_VAGUE';
      purgedIntakeIds: string[];
    }
  | {
      status: 'SKIPPED_INACTIVE_DISTRICT';
      districtStatus: string;
    }
  | {
      status: 'SKIPPED_DUPLICATE';
      existingEvidenceId: string;
      topicId: string;
    };

export interface TopicAssignmentCoordinatorDeps {
  db: DbClient;
  pool: pg.Pool;
  topicMatchingEvaluator: TopicMatchingEvaluator;
  boss?: PgBoss;
  injectedEvidenceResolver?: (
    districtId: string,
    mahallaName: string,
    calendarDay: string,
  ) => Promise<AcceptedEvidenceItem[] | undefined>;
}

export interface TopicAssignmentCoordinator {
  assignEvidenceToTopic(command: TopicAssignmentCommand): Promise<TopicAssignmentOutcome>;
}

async function runAtomicIntakeTransaction<T>(
  pool: pg.Pool,
  boss: PgBoss | undefined,
  callback: (scope: {
    tx: any;
    enqueueJob: (
      queueName: string,
      data: any,
      options?: PgBoss.SendOptions,
    ) => Promise<string | null>;
  }) => Promise<T>,
): Promise<T> {
  if (boss) {
    return withTransactionalIntake(pool, boss, callback as any);
  }

  const client = await pool.connect();
  let rollbackError: unknown = null;
  try {
    await client.query('BEGIN');
    const tx = drizzle(client, { schema });
    const enqueueJob = async (
      _queueName: string,
      _data: any,
      _options?: PgBoss.SendOptions,
    ): Promise<string | null> => {
      return null;
    };
    const result = await callback({ tx, enqueueJob });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr) {
      rollbackError = rbErr;
    }
    throw error;
  } finally {
    client.release(rollbackError ? true : undefined);
  }
}

export function createTopicAssignmentCoordinator(
  deps: TopicAssignmentCoordinatorDeps,
): TopicAssignmentCoordinator {
  const { db, pool, boss, topicMatchingEvaluator, injectedEvidenceResolver } = deps;

  return {
    async assignEvidenceToTopic(
      command: TopicAssignmentCommand,
    ): Promise<TopicAssignmentOutcome> {
      const {
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
        burstMessages,
      } = command;

      const startTime = performance.now();

      // 1. Deduplication / Idempotency Check (AC 16 / Matrix #26)
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
        return {
          status: 'SKIPPED_DUPLICATE',
          existingEvidenceId: existingEvidence.id,
          topicId: existingEvidence.topicId,
        };
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
        (districtGate1.status !== 'ACTIVE' && districtGate1.status !== 'GRACE') ||
        districtGate1.accessEligible === false
      ) {
        const durationMs = Math.round(performance.now() - startTime);
        const districtStatus = districtGate1?.status ?? 'NOT_FOUND';
        console.log(
          JSON.stringify({
            event: 'TELEGRAM_TOPIC_ASSIGNMENT_DROPPED_INACTIVE_DISTRICT',
            districtId,
            mahallaName,
            telegramChatId,
            telegramMessageId,
            districtStatus,
            accessEligible: districtGate1?.accessEligible ?? false,
            durationMs,
          }),
        );
        return {
          status: 'SKIPPED_INACTIVE_DISTRICT',
          districtStatus,
        };
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
      let orderedSnapshotTopicIds: string[] = [];

      if (directReplyTopicId) {
        isDirectReply = true;
        orderedSnapshotTopicIds = [directReplyTopicId];
        matchingDecision = {
          decision: 'MATCH_EXISTING_TOPIC',
          matched_topic_id: directReplyTopicId,
          primary_lane: null,
          reasoning: 'Direct Telegram reply to existing same-day accepted evidence',
        };
      } else {
        let injectedEvidence: AcceptedEvidenceItem[] | undefined;
        if (injectedEvidenceResolver) {
          injectedEvidence = await injectedEvidenceResolver(
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
        orderedSnapshotTopicIds = Array.from(groupSnapshotByTopic(snapshot).keys());

        // Execute AI Gateway outside DB transaction (AD-5, AD-8 / AC 14)
        matchingAiResult = await topicMatchingEvaluator.evaluateTopicAssignment({
          candidateText: verbatimText,
          telegramMessageId,
          originalTimestamp,
          contentType,
          replyMetadata: replyMetadata ?? null,
          relevantLanes: (relevantLanes ?? []) as QualifyingLane[],
          relevanceReasoning: reasoning ?? '',
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
        (districtGate2.status !== 'ACTIVE' && districtGate2.status !== 'GRACE') ||
        districtGate2.accessEligible === false
      ) {
        const durationMs = Math.round(performance.now() - startTime);
        const districtStatus = districtGate2?.status ?? 'NOT_FOUND';
        console.log(
          JSON.stringify({
            event: 'TELEGRAM_TOPIC_ASSIGNMENT_COMMIT_ABORTED_INACTIVE_DISTRICT',
            districtId,
            mahallaName,
            telegramChatId,
            telegramMessageId,
            districtStatus,
            accessEligible: districtGate2?.accessEligible ?? false,
            durationMs,
          }),
        );
        return {
          status: 'SKIPPED_INACTIVE_DISTRICT',
          districtStatus,
        };
      }

      // 6. CAS Optimistic Concurrency Check (AC 12 / AD-6 / Matrix #21)
      if (!isDirectReply) {
        const latestSnapshot = await getMahallaDailySnapshot(
          db,
          districtId,
          mahallaName,
          calendarDay,
          injectedEvidenceResolver
            ? await injectedEvidenceResolver(districtId, mahallaName, calendarDay)
            : undefined,
        );

        verifySnapshotIntegrity(latestSnapshot);

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
          throw new StaleSnapshotRevisionError(
            latestSnapshot.contextRevision,
            initialRevision,
          );
        }
      }

      // 7. Atomic PostgreSQL Commit Block (AC 6, 7, 8, 10, 16, 17)
      const [intakeRec] = await db
        .select({ rawPayload: telegramIntakeRecords.rawPayload })
        .from(telegramIntakeRecords)
        .where(eq(telegramIntakeRecords.id, intakeId))
        .limit(1);

      const fallbackUserMetadata = extractTelegramUserMetadata(
        intakeRec?.rawPayload,
        telegramUserId,
      );
      const defaultUserMetadata = command.userMetadata || fallbackUserMetadata;
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

      const outcome = await runAtomicIntakeTransaction(
        pool,
        boss,
        async ({ tx, enqueueJob }) => {
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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- tx is structurally DbOrTx
            await insertAiProviderAttempts(tx as any, topicMatchingOpId, matchingAiResult);
          }

          const evidenceItems =
            burstMessages && burstMessages.length > 0
              ? burstMessages.map((m) => ({
                  intakeRecordId: m.intakeId,
                  telegramMessageId: m.telegramMessageId,
                  originalTimestamp: new Date(m.originalTimestamp),
                  verbatimText: m.verbatimText,
                  contentType: m.contentType,
                  replyMetadata: m.replyMetadata || null,
                  userMetadata: m.userMetadata || defaultUserMetadata,
                }))
              : [
                  {
                    intakeRecordId: intakeId,
                    telegramMessageId,
                    originalTimestamp: candidateDate,
                    verbatimText,
                    contentType,
                    replyMetadata: replyMetadata || null,
                    userMetadata: defaultUserMetadata,
                  },
                ];

          const latestCandidateTimestamp = evidenceItems.reduce(
            (max, item) =>
              item.originalTimestamp.getTime() > max.getTime()
                ? item.originalTimestamp
                : max,
            candidateDate,
          );

          let targetTopicId: string | null = null;
          let targetTopicRecord: {
            id: string;
            latestRelevantEvidenceTimestamp: Date;
            requiredDerivedGeneration: number;
          } | null = null;
          let matchedResolutionMethod:
            | 'DIRECT_REPLY'
            | 'INDEX'
            | 'EXACT'
            | 'FUZZY'
            | 'LANE_CONSOLIDATION' = isDirectReply ? 'DIRECT_REPLY' : 'EXACT';

          if (matchingDecision.decision === 'MATCH_EXISTING_TOPIC') {
            const candidateTopics = await tx
              .select({
                id: topics.id,
                primaryLane: topics.primaryLane,
                status: topics.status,
                latestRelevantEvidenceTimestamp: topics.latestRelevantEvidenceTimestamp,
                requiredDerivedGeneration: topics.requiredDerivedGeneration,
              })
              .from(topics)
              .where(
                and(
                  eq(topics.districtId, districtId),
                  eq(topics.mahallaName, mahallaName),
                  eq(topics.calendarDay, calendarDay),
                  eq(topics.status, 'ACTIVE'),
                ),
              );

            const fallbackLane =
              relevantLanes && relevantLanes.length > 0 && relevantLanes[0]
                ? relevantLanes[0]
                : 'HOKIM_RELATED';

            const resolution = resolveTargetTopic({
              matchedTopicId: matchingDecision.matched_topic_id,
              matchedTopicIndex: matchingDecision.matched_topic_index,
              orderedSnapshotTopicIds,
              candidateTopics,
              effectivePrimaryLane: fallbackLane,
            });

            if (resolution.status === 'MATCHED') {
              targetTopicId = resolution.matchedTopic.id;
              targetTopicRecord = resolution.matchedTopic;
              matchedResolutionMethod = isDirectReply ? 'DIRECT_REPLY' : resolution.method;

              if (resolution.method !== 'EXACT' && !isDirectReply) {
                console.warn(
                  JSON.stringify({
                    event: 'TELEGRAM_TOPIC_ASSIGNMENT_MATCH_RECOVERED',
                    recoveryMethod: resolution.method,
                    districtId,
                    mahallaName,
                    calendarDay,
                    telegramMessageId,
                    aiReturnedTopicId: matchingDecision.matched_topic_id,
                    aiReturnedTopicIndex: matchingDecision.matched_topic_index,
                    recoveredTopicId: targetTopicId,
                  }),
                );
              }
            } else {
              console.warn(
                JSON.stringify({
                  event: 'TELEGRAM_TOPIC_ASSIGNMENT_UNRESOLVED_FALLBACK_NEW_TOPIC',
                  districtId,
                  mahallaName,
                  calendarDay,
                  telegramMessageId,
                  aiReturnedTopicId: matchingDecision.matched_topic_id,
                  aiReturnedTopicIndex: matchingDecision.matched_topic_index,
                  fallbackLane: resolution.fallbackLane,
                }),
              );
            }
          }

          if (targetTopicId && targetTopicRecord) {
            const latestEvidenceTime = new Date(
              Math.max(
                targetTopicRecord.latestRelevantEvidenceTimestamp.getTime(),
                latestCandidateTimestamp.getTime(),
              ),
            );
            const retentionExpiresAt = calculateRetentionDeadline(latestEvidenceTime);
            const nextGeneration = targetTopicRecord.requiredDerivedGeneration + 1;

            await tx
              .update(topics)
              .set({
                latestRelevantEvidenceTimestamp: latestEvidenceTime,
                retentionExpiresAt,
                requiredDerivedGeneration: nextGeneration,
                updatedAt: new Date(),
              })
              .where(eq(topics.id, targetTopicId));

            for (const item of evidenceItems) {
              const evidenceId = `evi_${crypto.randomUUID()}`;
              await tx.insert(acceptedEvidence).values({
                id: evidenceId,
                topicId: targetTopicId,
                districtId,
                mahallaName,
                calendarDay,
                intakeRecordId: item.intakeRecordId,
                telegramChatId,
                telegramMessageId: item.telegramMessageId,
                telegramUserId: telegramUserId ?? null,
                originalTimestamp: item.originalTimestamp,
                verbatimText: item.verbatimText,
                contentType: item.contentType,
                userMetadata: item.userMetadata,
                replyMetadata: item.replyMetadata,
                aiOperationId: linkedAiOpId,
              });
            }

            const projectionJobData: TelegramTopicProjectionJobData = {
              topicId: targetTopicId,
              districtId,
              mahallaName,
              calendarDay,
              generation: nextGeneration,
            };
            const singletonKey = JobSingletonKeys.forTopicProjection(
              targetTopicId,
              nextGeneration,
            );
            await enqueueJob(TELEGRAM_TOPIC_PROJECTION_QUEUE, projectionJobData, {
              singletonKey,
            });

            return {
              status: 'ASSIGNED_EXISTING' as const,
              topicId: targetTopicId,
              generation: nextGeneration,
              evidenceCount: evidenceItems.length,
              isDirectReply,
              method: matchedResolutionMethod,
            };
          } else if (
            matchingDecision.decision === 'NEW_TOPIC' ||
            matchingDecision.decision === 'MATCH_EXISTING_TOPIC'
          ) {
            let effectivePrimaryLane =
              matchingDecision.decision === 'NEW_TOPIC' && matchingDecision.primary_lane
                ? matchingDecision.primary_lane
                : relevantLanes && relevantLanes.length > 0 && relevantLanes[0]
                  ? relevantLanes[0]
                  : 'HOKIM_RELATED';

            if (
              relevantLanes &&
              relevantLanes.length > 0 &&
              relevantLanes[0] &&
              !relevantLanes.includes(effectivePrimaryLane)
            ) {
              console.warn(
                JSON.stringify({
                  event: 'TELEGRAM_TOPIC_ASSIGNMENT_PRIMARY_LANE_CLAMPED',
                  districtId,
                  mahallaName,
                  telegramMessageId,
                  aiReturnedLane: effectivePrimaryLane,
                  clampedTo: relevantLanes[0],
                  relevantLanes,
                }),
              );
              effectivePrimaryLane = relevantLanes[0];
            }

            const newTopicId = `top_${crypto.randomUUID()}`;
            const retentionExpiresAt = calculateRetentionDeadline(latestCandidateTimestamp);

            await tx.insert(topics).values({
              id: newTopicId,
              districtId,
              mahallaName,
              calendarDay,
              primaryLane: effectivePrimaryLane,
              status: 'ACTIVE',
              latestRelevantEvidenceTimestamp: latestCandidateTimestamp,
              retentionExpiresAt,
              requiredDerivedGeneration: 1,
              appliedDerivedGeneration: 0,
            });

            for (const item of evidenceItems) {
              const evidenceId = `evi_${crypto.randomUUID()}`;
              await tx.insert(acceptedEvidence).values({
                id: evidenceId,
                topicId: newTopicId,
                districtId,
                mahallaName,
                calendarDay,
                intakeRecordId: item.intakeRecordId,
                telegramChatId,
                telegramMessageId: item.telegramMessageId,
                telegramUserId: telegramUserId ?? null,
                originalTimestamp: item.originalTimestamp,
                verbatimText: item.verbatimText,
                contentType: item.contentType,
                userMetadata: item.userMetadata,
                replyMetadata: item.replyMetadata,
                aiOperationId: linkedAiOpId,
              });
            }

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
            });

            return {
              status: 'CREATED_NEW' as const,
              topicId: newTopicId,
              primaryLane: effectivePrimaryLane,
              evidenceCount: evidenceItems.length,
            };
          } else {
            const allIntakeIds = evidenceItems.map((i) => i.intakeRecordId);
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
              .where(inArray(telegramIntakeRecords.id, allIntakeIds));

            return {
              status: 'UNASSIGNABLE_VAGUE' as const,
              purgedIntakeIds: allIntakeIds,
            };
          }
        },
      );

      const durationMs = Math.round(performance.now() - startTime);

      console.log(
        JSON.stringify({
          event:
            outcome.status === 'UNASSIGNABLE_VAGUE'
              ? 'TELEGRAM_TOPIC_ASSIGNMENT_VAGUE_DISCARDED'
              : 'TELEGRAM_TOPIC_ASSIGNMENT_COMMITTED',
          districtId,
          mahallaName,
          calendarDay,
          telegramChatId,
          telegramMessageId,
          outcomeStatus: outcome.status,
          isDirectReply,
          durationMs,
        }),
      );

      return outcome;
    },
  };
}
