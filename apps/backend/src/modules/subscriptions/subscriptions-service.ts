import { eq, asc } from 'drizzle-orm';
import { DbClient, DbOrTx } from '../../adapters/db/client.js';
import { districts, districtSubscriptions } from '../../adapters/db/schema/index.js';
import {
  DistrictSubscription,
  SubscriptionStatus,
  SubscriptionStatusSchema,
  UpdateDistrictSubscriptionRequest,
} from '@mahalla-ovozi/api-contracts';
import { DistrictNotFoundError } from '../districts/districts-service.js';
import { recordAuditEvent } from '../audit/audit-service.js';

export function formatDistrictSubscription(row: {
  id: string;
  districtId: string;
  districtName: string;
  region?: string | null;
  status: string;
  statusStartedAt: Date;
  scheduledTransitionAt?: Date | null;
  scheduledTransitionType?: string | null;
  externalPaymentReference?: string | null;
  internalNote?: string | null;
  updatedById?: string | null;
  createdAt: Date;
  updatedAt: Date;
}): DistrictSubscription {
  return {
    id: row.id,
    districtId: row.districtId,
    districtName: row.districtName,
    region: row.region ?? undefined,
    status: SubscriptionStatusSchema.parse(row.status),
    statusStartedAt: row.statusStartedAt.toISOString(),
    scheduledTransitionAt: row.scheduledTransitionAt ? row.scheduledTransitionAt.toISOString() : undefined,
    scheduledTransitionType: row.scheduledTransitionType ?? undefined,
    externalPaymentReference: row.externalPaymentReference ?? undefined,
    internalNote: row.internalNote ?? undefined,
    updatedById: row.updatedById ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function ensureDistrictSubscription(
  db: DbOrTx,
  districtId: string,
  initialStatus?: string,
): Promise<typeof districtSubscriptions.$inferSelect> {
  const [existing] = await db
    .select()
    .from(districtSubscriptions)
    .where(eq(districtSubscriptions.districtId, districtId))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [dist] = await db
    .select()
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);

  if (!dist) {
    throw new DistrictNotFoundError(districtId);
  }

  const now = new Date();
  const status = initialStatus ?? (dist.status as SubscriptionStatus) ?? 'ACTIVE';
  const statusStartedAt = dist.activatedAt ?? dist.createdAt ?? now;

  await db
    .insert(districtSubscriptions)
    .values({
      id: `sub_${districtId}`,
      districtId,
      status,
      statusStartedAt,
      createdAt: dist.createdAt ?? now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: districtSubscriptions.districtId });

  const [created] = await db
    .select()
    .from(districtSubscriptions)
    .where(eq(districtSubscriptions.districtId, districtId))
    .limit(1);

  if (!created) {
    throw new DistrictNotFoundError(districtId);
  }

  return created;
}

export async function listDistrictSubscriptions(
  db: DbClient,
): Promise<DistrictSubscription[]> {
  const allDistricts = await db
    .select({
      id: districts.id,
      name: districts.name,
      region: districts.region,
      status: districts.status,
      activatedAt: districts.activatedAt,
      createdAt: districts.createdAt,
      subId: districtSubscriptions.id,
      subStatus: districtSubscriptions.status,
      subStatusStartedAt: districtSubscriptions.statusStartedAt,
      subScheduledTransitionAt: districtSubscriptions.scheduledTransitionAt,
      subScheduledTransitionType: districtSubscriptions.scheduledTransitionType,
      subExternalPaymentReference: districtSubscriptions.externalPaymentReference,
      subInternalNote: districtSubscriptions.internalNote,
      subUpdatedById: districtSubscriptions.updatedById,
      subCreatedAt: districtSubscriptions.createdAt,
      subUpdatedAt: districtSubscriptions.updatedAt,
    })
    .from(districts)
    .leftJoin(districtSubscriptions, eq(districts.id, districtSubscriptions.districtId))
    .orderBy(asc(districts.name));

  const results: DistrictSubscription[] = [];

  for (const row of allDistricts) {
    if (!row.subId) {
      const sub = await ensureDistrictSubscription(db, row.id, row.status);
      results.push(
        formatDistrictSubscription({
          id: sub.id,
          districtId: row.id,
          districtName: row.name,
          region: row.region,
          status: sub.status,
          statusStartedAt: sub.statusStartedAt,
          scheduledTransitionAt: sub.scheduledTransitionAt,
          scheduledTransitionType: sub.scheduledTransitionType,
          externalPaymentReference: sub.externalPaymentReference,
          internalNote: sub.internalNote,
          updatedById: sub.updatedById,
          createdAt: sub.createdAt,
          updatedAt: sub.updatedAt,
        }),
      );
    } else {
      results.push(
        formatDistrictSubscription({
          id: row.subId,
          districtId: row.id,
          districtName: row.name,
          region: row.region,
          status: row.subStatus ?? row.status,
          statusStartedAt: row.subStatusStartedAt ?? row.activatedAt ?? row.createdAt ?? new Date(),
          scheduledTransitionAt: row.subScheduledTransitionAt,
          scheduledTransitionType: row.subScheduledTransitionType,
          externalPaymentReference: row.subExternalPaymentReference,
          internalNote: row.subInternalNote,
          updatedById: row.subUpdatedById,
          createdAt: row.subCreatedAt ?? row.createdAt ?? new Date(),
          updatedAt: row.subUpdatedAt ?? new Date(),
        }),
      );
    }
  }

  return results;
}

export async function getDistrictSubscription(
  db: DbClient,
  districtId: string,
): Promise<DistrictSubscription> {
  const [dist] = await db
    .select()
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);

  if (!dist) {
    throw new DistrictNotFoundError(districtId);
  }

  const sub = await ensureDistrictSubscription(db, districtId, dist.status);

  return formatDistrictSubscription({
    id: sub.id,
    districtId: dist.id,
    districtName: dist.name,
    region: dist.region,
    status: sub.status,
    statusStartedAt: sub.statusStartedAt,
    scheduledTransitionAt: sub.scheduledTransitionAt,
    scheduledTransitionType: sub.scheduledTransitionType,
    externalPaymentReference: sub.externalPaymentReference,
    internalNote: sub.internalNote,
    updatedById: sub.updatedById,
    createdAt: sub.createdAt,
    updatedAt: sub.updatedAt,
  });
}

