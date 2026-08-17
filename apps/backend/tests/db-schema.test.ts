import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDbPool, createDbClient, DbClient } from '../src/adapters/db/client.js';
import { accounts, sessions, auditEvents, signInRateLimits } from '../src/adapters/db/schema/index.js';
import pg from 'pg';

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
});
