import crypto from 'node:crypto';
import { eq, asc, sql } from 'drizzle-orm';
import { DbClient } from '../../adapters/db/client.js';
import { districts } from '../../adapters/db/schema/index.js';
import {
  CreateDistrictRequest,
  District,
  DistrictStatusSchema,
} from '@mahalla-ovozi/api-contracts';
import { recordAuditEvent } from '../audit/audit-service.js';

import {
  DistrictNotFoundError,
  DistrictAlreadyActiveError,
  DistrictNotReadyForActivationError,
  DistrictInvalidStatusError,
  activateDistrict,
} from './district-onboarding-engine.js';

export {
  DistrictNotFoundError,
  DistrictAlreadyActiveError,
  DistrictNotReadyForActivationError,
  DistrictInvalidStatusError,
  activateDistrict,
};

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

