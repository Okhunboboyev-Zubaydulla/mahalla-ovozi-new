import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import pg from 'pg';
import crypto from 'node:crypto';
import { sql } from 'drizzle-orm';
import { createDbPool, createDbClient, DbClient } from '../src/adapters/db/client.js';
import { buildHttpServer } from '../src/entrypoints/http.js';
import {
  districts,
  telegramIntakeRecords,
  aiProfiles,
  aiOperations,
  acceptedEvidence,
  topics,
  topicProjections,
  auditEvents,
} from '../src/adapters/db/schema/index.js';
import { createOrResetProductOwner } from '../src/modules/auth/account-service.js';
import { COOKIE_NAME } from '../src/modules/auth/session-manager.js';
import { createBossClient, initBossQueues } from '../src/adapters/jobs/boss-client.js';
import { purgeExpiredDebugIntakePayloads } from '../src/modules/retention/debug-payload-retention.js';
import { extractSignalVerbatimText } from '../src/modules/ai/signal-management-service.js';
import type PgBoss from 'pg-boss';

const SAME_ORIGIN_HEADERS = {
  origin: 'http://localhost:5173',
  host: 'localhost:3000',
};

describe('Signal & Evidence Management Console & CRUD Verification', () => {
  let pool: pg.Pool;
  let db: DbClient;
  let boss: PgBoss;
  let server: FastifyInstance;

  let poCookie: string;
  let testDistrictId: string;
  const mahallaName = 'Istiqlol MFY';
  const calendarDay = '2026-09-01';

  let relevantIntakeId: string;
  let excludedIntakeId: string;
  let evidenceId: string;
  let topicId: string;

  beforeAll(async () => {
    pool = createDbPool();
    db = createDbClient(pool);
    boss = createBossClient();
    await boss.start();
    await initBossQueues(boss);

    server = await buildHttpServer({ db, pool, boss });
    await server.ready();

    // 1. Authenticate Product Owner
    const poUsername = `po_signals_${Date.now()}`;
    const poPassword = 'SecurePOPassword2026!';
    await createOrResetProductOwner(db, {
      username: poUsername,
      password: poPassword,
    });

    const signInRes = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-in',
      headers: SAME_ORIGIN_HEADERS,
      payload: {
        username: poUsername,
        password: poPassword,
      },
    });
    expect(signInRes.statusCode).toBe(200);
    const sessionCookie = signInRes.cookies.find((c) => c.name === COOKIE_NAME);
    expect(sessionCookie).toBeDefined();
    poCookie = `${sessionCookie!.name}=${sessionCookie!.value}`;

    // 2. Create Test District
    testDistrictId = `dist_sig_${crypto.randomUUID()}`;
    await db.insert(districts).values({
      id: testDistrictId,
      name: `District_Signals_${crypto.randomUUID().slice(0, 6)}`,
      status: 'ACTIVE',
    });

    // 2.1 Seed Test AI Profile
    const profileId = `prof_test_${crypto.randomUUID().slice(0, 8)}`;
    await db.insert(aiProfiles).values({
      id: profileId,
      version: 1,
      operationType: 'SEMANTIC_RELEVANCE',
      provider: 'OPENAI',
      modelId: 'gpt-4o-mini',
      promptVersion: 'v1',
      schemaVersion: 'v1',
      temperature: 0.0,
      maxOutputTokens: 500,
      timeoutMs: 10000,
      retryPolicy: { maxAttempts: 3 },
      capabilities: { structuredOutputs: true },
      isActive: true,
    });

    // 3. Create Relevant Intake & Evidence & Topic
    relevantIntakeId = `intake_rel_${crypto.randomUUID()}`;
    await db.insert(telegramIntakeRecords).values({
      id: relevantIntakeId,
      districtId: testDistrictId,
      mahallaName,
      telegramBotId: 'bot_test',
      telegramChatId: '-1001234567',
      telegramMessageId: '1001',
      originalTimestamp: new Date('2026-09-01T10:00:00.000Z'),
      calendarDay,
      rawPayload: {
        text: 'Suv o`chib qoldi, 3 kundan beri suv yo`q',
        from: { id: 111, first_name: 'Resident A' },
      },
    });

    const relevantAiOpId = `aiop_${crypto.randomUUID()}`;
    await db.insert(aiOperations).values({
      id: relevantAiOpId,
      districtId: testDistrictId,
      mahallaName,
      calendarDay,
      operationType: 'SEMANTIC_RELEVANCE',
      targetId: relevantIntakeId,
      pinnedProfileId: profileId,
      snapshotFingerprint: 'fp_test',
      finalStatus: 'COMPLETED_RELEVANT',
      resultPayload: {
        is_relevant: true,
        relevant_lanes: ['WATER'],
        exclusion_reason: null,
        reasoning: 'Tap water outage reported by resident for 3 days',
      },
    });

    topicId = `top_${crypto.randomUUID()}`;
    await db.insert(topics).values({
      id: topicId,
      districtId: testDistrictId,
      mahallaName,
      calendarDay,
      primaryLane: 'WATER',
      status: 'ACTIVE',
      latestRelevantEvidenceTimestamp: new Date('2026-09-01T10:00:00.000Z'),
      retentionExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      requiredDerivedGeneration: 1,
      appliedDerivedGeneration: 1,
    });

    evidenceId = `evi_${crypto.randomUUID()}`;
    await db.insert(acceptedEvidence).values({
      id: evidenceId,
      topicId,
      districtId: testDistrictId,
      mahallaName,
      calendarDay,
      intakeRecordId: relevantIntakeId,
      telegramChatId: '-1001234567',
      telegramMessageId: '1001',
      originalTimestamp: new Date('2026-09-01T10:00:00.000Z'),
      verbatimText: 'Suv o`chib qoldi, 3 kundan beri suv yo`q',
      contentType: 'TEXT',
      aiOperationId: relevantAiOpId,
    });

    await db.insert(topicProjections).values({
      id: `prj_${crypto.randomUUID()}`,
      topicId,
      districtId: testDistrictId,
      mahallaName,
      calendarDay,
      summary: 'Истиқлол МФЙда сув таъминотида 3 кунлик узилиш кузатилмоқда.',
      lanes: ['WATER'],
      primaryLane: 'WATER',
      anchorEvidenceId: evidenceId,
      anchorQuote: '3 kundan beri suv yo`q',
      latestMeaningfulActivityTimestamp: new Date('2026-09-01T10:00:00.000Z'),
      attribution: 'Telegram',
      generation: 1,
      aiProfileId: profileId,
    });

    // 4. Create Excluded Intake with Bounded Debug Retention
    excludedIntakeId = `intake_ex_${crypto.randomUUID()}`;
    await db.insert(telegramIntakeRecords).values({
      id: excludedIntakeId,
      districtId: testDistrictId,
      mahallaName,
      telegramBotId: 'bot_test',
      telegramChatId: '-1001234567',
      telegramMessageId: '1002',
      originalTimestamp: new Date('2026-09-01T11:00:00.000Z'),
      calendarDay,
      rawPayload: {
        status: 'EXCLUDED',
        exclusionReason: 'ADVERTISEMENT_OR_SPAM',
        verbatimText: 'Kvartira ijaraga beriladi, arzon narxda!',
        reasoning: 'Commercial apartment rental advertisement',
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      },
    });

    await db.insert(aiOperations).values({
      id: `aiop_${crypto.randomUUID()}`,
      districtId: testDistrictId,
      mahallaName,
      calendarDay,
      operationType: 'SEMANTIC_RELEVANCE',
      targetId: excludedIntakeId,
      pinnedProfileId: profileId,
      snapshotFingerprint: 'fp_test',
      finalStatus: 'COMPLETED_IRRELEVANT',
      resultPayload: {
        is_relevant: false,
        relevant_lanes: [],
        exclusion_reason: 'ADVERTISEMENT_OR_SPAM',
        reasoning: 'Commercial apartment rental advertisement',
      },
    });
  });

  it('1. GET /api/v1/admin/signals lists signals with full text, decisions, and reasoning', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/admin/signals?districtId=${testDistrictId}`,
      headers: {
        ...SAME_ORIGIN_HEADERS,
        cookie: poCookie,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.items).toBeDefined();
    expect(body.items.length).toBeGreaterThanOrEqual(2);

    const relevant = body.items.find((i: any) => i.intakeId === relevantIntakeId);
    expect(relevant).toBeDefined();
    expect(relevant.isRelevant).toBe(true);
    expect(relevant.verbatimText).toContain('Suv o`chib qoldi');
    expect(relevant.reasoning).toContain('Tap water outage');
    expect(relevant.relevantLanes).toContain('WATER');

    const excluded = body.items.find((i: any) => i.intakeId === excludedIntakeId);
    expect(excluded).toBeDefined();
    expect(excluded.isRelevant).toBe(false);
    expect(excluded.verbatimText).toContain('Kvartira ijaraga beriladi');
    expect(excluded.exclusionReason).toBe('ADVERTISEMENT_OR_SPAM');
    expect(excluded.reasoning).toContain('Commercial apartment rental');
  });

  it('2. GET /api/v1/admin/signals filters by isRelevant status', async () => {
    const resRelevant = await server.inject({
      method: 'GET',
      url: `/api/v1/admin/signals?districtId=${testDistrictId}&isRelevant=true`,
      headers: {
        ...SAME_ORIGIN_HEADERS,
        cookie: poCookie,
      },
    });
    expect(resRelevant.statusCode).toBe(200);
    const bodyRel = JSON.parse(resRelevant.payload);
    expect(bodyRel.items.every((i: any) => i.isRelevant === true)).toBe(true);

    const resExcluded = await server.inject({
      method: 'GET',
      url: `/api/v1/admin/signals?districtId=${testDistrictId}&isRelevant=false`,
      headers: {
        ...SAME_ORIGIN_HEADERS,
        cookie: poCookie,
      },
    });
    expect(resExcluded.statusCode).toBe(200);
    const bodyEx = JSON.parse(resExcluded.payload);
    expect(bodyEx.items.every((i: any) => i.isRelevant === false)).toBe(true);
  });

  it('3. GET /api/v1/admin/signals/:id returns single signal detail', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/admin/signals/${relevantIntakeId}`,
      headers: {
        ...SAME_ORIGIN_HEADERS,
        cookie: poCookie,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.signal.intakeId).toBe(relevantIntakeId);
    expect(body.signal.verbatimText).toContain('Suv o`chib qoldi');
  });

  it('4. POST /api/v1/admin/signals/:id/promote promotes an excluded message and logs audit event', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/signals/${excludedIntakeId}/promote`,
      headers: {
        ...SAME_ORIGIN_HEADERS,
        cookie: poCookie,
      },
      payload: {
        lanes: ['HOKIM_RELATED'],
        changeReason: 'Manual PO test override for promotion',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.intakeId).toBe(excludedIntakeId);

    // Verify audit event recorded
    const [audit] = await db
      .select()
      .from(auditEvents)
      .where(sql`${auditEvents.action} = 'SIGNAL_PROMOTED_TO_EVIDENCE'`)
      .orderBy(sql`${auditEvents.createdAt} DESC`)
      .limit(1);

    expect(audit).toBeDefined();
    expect((audit!.metadata as any)?.intakeId).toBe(excludedIntakeId);
    expect((audit!.metadata as any)?.changeReason).toBe('Manual PO test override for promotion');
  });

  it('5. PATCH /api/v1/admin/signals/:id/evidence updates verbatim text and logs audit event', async () => {
    const newText = 'Suv o`chib qoldi, 3 kundan beri suv yo`q (tahrirlangan)';
    const res = await server.inject({
      method: 'PATCH',
      url: `/api/v1/admin/signals/${evidenceId}/evidence`,
      headers: {
        ...SAME_ORIGIN_HEADERS,
        cookie: poCookie,
      },
      payload: {
        verbatimText: newText,
        changeReason: 'Corrected punctuation in resident message',
      },
    });

    expect(res.statusCode).toBe(200);
    const [updatedEvidence] = await db
      .select()
      .from(acceptedEvidence)
      .where(sql`${acceptedEvidence.id} = ${evidenceId}`)
      .limit(1);

    expect(updatedEvidence).toBeDefined();
    expect(updatedEvidence!.verbatimText).toBe(newText);

    // Verify audit event
    const [audit] = await db
      .select()
      .from(auditEvents)
      .where(sql`${auditEvents.action} = 'EVIDENCE_TEXT_UPDATED'`)
      .orderBy(sql`${auditEvents.createdAt} DESC`)
      .limit(1);

    expect(audit).toBeDefined();
    expect((audit!.metadata as any)?.evidenceId).toBe(evidenceId);
  });

  it('6. POST /api/v1/admin/signals/:id/reclassify reclassifies evidence lane', async () => {
    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/signals/${evidenceId}/reclassify`,
      headers: {
        ...SAME_ORIGIN_HEADERS,
        cookie: poCookie,
      },
      payload: {
        lanes: ['ELECTRICITY'],
        changeReason: 'Resident message actually reported electric transformer outage',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.newTopicId).toBeDefined();

    // Verify evidence moved to electricity topic
    const [updatedEvidence] = await db
      .select()
      .from(acceptedEvidence)
      .where(sql`${acceptedEvidence.id} = ${evidenceId}`)
      .limit(1);

    expect(updatedEvidence).toBeDefined();
    expect(updatedEvidence!.topicId).toBe(body.newTopicId);
  });

  it('7. DELETE /api/v1/admin/signals/:id/evidence deletes evidence and cascades clean topic removal', async () => {
    const res = await server.inject({
      method: 'DELETE',
      url: `/api/v1/admin/signals/${evidenceId}/evidence`,
      headers: {
        ...SAME_ORIGIN_HEADERS,
        cookie: poCookie,
      },
      payload: {
        changeReason: 'Test cleanup of single-evidence topic',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);

    const [deletedEvidence] = await db
      .select()
      .from(acceptedEvidence)
      .where(sql`${acceptedEvidence.id} = ${evidenceId}`)
      .limit(1);
    expect(deletedEvidence).toBeUndefined();

    // Verify audit event
    const [audit] = await db
      .select()
      .from(auditEvents)
      .where(sql`${auditEvents.action} = 'EVIDENCE_DELETED'`)
      .orderBy(sql`${auditEvents.createdAt} DESC`)
      .limit(1);

    expect(audit).toBeDefined();
    expect((audit!.metadata as any)?.evidenceId).toBe(evidenceId);
  });

  it('8. POST /api/v1/admin/signals/manual creates manual civic signal', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/v1/admin/signals/manual',
      headers: {
        ...SAME_ORIGIN_HEADERS,
        cookie: poCookie,
      },
      payload: {
        districtId: testDistrictId,
        mahallaName: 'Beshariq MFY',
        verbatimText: 'Qishloqda transformator yonib ketdi',
        lanes: ['ELECTRICITY'],
        changeReason: 'Direct citizen hotline appeal',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.success).toBe(true);
    expect(body.intakeId).toBeDefined();

    // Verify intake record exists
    const [intake] = await db
      .select()
      .from(telegramIntakeRecords)
      .where(sql`${telegramIntakeRecords.id} = ${body.intakeId}`)
      .limit(1);

    expect(intake).toBeDefined();
    expect(intake!.mahallaName).toBe('Beshariq MFY');
  });

  it('9. purgeExpiredDebugIntakePayloads purges expired debug payloads while keeping active ones', async () => {
    const expiredIntakeId = `intake_exp_${crypto.randomUUID()}`;
    await db.insert(telegramIntakeRecords).values({
      id: expiredIntakeId,
      districtId: testDistrictId,
      mahallaName,
      telegramBotId: 'bot_test',
      telegramChatId: '-1001234567',
      telegramMessageId: '9999',
      originalTimestamp: new Date('2026-08-01T10:00:00.000Z'),
      calendarDay: '2026-08-01',
      rawPayload: {
        status: 'EXCLUDED',
        exclusionReason: 'GENERAL_CHATTER',
        verbatimText: 'Expired text from 30 days ago',
        expiresAt: new Date(Date.now() - 1000).toISOString(), // expired
      },
    });

    const purgeResult = await purgeExpiredDebugIntakePayloads(db, new Date());
    expect(purgeResult.purgedCount).toBeGreaterThanOrEqual(1);

    const [purged] = await db
      .select()
      .from(telegramIntakeRecords)
      .where(sql`${telegramIntakeRecords.id} = ${expiredIntakeId}`)
      .limit(1);

    expect(purged).toBeDefined();
    const payload = purged!.rawPayload as any;
    expect(payload.status).toBe('EXCLUDED');
    expect(payload.exclusionReason).toBe('GENERAL_CHATTER');
    expect(payload.verbatimText).toBeUndefined();
    expect(payload.purgedAt).toBeDefined();
  });

  it('10. GET /api/v1/admin/signals filters by lane and search keywords', async () => {
    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/admin/signals?districtId=${testDistrictId}&lane=ELECTRICITY&search=transformator`,
      headers: {
        ...SAME_ORIGIN_HEADERS,
        cookie: poCookie,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    expect(body.items[0].verbatimText).toContain('transformator');
  });

  it('11. POST /api/v1/admin/signals/:id/promote rejects promoting purged messages without verbatim text', async () => {
    const purgedIntakeId = `intake_purged_${crypto.randomUUID()}`;
    await db.insert(telegramIntakeRecords).values({
      id: purgedIntakeId,
      districtId: testDistrictId,
      mahallaName,
      telegramBotId: 'bot_test',
      telegramChatId: '-1001234567',
      telegramMessageId: '12345',
      originalTimestamp: new Date('2026-08-01T10:00:00.000Z'),
      calendarDay: '2026-08-01',
      rawPayload: {
        status: 'EXCLUDED',
        exclusionReason: 'ADVERTISEMENT_OR_SPAM',
        purgedAt: new Date().toISOString(),
      },
    });

    const res = await server.inject({
      method: 'POST',
      url: `/api/v1/admin/signals/${purgedIntakeId}/promote`,
      headers: {
        ...SAME_ORIGIN_HEADERS,
        cookie: poCookie,
      },
      payload: {
        lanes: ['WATER'],
        changeReason: 'Attempt to promote purged message',
      },
    });

    expect(res.statusCode).toBe(404);
  });

  it('12. extractSignalVerbatimText resolves native message fields and service event fallbacks', () => {
    // 1. Evidence verbatim text precedence
    expect(extractSignalVerbatimText('Evidence verbatim text', { message: { text: 'Raw text' } })).toBe('Evidence verbatim text');

    // 2. Raw message text
    expect(extractSignalVerbatimText(null, { message: { text: 'Suv oqib yotibdi' } })).toBe('Suv oqib yotibdi');

    // 3. Media caption
    expect(extractSignalVerbatimText(null, { message: { caption: 'Quvur yorildi rasm' } })).toBe('Quvur yorildi rasm');

    // 4. Service message: left_chat_participant
    expect(
      extractSignalVerbatimText(null, {
        message: { left_chat_participant: { first_name: 'Ali', last_name: 'Valiyev' } },
      }),
    ).toBe('(Хизмат хабари: Ali Valiyev гуруҳни тарк этди)');

    // 5. Fallback for completely empty payload
    expect(extractSignalVerbatimText(null, {})).toBe('(Матн мавжуд эмас)');
  });

  it('13. GET /api/v1/admin/signals extracts native Telegram text for in-flight signals and marks service message exclusions as REJECTED', async () => {
    const rawMsgIntakeId = `intake_raw_${crypto.randomUUID()}`;
    const serviceMsgIntakeId = `intake_service_${crypto.randomUUID()}`;

    // Insert in-flight message with raw Telegram update
    await db.insert(telegramIntakeRecords).values({
      id: rawMsgIntakeId,
      districtId: testDistrictId,
      mahallaName,
      telegramBotId: 'bot_test',
      telegramChatId: '-10099887766',
      telegramMessageId: '5501',
      originalTimestamp: new Date('2026-09-02T12:00:00.000Z'),
      calendarDay: '2026-09-02',
      rawPayload: {
        update_id: 112233,
        message: {
          message_id: 5501,
          date: 1788350400,
          chat: { id: -10099887766, type: 'supergroup', title: 'Test Group' },
          from: { id: 12345, is_bot: false, first_name: 'TestUser' },
          text: 'Mahallamizda suv bosimi juda past',
        },
      },
    });

    // Insert service message (user left group)
    await db.insert(telegramIntakeRecords).values({
      id: serviceMsgIntakeId,
      districtId: testDistrictId,
      mahallaName,
      telegramBotId: 'bot_test',
      telegramChatId: '-10099887766',
      telegramMessageId: '5502',
      originalTimestamp: new Date('2026-09-02T12:01:00.000Z'),
      calendarDay: '2026-09-02',
      rawPayload: {
        update_id: 112234,
        message: {
          message_id: 5502,
          date: 1788350460,
          chat: { id: -10099887766, type: 'supergroup', title: 'Test Group' },
          from: { id: 12345, is_bot: false, first_name: 'TestUser' },
          left_chat_participant: { id: 12345, is_bot: false, first_name: 'TestUser' },
        },
      },
    });

    const res = await server.inject({
      method: 'GET',
      url: `/api/v1/admin/signals?districtId=${testDistrictId}`,
      headers: {
        ...SAME_ORIGIN_HEADERS,
        cookie: poCookie,
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);

    const rawSignal = body.items.find((item: any) => item.intakeId === rawMsgIntakeId);
    expect(rawSignal).toBeDefined();
    expect(rawSignal.verbatimText).toBe('Mahallamizda suv bosimi juda past');
    expect(rawSignal.status).toBe('PENDING');

    const serviceSignal = body.items.find((item: any) => item.intakeId === serviceMsgIntakeId);
    expect(serviceSignal).toBeDefined();
    expect(serviceSignal.status).toBe('REJECTED');
    expect(serviceSignal.exclusionReason).toBe('SERVICE_MESSAGE');
    expect(serviceSignal.verbatimText).toContain('тарк этди');
  });

  afterAll(async () => {
    if (server) await server.close();
    if (boss) await boss.stop();
    if (pool) await pool.end();
  });
});
