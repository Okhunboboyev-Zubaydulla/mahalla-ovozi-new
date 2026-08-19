import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createDbPool, createDbClient, DbClient } from '../src/adapters/db/client.js';
import { accounts, sessions, auditEvents, signInRateLimits, districts, districtTelegramBots, districtTelegramGroups } from '../src/adapters/db/schema/index.js';
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

  it('can query district_telegram_bots table', async () => {
    const rows = await db.select().from(districtTelegramBots).limit(1);
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

  it('cascades deletion of district_telegram_bots when district is deleted', async () => {
    const districtId = `dist_${crypto.randomUUID()}`;
    const botRowId = `dtb_${crypto.randomUUID()}`;
    const botId = `bot_${crypto.randomUUID().slice(0, 8)}`;

    await db.insert(districts).values({
      id: districtId,
      name: `CascadeTest_${crypto.randomUUID().slice(0, 8)}`,
      status: 'SETUP_INCOMPLETE',
    });

    await db.insert(districtTelegramBots).values({
      id: botRowId,
      districtId,
      botId,
      botFirstName: 'Test Bot',
      encryptedToken: 'abcdef123456',
      tokenIv: '123456789012345678901234',
      tokenTag: '12345678901234567890123456789012',
      tokenKeyVersion: 'v1',
      tokenMasked: `${botId}:••••••••••••`,
      status: 'VALID',
      lastValidatedAt: new Date(),
    });

    // Verify row exists
    const [botBefore] = await db
      .select()
      .from(districtTelegramBots)
      .where(eq(districtTelegramBots.id, botRowId));
    expect(botBefore).toBeDefined();

    // Delete parent district
    await db.delete(districts).where(eq(districts.id, districtId));

    // Verify child record was cascade-deleted
    const [botAfter] = await db
      .select()
      .from(districtTelegramBots)
      .where(eq(districtTelegramBots.id, botRowId));
    expect(botAfter).toBeUndefined();
  });

  it('enforces unique constraint on districtId (max 1 bot per district)', async () => {
    const districtId = `dist_${crypto.randomUUID()}`;
    const bot1RowId = `dtb_${crypto.randomUUID()}`;
    const bot2RowId = `dtb_${crypto.randomUUID()}`;

    await db.insert(districts).values({
      id: districtId,
      name: `UniqueDistrictBot_${crypto.randomUUID().slice(0, 8)}`,
      status: 'SETUP_INCOMPLETE',
    });

    await db.insert(districtTelegramBots).values({
      id: bot1RowId,
      districtId,
      botId: `bot_1_${crypto.randomUUID().slice(0, 8)}`,
      botFirstName: 'Bot 1',
      encryptedToken: 'encrypted1',
      tokenIv: 'iv1',
      tokenTag: 'tag1',
      tokenKeyVersion: 'v1',
      tokenMasked: '1:••••••••••••',
      status: 'VALID',
      lastValidatedAt: new Date(),
    });

    // Inserting a second bot for the same district must throw unique violation
    await expect(
      db.insert(districtTelegramBots).values({
        id: bot2RowId,
        districtId,
        botId: `bot_2_${crypto.randomUUID().slice(0, 8)}`,
        botFirstName: 'Bot 2',
        encryptedToken: 'encrypted2',
        tokenIv: 'iv2',
        tokenTag: 'tag2',
        tokenKeyVersion: 'v1',
        tokenMasked: '2:••••••••••••',
        status: 'VALID',
        lastValidatedAt: new Date(),
      })
    ).rejects.toThrow();

    // Clean up
    await db.delete(districts).where(eq(districts.id, districtId));
  });

  it('enforces cross-district uniqueness on botId at DB level (AC 5)', async () => {
    const district1Id = `dist_${crypto.randomUUID()}`;
    const district2Id = `dist_${crypto.randomUUID()}`;
    const sharedBotId = `shared_bot_${crypto.randomUUID().slice(0, 8)}`;

    await db.insert(districts).values([
      { id: district1Id, name: `District1_${crypto.randomUUID().slice(0, 8)}`, status: 'SETUP_INCOMPLETE' },
      { id: district2Id, name: `District2_${crypto.randomUUID().slice(0, 8)}`, status: 'SETUP_INCOMPLETE' },
    ]);

    await db.insert(districtTelegramBots).values({
      id: `dtb_${crypto.randomUUID()}`,
      districtId: district1Id,
      botId: sharedBotId,
      botFirstName: 'Shared Bot',
      encryptedToken: 'enc1',
      tokenIv: 'iv1',
      tokenTag: 'tag1',
      tokenKeyVersion: 'v1',
      tokenMasked: 'shared:••••••••••••',
      status: 'VALID',
      lastValidatedAt: new Date(),
    });

    // Attempting to attach the same botId to district 2 must fail with unique constraint violation
    await expect(
      db.insert(districtTelegramBots).values({
        id: `dtb_${crypto.randomUUID()}`,
        districtId: district2Id,
        botId: sharedBotId,
        botFirstName: 'Shared Bot',
        encryptedToken: 'enc2',
        tokenIv: 'iv2',
        tokenTag: 'tag2',
        tokenKeyVersion: 'v1',
        tokenMasked: 'shared:••••••••••••',
        status: 'VALID',
        lastValidatedAt: new Date(),
      })
    ).rejects.toThrow();

    // Clean up
    await db.delete(districts).where(eq(districts.id, district1Id));
    await db.delete(districts).where(eq(districts.id, district2Id));
  });

  it('enforces CHECK constraint on district_telegram_bots status values', async () => {
    const districtId = `dist_${crypto.randomUUID()}`;

    await db.insert(districts).values({
      id: districtId,
      name: `CheckStatusBot_${crypto.randomUUID().slice(0, 8)}`,
      status: 'SETUP_INCOMPLETE',
    });

    await expect(
      db.insert(districtTelegramBots).values({
        id: `dtb_${crypto.randomUUID()}`,
        districtId,
        botId: `bot_${crypto.randomUUID().slice(0, 8)}`,
        botFirstName: 'Invalid Status Bot',
        encryptedToken: 'enc',
        tokenIv: 'iv',
        tokenTag: 'tag',
        tokenKeyVersion: 'v1',
        tokenMasked: 'mask',
        status: 'UNAUTHORIZED_STATUS' as unknown as 'VALID',
        lastValidatedAt: new Date(),
      })
    ).rejects.toThrow();

    // Clean up
    await db.delete(districts).where(eq(districts.id, districtId));
  });

  it('can query district_telegram_groups table', async () => {
    const rows = await db.select().from(districtTelegramGroups).limit(1);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('cascades deletion of district_telegram_groups when district is deleted', async () => {
    const districtId = `dist_${crypto.randomUUID()}`;
    const groupId = `dtg_${crypto.randomUUID()}`;
    const chatId = `-100${crypto.randomUUID().replace(/\D/g, '').slice(0, 10)}`;

    await db.insert(districts).values({
      id: districtId,
      name: `CascadeGroupDist_${crypto.randomUUID().slice(0, 8)}`,
      status: 'SETUP_INCOMPLETE',
    });

    await db.insert(districtTelegramGroups).values({
      id: groupId,
      districtId,
      mahallaName: 'Bogbonlar',
      telegramChatId: chatId,
      telegramChatTitle: 'Bogbonlar Mahalla Guruhi',
      status: 'PENDING',
    });

    const [groupBefore] = await db
      .select()
      .from(districtTelegramGroups)
      .where(eq(districtTelegramGroups.id, groupId));
    expect(groupBefore).toBeDefined();

    // Delete parent district
    await db.delete(districts).where(eq(districts.id, districtId));

    // Verify child group was cascade-deleted
    const [groupAfter] = await db
      .select()
      .from(districtTelegramGroups)
      .where(eq(districtTelegramGroups.id, groupId));
    expect(groupAfter).toBeUndefined();
  });

  it('enforces case-insensitive uniqueness on mahallaName within a district (AC 2)', async () => {
    const districtId = `dist_${crypto.randomUUID()}`;
    const group1Id = `dtg_${crypto.randomUUID()}`;
    const group2Id = `dtg_${crypto.randomUUID()}`;

    await db.insert(districts).values({
      id: districtId,
      name: `MahallaUniqDist_${crypto.randomUUID().slice(0, 8)}`,
      status: 'SETUP_INCOMPLETE',
    });

    await db.insert(districtTelegramGroups).values({
      id: group1Id,
      districtId,
      mahallaName: 'Navbahor',
      telegramChatId: `-100${crypto.randomUUID().replace(/\D/g, '').slice(0, 10)}`,
      telegramChatTitle: 'Navbahor Guruhi 1',
      status: 'PENDING',
    });

    // Attempt insert with different casing (NAVBAHOR / navbahor) for the same district must fail
    await expect(
      db.insert(districtTelegramGroups).values({
        id: group2Id,
        districtId,
        mahallaName: 'NAVBAHOR',
        telegramChatId: `-100${crypto.randomUUID().replace(/\D/g, '').slice(0, 10)}`,
        telegramChatTitle: 'Navbahor Guruhi 2',
        status: 'PENDING',
      })
    ).rejects.toThrow();

    // Clean up
    await db.delete(districts).where(eq(districts.id, districtId));
  });

  it('enforces global uniqueness on telegramChatId across districts (AC 3)', async () => {
    const district1Id = `dist_${crypto.randomUUID()}`;
    const district2Id = `dist_${crypto.randomUUID()}`;
    const sharedChatId = `-100${crypto.randomUUID().replace(/\D/g, '').slice(0, 10)}`;

    await db.insert(districts).values([
      { id: district1Id, name: `DistrictA_${crypto.randomUUID().slice(0, 8)}`, status: 'SETUP_INCOMPLETE' },
      { id: district2Id, name: `DistrictB_${crypto.randomUUID().slice(0, 8)}`, status: 'SETUP_INCOMPLETE' },
    ]);

    await db.insert(districtTelegramGroups).values({
      id: `dtg_${crypto.randomUUID()}`,
      districtId: district1Id,
      mahallaName: 'Mahalla A',
      telegramChatId: sharedChatId,
      telegramChatTitle: 'Shared Group',
      status: 'VALID',
    });

    // Attempting to attach the same telegramChatId to district 2 must fail
    await expect(
      db.insert(districtTelegramGroups).values({
        id: `dtg_${crypto.randomUUID()}`,
        districtId: district2Id,
        mahallaName: 'Mahalla B',
        telegramChatId: sharedChatId,
        telegramChatTitle: 'Shared Group',
        status: 'VALID',
      })
    ).rejects.toThrow();

    // Clean up
    await db.delete(districts).where(eq(districts.id, district1Id));
    await db.delete(districts).where(eq(districts.id, district2Id));
  });

  it('enforces CHECK constraint on district_telegram_groups status values', async () => {
    const districtId = `dist_${crypto.randomUUID()}`;

    await db.insert(districts).values({
      id: districtId,
      name: `CheckStatusGroup_${crypto.randomUUID().slice(0, 8)}`,
      status: 'SETUP_INCOMPLETE',
    });

    await expect(
      db.insert(districtTelegramGroups).values({
        id: `dtg_${crypto.randomUUID()}`,
        districtId,
        mahallaName: 'Chilonzor',
        telegramChatId: `-100${crypto.randomUUID().replace(/\D/g, '').slice(0, 10)}`,
        telegramChatTitle: 'Chilonzor Guruhi',
        status: 'INVALID_GROUP_STATUS',
      })
    ).rejects.toThrow();

    // Clean up
    await db.delete(districts).where(eq(districts.id, districtId));
  });
});

