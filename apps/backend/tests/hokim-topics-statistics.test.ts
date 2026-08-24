import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import pg from 'pg';
import crypto from 'node:crypto';
import { createDbPool, createDbClient, DbClient } from '../src/adapters/db/client.js';
import { buildHttpServer } from '../src/entrypoints/http.js';
import {
  accounts,
  districts,
  districtTelegramGroups,
  topics,
  topicProjections,
  acceptedEvidence,
  telegramIntakeRecords,
  ensureDefaultAiProfiles,
} from '../src/adapters/db/schema/index.js';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../src/adapters/crypto/argon2.js';
import { COOKIE_NAME } from '../src/modules/auth/session-manager.js';
import { getTashkentCalendarDay } from '../src/modules/telegram-intake/timezone-util.js';
import { QualifyingLane } from '@mahalla-ovozi/api-contracts';

const SAME_ORIGIN_HEADERS = {
  origin: 'http://localhost:5173',
  host: 'localhost:3000',
};

describe('Story 3.5: Neutral Statistics Aggregation Integration Tests', () => {
  let pool: pg.Pool;
  let db: DbClient;
  let server: FastifyInstance;

  let districtAId: string;
  let districtBId: string;
  let districtSingleMahallaId: string;

  let hokimACookie: string;
  let hokimBCookie: string;
  let hokimSingleCookie: string;
  let poCookie: string;

  let hokimAId: string;
  let hokimBId: string;
  let hokimSingleId: string;
  let poId: string;

  const nowEpoch = Math.floor(Date.now() / 1000);
  const todayCalendarDay = getTashkentCalendarDay(nowEpoch);
  const yesterdayCalendarDay = getTashkentCalendarDay(nowEpoch - 86400);

  const createdTopicIds: string[] = [];
  const createdRecordIds: string[] = [];

  beforeAll(async () => {
    pool = createDbPool();
    db = createDbClient(pool);
    server = await buildHttpServer({ db, pool });
    await server.ready();

    await ensureDefaultAiProfiles(db);

    // 1. Create District A (Multi-Mahalla: "Наврўз", "Боғбон", "Шодлик")
    districtAId = `dist_a_${crypto.randomUUID().slice(0, 8)}`;
    await db.insert(districts).values({
      id: districtAId,
      name: `Статистика Туман А ${districtAId}`,
      region: 'Тошкент вилояти',
      status: 'ACTIVE',
    });

    // 2. Create District B (for Tenant Isolation)
    districtBId = `dist_b_${crypto.randomUUID().slice(0, 8)}`;
    await db.insert(districts).values({
      id: districtBId,
      name: `Статистика Туман Б ${districtBId}`,
      region: 'Тошкент вилояти',
      status: 'ACTIVE',
    });

    // 3. Create District Single (District with only 1 Mahalla)
    districtSingleMahallaId = `dist_s_${crypto.randomUUID().slice(0, 8)}`;
    await db.insert(districts).values({
      id: districtSingleMahallaId,
      name: `Ягона Маҳаллали Туман ${districtSingleMahallaId}`,
      region: 'Тошкент вилояти',
      status: 'ACTIVE',
    });

    // Seed Telegram groups
    await db.insert(districtTelegramGroups).values([
      {
        id: `grp_a1_${crypto.randomUUID().slice(0, 8)}`,
        districtId: districtAId,
        telegramChatId: `-1001${Date.now()}1`,
        telegramChatTitle: 'Наврўз Гуруҳи',
        mahallaName: 'Наврўз',
        status: 'VALID',
      },
      {
        id: `grp_a2_${crypto.randomUUID().slice(0, 8)}`,
        districtId: districtAId,
        telegramChatId: `-1001${Date.now()}2`,
        telegramChatTitle: 'Боғбон Гуруҳи',
        mahallaName: 'Боғбон',
        status: 'VALID',
      },
      {
        id: `grp_a3_${crypto.randomUUID().slice(0, 8)}`,
        districtId: districtAId,
        telegramChatId: `-1001${Date.now()}3`,
        telegramChatTitle: 'Шодлик Гуруҳи',
        mahallaName: 'Шодлик',
        status: 'VALID',
      },
      {
        id: `grp_b1_${crypto.randomUUID().slice(0, 8)}`,
        districtId: districtBId,
        telegramChatId: `-1001${Date.now()}4`,
        telegramChatTitle: 'Чорсу Гуруҳи',
        mahallaName: 'Чорсу',
        status: 'VALID',
      },
      {
        id: `grp_s1_${crypto.randomUUID().slice(0, 8)}`,
        districtId: districtSingleMahallaId,
        telegramChatId: `-1001${Date.now()}5`,
        telegramChatTitle: 'Ягона Маҳалла Гуруҳи',
        mahallaName: 'Ягона Маҳалла',
        status: 'VALID',
      },
    ]);

    // Create Hokim A
    hokimAId = `acc_hokim_a_${crypto.randomUUID().slice(0, 8)}`;
    const passHashA = await hashPassword('HokimPassword2026!');
    await db.insert(accounts).values({
      id: hokimAId,
      username: `hokim_stats_a_${Date.now()}`,
      passwordHash: passHashA,
      role: 'DISTRICT_HOKIM',
      status: 'ACTIVE',
      districtId: districtAId,
      mustChangePassword: false,
    });

    // Create Hokim B
    hokimBId = `acc_hokim_b_${crypto.randomUUID().slice(0, 8)}`;
    const passHashB = await hashPassword('HokimPassword2026!');
    await db.insert(accounts).values({
      id: hokimBId,
      username: `hokim_stats_b_${Date.now()}`,
      passwordHash: passHashB,
      role: 'DISTRICT_HOKIM',
      status: 'ACTIVE',
      districtId: districtBId,
      mustChangePassword: false,
    });

    // Create Hokim Single Mahalla
    hokimSingleId = `acc_hokim_s_${crypto.randomUUID().slice(0, 8)}`;
    const passHashS = await hashPassword('HokimPassword2026!');
    await db.insert(accounts).values({
      id: hokimSingleId,
      username: `hokim_stats_s_${Date.now()}`,
      passwordHash: passHashS,
      role: 'DISTRICT_HOKIM',
      status: 'ACTIVE',
      districtId: districtSingleMahallaId,
      mustChangePassword: false,
    });

    // Create Product Owner
    poId = `acc_po_${crypto.randomUUID().slice(0, 8)}`;
    const passHashPO = await hashPassword('POPassword2026!');
    await db.insert(accounts).values({
      id: poId,
      username: `po_stats_${Date.now()}`,
      passwordHash: passHashPO,
      role: 'PRODUCT_OWNER',
      status: 'ACTIVE',
      mustChangePassword: false,
    });

    // Login Hokim A
    const loginResA = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-in',
      headers: SAME_ORIGIN_HEADERS,
      payload: {
        username: (await db.query.accounts.findFirst({ where: eq(accounts.id, hokimAId) }))!.username,
        password: 'HokimPassword2026!',
      },
    });
    const cookieA = loginResA.cookies.find((c) => c.name === COOKIE_NAME);
    hokimACookie = `${cookieA!.name}=${cookieA!.value}`;

    // Login Hokim B
    const loginResB = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-in',
      headers: SAME_ORIGIN_HEADERS,
      payload: {
        username: (await db.query.accounts.findFirst({ where: eq(accounts.id, hokimBId) }))!.username,
        password: 'HokimPassword2026!',
      },
    });
    const cookieB = loginResB.cookies.find((c) => c.name === COOKIE_NAME);
    hokimBCookie = `${cookieB!.name}=${cookieB!.value}`;

    // Login Hokim Single
    const loginResS = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-in',
      headers: SAME_ORIGIN_HEADERS,
      payload: {
        username: (await db.query.accounts.findFirst({ where: eq(accounts.id, hokimSingleId) }))!.username,
        password: 'HokimPassword2026!',
      },
    });
    const cookieS = loginResS.cookies.find((c) => c.name === COOKIE_NAME);
    hokimSingleCookie = `${cookieS!.name}=${cookieS!.value}`;

    // Login PO
    const loginResPO = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/sign-in',
      headers: SAME_ORIGIN_HEADERS,
      payload: {
        username: (await db.query.accounts.findFirst({ where: eq(accounts.id, poId) }))!.username,
        password: 'POPassword2026!',
      },
    });
    const cookiePO = loginResPO.cookies.find((c) => c.name === COOKIE_NAME);
    poCookie = `${cookiePO!.name}=${cookiePO!.value}`;

    // Helper to seed a topic with projection and N evidence items
    async function seedTopicWithEvidence(params: {
      districtId: string;
      primaryLane: QualifyingLane;
      lanes: QualifyingLane[];
      isHokimRelated?: boolean;
      calendarDay: string;
      mahallaName: string;
      title: string;
      evidenceCount: number;
    }) {
      const topicId = `top_st_${crypto.randomUUID().slice(0, 8)}`;
      createdTopicIds.push(topicId);

      const now = new Date();
      await db.insert(topics).values({
        id: topicId,
        districtId: params.districtId,
        mahallaName: params.mahallaName,
        calendarDay: params.calendarDay,
        primaryLane: params.primaryLane,
        status: 'ACTIVE',
        latestRelevantEvidenceTimestamp: now,
        retentionExpiresAt: new Date(now.getTime() + 90 * 86400000),
        createdAt: now,
        updatedAt: now,
      });

      let firstEvidenceId = '';
      for (let i = 0; i < params.evidenceCount; i++) {
        const intakeId = `int_st_${crypto.randomUUID().slice(0, 8)}`;
        const evidenceId = `evi_st_${crypto.randomUUID().slice(0, 8)}`;
        createdRecordIds.push(intakeId);

        if (i === 0) firstEvidenceId = evidenceId;

        await db.insert(telegramIntakeRecords).values({
          id: intakeId,
          districtId: params.districtId,
          mahallaName: params.mahallaName,
          telegramBotId: 'bot_test',
          telegramChatId: '123456',
          telegramMessageId: String(Math.floor(Math.random() * 1000000)),
          rawPayload: {},
          originalTimestamp: now,
          calendarDay: params.calendarDay,
          createdAt: now,
        });

        await db.insert(acceptedEvidence).values({
          id: evidenceId,
          topicId,
          districtId: params.districtId,
          mahallaName: params.mahallaName,
          calendarDay: params.calendarDay,
          intakeRecordId: intakeId,
          telegramChatId: '123456',
          telegramMessageId: String(Math.floor(Math.random() * 1000000)),
          originalTimestamp: now,
          verbatimText: `${params.title} evidence #${i + 1}`,
          contentType: 'TEXT',
          createdAt: now,
        });
      }

      const defaultAiProfile = (await db.query.aiProfiles.findFirst())!;
      const projectionId = `prj_st_${crypto.randomUUID().slice(0, 8)}`;
      await db.insert(topicProjections).values({
        id: projectionId,
        topicId,
        districtId: params.districtId,
        mahallaName: params.mahallaName,
        calendarDay: params.calendarDay,
        summary: params.title,
        lanes: params.lanes,
        primaryLane: params.primaryLane,
        anchorEvidenceId: firstEvidenceId,
        anchorQuote: params.title,
        latestMeaningfulActivityTimestamp: now,
        attribution: 'Маҳалла аҳолиси',
        isHokimRelated: params.isHokimRelated ?? params.lanes.includes('HOKIM_RELATED'),
        generation: 1,
        aiProfileId: defaultAiProfile.id,
        createdAt: now,
        updatedAt: now,
      });

      return topicId;
    }

    // Seed Data in District A for TODAY:
    // Topic 1: Multi-lane (WATER + ELECTRICITY), Наврўз, 3 evidence
    await seedTopicWithEvidence({
      districtId: districtAId,
      primaryLane: 'WATER',
      lanes: ['WATER', 'ELECTRICITY'],
      calendarDay: todayCalendarDay,
      mahallaName: 'Наврўз',
      title: 'Наврўз сув ва электр муаммоси',
      evidenceCount: 3,
    });

    // Topic 2: Hokim-related multi-lane (HOKIM_RELATED + WATER), Наврўз, 2 evidence
    await seedTopicWithEvidence({
      districtId: districtAId,
      primaryLane: 'HOKIM_RELATED',
      lanes: ['HOKIM_RELATED', 'WATER'],
      isHokimRelated: true,
      calendarDay: todayCalendarDay,
      mahallaName: 'Наврўз',
      title: 'Ҳоким қабули ва сув масаласи',
      evidenceCount: 2,
    });

    // Topic 3: GAS, Боғбон, 1 evidence
    await seedTopicWithEvidence({
      districtId: districtAId,
      primaryLane: 'GAS',
      lanes: ['GAS'],
      calendarDay: todayCalendarDay,
      mahallaName: 'Боғбон',
      title: 'Боғбон газ босими',
      evidenceCount: 1,
    });

    // Topic 4: WASTE, Шодлик, 1 evidence
    await seedTopicWithEvidence({
      districtId: districtAId,
      primaryLane: 'WASTE',
      lanes: ['WASTE'],
      calendarDay: todayCalendarDay,
      mahallaName: 'Шодлик',
      title: 'Шодлик чиқинди тозалаш',
      evidenceCount: 1,
    });

    // Seed Data in District A for YESTERDAY:
    // Topic 5: WATER, Боғбон, 2 evidence
    await seedTopicWithEvidence({
      districtId: districtAId,
      primaryLane: 'WATER',
      lanes: ['WATER'],
      calendarDay: yesterdayCalendarDay,
      mahallaName: 'Боғбон',
      title: 'Кечаги сув муаммоси',
      evidenceCount: 2,
    });

    // Seed Data in District Single Mahalla:
    // Topic S1: WATER, Ягона Маҳалла, 2 evidence
    await seedTopicWithEvidence({
      districtId: districtSingleMahallaId,
      primaryLane: 'WATER',
      lanes: ['WATER'],
      calendarDay: todayCalendarDay,
      mahallaName: 'Ягона Маҳалла',
      title: 'Ягона маҳалла мавзуси',
      evidenceCount: 2,
    });

    // Seed Data in District B (Tenant Isolation):
    // Topic B1: ELECTRICITY, Чорсу, 5 evidence
    await seedTopicWithEvidence({
      districtId: districtBId,
      primaryLane: 'ELECTRICITY',
      lanes: ['ELECTRICITY'],
      calendarDay: todayCalendarDay,
      mahallaName: 'Чорсу',
      title: 'Чорсу электр муаммоси',
      evidenceCount: 5,
    });
  });

  afterAll(async () => {
    if (createdTopicIds.length > 0) {
      for (const topicId of createdTopicIds) {
        await db.delete(topicProjections).where(eq(topicProjections.topicId, topicId));
        await db.delete(acceptedEvidence).where(eq(acceptedEvidence.topicId, topicId));
        await db.delete(topics).where(eq(topics.id, topicId));
      }
    }
    if (createdRecordIds.length > 0) {
      for (const recId of createdRecordIds) {
        await db.delete(telegramIntakeRecords).where(eq(telegramIntakeRecords.id, recId));
      }
    }
    if (districtAId) {
      await db.delete(districtTelegramGroups).where(eq(districtTelegramGroups.districtId, districtAId));
      await db.delete(accounts).where(eq(accounts.districtId, districtAId));
      await db.delete(districts).where(eq(districts.id, districtAId));
    }
    if (districtBId) {
      await db.delete(districtTelegramGroups).where(eq(districtTelegramGroups.districtId, districtBId));
      await db.delete(accounts).where(eq(accounts.districtId, districtBId));
      await db.delete(districts).where(eq(districts.id, districtBId));
    }
    if (districtSingleMahallaId) {
      await db.delete(districtTelegramGroups).where(eq(districtTelegramGroups.districtId, districtSingleMahallaId));
      await db.delete(accounts).where(eq(accounts.districtId, districtSingleMahallaId));
      await db.delete(districts).where(eq(districts.id, districtSingleMahallaId));
    }
    if (poId) {
      await db.delete(accounts).where(eq(accounts.id, poId));
    }
    await server.close();
    await pool.end();
  });

  describe('Authorization & Validation', () => {
    it('returns 401 UNAUTHENTICATED when no session cookie is sent', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/hokim/topics/statistics',
        headers: SAME_ORIGIN_HEADERS,
      });

      expect(res.statusCode).toBe(401);
      const data = JSON.parse(res.body);
      expect(data.error.code).toBe('UNAUTHENTICATED');
    });

    it('returns 403 FORBIDDEN when user is not a DISTRICT_HOKIM', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/hokim/topics/statistics',
        headers: {
          ...SAME_ORIGIN_HEADERS,
          cookie: poCookie,
        },
      });

      expect(res.statusCode).toBe(403);
      const data = JSON.parse(res.body);
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('returns 400 VALIDATION_ERROR for invalid custom date scope without date bounds', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/hokim/topics/statistics?dateScope=custom',
        headers: {
          ...SAME_ORIGIN_HEADERS,
          cookie: hokimACookie,
        },
      });

      expect(res.statusCode).toBe(400);
      const data = JSON.parse(res.body);
      expect(data.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Default Today Statistics & Deduplication Aggregations', () => {
    it('computes authoritative aggregates for default today scope in District A', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/hokim/topics/statistics',
        headers: {
          ...SAME_ORIGIN_HEADERS,
          cookie: hokimACookie,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);

      expect(data.districtId).toBe(districtAId);
      expect(data.calendarDay).toBe(todayCalendarDay);
      expect(data.serverEvaluatedAt).toBeDefined();

      // Card 1: Total Unique Topics (Topic 1, 2, 3, 4 = 4 topics)
      expect(data.totalUniqueTopics).toBe(4);

      // Card 2: Hokim Related Topics (Topic 2 = 1 topic, 2 evidence)
      expect(data.hokimRelatedTopics).toBe(1);
      expect(data.hokimEvidenceCount).toBe(2);

      // Card 3: Active Mahallas (Наврўз, Боғбон, Шодлик = 3) & Total Accepted Evidence (3 + 2 + 1 + 1 = 7)
      expect(data.activeMahallasCount).toBe(3);
      expect(data.totalAcceptedEvidenceCount).toBe(7);

      // Card 4: Most active service lane
      // WATER has 2 topics (Topic 1 & Topic 2), ELECTRICITY has 1, GAS has 1, WASTE has 1.
      // Top service lane is WATER (2 topics)
      expect(data.card4.mode).toBe('most_active_service_lane');
      expect(data.card4.leaderLane).toBe('WATER');
      expect(data.card4.leaderTopicCount).toBe(2);
      expect(data.card4.isTie).toBe(false);
      expect(data.card4.isZero).toBe(false);

      // Card 5: Most active Mahalla
      // Наврўз has 2 topics (Topic 1 & 2), Боғбон has 1, Шодлик has 1.
      // Top Mahalla is Наврўз (2 topics)
      expect(data.card5.mode).toBe('most_active_mahalla');
      expect(data.card5.leaderMahalla).toBe('Наврўз');
      expect(data.card5.leaderTopicCount).toBe(2);
      expect(data.card5.isTie).toBe(false);
      expect(data.card5.isZero).toBe(false);
    });
  });

  describe('Service Lane Ties & Multi-Lane Fallback (Card 4)', () => {
    it('detects a tie when multiple service lanes share the maximum topic count', async () => {
      // Filter for lanes: ELECTRICITY, GAS, WASTE (each has 1 topic today)
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/hokim/topics/statistics?lanes=ELECTRICITY,GAS,WASTE',
        headers: {
          ...SAME_ORIGIN_HEADERS,
          cookie: hokimACookie,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);

      expect(data.card4.mode).toBe('most_active_service_lane');
      expect(data.card4.isTie).toBe(true);
      expect(data.card4.tiedCount).toBe(3);
      expect(data.card4.leaderLane).toBeNull();
      expect(data.card4.leaderTopicCount).toBe(1);
      expect(data.card4.isZero).toBe(false);
    });

    it('falls back to multi_lane_topics when fewer than 2 service lanes are selected', async () => {
      // Filter for only WATER and HOKIM_RELATED (only 1 service lane)
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/hokim/topics/statistics?lanes=WATER,HOKIM_RELATED',
        headers: {
          ...SAME_ORIGIN_HEADERS,
          cookie: hokimACookie,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);

      // Fallback mode activated
      expect(data.card4.mode).toBe('multi_lane_topics');
      // Topic 1 and Topic 2 both have > 1 lane in `lanes` array
      expect(data.card4.multiLaneTopicCount).toBe(2);
    });
  });

  describe('Mahalla Ties, Single Mahalla Fallback & Zero Precedence (Card 5)', () => {
    it('falls back to multi_evidence_topics when a specific mahalla filter is active', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/hokim/topics/statistics?mahallaName=Наврўз',
        headers: {
          ...SAME_ORIGIN_HEADERS,
          cookie: hokimACookie,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);

      expect(data.card5.mode).toBe('multi_evidence_topics');
      // In Наврўз, Topic 1 has 3 evidence, Topic 2 has 2 evidence -> 2 multi-evidence topics (>1 evidence)
      expect(data.card5.multiEvidenceTopicCount).toBe(2);
    });

    it('falls back to multi_evidence_topics in a single-Mahalla district', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/v1/hokim/topics/statistics',
        headers: {
          ...SAME_ORIGIN_HEADERS,
          cookie: hokimSingleCookie,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);

      expect(data.districtId).toBe(districtSingleMahallaId);
      expect(data.card5.mode).toBe('multi_evidence_topics');
      expect(data.card5.multiEvidenceTopicCount).toBe(1);
    });

    it('handles all-zero state with zero-precedence over ties', async () => {
      // Query for an empty date range with no topics (e.g. 10 days ago)
      const tenDaysAgo = getTashkentCalendarDay(nowEpoch - 10 * 86400);
      const res = await server.inject({
        method: 'GET',
        url: `/api/v1/hokim/topics/statistics?dateScope=custom&dateFrom=${tenDaysAgo}&dateTo=${tenDaysAgo}`,
        headers: {
          ...SAME_ORIGIN_HEADERS,
          cookie: hokimACookie,
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.body);

      expect(data.totalUniqueTopics).toBe(0);
      expect(data.card4.mode).toBe('most_active_service_lane');
      expect(data.card4.isZero).toBe(true);
      expect(data.card4.leaderLane).toBeNull();
      expect(data.card4.leaderTopicCount).toBe(0);

      expect(data.card5.mode).toBe('most_active_mahalla');
      expect(data.card5.isZero).toBe(true);
      expect(data.card5.leaderMahalla).toBeNull();
      expect(data.card5.leaderTopicCount).toBe(0);
    });
  });

  describe('Tenant Isolation', () => {
    it('strictly isolates statistics by Hokim districtId', async () => {
      const resB = await server.inject({
        method: 'GET',
        url: '/api/v1/hokim/topics/statistics',
        headers: {
          ...SAME_ORIGIN_HEADERS,
          cookie: hokimBCookie,
        },
      });

      expect(resB.statusCode).toBe(200);
      const dataB = JSON.parse(resB.body);

      expect(dataB.districtId).toBe(districtBId);
      // District B has only 1 topic (Topic B1: ELECTRICITY, 5 evidence)
      expect(dataB.totalUniqueTopics).toBe(1);
      expect(dataB.hokimRelatedTopics).toBe(0);
      expect(dataB.activeMahallasCount).toBe(1);
      expect(dataB.totalAcceptedEvidenceCount).toBe(5);
      expect(dataB.card4.leaderLane).toBe('ELECTRICITY');
    });
  });
});
