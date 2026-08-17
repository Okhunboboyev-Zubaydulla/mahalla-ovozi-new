import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDbPool, createDbClient, DbClient } from '../src/adapters/db/client.js';
import { accounts, sessions, auditEvents, signInRateLimits, districts } from '../src/adapters/db/schema/index.js';
import { eq } from 'drizzle-orm';
import pg from 'pg';
import crypto from 'node:crypto';

describe('Database Schema & Migration Verification', () => {
  let pool: pg.Pool;
  let db: DbClient;

  beforeAll(async () => {
    pool = createDbPool();
    db = createDbClient(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('can query accounts table', async () => {
    const rows = await db.select().from(accounts).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('can query sessions table with foreign key relationship', async () => {
    const rows = await db.select().from(sessions).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('can query audit_events table', async () => {
    const rows = await db.select().from(auditEvents).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('can query sign_in_rate_limits table', async () => {
    const rows = await db.select().from(signInRateLimits).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('can query districts table', async () => {
    const rows = await db.select().from(districts).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('enforces case-insensitive uniqueness on district name at DB level (P2-A)', async () => {
    const uniqueSuffix = crypto.randomUUID().slice(0, 8);
    const id1 = `dist_${crypto.randomUUID()}`;
    const id2 = `dist_${crypto.randomUUID()}`;
    const name = `SchemaTest_${uniqueSuffix}`;

    // Insert first district
    await db.insert(districts).values({
      id: id1,
      name: name,
      status: 'SETUP_INCOMPLETE',
    });

    // Attempt insert with different casing — must fail due to LOWER(name) unique index
    await expect(
      db.insert(districts).values({
        id: id2,
        name: name.toLowerCase(),
        status: 'SETUP_INCOMPLETE',
      })
    ).rejects.toThrow();

    // Clean up
    await db.delete(districts).where(eq(districts.id, id1));
  });

  it('enforces CHECK constraint on district status values at DB level (P2-B)', async () => {
    const id = `dist_${crypto.randomUUID()}`;
    await expect(
      db.insert(districts).values({
        id,
        name: `StatusCheck_${crypto.randomUUID().slice(0, 8)}`,
        status: 'INVALID_STATUS_VALUE',
      })
    ).rejects.toThrow();
  });
});