export async function updateDistrictSubscriptionMetadata(
  db: DbClient,
  districtId: string,
  input: UpdateDistrictSubscriptionRequest,
  actor?: { id: string; role: string },
  context?: { ipAddress?: string | null; userAgent?: string | null },
): Promise<DistrictSubscription> {
  const [dist] = await db
    .select()
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);

  if (!dist) {
    throw new DistrictNotFoundError(districtId);
  }

  // Ensure record exists before update
  await ensureDistrictSubscription(db, districtId, dist.status);

  const now = new Date();
  const updateFields: Partial<typeof districtSubscriptions.$inferInsert> = {
    updatedAt: now,
    updatedById: actor?.id ?? null,
  };

  if (input.externalPaymentReference !== undefined) {
    updateFields.externalPaymentReference =
      input.externalPaymentReference === null || input.externalPaymentReference === ''
        ? null
        : input.externalPaymentReference;
  }

  if (input.internalNote !== undefined) {
    updateFields.internalNote =
      input.internalNote === null || input.internalNote === ''
        ? null
        : input.internalNote;
  }

  let updatedRow: typeof districtSubscriptions.$inferSelect | undefined;

  await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(districtSubscriptions)
      .set(updateFields)
      .where(eq(districtSubscriptions.districtId, districtId))
      .returning();

    updatedRow = updated;

    await recordAuditEvent(tx, {
      districtId,
      actorId: actor?.id ?? null,
      actorRole: actor?.role ?? 'PRODUCT_OWNER',
      action: 'DISTRICT_SUBSCRIPTION_METADATA_UPDATED',
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
      metadata: {
        districtId,
        districtName: dist.name,
        externalPaymentReferenceUpdated: input.externalPaymentReference !== undefined,
        internalNoteUpdated: input.internalNote !== undefined,
      },
    });
  });

  if (!updatedRow) {
    throw new DistrictNotFoundError(districtId);
  }

  return formatDistrictSubscription({
    id: updatedRow.id,
    districtId: dist.id,
    districtName: dist.name,
    region: dist.region,
    status: updatedRow.status,
    statusStartedAt: updatedRow.statusStartedAt,
    scheduledTransitionAt: updatedRow.scheduledTransitionAt,
    scheduledTransitionType: updatedRow.scheduledTransitionType,
    externalPaymentReference: updatedRow.externalPaymentReference,
    internalNote: updatedRow.internalNote,
    updatedById: updatedRow.updatedById,
    createdAt: updatedRow.createdAt,
    updatedAt: updatedRow.updatedAt,
  });
}
