import crypto from 'node:crypto';
import { eq, asc, sql } from 'drizzle-orm';
import { DbClient } from '../../adapters/db/client.js';
import { districts, auditEvents } from '../../adapters/db/schema/index.js';
import { CreateDistrictRequest, District } from '@mahalla-ovozi/api-contracts';

export function formatDistrict(row: {
  id: string;
  name: string;
  region: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): District {
  return {
    id: row.id,
    name: row.name,
    region: row.region || undefined,
    status: row.status as District['status'],
    createdAt: row.createdAt.toISOString(),
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
    throw new Error('DISTRICT_NOT_FOUND');
  }

  return formatDistrict(row);
}

export async function createDistrict(
  db: DbClient,
  input: CreateDistrictRequest,
  actor?: { id: string; role: string }
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
    throw new Error('DISTRICT_NAME_EXISTS');
  }

  const id = `dist_${crypto.randomUUID()}`;
  const now = new Date();

  let createdRow: typeof districts.$inferSelect | undefined;

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

    await tx.insert(auditEvents).values({
      id: `aud_${crypto.randomUUID()}`,
      actorId: actor?.id || null,
      actorRole: actor?.role || null,
      action: 'DISTRICT_CREATED',
      metadata: auditMetadata,
      createdAt: now,
    });
  });

  if (!createdRow) {
    throw new Error('DISTRICT_CREATION_FAILED');
  }

  return formatDistrict(createdRow);
}
