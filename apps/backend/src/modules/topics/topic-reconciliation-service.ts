import type PgBoss from 'pg-boss';
import { sql } from 'drizzle-orm';
import type { DbClient } from '../../adapters/db/client.js';
import {
  sendQueueJob,
  JobSingletonKeys,
  TELEGRAM_TOPIC_PROJECTION_QUEUE,
  type TelegramTopicProjectionJobData,
} from '../../adapters/jobs/boss-client.js';

export interface TopicReconciliationResult {
  sweptCount: number;
  reEnqueuedCount: number;
  errorCount: number;
  durationMs: number;
}

interface StalledTopicRow extends Record<string, unknown> {
  id: string;
  districtId: string;
  mahallaName: string;
  calendarDay: string;
  requiredDerivedGeneration: number;
  appliedDerivedGeneration: number;
}

/**
 * Self-healing topic projection reconciler.
 * Periodically detects active topics whose projections were dropped, interrupted,
 * or failed (e.g. due to AI provider rate limits or crashes) and re-enqueues them
 * using deterministic singleton keys.
 */
export async function reconcileUnprojectedTopics(
  db: DbClient,
  boss: PgBoss,
  cooldownSeconds: number,
  targetDistrictId?: string,
): Promise<TopicReconciliationResult> {
  const startTime = performance.now();
  let reEnqueuedCount = 0;
  let errorCount = 0;

  try {
    const districtFilter = targetDistrictId
      ? sql`AND t.district_id = ${targetDistrictId}`
      : sql``;

    // 1. Identify active topics with missing or lagging projections past cooldown window
    const query = sql<StalledTopicRow>`
      SELECT 
        t.id, 
        t.district_id AS "districtId", 
        t.mahalla_name AS "mahallaName", 
        t.calendar_day AS "calendarDay", 
        t.required_derived_generation AS "requiredDerivedGeneration", 
        t.applied_derived_generation AS "appliedDerivedGeneration"
      FROM topics t
      LEFT JOIN topic_projections tp ON tp.topic_id = t.id
      WHERE t.status = 'ACTIVE'
        AND t.retention_expires_at > NOW()
        AND (tp.id IS NULL OR t.applied_derived_generation < t.required_derived_generation)
        AND t.updated_at < (NOW() - (${cooldownSeconds} * INTERVAL '1 second'))
        ${districtFilter}
      ORDER BY t.updated_at ASC
      LIMIT 100;
    `;

    const result = await db.execute<StalledTopicRow>(query);
    const candidateRows = result.rows;

    for (const topic of candidateRows) {
      try {
        const projectionJobData: TelegramTopicProjectionJobData = {
          topicId: topic.id,
          districtId: topic.districtId,
          mahallaName: topic.mahallaName,
          calendarDay: topic.calendarDay,
          generation: topic.requiredDerivedGeneration,
        };

        const singletonKey = JobSingletonKeys.forTopicProjection(
          topic.id,
          topic.requiredDerivedGeneration,
        );

        const jobId = await sendQueueJob(
          boss,
          TELEGRAM_TOPIC_PROJECTION_QUEUE,
          projectionJobData,
          {
            singletonKey,
          },
        );

        if (jobId) {
          reEnqueuedCount++;
        }
      } catch (topicErr) {
        errorCount++;
        console.error(
          JSON.stringify({
            event: 'TELEGRAM_TOPIC_RECONCILIATION_ITEM_ERROR',
            topicId: topic.id,
            error: topicErr instanceof Error ? topicErr.message : String(topicErr),
          }),
        );
      }
    }

    const durationMs = Math.round(performance.now() - startTime);

    if (candidateRows.length > 0 || errorCount > 0) {
      console.log(
        JSON.stringify({
          event: 'TELEGRAM_TOPIC_RECONCILIATION_SWEEP',
          sweptCount: candidateRows.length,
          reEnqueuedCount,
          errorCount,
          durationMs,
        }),
      );
    }

    return {
      sweptCount: candidateRows.length,
      reEnqueuedCount,
      errorCount,
      durationMs,
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    console.error(
      JSON.stringify({
        event: 'TELEGRAM_TOPIC_RECONCILIATION_FATAL_ERROR',
        error: err instanceof Error ? err.message : String(err),
        durationMs,
      }),
    );
    throw err;
  }
}
