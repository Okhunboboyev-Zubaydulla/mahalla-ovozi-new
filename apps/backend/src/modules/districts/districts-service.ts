import crypto from 'node:crypto';
import { eq, and, asc, sql } from 'drizzle-orm';
import { DbClient } from '../../adapters/db/client.js';
import { districts } from '../../adapters/db/schema/index.js';
import {
  CreateDistrictRequest,
  District,
  DistrictStatusSchema,
  ActivateDistrictResponse,
  PrerequisiteItem,
} from '@mahalla-ovozi/api-contracts';
import { recordAuditEvent } from '../audit/audit-service.js';
import { evaluateDistrictReadiness } from './districts-readiness.js';

export class DistrictNotFoundError extends Error {
  readonly code = 'DISTRICT_NOT_FOUND' as const;
  constructor(districtId: string) {
    super(`Туман топилмади (ID: ${districtId}).`);
    this.name = 'DistrictNotFoundError';
  }
}

export class DistrictNameExistsError extends Error {
  readonly code = 'DISTRICT_NAME_EXISTS' as const;
  constructor(name: string) {
    super(`Бу номдаги туман аллақачон мавжуд: "${name}".`);
    this.name = 'DistrictNameExistsError';
  }
}

export class DistrictCreationError extends Error {
  readonly code = 'DISTRICT_CREATION_FAILED' as const;
  constructor(message: string) {
    super(message);
    this.name = 'DistrictCreationError';
  }
}

export class DistrictAlreadyActiveError extends Error {
  readonly code = 'DISTRICT_ALREADY_ACTIVE' as const;
  readonly statusCode = 409;
  constructor(districtId: string) {
    super(`Туман аллақачон фаоллаштирилган (ID: ${districtId}).`);
    this.name = 'DistrictAlreadyActiveError';
  }
}

export class DistrictNotReadyForActivationError extends Error {
  readonly code = 'DISTRICT_NOT_READY' as const;
  readonly statusCode = 409;
  constructor(readonly blockers: PrerequisiteItem[]) {
    super('Туманни фаоллаштириш учун барча талаблар бажарилмаган.');
    this.name = 'DistrictNotReadyForActivationError';
  }
}

export class DistrictInvalidStatusError extends Error {
  readonly code = 'DISTRICT_INVALID_STATUS' as const;
  readonly statusCode = 409;
  constructor(districtId: string, status: string) {
    super(`Туман нотўғри ҳолатда: ${status}. Фақат созлаш тугалланмаган туманларни фаоллаштириш мумкин (ID: ${districtId}).`);
    this.name = 'DistrictInvalidStatusError';
  }
}

export function formatDistrict(row: {
  id: string;
  name: string;
  region: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  activatedAt?: Date | null;
  activatedById?: string | null;
}): District {
  return {
    id: row.id,
    name: row.name,
    region: row.region || undefined,
    status: DistrictStatusSchema.parse(row.status),
    createdAt: row.createdAt.toISOString(),
    activatedAt: row.activatedAt ? row.activatedAt.toISOString() : undefined,
    activatedById: row.activatedById || undefined,
  };
}


export async function listDistricts(db: DbClient): Promise<District[]> {
  // P3-H: Return all districts ordered by name ASC (no pagination for MVP)
  const rows = await db
    .select()
    .from(districts)
    .orderBy(asc(districts.name));

  return rows.map(formatDistrict);
}

export async function getDistrictById(db: DbClient, districtId: string): Promise<District> {
  const [row] = await db
    .select()
    .from(districts)
    .where(eq(districts.id, districtId))
    .limit(1);

  if (!row) {
    // P3-C: Throw domain error; route handler maps to HTTP 404
    throw new DistrictNotFoundError(districtId);
  }

  return formatDistrict(row);
}

