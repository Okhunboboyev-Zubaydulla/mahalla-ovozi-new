import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type pg from 'pg';
import crypto from 'node:crypto';
import { eq, and } from 'drizzle-orm';
import type PgBoss from 'pg-boss';
import { createDbPool, createDbClient, type DbClient } from '../src/adapters/db/client.js';
import {
  createBossClient,
  initBossQueues,
  TELEGRAM_BURST_DEBOUNCE_QUEUE,
  TELEGRAM_SEMANTIC_RELEVANCE_QUEUE,
  TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
} from '../src/adapters/jobs/boss-client.js';
import {
  districts,
  districtTelegramBots,
  districtTelegramGroups,
  telegramIntakeRecords,
  topics,
  acceptedEvidence,
} from '../src/adapters/db/schema/index.js';
import { encryptToken } from '../src/adapters/crypto/token-cipher.js';
import { processTelegramWebhookUpdate } from '../src/modules/telegram-intake/telegram-intake-service.js';
import { processBurstDebounceJobs } from '../src/modules/telegram-intake/jobs/burst-debounce-job-handler.js';
import { processSemanticRelevanceJobs } from '../src/modules/ai/jobs/semantic-relevance-job-handler.js';
import { processTopicAssignmentJobs } from '../src/modules/topics/jobs/topic-assignment-job-handler.js';
import { ensureDefaultAiProfiles } from '../src/adapters/db/seeds.js';

