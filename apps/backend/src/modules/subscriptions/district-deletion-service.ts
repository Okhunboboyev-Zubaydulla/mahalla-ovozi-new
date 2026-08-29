import crypto from 'node:crypto';
import { eq, and, or, asc, sql } from 'drizzle-orm';
import { DbClient } from '../../adapters/db/client.js';
import {
  districts,
  districtSubscriptions,
  districtDeletionRecords,
  topicProjections,
  acceptedEvidence,
  topics,
  aiOperations,
  districtAnalysisSettingsDrafts,
  districtAnalysisSettingsVersions,
  telegramIntakeRecords,
  operationalIssues,
  userDashboardVisits,
  accounts,
  districtTelegramGroups,
  districtTelegramBots,
  auditEvents,
  DistrictDeletionRecordEntity,
} from '../../adapters/db/schema/index.js';
import {
  DistrictDeletionRecord,
  DistrictDeletionRecordSchema,
} from '@mahalla-ovozi/api-contracts';
import { DistrictNotFoundError } from '../districts/districts-service.js';
import { recordAuditEvent } from '../audit/audit-service.js';

export class DistrictAlreadyDeletedError extends Error {
  readonly code = 'DISTRICT_ALREADY_DELETED' as const;
  readonly statusCode = 409;
  readonly districtId: string;

  constructor(districtId: string) {
    super(
      `Туман тизимдан бутунлай ўчирилган (ID: ${districtId}). Бу туман бўйича амалларни бажариш мумкин эмас.`,
    );
    this.name = 'DistrictAlreadyDeletedError';
    this.districtId = districtId;
  }
}

export class DistrictNotEligibleForDeletionError extends Error {
  readonly code = 'DISTRICT_NOT_ELIGIBLE_FOR_DELETION' as const;
  readonly statusCode = 409;
  readonly districtId: string;

  constructor(districtId: string, message?: string) {
    super(
      message ??
        `Туман ўчириш талабларига жавоб бермайди ёки 30 кунлик кутиш муддати ҳали тугамаган (ID: ${districtId}).`,
    );
    this.name = 'DistrictNotEligibleForDeletionError';
    this.districtId = districtId;
  }
}

/**
 * Validates that an explicit districtId is present and non-empty.
 * Throws INVALID_DISTRICT_SCOPE to guarantee multi-tenant boundary safety (AC 3, AD-9).
 */
export function validateDistrictScope(districtId: string): void {
  if (!districtId || typeof districtId !== 'string' || districtId.trim() === '') {
    throw new Error(
      'INVALID_DISTRICT_SCOPE: districtId is strictly required and cannot be empty or omitted',
    );
  }
}

