import crypto from 'node:crypto';
import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { eq } from 'drizzle-orm';
import type { DbClient } from '../../../adapters/db/client.js';
import {
  districts,
  topics,
  topicProjections,
  aiOperations,
  aiProviderAttempts,
} from '../../../adapters/db/schema/index.js';
import {
  TELEGRAM_TOPIC_PROJECTION_QUEUE,
  withTransactionalIntake,
  type TelegramTopicProjectionJobData,
} from '../../../adapters/jobs/boss-client.js';
import type { QualifyingLane } from '@mahalla-ovozi/api-contracts';
import { TopicProjectionEvaluator } from '../topic-projection-evaluator.js';
import {
  getMahallaDailySnapshot,
  type AcceptedEvidenceItem,
} from '../../ai/context-snapshot.js';
import { clearPendingRetryFlag } from '../../issues/retry-service.js';

export interface TopicProjectionJobDeps {
  db: DbClient;
  pool: pg.Pool;
  boss: PgBoss;
  topicProjectionEvaluator: TopicProjectionEvaluator;
  injectedEvidenceResolver?: (
    districtId: string,
    mahallaName: string,
    calendarDay: string,
  ) => Promise<AcceptedEvidenceItem[] | undefined>;
}

export async function processTopicProjectionJobs(
  jobs: PgBoss.Job<TelegramTopicProjectionJobData>[],
  deps: TopicProjectionJobDeps,
): Promise<void> {
  const { db, pool, boss, topicProjectionEvaluator } = deps;
  const options = deps;
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

            let projectionCommitted = false;

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

              projectionCommitted = true;
            });

            if (projectionCommitted) {
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
            }
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
            throw err;
          } finally {
            if (job.data?.issueId) {
              await clearPendingRetryFlag(db, job.data.issueId);
            }
          }
        }
      }




export async function registerTopicProjectionJobHandler(
  boss: PgBoss,
  deps: TopicProjectionJobDeps,
): Promise<void> {
  await boss.work<TelegramTopicProjectionJobData>(
    TELEGRAM_TOPIC_PROJECTION_QUEUE,
    { newJobCheckInterval: 50 } as any,
    (jobs) => processTopicProjectionJobs(jobs, deps),
  );
}
