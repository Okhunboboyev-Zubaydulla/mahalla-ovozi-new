import type pg from 'pg';
import type PgBoss from 'pg-boss';
import type { DbClient } from '../../adapters/db/client.js';
import { districts } from '../../adapters/db/schema/districts.js';
import { TopicRetentionService } from './topic-retention-service.js';
import type { DisasterRestoreReconciliationResult } from './topic-retention-types.js';

/**
 * Disaster-Recovery Retention Reconciliation Service.
 * Re-evaluates all restored PostgreSQL topics against authoritative real-world time (NOW)
 * and purges all expired topics, their Accepted Evidence, and derived projections
 * before public ingress and worker intake are enabled.
 * Governed by FR-12, AD-11.
 */
export async function reconcileRestoredRetention(
  pool: pg.Pool,
  boss: PgBoss,
  db: DbClient,
  districtId?: string,
  now: Date = new Date(),
): Promise<DisasterRestoreReconciliationResult> {
  const startTime = performance.now();
  const retentionService = new TopicRetentionService(pool, boss, db);

  let targetDistrictIds: string[] = [];
  const cleanDistrictId = typeof districtId === 'string' ? districtId.trim() : '';

  if (cleanDistrictId) {
    targetDistrictIds = [cleanDistrictId];
  } else {
    const allDistricts = await db.select({ id: districts.id }).from(districts);
    targetDistrictIds = allDistricts.map((d) => d.id);
  }

  let totalTopicsPurged = 0;
  let totalEvidencePurged = 0;
  let totalProjectionsPurged = 0;
  let districtsSucceeded = 0;
  let districtsFailed = 0;
  const errors: Array<{ districtId: string; error: string }> = [];

  const BATCH_SIZE = 500;
  const MAX_ITERATIONS = 2000;

  for (const currentDistrictId of targetDistrictIds) {
    try {
      let hasMore = true;
      let iterations = 0;

      while (hasMore && iterations < MAX_ITERATIONS) {
        iterations++;
        const batchResult = await retentionService.purgeDistrictExpiredTopicsBatch(
          currentDistrictId,
          { limit: BATCH_SIZE },
          now,
        );

        totalTopicsPurged += batchResult.topicsPurged;
        totalEvidencePurged += batchResult.evidencePurged;
        totalProjectionsPurged += batchResult.projectionsPurged;

        if (batchResult.topicsEvaluated < BATCH_SIZE || (batchResult.topicsPurged === 0 && batchResult.topicsEvaluated > 0)) {
          hasMore = false;
        } else if (batchResult.topicsEvaluated === 0) {
          hasMore = false;
        } else {
          await new Promise<void>((resolve) => setImmediate(resolve));
        }
      }

      districtsSucceeded++;
    } catch (districtErr) {
      districtsFailed++;
      const errorMsg = districtErr instanceof Error ? districtErr.message : String(districtErr);
      errors.push({ districtId: currentDistrictId, error: errorMsg });
      console.error(
        JSON.stringify({
          event: 'TELEGRAM_DISASTER_RESTORE_DISTRICT_ERROR',
          districtId: currentDistrictId,
          error: errorMsg,
        }),
      );
    }
  }

  const durationMs = Math.round(performance.now() - startTime);

  console.log(
    JSON.stringify({
      event: 'TELEGRAM_DISASTER_RESTORE_RECONCILIATION_COMPLETED',
      districtsReconciled: districtsSucceeded,
      districtsEvaluated: targetDistrictIds.length,
      districtsSucceeded,
      districtsFailed,
      totalTopicsPurged,
      totalEvidencePurged,
      totalProjectionsPurged,
      errorCount: errors.length,
      durationMs,
    }),
  );

  return {
    districtsReconciled: districtsSucceeded,
    districtsEvaluated: targetDistrictIds.length,
    districtsSucceeded,
    districtsFailed,
    totalTopicsPurged,
    totalEvidencePurged,
    totalProjectionsPurged,
    errors,
    durationMs,
  };
}