export async function createDistrict(
  db: DbClient,
  input: CreateDistrictRequest,
  actor?: { id: string; role: string },
  context?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<District> {
  const trimmedName = input.name.trim();

  // Case-insensitive pre-check for friendly domain error
  const [existing] = await db
    .select()
    .from(districts)
    .where(sql`LOWER(${districts.name}) = LOWER(${trimmedName})`)
    .limit(1);

  if (existing) {
    // P3-C: Throw domain error; route handler maps to HTTP 409
    throw new DistrictNameExistsError(trimmedName);
  }

  const id = `dist_${crypto.randomUUID()}`;
  const now = new Date();

  let createdRow: typeof districts.$inferSelect | undefined;

  try {
    // P3-B: Atomic transaction wrapping district INSERT and DISTRICT_CREATED audit event INSERT
    await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(districts)
        .values({
          id,
          name: trimmedName,
          region: input.region || null,
          status: 'SETUP_INCOMPLETE',
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      createdRow = inserted;

      // P2-E & P1-10: DISTRICT_CREATED audit payload shape — privacy safe
      const auditMetadata: Record<string, unknown> = {
        districtId: id,
        districtName: trimmedName,
      };
      if (input.region) {
        auditMetadata.region = input.region;
      }

      await recordAuditEvent(tx, {
        actorId: actor?.id || null,
        actorRole: actor?.role || null,
        action: 'DISTRICT_CREATED',
        ipAddress: context?.ipAddress || null,
        userAgent: context?.userAgent || null,
        metadata: auditMetadata,
      });
    });
  } catch (err: unknown) {
    // Handle concurrent duplicate name collision caught by DB unique index
    if (
      err instanceof DistrictNameExistsError ||
      (typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === '23505')
    ) {
      throw new DistrictNameExistsError(trimmedName);
    }
    throw err;
  }

  if (!createdRow) {
    throw new DistrictCreationError('Туман яратишда хатолик юз берди.');
  }

  return formatDistrict(createdRow);
}

export async function activateDistrict(
  db: DbClient,
  districtId: string,
  actor: { id: string; role: string },
  clientInfo?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<ActivateDistrictResponse> {
  const now = new Date();
  let failedPrerequisites: PrerequisiteItem[] | null = null;
  let targetDistrictName = '';

  try {
    const result = await db.transaction(async (tx) => {
      // Tier 1: Exclusive row lock via SELECT ... FOR UPDATE
      const lockResult = await tx.execute<{
        id: string;
        name: string;
        region: string | null;
        status: string;
        access_eligible: boolean;
        analysis_config_profile_id: string;
        disclosure_confirmed_at: Date | null;
        disclosure_confirmed_by_id: string | null;
        activated_at: Date | null;
        activated_by_id: string | null;
        created_at: Date;
        updated_at: Date;
      }>(sql`SELECT * FROM districts WHERE id = ${districtId} FOR UPDATE`);

      const lockedDistrict = lockResult.rows[0];
      if (!lockedDistrict) {
        throw new DistrictNotFoundError(districtId);
      }

      targetDistrictName = lockedDistrict.name;

      if (lockedDistrict.status === 'ACTIVE') {
        throw new DistrictAlreadyActiveError(districtId);
      }

      if (lockedDistrict.status !== 'SETUP_INCOMPLETE') {
        throw new DistrictInvalidStatusError(districtId, lockedDistrict.status);
      }

      // Authoritatively re-evaluate all 8 prerequisites under lock
      const readiness = await evaluateDistrictReadiness(tx, districtId);
      if (!readiness.isActivationReady) {
        failedPrerequisites = readiness.items.filter((item) => item.status !== 'passed');
        throw new DistrictNotReadyForActivationError(failedPrerequisites);
      }

      // Tier 2: Conditional CAS atomic update
      const [updated] = await tx
        .update(districts)
        .set({
          status: 'ACTIVE',
          activatedAt: now,
          activatedById: actor.id,
          updatedAt: now,
        })
        .where(and(eq(districts.id, districtId), eq(districts.status, 'SETUP_INCOMPLETE')))
        .returning();

      if (!updated) {
        throw new DistrictAlreadyActiveError(districtId);
      }

      // Insert DISTRICT_ACTIVATED audit event inside transaction
      await recordAuditEvent(tx, {
        actorId: actor.id,
        actorRole: actor.role,
        action: 'DISTRICT_ACTIVATED',
        ipAddress: clientInfo?.ipAddress ?? null,
        userAgent: clientInfo?.userAgent ?? null,
        metadata: {
          districtId,
          districtName: updated.name,
          passedPrerequisitesCount: readiness.passedCount,
          activatedAt: now.toISOString(),
        },
      });

      return {
        district: formatDistrict(updated),
        activatedAt: now.toISOString(),
        activatedById: actor.id,
      };
    });

    return result;
  } catch (err) {
    if (err instanceof DistrictNotReadyForActivationError) {
      await recordAuditEvent(db, {
        actorId: actor.id,
        actorRole: actor.role,
        action: 'DISTRICT_ACTIVATION_FAILED',
        ipAddress: clientInfo?.ipAddress ?? null,
        userAgent: clientInfo?.userAgent ?? null,
        metadata: {
          districtId,
          districtName: targetDistrictName,
          failedPrerequisites: err.blockers.map((i) => ({
            key: i.key,
            label: i.label,
            status: i.status,
            blockerReason: i.blockerReason,
          })),
        },
      });
    }
    throw err;
  }
}

