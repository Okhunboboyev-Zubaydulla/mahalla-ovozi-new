import type pg from 'pg';
import type PgBoss from 'pg-boss';
import { eq, and, not, inArray } from 'drizzle-orm';
import type { DbClient } from '../../../adapters/db/client.js';
import { districts } from '../../../adapters/db/schema/index.js';
import {
  TELEGRAM_TOPIC_RETENTION_QUEUE,
  type TelegramTopicRetentionJobData,
} from '../../../adapters/jobs/boss-client.js';
import { TopicRetentionService } from '../topic-retention-service.js';

import { clearPendingRetryFlag } from '../../issues/retry-service.js';

export interface RetentionJobDeps {
  db: DbClient;
  pool: pg.Pool;
  boss: PgBoss;
}

export async function processRetentionJobs(
  jobs: PgBoss.Job<TelegramTopicRetentionJobData>[],
  deps: RetentionJobDeps,
): Promise<void> {
  const { db, pool, boss } = deps;
  const retentionService = new TopicRetentionService(pool, boss, db);

  for (const job of jobs) {
    const startTime = performance.now();
    const rawDistrictId = job.data?.districtId;
    const districtId =
      typeof rawDistrictId === 'string' && rawDistrictId.trim() !== ''
        ? rawDistrictId.trim()
        : undefined;

    try {
      if (districtId) {
        // 1. Gate 1: Check district lifecycle (AC 12)
        const [district] = await db
          .select()
          .from(districts)
          .where(eq(districts.id, districtId))
          .limit(1);

        if (
          !district ||
          (district.status !== 'ACTIVE' && district.status !== 'GRACE' && district.status !== 'SUSPENDED') ||
          district.accessEligible === false
        ) {
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
            failedPurges: result.failedPurges ?? 0,
            durationMs,
          }),
        );
      } else {
        // Scheduled scan across all active, grace, and suspended districts (AC 13, FR30)
        const eligibleDistricts = await db
          .select({ id: districts.id })
          .from(districts)
          .where(
            and(
              inArray(districts.status, ['ACTIVE', 'GRACE', 'SUSPENDED']),
              not(eq(districts.accessEligible, false)),
            ),
          );

        let totalEvaluated = 0;
        let totalPurged = 0;
        let totalEvidence = 0;
        let totalProjections = 0;
        let districtsFailed = 0;

        for (const d of eligibleDistricts) {
          try {
            const result = await retentionService.purgeDistrictExpiredTopicsBatch(d.id);
            totalEvaluated += result.topicsEvaluated;
            totalPurged += result.topicsPurged;
            totalEvidence += result.evidencePurged;
            totalProjections += result.projectionsPurged;
          } catch (districtErr) {
            districtsFailed++;
            console.error(
              JSON.stringify({
                event: 'TELEGRAM_TOPIC_RETENTION_DISTRICT_ERROR',
                districtId: d.id,
                error:
                  districtErr instanceof Error
                    ? districtErr.message
                    : String(districtErr),
              }),
            );
          }
        }

        const durationMs = Math.round(performance.now() - startTime);
        console.log(
          JSON.stringify({
            event: 'TELEGRAM_TOPIC_RETENTION_SCAN_COMPLETED',
            districtsScanned: eligibleDistricts.length,
            districtsFailed,
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
    } finally {
      if (job.data?.issueId) {
        await clearPendingRetryFlag(db, job.data.issueId);
      }
    }
  }
}




export async function registerRetentionJobHandler(
  boss: PgBoss,
  deps: RetentionJobDeps,
): Promise<void> {
  await boss.work<TelegramTopicRetentionJobData>(
    TELEGRAM_TOPIC_RETENTION_QUEUE,
    { newJobCheckInterval: 50 } as any,
    (jobs) => processRetentionJobs(jobs, deps),
  );
}