describe('Burst Message Debouncing & Semantic Aggregation Integration Tests', () => {
  let pool: pg.Pool;
  let db: DbClient;
  let boss: PgBoss;

  let activeDistrictId: string;
  let activeBotId: string;
  let validChatId: string;

  beforeAll(async () => {
    pool = createDbPool();
    db = createDbClient(pool);
    boss = createBossClient();
    await boss.start();
    await initBossQueues(boss);
    await ensureDefaultAiProfiles(db);
  });

  afterAll(async () => {
    await boss.stop({ graceful: true, timeout: 10000 });
    await pool.end();
  });

  beforeEach(async () => {
    vi.restoreAllMocks();

    activeDistrictId = `dist_burst_${crypto.randomUUID()}`;
    await db.insert(districts).values({
      id: activeDistrictId,
      name: `Burst Test District ${crypto.randomUUID().slice(0, 6)}`,
      status: 'ACTIVE',
    });

    activeBotId = `bot_burst_${crypto.randomUUID().slice(0, 8)}`;
    const activeEnc = encryptToken(`111111111:AA${crypto.randomUUID()}`);
    await db.insert(districtTelegramBots).values({
      id: `dtb_${crypto.randomUUID()}`,
      districtId: activeDistrictId,
      botId: activeBotId,
      botFirstName: 'Burst Test Bot',
      botUsername: 'burst_test_bot',
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
  });

  it('Test 1 (End-to-End Burst Flow): Merges split messages into one AI candidate and persists distinct accepted evidence rows', async () => {
    const userId = '999123';
    const msgId1 = `101_${Date.now()}`;
    const msgId2 = `102_${Date.now()}`;
    const baseTime = new Date('2026-08-21T20:15:00Z');

    // 1. Webhook receives Message 1: "Hammada yomi"
    const res1 = await processTelegramWebhookUpdate(pool, boss, activeBotId, {
      update_id: 1001,
      message: {
        message_id: Number(msgId1.split('_')[0]),
        date: Math.floor(baseTime.getTime() / 1000),
        chat: { id: validChatId, title: 'Navbahor' },
        from: { id: Number(userId), first_name: 'Resident', username: 'resident1' },
        text: 'Hammada yomi',
      },
    });
    expect(res1.status).toBe('ACCEPTED');

    // 2. Webhook receives Message 2: "Svet" (10s later)
    const res2 = await processTelegramWebhookUpdate(pool, boss, activeBotId, {
      update_id: 1002,
      message: {
        message_id: Number(msgId2.split('_')[0]),
        date: Math.floor((baseTime.getTime() + 10000) / 1000),
        chat: { id: validChatId, title: 'Navbahor' },
        from: { id: Number(userId), first_name: 'Resident', username: 'resident1' },
        text: 'Svet',
      },
    });
    expect(res2.status).toBe('ACCEPTED');

    // 3. Verify both intake records exist in DB
    const intakes = await db
      .select()
      .from(telegramIntakeRecords)
      .where(
        and(
          eq(telegramIntakeRecords.districtId, activeDistrictId),
          eq(telegramIntakeRecords.telegramChatId, validChatId),
        ),
      );
    expect(intakes.length).toBe(2);

    // 4. Process Burst Debounce Job (simulating timer expiration 30s later)
    const debounceJob: any = {
      data: {
        districtId: activeDistrictId,
        mahallaName: 'Navbahor',
        calendarDay: '2026-08-21',
        telegramChatId: validChatId,
        telegramUserId: userId,
        telegramBotId: activeBotId,
        firstMessageTimestamp: baseTime.toISOString(),
      },
    };

    // Mock Date.now to simulate execution 30s after the second message
    const realDateNow = Date.now;
    Date.now = () => baseTime.getTime() + 45000;

    let enqueuedSemanticJobData: any = null;
    const sendSpy = vi.spyOn(boss, 'send').mockImplementation(async (queue: any, data: any) => {
      if (queue === TELEGRAM_SEMANTIC_RELEVANCE_QUEUE) {
        enqueuedSemanticJobData = data;
      }
      return 'mock_job_id';
    });

    try {
      await processBurstDebounceJobs([debounceJob], { db, boss });

      expect(enqueuedSemanticJobData).toBeDefined();
      expect(enqueuedSemanticJobData.verbatimText).toBe('Hammada yomi\nSvet');
      expect(enqueuedSemanticJobData.burstMessages).toBeDefined();
      expect(enqueuedSemanticJobData.burstMessages.length).toBe(2);

      // Verify records are now marked with batchId
      const updatedIntakes = await db
        .select()
        .from(telegramIntakeRecords)
        .where(
          and(
            eq(telegramIntakeRecords.districtId, activeDistrictId),
            eq(telegramIntakeRecords.telegramChatId, validChatId),
          ),
        );
      expect(updatedIntakes.every((r) => r.processedAt !== null && r.batchId !== null)).toBe(true);

      // 5. Process Semantic Relevance with mock evaluator
      const mockRelevanceEvaluator: any = {
        evaluateRelevance: vi.fn().mockResolvedValue({
          data: {
            is_relevant: true,
            relevant_lanes: ['INFRASTRUCTURE'],
            reasoning: 'Electricity outage complaint',
          },
          profileId: 'prof_rel_2026_08_v1',
          provider: 'OLLAMA',
          modelId: 'gemma4:12b',
          providerRequestId: 'mock_req',
          durationMs: 50,
          tokens: { inputTokens: 20, outputTokens: 10, cachedTokens: 0 },
          estimatedCostUsd: '0.0001',
          attempts: [],
        }),
      };

      let enqueuedTopicJobData: any = null;
      sendSpy.mockImplementation(async (queue: any, data: any) => {
        if (queue === TELEGRAM_TOPIC_ASSIGNMENT_QUEUE) {
          enqueuedTopicJobData = data;
        }
        return 'mock_topic_job_id';
      });

      const semanticJob: any = {
        data: enqueuedSemanticJobData,
      };

      await processSemanticRelevanceJobs([semanticJob], {
        db,
        pool,
        boss,
        relevanceEvaluator: mockRelevanceEvaluator,
      });

      expect(enqueuedTopicJobData).toBeDefined();
      expect(enqueuedTopicJobData.burstMessages.length).toBe(2);

      // 6. Process Topic Assignment with mock topic matching evaluator (NEW_TOPIC)
      const mockTopicMatchingEvaluator: any = {
        evaluateTopicAssignment: vi.fn().mockResolvedValue({
          data: {
            decision: 'NEW_TOPIC',
            primary_lane: 'INFRASTRUCTURE',
            reasoning: 'New electricity outage cluster',
          },
          profileId: 'prof_match_2026_08_v1',
          provider: 'OLLAMA',
          modelId: 'gemma4:12b',
          providerRequestId: 'mock_req',
          durationMs: 50,
          tokens: { inputTokens: 20, outputTokens: 10, cachedTokens: 0 },
          estimatedCostUsd: '0.0001',
          attempts: [],
        }),
      };

      const topicJob: any = {
        data: enqueuedTopicJobData,
      };

      await processTopicAssignmentJobs([topicJob], {
        db,
        pool,
        boss,
        topicMatchingEvaluator: mockTopicMatchingEvaluator,
      });

      // 7. Verify Database Result: 1 Topic, 2 Accepted Evidence rows
      const createdTopics = await db
        .select()
        .from(topics)
        .where(
          and(
            eq(topics.districtId, activeDistrictId),
            eq(topics.mahallaName, 'Navbahor'),
          ),
        );
      expect(createdTopics.length).toBe(1);
      const topicId = createdTopics[0]!.id;
      expect(createdTopics[0]!.primaryLane).toBe('INFRASTRUCTURE');

      const evidence = await db
        .select()
        .from(acceptedEvidence)
        .where(eq(acceptedEvidence.topicId, topicId));

      expect(evidence.length).toBe(2);

      const texts = evidence.map((e) => e.verbatimText).sort();
      expect(texts).toEqual(['Hammada yomi', 'Svet']);
    } finally {
      Date.now = realDateNow;
      sendSpy.mockRestore();
    }
  });

  it('Test 2 (Sliding Window Reset): Extends debounce timer when user continues typing within 25 seconds', async () => {
    const userId = '888456';
    const baseTime = new Date('2026-08-21T14:00:00Z');

    // Message 1 at T=0
    await processTelegramWebhookUpdate(pool, boss, activeBotId, {
      update_id: 2001,
      message: {
        message_id: 201,
        date: Math.floor(baseTime.getTime() / 1000),
        chat: { id: validChatId, title: 'Navbahor' },
        from: { id: Number(userId), first_name: 'Resident 2' },
        text: 'Assalomu alaykum',
      },
    });

    // Message 2 at T=15s
    await processTelegramWebhookUpdate(pool, boss, activeBotId, {
      update_id: 2002,
      message: {
        message_id: 202,
        date: Math.floor((baseTime.getTime() + 15000) / 1000),
        chat: { id: validChatId, title: 'Navbahor' },
        from: { id: Number(userId), first_name: 'Resident 2' },
        text: 'Kutamiz',
      },
    });

    // When worker fires at T=20s (5s after Msg 2, so within 25s window):
    const realDateNow = Date.now;
    Date.now = () => baseTime.getTime() + 20000;

    let rescheduledJobData: any = null;
    let rescheduledOptions: any = null;

    const sendSpy = vi.spyOn(boss, 'send').mockImplementation(async (queue: any, data: any, options: any) => {
      if (queue === TELEGRAM_BURST_DEBOUNCE_QUEUE) {
        rescheduledJobData = data;
        rescheduledOptions = options;
      }
      return 'mock_rescheduled_id';
    });

    try {
      const debounceJob: any = {
        data: {
          districtId: activeDistrictId,
          mahallaName: 'Navbahor',
          calendarDay: '2026-08-21',
          telegramChatId: validChatId,
          telegramUserId: userId,
          telegramBotId: activeBotId,
          firstMessageTimestamp: baseTime.toISOString(),
        },
      };

      await processBurstDebounceJobs([debounceJob], { db, boss });

      // Verify job was rescheduled rather than flushed
      expect(rescheduledJobData).toBeDefined();
      expect(rescheduledOptions?.startAfter).toBeGreaterThanOrEqual(1);
    } finally {
      Date.now = realDateNow;
      sendSpy.mockRestore();
    }
  });

  it('Test 3 (Pre-Filtering Noise): Discards bot commands from the burst buffer candidate pool', async () => {
    const userId = '777888';
    const baseTime = new Date('2026-08-21T16:00:00Z');

    // Message 1: Bot command /start (structurally excluded)
    const res1 = await processTelegramWebhookUpdate(pool, boss, activeBotId, {
      update_id: 3001,
      message: {
        message_id: 301,
        date: Math.floor(baseTime.getTime() / 1000),
        chat: { id: validChatId, title: 'Navbahor' },
        from: { id: Number(userId), first_name: 'Resident 3' },
        text: '/start',
      },
    });
    expect(res1.status).toBe('ACCEPTED');

    // Message 2: Legitimate complaint
    const res2 = await processTelegramWebhookUpdate(pool, boss, activeBotId, {
      update_id: 3002,
      message: {
        message_id: 302,
        date: Math.floor((baseTime.getTime() + 5000) / 1000),
        chat: { id: validChatId, title: 'Navbahor' },
        from: { id: Number(userId), first_name: 'Resident 3' },
        text: 'Gaz bosimi juda past tushib ketdi',
      },
    });
    expect(res2.status).toBe('ACCEPTED');

    // Trigger debounce worker 30s later
    const realDateNow = Date.now;
    Date.now = () => baseTime.getTime() + 40000;

    let enqueuedSemanticJobData: any = null;
    const sendSpy = vi.spyOn(boss, 'send').mockImplementation(async (queue: any, data: any) => {
      if (queue === TELEGRAM_SEMANTIC_RELEVANCE_QUEUE) {
        enqueuedSemanticJobData = data;
      }
      return 'mock_job_id';
    });

    try {
      const debounceJob: any = {
        data: {
          districtId: activeDistrictId,
          mahallaName: 'Navbahor',
          calendarDay: '2026-08-21',
          telegramChatId: validChatId,
          telegramUserId: userId,
          telegramBotId: activeBotId,
          firstMessageTimestamp: baseTime.toISOString(),
        },
      };

      await processBurstDebounceJobs([debounceJob], { db, boss });

      expect(enqueuedSemanticJobData).toBeDefined();
      // Only the valid complaint is included, '/start' was filtered out
      expect(enqueuedSemanticJobData.verbatimText).toBe('Gaz bosimi juda past tushib ketdi');
    } finally {
      Date.now = realDateNow;
      sendSpy.mockRestore();
    }
  });
});
