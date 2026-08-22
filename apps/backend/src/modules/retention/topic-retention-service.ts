import type pg from 'pg';
import type PgBoss from 'pg-boss';
import type { DbClient } from '../../adapters/db/client.js';
import { withTransactionalIntake } from '../../adapters/jobs/boss-client.js';
import {
  findExpiredTopicIds,
  deleteTopicWithEvidenceAtomic,
} from './topic-retention-repository.js';
import type {
  RetentionPurgeResult,
  RetentionScanOptions,
  RetentionBatchResult,
} from './topic-retention-types.js';

export const EXACT_90_DAYS_MS = 90 * 24 * 60 * 60 * 1000; // 7,776,000,000 ms

/**
 * Calculates the exact 90-day retention deadline from the latest relevant evidence timestamp.
 * Arithmetic is exact to the millisecond, timezone-invariant, and preserves Asia/Tashkent calendar days.
 * Governed by FR-12, AD-3, AD-9.
 */
export function calculateRetentionDeadline(latestEvidenceTimestamp: Date): Date {
  return new Date(latestEvidenceTimestamp.getTime() + EXACT_90_DAYS_MS);
}

/**
 * Determines whether a given retention deadline has arrived (is <= now).
 */
export function isRetentionExpired(retentionExpiresAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= retentionExpiresAt.getTime();
}

/**
 * Validates that an explicit districtId is present and non-empty.
 * Throws INVALID_DISTRICT_SCOPE to guarantee multi-tenant boundary safety.
 * Governed by AD-9.
 */
export function validateDistrictScope(districtId: string): void {
  if (!districtId || typeof districtId !== 'string' || districtId.trim() === '') {
    throw new Error(
      'INVALID_DISTRICT_SCOPE: districtId is strictly required and cannot be empty or omitted',
    );
  }
}

/**
 * TopicRetentionService manages topic-level 90-day retention evaluation,
 * atomic multi-table purging, concurrency protection, and district-scoped batch scanning.
 * Governed by FR-12, AD-3, AD-4, AD-5, AD-6, AD-7, AD-9, AD-11.
 */
export class TopicRetentionService {
  constructor(
    private readonly pool: pg.Pool,
    private readonly boss: PgBoss,
    private readonly db: DbClient,
  ) {}

  /**
   * Purges a single expired Topic and its associated evidence and projections atomically.
   * Re-evaluates retention under an exclusive row lock to prevent race conditions with in-flight ingestion.
   */
  async purgeExpiredTopic(
    districtId: string,
    topicId: string,
    now: Date = new Date(),
  ): Promise<RetentionPurgeResult> {
    validateDistrictScope(districtId);

    return withTransactionalIntake(this.pool, this.boss, async ({ tx }) => {
      const result = await deleteTopicWithEvidenceAtomic(tx, districtId, topicId, now);

      return {
        topicId,
        districtId,
        evidenceCount: result.evidenceCount,
        projectionsCount: result.projectionsCount,
        purged: result.purged,
        reason: result.reason,
      };
    });
  }

  /**
   * Scans a District for expired Topics and purges them in bounded batches.
   * Each expired Topic is purged independently within its own atomic transaction to isolate failures.
   */
  async purgeDistrictExpiredTopicsBatch(
    districtId: string,
    options?: RetentionScanOptions,
    now: Date = new Date(),
  ): Promise<RetentionBatchResult> {
    validateDistrictScope(districtId);

    const startTime = performance.now();
    const limit = options?.limit ?? 100;

    const expiredTopicIds = await findExpiredTopicIds(this.db, districtId, limit, now);

    let topicsPurged = 0;
    let evidencePurged = 0;
    let projectionsPurged = 0;

    for (const topicId of expiredTopicIds) {
      try {
        const purgeResult = await this.purgeExpiredTopic(districtId, topicId, now);
        if (purgeResult.purged) {
          topicsPurged++;
          evidencePurged += purgeResult.evidenceCount;
          projectionsPurged += purgeResult.projectionsCount;
        } else if (purgeResult.reason === 'EXTENDED_BY_NEWER_EVIDENCE') {
          console.log(
            JSON.stringify({
              event: 'TELEGRAM_TOPIC_RETENTION_ABORTED_ACTIVE',
              districtId,
              topicId,
              reason: purgeResult.reason,
            }),
          );
        }
      } catch (topicError) {
        console.error(
          JSON.stringify({
            event: 'TELEGRAM_TOPIC_RETENTION_TOPIC_PURGE_ERROR',
            districtId,
            topicId,
            error: topicError instanceof Error ? topicError.message : String(topicError),
          }),
        );
      }
    }

    const durationMs = Math.round(performance.now() - startTime);

    if (topicsPurged > 0) {
      console.log(
        JSON.stringify({
          event: 'TELEGRAM_TOPIC_RETENTION_PURGED',
          districtId,
          topicsEvaluated: expiredTopicIds.length,
          topicsPurgedCount: topicsPurged,
          evidencePurgedCount: evidencePurged,
          projectionsPurgedCount: projectionsPurged,
          durationMs,
        }),
      );
    }

    return {
      districtId,
      topicsEvaluated: expiredTopicIds.length,
      topicsPurged,
      evidencePurged,
      projectionsPurged,
      durationMs,
    };
  }
}
