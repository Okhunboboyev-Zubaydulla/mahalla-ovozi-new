import type PgBoss from 'pg-boss';
import { eq, and } from 'drizzle-orm';
import crypto from 'node:crypto';
import type { DbClient } from '../../../adapters/db/client.js';
import {
  DISTRICT_LIVE_DELETION_QUEUE,
  DISTRICT_LIVE_DELETION_CRON_QUEUE,
  DistrictLiveDeletionJobData,
} from '../../../adapters/jobs/boss-client.js';
import {
  executeDistrictLiveDeletion,
  processOverdueCancelledDistricts,
} from '../district-deletion-service.js';
import { operationalIssues } from '../../../adapters/db/schema/index.js';

export interface DistrictDeletionJobDeps {
  db: DbClient;
  boss?: PgBoss;
}

export async function processDistrictDeletionJobs(
  jobs: PgBoss.Job<DistrictLiveDeletionJobData>[],
  deps: DistrictDeletionJobDeps,
): Promise<void> {
  const { db } = deps;
  for (const job of jobs) {
    const { districtId } = job.data;
    try {
      // Execute live deletion (safe no-op/null return if recovered or reactivated)
      await executeDistrictLiveDeletion(db, districtId, {
        actor: { id: null, role: 'SYSTEM' },
      });
    } catch (err) {
      const errorMsg = (err as Error).message;
      console.error(
        JSON.stringify({
          event: 'DISTRICT_LIVE_DELETION_JOB_FAILED',
          districtId,
          error: errorMsg,
        }),
      );

      // Record or update Critical operational issue for System Health diagnostics (AC 11)
      try {
        const now = new Date();
        const logicalKey = `del_fail:${districtId}`;

        const [existingIssue] = await db
          .select()
          .from(operationalIssues)
          .where(
            and(
              eq(operationalIssues.logicalKey, logicalKey),
              eq(operationalIssues.status, 'ACTIVE'),
            ),
          )
          .limit(1);

        if (existingIssue) {
          await db
            .update(operationalIssues)
            .set({
              latestCheckAt: now,
              sanitizedDescription: `Туманни ўчириш жараёнида хатолик юз берди: ${errorMsg}`,
              updatedAt: now,
            })
            .where(eq(operationalIssues.id, existingIssue.id));
        } else {
          try {
            await db.insert(operationalIssues).values({
              id: `iss_${crypto.randomUUID()}`,
              logicalKey,
              scope: 'GLOBAL',
              districtId: null, // Scoped to system since district row might be mid-state or deleted
              component: 'SUBSCRIPTION_LIFECYCLE',
              issueCategory: 'LIFECYCLE_DELETION',
              severity: 'Critical',
              status: 'ACTIVE',
              healthStatus: 'DEGRADED',
              sanitizedTitle: 'Туманни жонли тизимдан ўчиришда хатолик',
              sanitizedDescription: `Туманни ўчириш жараёнида хатолик юз берди (ID: ${districtId}): ${errorMsg}`,
              recommendedAction: 'Маълумотлар базаси ва тизим ҳолатини текшириб, ўчиришни қайта ишга туширинг.',
              metadata: {
                districtId,
                errorCode: 'LIVE_DELETION_FAILED',
              },
              startedAt: now,
              latestCheckAt: now,
              createdAt: now,
              updatedAt: now,
            });
          } catch {
            // Concurrent worker might have created the active issue simultaneously; update existing
            await db
              .update(operationalIssues)
              .set({
                latestCheckAt: now,
                sanitizedDescription: `Туманни ўчириш жараёнида хатолик юз берди: ${errorMsg}`,
                updatedAt: now,
              })
              .where(
                and(
                  eq(operationalIssues.logicalKey, logicalKey),
                  eq(operationalIssues.status, 'ACTIVE'),
                ),
              );
          }
        }
      } catch (issueErr) {
        console.error(
          JSON.stringify({
            event: 'DISTRICT_LIVE_DELETION_ISSUE_CREATION_FAILED',
            districtId,
            error: (issueErr as Error).message,
          }),
        );
      }

      throw err;
    }
  }
}

export async function registerDistrictDeletionJobHandler(
  boss: PgBoss,
  deps: DistrictDeletionJobDeps,
): Promise<void> {
  // 1. Process delayed individual deletion jobs
  await boss.work<DistrictLiveDeletionJobData>(
    DISTRICT_LIVE_DELETION_QUEUE,
    async (jobs) => {
      await processDistrictDeletionJobs(jobs, deps);
    },
  );

  // 2. Periodic recurring cron sweep every 1 minute as resilient fallback (AC 9)
  await boss.schedule(
    DISTRICT_LIVE_DELETION_CRON_QUEUE,
    '* * * * *',
    {},
    { tz: 'UTC' },
  );

  await boss.work(
    DISTRICT_LIVE_DELETION_CRON_QUEUE,
    async () => {
      await processOverdueCancelledDistricts(deps.db);
    },
  );
}
