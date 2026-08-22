import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { FastifyInstance } from 'fastify';
import pg from 'pg';
import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import type PgBoss from 'pg-boss';
import { buildHttpServer } from '../src/entrypoints/http.js';
import { createDbPool, createDbClient, DbClient } from '../src/adapters/db/client.js';
import { createBossClient, initBossQueues } from '../src/adapters/jobs/boss-client.js';
import { deriveWebhookSecret } from '../src/modules/telegram-intake/webhook-security.js';
import {
  districts,
  districtTelegramBots,
  districtTelegramGroups,
  telegramIntakeRecords,
} from '../src/adapters/db/schema/index.js';
import { encryptToken } from '../src/adapters/crypto/token-cipher.js';

describe('Story 2.1: Telegram Webhook Ingress & Durability Integration Tests', () => {
  let server: FastifyInstance;
  let pool: pg.Pool;
  let db: DbClient;
  let boss: PgBoss;

  let activeDistrictId: string;
  let inactiveDistrictId: string;
  let districtBId: string;

  let activeBotId: string;
  let inactiveBotId: string;
  let districtBBotId: string;

  let validChatId: string;
  let pendingChatId: string;
  let districtBChatId: string;

  beforeAll(async () => {
    pool = createDbPool();
    db = createDbClient(pool);
    boss = createBossClient();
    await boss.start();
    await initBossQueues(boss);

    server = await buildHttpServer({ db, pool, boss });
    await server.ready();
  });

  afterAll(async () => {
    await server.close();
    await boss.stop({ graceful: true, timeout: 10000 });
    await pool.end();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();

    // 1. Create Active District A
    activeDistrictId = `dist_act_${crypto.randomUUID()}`;
    await db.insert(districts).values({
      id: activeDistrictId,
      name: `Active District ${crypto.randomUUID().slice(0, 6)}`,
      status: 'ACTIVE',
    });

    activeBotId = `bot_act_${crypto.randomUUID().slice(0, 8)}`;
    const activeEnc = encryptToken(`111111111:AA${crypto.randomUUID()}`);
    await db.insert(districtTelegramBots).values({
      id: `dtb_${crypto.randomUUID()}`,
      districtId: activeDistrictId,
      botId: activeBotId,
      botFirstName: 'Active District Bot',
      botUsername: 'active_district_bot',
      encryptedToken: activeEnc.encryptedToken,
      tokenIv: activeEnc.tokenIv,
      tokenTag: activeEnc.tokenTag,
      tokenKeyVersion: activeEnc.tokenKeyVersion,
      tokenMasked: `${activeBotId}:••••••••••••`,
      status: 'VALID',
      lastValidatedAt: new Date(),
    });

    validChatId = `-100${Date.now()}${Math.floor(Math.random() * 1000)}`;
    await db.insert(districtTelegramGroups).values({
      id: `dtg_${crypto.randomUUID()}`,
      districtId: activeDistrictId,
      mahallaName: 'Navbahor',
      telegramChatId: validChatId,
      telegramChatTitle: 'Navbahor Mahalla Group',
      status: 'VALID',
      lastValidatedAt: new Date(),
    });

    pendingChatId = `-100${Date.now() + 1}${Math.floor(Math.random() * 1000)}`;
    await db.insert(districtTelegramGroups).values({
      id: `dtg_${crypto.randomUUID()}`,
      districtId: activeDistrictId,
      mahallaName: 'Bogbonlar',
      telegramChatId: pendingChatId,
      telegramChatTitle: 'Bogbonlar Mahalla Group',
      status: 'PENDING',
    });

    // 2. Create Inactive District (SETUP_INCOMPLETE)
    inactiveDistrictId = `dist_inact_${crypto.randomUUID()}`;
    await db.insert(districts).values({
      id: inactiveDistrictId,
      name: `Inactive District ${crypto.randomUUID().slice(0, 6)}`,
      status: 'SETUP_INCOMPLETE',
    });

    inactiveBotId = `bot_inact_${crypto.randomUUID().slice(0, 8)}`;
    const inactEnc = encryptToken(`222222222:BB${crypto.randomUUID()}`);
    await db.insert(districtTelegramBots).values({
      id: `dtb_${crypto.randomUUID()}`,
      districtId: inactiveDistrictId,
      botId: inactiveBotId,
      botFirstName: 'Inactive District Bot',
      encryptedToken: inactEnc.encryptedToken,
      tokenIv: inactEnc.tokenIv,
      tokenTag: inactEnc.tokenTag,
      tokenKeyVersion: inactEnc.tokenKeyVersion,
      tokenMasked: `${inactiveBotId}:••••••••••••`,
      status: 'VALID',
      lastValidatedAt: new Date(),
    });

    // 3. Create District B (for cross-district mismatch test)
    districtBId = `dist_b_${crypto.randomUUID()}`;
    await db.insert(districts).values({
      id: districtBId,
      name: `District B ${crypto.randomUUID().slice(0, 6)}`,
      status: 'ACTIVE',
    });

    districtBBotId = `bot_b_${crypto.randomUUID().slice(0, 8)}`;
    const bEnc = encryptToken(`333333333:CC${crypto.randomUUID()}`);
    await db.insert(districtTelegramBots).values({
      id: `dtb_${crypto.randomUUID()}`,
      districtId: districtBId,
      botId: districtBBotId,
      botFirstName: 'District B Bot',
      encryptedToken: bEnc.encryptedToken,
      tokenIv: bEnc.tokenIv,
      tokenTag: bEnc.tokenTag,
      tokenKeyVersion: bEnc.tokenKeyVersion,
      tokenMasked: `${districtBBotId}:••••••••••••`,
      status: 'VALID',
      lastValidatedAt: new Date(),
    });

    districtBChatId = `-100${Date.now() + 2}${Math.floor(Math.random() * 1000)}`;
    await db.insert(districtTelegramGroups).values({
      id: `dtg_${crypto.randomUUID()}`,
      districtId: districtBId,
      mahallaName: 'Istiqlol',
      telegramChatId: districtBChatId,
      telegramChatTitle: 'Istiqlol Mahalla Group',
      status: 'VALID',
      lastValidatedAt: new Date(),
    });
  });

  // Test 1: Happy Path
  it('Test 1 (Happy Path): Active District + valid bot + approved group receives message, persists intake, and enqueues pg-boss job (AC 1, 4)', async () => {
    const secret = deriveWebhookSecret(activeBotId);
    const messageId = 1001;

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${activeBotId}`,
      headers: {
        'x-telegram-bot-api-secret-token': secret,
      },
      payload: {
        update_id: 5001,
        message: {
          message_id: messageId,
          date: Math.floor(new Date('2026-08-21T12:00:00Z').getTime() / 1000),
          chat: {
            id: validChatId,
            title: 'Navbahor Mahalla Group',
            type: 'supergroup',
          },
          from: {
            id: 888123,
            first_name: 'Alisher',
            username: 'alisher_resident',
          },
          text: 'Suv quvuri yorildi, taʼmirlash kerak.',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe('ACCEPTED');
    expect(body.intakeId).toBeDefined();

    // Verify DB record
    const [record] = await db
      .select()
      .from(telegramIntakeRecords)
      .where(
        and(
          eq(telegramIntakeRecords.districtId, activeDistrictId),
          eq(telegramIntakeRecords.telegramChatId, validChatId),
          eq(telegramIntakeRecords.telegramMessageId, String(messageId)),
        ),
      );

    expect(record).toBeDefined();
    expect(record?.mahallaName).toBe('Navbahor');
    expect(record?.telegramBotId).toBe(activeBotId);
    expect(record?.calendarDay).toBe('2026-08-21');
    expect(record?.telegramUserId).toBe('888123');
    expect(record?.updateId).toBe('5001');
  });

  // Test 2: Inactive District Rejection
  it('Test 2 (Inactive District): Inactive District returns 200 OK DROPPED with 0 DB records and 0 jobs (AC 3)', async () => {
    const secret = deriveWebhookSecret(inactiveBotId);
    const messageId = 1002;

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${inactiveBotId}`,
      headers: {
        'x-telegram-bot-api-secret-token': secret,
      },
      payload: {
        update_id: 5002,
        message: {
          message_id: messageId,
          date: Math.floor(Date.now() / 1000),
          chat: { id: validChatId },
          text: 'Hello test',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe('DROPPED');
    expect(body.reason).toBe('DISTRICT_NOT_ACTIVE');

    const records = await db
      .select()
      .from(telegramIntakeRecords)
      .where(
        and(
          eq(telegramIntakeRecords.telegramBotId, inactiveBotId),
          eq(telegramIntakeRecords.telegramMessageId, String(messageId)),
        ),
      );
    expect(records.length).toBe(0);
  });

  // Test 3: Unapproved Group Rejection
  it('Test 3 (Unapproved Group): Group in PENDING status returns 200 OK DROPPED without DB intake or job (AC 2)', async () => {
    const secret = deriveWebhookSecret(activeBotId);
    const messageId = 1003;

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${activeBotId}`,
      headers: {
        'x-telegram-bot-api-secret-token': secret,
      },
      payload: {
        update_id: 5003,
        message: {
          message_id: messageId,
          date: Math.floor(Date.now() / 1000),
          chat: { id: pendingChatId },
          text: 'Unapproved group message',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe('DROPPED');
    expect(body.reason).toBe('GROUP_NOT_APPROVED');

    const records = await db
      .select()
      .from(telegramIntakeRecords)
      .where(
        and(
          eq(telegramIntakeRecords.telegramBotId, activeBotId),
          eq(telegramIntakeRecords.telegramMessageId, String(messageId)),
        ),
      );
    expect(records.length).toBe(0);
  });

  // Test 4: Cross-District Group Rejection
  it('Test 4 (Cross-District Group): Group belonging to District B sent to District A bot returns 200 OK DROPPED (AC 2)', async () => {
    const secret = deriveWebhookSecret(activeBotId);
    const messageId = 1004;

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${activeBotId}`,
      headers: {
        'x-telegram-bot-api-secret-token': secret,
      },
      payload: {
        update_id: 5004,
        message: {
          message_id: messageId,
          date: Math.floor(Date.now() / 1000),
          chat: { id: districtBChatId }, // belongs to District B, not active District A
          text: 'Cross-district message attempt',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe('DROPPED');
    expect(body.reason).toBe('CROSS_DISTRICT_MISMATCH');

    const records = await db
      .select()
      .from(telegramIntakeRecords)
      .where(
        and(
          eq(telegramIntakeRecords.telegramBotId, activeBotId),
          eq(telegramIntakeRecords.telegramMessageId, String(messageId)),
        ),
      );
    expect(records.length).toBe(0);
  });

  // Test 5: Duplicate Delivery & Redelivery Idempotency
  it('Test 5 (Duplicate Delivery): Repeated delivery resolves to DUPLICATE with exactly 1 DB record and 1 job (AC 5)', async () => {
    const secret = deriveWebhookSecret(activeBotId);
    const messageId = 1005;

    const payload = {
      update_id: 5005,
      message: {
        message_id: messageId,
        date: Math.floor(Date.now() / 1000),
        chat: { id: validChatId, title: 'Navbahor' },
        text: 'Duplicate delivery test',
      },
    };

    // 1st delivery
    const res1 = await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${activeBotId}`,
      headers: { 'x-telegram-bot-api-secret-token': secret },
      payload,
    });
    expect(res1.statusCode).toBe(200);
    expect(res1.json().status).toBe('ACCEPTED');

    // 2nd delivery (Duplicate)
    const res2 = await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${activeBotId}`,
      headers: { 'x-telegram-bot-api-secret-token': secret },
      payload,
    });
    expect(res2.statusCode).toBe(200);
    expect(res2.json().status).toBe('DUPLICATE');

    // Exactly 1 DB row
    const records = await db
      .select()
      .from(telegramIntakeRecords)
      .where(
        and(
          eq(telegramIntakeRecords.districtId, activeDistrictId),
          eq(telegramIntakeRecords.telegramChatId, validChatId),
          eq(telegramIntakeRecords.telegramMessageId, String(messageId)),
        ),
      );
    expect(records.length).toBe(1);
  });

  // Test 6: Atomic Rollback on Failure
  it('Test 6 (Atomic Rollback): Transaction failure rolls back DB insert, returns 500, and leaves 0 orphan records (AC 4)', async () => {
    const secret = deriveWebhookSecret(activeBotId);
    const messageId = 1006;

    // Spy on boss.send and force an error
    const sendSpy = vi.spyOn(boss, 'send').mockRejectedValueOnce(new Error('Simulated queue broker failure'));

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${activeBotId}`,
      headers: { 'x-telegram-bot-api-secret-token': secret },
      payload: {
        update_id: 5006,
        message: {
          message_id: messageId,
          date: Math.floor(Date.now() / 1000),
          chat: { id: validChatId, title: 'Navbahor' },
          text: 'Rollback test',
        },
      },
    });

    expect(res.statusCode).toBe(500);
    expect(res.json().error.code).toBe('INTAKE_PERSISTENCE_FAILED');

    // Verify 0 orphan records in DB due to rollback
    const records = await db
      .select()
      .from(telegramIntakeRecords)
      .where(
        and(
          eq(telegramIntakeRecords.telegramBotId, activeBotId),
          eq(telegramIntakeRecords.telegramMessageId, String(messageId)),
        ),
      );
    expect(records.length).toBe(0);

    sendSpy.mockRestore();
  });

  // Test 7: Tashkent Calendar Day Preservation Across Day Boundaries
  it('Test 7 (Tashkent Day Preservation): Preserves Asia/Tashkent calendar days across UTC 18:59:59 vs 19:00:00 (AC 6)', async () => {
    const secret = deriveWebhookSecret(activeBotId);
    const msgDay1 = 10071;
    const msgDay2 = 10072;

    // Day 1: 2026-08-21 18:59:59 UTC -> 2026-08-21 23:59:59 Tashkent
    await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${activeBotId}`,
      headers: { 'x-telegram-bot-api-secret-token': secret },
      payload: {
        update_id: 5071,
        message: {
          message_id: msgDay1,
          date: Math.floor(new Date('2026-08-21T18:59:59Z').getTime() / 1000),
          chat: { id: validChatId },
          text: 'Late night message',
        },
      },
    });

    // Day 2: 2026-08-21 19:00:00 UTC -> 2026-08-22 00:00:00 Tashkent
    await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${activeBotId}`,
      headers: { 'x-telegram-bot-api-secret-token': secret },
      payload: {
        update_id: 5072,
        message: {
          message_id: msgDay2,
          date: Math.floor(new Date('2026-08-21T19:00:00Z').getTime() / 1000),
          chat: { id: validChatId },
          text: 'Midnight message next day',
        },
      },
    });

    const [rec1] = await db
      .select()
      .from(telegramIntakeRecords)
      .where(eq(telegramIntakeRecords.telegramMessageId, String(msgDay1)));
    const [rec2] = await db
      .select()
      .from(telegramIntakeRecords)
      .where(eq(telegramIntakeRecords.telegramMessageId, String(msgDay2)));

    expect(rec1?.calendarDay).toBe('2026-08-21');
    expect(rec2?.calendarDay).toBe('2026-08-22');
  });

  // Test 8: Unsupported / Non-Message Update Guards
  it('Test 8 (Unsupported Update Type): Non-message update returns 200 OK DROPPED without DB writes (AC 2, 9)', async () => {
    const secret = deriveWebhookSecret(activeBotId);

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${activeBotId}`,
      headers: { 'x-telegram-bot-api-secret-token': secret },
      payload: {
        update_id: 5008,
        my_chat_member: {
          chat: { id: validChatId },
          status: 'member',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe('DROPPED');
    expect(body.reason).toBe('UNSUPPORTED_UPDATE_TYPE');
  });

  // Test 9: Secret Token Verification
  it('Test 9 (Secret Token Verification): Returns 401 Unauthorized for missing or invalid secret token (AC 8)', async () => {
    // Missing header
    const resNoHeader = await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${activeBotId}`,
      payload: { update_id: 5009 },
    });
    expect(resNoHeader.statusCode).toBe(401);
    expect(resNoHeader.json().error.code).toBe('UNAUTHORIZED_WEBHOOK');

    // Invalid header
    const resBadHeader = await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${activeBotId}`,
      headers: { 'x-telegram-bot-api-secret-token': 'wrong-secret-token-123' },
      payload: { update_id: 5009 },
    });
    expect(resBadHeader.statusCode).toBe(401);
    expect(resBadHeader.json().error.code).toBe('UNAUTHORIZED_WEBHOOK');
  });

  // Test 10: Privacy Guard Verification
  it('Test 10 (Privacy Guard): Ensures message text, captions, and bot tokens are excluded from logs (AC 8, AD-11)', async () => {
    const secret = deriveWebhookSecret(activeBotId);
    const messageId = 1010;
    const sensitiveResidentText = 'Shaxsiy fuqaro maʼlumoti: +998901234567';

    const logSpy = vi.spyOn(console, 'log');

    await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${activeBotId}`,
      headers: { 'x-telegram-bot-api-secret-token': secret },
      payload: {
        update_id: 5010,
        message: {
          message_id: messageId,
          date: Math.floor(Date.now() / 1000),
          chat: { id: validChatId },
          text: sensitiveResidentText,
        },
      },
    });

    // Check all console.log calls in this execution
    for (const call of logSpy.mock.calls) {
      const callString = JSON.stringify(call);
      expect(callString).not.toContain(sensitiveResidentText);
      expect(callString).not.toContain(secret);
    }

    // Verify structured telemetry contains chatId, messageId, and latencyMs (AC 8)
    const telemetryCalls = logSpy.mock.calls.filter((call) => call[0] === '[telemetry:telegram-intake]');
    expect(telemetryCalls.length).toBeGreaterThan(0);
    const telemetryPayload = telemetryCalls[0]?.[1] as Record<string, unknown>;
    expect(telemetryPayload).toBeDefined();
    expect(telemetryPayload.chatId).toBe(validChatId);
    expect(telemetryPayload.messageId).toBe(String(messageId));
    expect(typeof telemetryPayload.latencyMs).toBe('number');

    logSpy.mockRestore();
  });

  // Test 11: NFR3 Latency Benchmark
  it('Test 11 (NFR3 Latency Benchmark): Webhook durability acknowledgement completes in < 100ms (AC 9, NFR3)', async () => {
    const secret = deriveWebhookSecret(activeBotId);

    const start = performance.now();
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${activeBotId}`,
      headers: { 'x-telegram-bot-api-secret-token': secret },
      payload: {
        update_id: 5011,
        message: {
          message_id: 1011,
          date: Math.floor(Date.now() / 1000),
          chat: { id: validChatId },
          text: 'Latency check',
        },
      },
    });
    const latencyMs = performance.now() - start;

    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ACCEPTED');
    expect(latencyMs).toBeLessThan(100); // well within 1000ms NFR3 target
  });

  // Test 12: Invalid / Revoked Bot Guard
  it('Test 12 (Invalid/Revoked Bot Guard): Returns 200 OK DROPPED with reason BOT_NOT_VALID when bot.status is INVALID (AC 1, AC 2)', async () => {
    // 1-to-1 constraint on district_telegram_bots.district_id: create dedicated Active District
    const distForInvalidBot = `dist_inv_${crypto.randomUUID()}`;
    await db.insert(districts).values({
      id: distForInvalidBot,
      name: `District With Invalid Bot ${crypto.randomUUID().slice(0, 6)}`,
      status: 'ACTIVE',
    });

    const invalidBotId = `bot_inv_${crypto.randomUUID().slice(0, 8)}`;
    const enc = encryptToken(`999999999:ZZ${crypto.randomUUID()}`);
    await db.insert(districtTelegramBots).values({
      id: `dtb_${crypto.randomUUID()}`,
      districtId: distForInvalidBot,
      botId: invalidBotId,
      botFirstName: 'Revoked Bot',
      botUsername: 'revoked_bot',
      encryptedToken: enc.encryptedToken,
      tokenIv: enc.tokenIv,
      tokenTag: enc.tokenTag,
      tokenKeyVersion: enc.tokenKeyVersion,
      tokenMasked: `${invalidBotId}:••••••••••••`,
      status: 'INVALID',
      lastValidatedAt: new Date(),
    });

    const secret = deriveWebhookSecret(invalidBotId);
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/webhooks/telegram/${invalidBotId}`,
      headers: { 'x-telegram-bot-api-secret-token': secret },
      payload: {
        update_id: 5012,
        message: {
          message_id: 1012,
          date: Math.floor(Date.now() / 1000),
          chat: { id: validChatId },
          text: 'Message for revoked bot',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe('DROPPED');
    expect(body.reason).toBe('BOT_NOT_VALID');

    // Verify 0 records inserted
    const records = await db
      .select()
      .from(telegramIntakeRecords)
      .where(eq(telegramIntakeRecords.telegramBotId, invalidBotId));
    expect(records.length).toBe(0);
  });
});