export function formatDistrictDeletionRecord(
  row: DistrictDeletionRecordEntity,
): DistrictDeletionRecord {
  return DistrictDeletionRecordSchema.parse({
    id: row.id,
    districtId: row.districtId,
    districtName: row.districtName,
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : undefined,
    cancelledById: row.cancelledById ?? undefined,
    cancellationReason: row.cancellationReason ?? undefined,
    scheduledLiveDeletionAt: row.scheduledLiveDeletionAt.toISOString(),
    actualLiveDeletionAt: row.actualLiveDeletionAt.toISOString(),
    liveDeletionStatus: row.liveDeletionStatus as 'COMPLETED' | 'FAILED',
    protectedBackupExpiryDeadline: row.protectedBackupExpiryDeadline.toISOString(),
    backupExpiryStatus: row.backupExpiryStatus as 'PENDING' | 'VERIFIED' | 'FAILED',
    backupExpiryVerifiedAt: row.backupExpiryVerifiedAt
      ? row.backupExpiryVerifiedAt.toISOString()
      : undefined,
    restoreReconciliationStatus:
      (row.restoreReconciliationStatus as 'PENDING' | 'RECONCILED' | 'FAILED' | null) ?? undefined,
    restoreReconciliationVerifiedAt: row.restoreReconciliationVerifiedAt
      ? row.restoreReconciliationVerifiedAt.toISOString()
      : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

export async function getDistrictDeletionRecord(
  db: DbClient,
  districtId: string,
): Promise<DistrictDeletionRecord | null> {
  validateDistrictScope(districtId);
  const [row] = await db
    .select()
    .from(districtDeletionRecords)
    .where(eq(districtDeletionRecords.districtId, districtId))
    .limit(1);

  return row ? formatDistrictDeletionRecord(row) : null;
}

export interface ExecuteDistrictLiveDeletionOptions {
  bypassDeadlineCheck?: boolean;
  actor?: { id?: string | null; role?: string | null };
  context?: { ipAddress?: string | null; userAgent?: string | null };
}

export async function executeDistrictLiveDeletion(
  db: DbClient,
  districtId: string,
  options?: ExecuteDistrictLiveDeletionOptions,
): Promise<DistrictDeletionRecord | null> {
  validateDistrictScope(districtId);
  // 1. Fast-path idempotency check: if already deleted with completed tombstone, return existing record
  const existingTombstone = await getDistrictDeletionRecord(db, districtId);
  if (existingTombstone && existingTombstone.liveDeletionStatus === 'COMPLETED') {
    return existingTombstone;
  }

  let finalRecord: DistrictDeletionRecordEntity | undefined;

  await db.transaction(async (tx) => {
    const now = new Date();

    // 2. Lock districts row first (consistent lock order: districts -> district_subscriptions)
    const lockDistrictResult = await tx.execute<{
      id: string;
      name: string;
      status: string;
      region: string | null;
    }>(sql`SELECT id, name, status, region FROM districts WHERE id = ${districtId} FOR UPDATE`);

    const lockedDistrict = lockDistrictResult.rows[0];

    // Lock-unblocking concurrency protection: If districts row missing under lock, check tombstone
    if (!lockedDistrict) {
      const [tombstoneUnderTx] = await tx
        .select()
        .from(districtDeletionRecords)
        .where(eq(districtDeletionRecords.districtId, districtId))
        .limit(1);

      if (tombstoneUnderTx && tombstoneUnderTx.liveDeletionStatus === 'COMPLETED') {
        finalRecord = tombstoneUnderTx;
        return;
      }

      throw new DistrictNotFoundError(districtId);
    }

    // 3. Lock district_subscriptions row second
    const lockSubResult = await tx.execute<{
      id: string;
      district_id: string;
      status: string;
      status_started_at: Date | null;
      scheduled_transition_at: Date | null;
      scheduled_transition_type: string | null;
      internal_note: string | null;
      updated_by_id: string | null;
    }>(
      sql`SELECT id, district_id, status, status_started_at, scheduled_transition_at, scheduled_transition_type, internal_note, updated_by_id FROM district_subscriptions WHERE district_id = ${districtId} FOR UPDATE`,
    );

    const lockedSub = lockSubResult.rows[0];

    // 4. Stale-job safeguard: Authoritatively verify status is still CANCELLED
    if (
      lockedDistrict.status !== 'CANCELLED' ||
      (lockedSub && lockedSub.status !== 'CANCELLED')
    ) {
      // District has been reactivated or recovered (SETUP_INCOMPLETE, ACTIVE, GRACE, SUSPENDED). Abort safely.
      return;
    }

    // 5. Deadline check: unless bypassed, verify scheduled deletion deadline has arrived
    if (!options?.bypassDeadlineCheck) {
      if (!lockedSub?.scheduled_transition_at) {
        throw new DistrictNotEligibleForDeletionError(
          districtId,
          'Туманни ўчириш муддати белгиланмаган.',
        );
      }
      const deadlineMs = new Date(lockedSub.scheduled_transition_at).getTime();
      const nowMs = now.getTime();
      // 60-second clock skew tolerance
      if (deadlineMs > nowMs + 60000) {
        throw new DistrictNotEligibleForDeletionError(
          districtId,
          `Туманни ўчириш муддати ҳали етиб келмаган. Режадаги вақт: ${lockedSub.scheduled_transition_at}`,
        );
      }
    }

    // 6. Extract cancellation metadata and compute tombstone parameters
    const cancelledAt = lockedSub?.status_started_at
      ? new Date(lockedSub.status_started_at)
      : now;
    const cancelledById = lockedSub?.updated_by_id ?? null;
    const cancellationReason = lockedSub?.internal_note ?? null;
    const scheduledLiveDeletionAt = lockedSub?.scheduled_transition_at
      ? new Date(lockedSub.scheduled_transition_at)
      : now;
    const actualLiveDeletionAt = now;
    const protectedBackupExpiryDeadline = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const tombstoneId = `del_rec_${crypto.randomUUID()}`;

    // 7. Insert surviving deletion tombstone
    await tx
      .insert(districtDeletionRecords)
      .values({
        id: tombstoneId,
        districtId,
        districtName: lockedDistrict.name,
        cancelledAt,
        cancelledById,
        cancellationReason,
        scheduledLiveDeletionAt,
        actualLiveDeletionAt,
        liveDeletionStatus: 'COMPLETED',
        protectedBackupExpiryDeadline,
        backupExpiryStatus: 'PENDING',
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoNothing({ target: districtDeletionRecords.districtId });

    // 8. Execute comprehensive multi-table live data purge in strict topological dependency order
    // 1. topic_projections
    await tx.delete(topicProjections).where(eq(topicProjections.districtId, districtId));

    // 2. accepted_evidence
    await tx.delete(acceptedEvidence).where(eq(acceptedEvidence.districtId, districtId));

    // 3. topics
    await tx.delete(topics).where(eq(topics.districtId, districtId));

    // 4. ai_provider_attempts
    await tx.execute(
      sql`DELETE FROM ai_provider_attempts WHERE operation_id IN (SELECT id FROM ai_operations WHERE district_id = ${districtId})`,
    );

    // 5. ai_operations
    await tx.delete(aiOperations).where(eq(aiOperations.districtId, districtId));

    // 6. telegram_intake_records
    await tx.delete(telegramIntakeRecords).where(eq(telegramIntakeRecords.districtId, districtId));

    // 7. district_analysis_settings_drafts
    await tx
      .delete(districtAnalysisSettingsDrafts)
      .where(eq(districtAnalysisSettingsDrafts.districtId, districtId));

    // 8. district_analysis_settings_versions
    await tx
      .delete(districtAnalysisSettingsVersions)
      .where(eq(districtAnalysisSettingsVersions.districtId, districtId));

    // 9. operational_issues (both district-scoped and global failure tracking issues)
    await tx
      .delete(operationalIssues)
      .where(
        or(
          eq(operationalIssues.districtId, districtId),
          eq(operationalIssues.logicalKey, `del_fail:${districtId}`),
        ),
      );

    // 10. user_dashboard_visits
    await tx.delete(userDashboardVisits).where(eq(userDashboardVisits.districtId, districtId));

    // 11. sessions (Hokim user accounts assigned to this district)
    await tx.execute(
      sql`DELETE FROM sessions WHERE account_id IN (SELECT id FROM accounts WHERE district_id = ${districtId})`,
    );

    // 12. accounts (Hokim user accounts assigned to this district)
    await tx.delete(accounts).where(eq(accounts.districtId, districtId));

    // 13. district_telegram_groups
    await tx.delete(districtTelegramGroups).where(eq(districtTelegramGroups.districtId, districtId));

    // 14. district_telegram_bots
    await tx.delete(districtTelegramBots).where(eq(districtTelegramBots.districtId, districtId));

    // 15. audit_events (District-scoped audit history)
    await tx.delete(auditEvents).where(eq(auditEvents.districtId, districtId));

    // 16. district_subscriptions
    await tx
      .delete(districtSubscriptions)
      .where(eq(districtSubscriptions.districtId, districtId));

    // 17. districts (parent district row)
    await tx.delete(districts).where(eq(districts.id, districtId));

    // 9. Append global system audit log with privacy-safe metadata
    await recordAuditEvent(tx, {
      districtId: null,
      actorId: options?.actor?.id ?? null,
      actorRole: (options?.actor?.role as 'PRODUCT_OWNER' | 'SYSTEM' | null) ?? 'SYSTEM',
      action: 'DISTRICT_LIVE_DELETED',
      ipAddress: options?.context?.ipAddress ?? null,
      userAgent: options?.context?.userAgent ?? null,
      metadata: {
        deletedDistrictId: districtId,
        deletedDistrictName: lockedDistrict.name,
        scheduledLiveDeletionAt: scheduledLiveDeletionAt.toISOString(),
        actualLiveDeletionAt: actualLiveDeletionAt.toISOString(),
        protectedBackupExpiryDeadline: protectedBackupExpiryDeadline.toISOString(),
        reason: cancellationReason ?? null,
      },
    });

    const [createdTombstone] = await tx
      .select()
      .from(districtDeletionRecords)
      .where(eq(districtDeletionRecords.districtId, districtId))
      .limit(1);

    finalRecord = createdTombstone;
  });

  return finalRecord ? formatDistrictDeletionRecord(finalRecord) : null;
}

export async function processOverdueCancelledDistricts(
  db: DbClient,
): Promise<{ processedCount: number; errors: Array<{ districtId: string; error: string }> }> {
  const overdue = await db
    .select({ districtId: districtSubscriptions.districtId })
    .from(districtSubscriptions)
    .where(
      and(
        eq(districtSubscriptions.status, 'CANCELLED'),
        eq(districtSubscriptions.scheduledTransitionType, 'LIVE_DELETION'),
        sql`${districtSubscriptions.scheduledTransitionAt} <= NOW()`,
      ),
    )
    .orderBy(asc(districtSubscriptions.scheduledTransitionAt))
    .limit(100);

  let processedCount = 0;
  const errors: Array<{ districtId: string; error: string }> = [];

  for (const item of overdue) {
    try {
      const res = await executeDistrictLiveDeletion(db, item.districtId);
      if (res) {
        processedCount++;
      }
    } catch (err) {
      const errorMsg = (err as Error).message;
      errors.push({ districtId: item.districtId, error: errorMsg });
      console.error(
        JSON.stringify({
          event: 'OVERDUE_CANCELLED_DISTRICT_LIVE_DELETION_FAILED',
          districtId: item.districtId,
          error: errorMsg,
        }),
      );
    }
  }

  return { processedCount, errors };
}
