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

  if (districtId) {
    targetDistrictIds = [districtId];
  } else {
    const allDistricts = await db.select({ id: districts.id }).from(districts);
    targetDistrictIds = allDistricts.map((d) => d.id);
  }

  let totalTopicsPurged = 0;
  let totalEvidencePurged = 0;
  let totalProjectionsPurged = 0;

  for (const currentDistrictId of targetDistrictIds) {
    const batchResult = await retentionService.purgeDistrictExpiredTopicsBatch(
      currentDistrictId,
      { limit: 10000 },
      now,
    );
    totalTopicsPurged += batchResult.topicsPurged;
    totalEvidencePurged += batchResult.evidencePurged;
    totalProjectionsPurged += batchResult.projectionsPurged;
  }

  const durationMs = Math.round(performance.now() - startTime);

  console.log(
    JSON.stringify({
      event: 'TELEGRAM_DISASTER_RESTORE_RECONCILIATION_COMPLETED',
      districtsReconciled: targetDistrictIds.length,
      totalTopicsPurged,
      totalEvidencePurged,
      totalProjectionsPurged,
      durationMs,
    }),
  );

  return {
    districtsReconciled: targetDistrictIds.length,
    totalTopicsPurged,
    totalEvidencePurged,
    totalProjectionsPurged,
    durationMs,
  };
}
