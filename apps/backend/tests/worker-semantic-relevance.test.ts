import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import pg from 'pg';
import type PgBoss from 'pg-boss';
import { eq } from 'drizzle-orm';
import {
  createDbPool,
  createDbClient,
  type DbClient,
} from '../src/adapters/db/client.js';
import { districts, telegramIntakeRecords, aiOperations, aiProviderAttempts } from '../src/adapters/db/schema/index.js';
import { ensureDefaultAiProfiles } from '../src/adapters/db/seeds.js';
import {
  createBossClient,
  initBossQueues,
  TELEGRAM_CONTENT_QUALIFICATION_QUEUE,
  TELEGRAM_SEMANTIC_RELEVANCE_QUEUE,
  TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
  type TelegramSemanticRelevanceJobData,
  type TelegramTopicAssignmentJobData,
} from '../src/adapters/jobs/boss-client.js';
import { startWorker, stopWorker } from '../src/entrypoints/worker.js';
import { createMockAiGateway, type MockAiGatewayController } from './helpers/mock-ai-gateway.js';
import { AiGatewayError } from '../src/modules/ai/types.js';
import type { AcceptedEvidenceItem } from '../src/modules/ai/context-snapshot.js';

describe('Story 2.3: Worker Semantic Relevance 25-Row Verification Matrix Integration Tests', () => {
  let pool: pg.Pool;
  let db: DbClient;
  let boss: PgBoss;
  let aiController: MockAiGatewayController;
  let testDistrictId: string;
  let testChatId: string;
  let customEvidenceStore: Map<string, AcceptedEvidenceItem[]> = new Map();
  let dynamicResolver: (() => Promise<AcceptedEvidenceItem[] | undefined>) | null = null;

  beforeAll(async () => {
    pool = createDbPool();
    db = createDbClient(pool);
    await ensureDefaultAiProfiles(db);

    aiController = createMockAiGateway();

    boss = createBossClient({ schema: 'pgboss_relevance' });
    await boss.start();
    await initBossQueues(boss);

    // Clean up any stale jobs from previous runs
    await pool.query('DELETE FROM pgboss_relevance.job WHERE name IN ($1, $2, $3)', [
      TELEGRAM_CONTENT_QUALIFICATION_QUEUE,
      TELEGRAM_SEMANTIC_RELEVANCE_QUEUE,
      TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
    ]);

    await startWorker({
      boss,
      db,
      pool,
      aiGateway: aiController.gateway,
      queues: [TELEGRAM_SEMANTIC_RELEVANCE_QUEUE],
      injectedEvidenceResolver: async (districtId, mahallaName, calendarDay) => {
        if (dynamicResolver) {
          return dynamicResolver();
        }
        const key = `${districtId}:${mahallaName}:${calendarDay}`;
        return customEvidenceStore.get(key);
      },
    });
  });

  afterAll(async () => {
    await stopWorker(boss);
    await pool.end();
  });

  beforeEach(async () => {
    aiController.mockAdapter.clearHistory();
    customEvidenceStore.clear();
    dynamicResolver = null;

    testDistrictId = `dist_rel_${crypto.randomUUID()}`;
    testChatId = `-100${Date.now()}${Math.floor(Math.random() * 1000)}`;

    await pool.query('DELETE FROM pgboss_relevance.job WHERE name IN ($1, $2, $3)', [
      TELEGRAM_CONTENT_QUALIFICATION_QUEUE,
      TELEGRAM_SEMANTIC_RELEVANCE_QUEUE,
      TELEGRAM_TOPIC_ASSIGNMENT_QUEUE,
    ]);

    // Seed test active district
    await db.insert(districts).values({
      id: testDistrictId,
      name: `RelevanceDistrict_${crypto.randomUUID().slice(0, 8)}`,
      status: 'ACTIVE',
      accessEligible: true,
    });
  });

  async function createTestIntake(text: string, messageId: string = '1001'): Promise<string> {
    const intakeId = `intk_${crypto.randomUUID()}`;
    await db.insert(telegramIntakeRecords).values({
      id: intakeId,
      districtId: testDistrictId,
      mahallaName: 'Guliston',
      telegramBotId: 'bot_test_123',
      telegramChatId: testChatId,
      telegramMessageId: messageId,
      originalTimestamp: new Date('2026-08-22T09:00:00.000Z'),
      calendarDay: '2026-08-22',
      rawPayload: {
        update_id: 1,
        message: {
          message_id: Number(messageId),
          date: 1787389200,
          chat: { id: Number(testChatId), type: 'supergroup', title: 'Guliston Mahalla' },
          text,
        },
      },
    });
    return intakeId;
  }

  async function processCandidateJob(
    intakeId: string,
    text: string,
    messageId: string = '1001',
    replyMetadata: any = null,
  ): Promise<void> {
    const jobData: TelegramSemanticRelevanceJobData = {
      intakeId,
      districtId: testDistrictId,
      mahallaName: 'Guliston',
      calendarDay: '2026-08-22',
      telegramChatId: testChatId,
      telegramMessageId: messageId,
      originalTimestamp: '2026-08-22T09:00:00.000Z',
      contentType: 'TEXT',
      verbatimText: text,
      replyMetadata,
    };

    await boss.send(TELEGRAM_SEMANTIC_RELEVANCE_QUEUE, jobData);
  }

  async function waitForOperation(intakeId: string, maxAttempts: number = 30): Promise<any> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const [op] = await db
        .select()
        .from(aiOperations)
        .where(eq(aiOperations.targetId, intakeId));
      if (op) return op;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Matrix #1 - #7: Qualifying Municipal Services & Hokim Concerns
  // ──────────────────────────────────────────────────────────────────────────

  it('Matrix #1: Water Outage (Uzbek Latin) qualifies under WATER and enqueues topic job', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: true,
      relevant_lanes: ['WATER'],
      exclusion_reason: null,
      reasoning: 'Water outage reported in apartment 12',
    });

    const text = "Bizning 12-uyda suv to'xtab qoldi, bosim umuman yo'q";
    const intakeId = await createTestIntake(text, '101');
    await processCandidateJob(intakeId, text, '101');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_RELEVANT');
    expect((op.resultPayload as any).relevant_lanes).toEqual(['WATER']);

    // 2. Verify ai_provider_attempts
    const attempts = await db
      .select()
      .from(aiProviderAttempts)
      .where(eq(aiProviderAttempts.operationId, op.id));
    expect(attempts).toHaveLength(1);
    expect(attempts[0]!.status).toBe('SUCCESS');

    // 3. Verify downstream topic assignment job enqueued
    let receivedTopicJob: PgBoss.Job<TelegramTopicAssignmentJobData> | null = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const jobs = await boss.fetch<TelegramTopicAssignmentJobData>(TELEGRAM_TOPIC_ASSIGNMENT_QUEUE, {
        batchSize: 10,
      });
      if (jobs && jobs.length > 0) {
        const match = jobs.find((j) => j.data.intakeId === intakeId);
        if (match) {
          receivedTopicJob = match;
          break;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    expect(receivedTopicJob).not.toBeNull();
    expect(receivedTopicJob?.data.relevantLanes).toEqual(['WATER']);
    expect(receivedTopicJob?.data.verbatimText).toBe(text);
  });

  it('Matrix #2: Electricity Blackout (Uzbek Cyrillic) qualifies under ELECTRICITY', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: true,
      relevant_lanes: ['ELECTRICITY'],
      exclusion_reason: null,
      reasoning: 'Electricity outage and transformer issue reported',
    });

    const text = '3 соатдан бери чироқ йўқ, трансформатордан тутун чиқяпти';
    const intakeId = await createTestIntake(text, '102');
    await processCandidateJob(intakeId, text, '102');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_RELEVANT');
    expect((op.resultPayload as any).relevant_lanes).toEqual(['ELECTRICITY']);
  });

  it('Matrix #3: Gas Pressure Issue (Russian) qualifies under GAS', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: true,
      relevant_lanes: ['GAS'],
      exclusion_reason: null,
      reasoning: 'Gas pressure zero and heating down',
    });

    const text = 'Давление газа упало до нуля, отопление не работает';
    const intakeId = await createTestIntake(text, '103');
    await processCandidateJob(intakeId, text, '103');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_RELEVANT');
    expect((op.resultPayload as any).relevant_lanes).toEqual(['GAS']);
  });

  it('Matrix #4: Waste Dump Problem (Colloquial Uzbek) qualifies under WASTE', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: true,
      relevant_lanes: ['WASTE'],
      exclusion_reason: null,
      reasoning: 'Garbage dump full and uncollected for 4 days',
    });

    const text = "Musorxona to'lib ketgan, 4 kundan beri moshin kelmadi";
    const intakeId = await createTestIntake(text, '104');
    await processCandidateJob(intakeId, text, '104');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_RELEVANT');
    expect((op.resultPayload as any).relevant_lanes).toEqual(['WASTE']);
  });

  it('Matrix #5: Direct Hokim Complaint (Non-Service) qualifies under HOKIM_RELATED', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: true,
      relevant_lanes: ['HOKIM_RELATED'],
      exclusion_reason: null,
      reasoning: 'Direct appeal to Hokim regarding pothole repairs',
    });

    const text = "Tuman hokimi qachon 4-ko'chadagi chuqurlarni yamaydi? Moshinalar tushib ketyapti";
    const intakeId = await createTestIntake(text, '105');
    await processCandidateJob(intakeId, text, '105');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_RELEVANT');
    expect((op.resultPayload as any).relevant_lanes).toEqual(['HOKIM_RELATED']);
  });

  it('Matrix #6: Service + Hokim Overlap qualifies under both WATER and HOKIM_RELATED', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: true,
      relevant_lanes: ['WATER', 'HOKIM_RELATED'],
      exclusion_reason: null,
      reasoning: 'Water pipe repair complaint addressed directly to Hokim',
    });

    const text = 'Ҳоким қачон маҳалладаги сув қувурини тузатади?';
    const intakeId = await createTestIntake(text, '106');
    await processCandidateJob(intakeId, text, '106');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_RELEVANT');
    expect((op.resultPayload as any).relevant_lanes).toEqual(['WATER', 'HOKIM_RELATED']);
  });

  it('Matrix #7: Road Problem without Explicit Hokim Mention qualifies under HOKIM_RELATED', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: true,
      relevant_lanes: ['HOKIM_RELATED'],
      exclusion_reason: null,
      reasoning: 'Muddy unpaved road infrastructure problem',
    });

    const text = "Ko'chamizda asfalt qilinmagan, loydan o'tib bo'lmayapti";
    const intakeId = await createTestIntake(text, '107');
    await processCandidateJob(intakeId, text, '107');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_RELEVANT');
    expect((op.resultPayload as any).relevant_lanes).toEqual(['HOKIM_RELATED']);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Matrix #8 - #13: Immediate Exclusion & Raw Resident Content Disposal
  // ──────────────────────────────────────────────────────────────────────────

  it('Matrix #8: Vague Official Blaming excluded as GENERAL_CHATTER, raw text sanitized (AC 7)', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: false,
      relevant_lanes: [],
      exclusion_reason: 'GENERAL_CHATTER',
      reasoning: 'Vague complaint without specific municipal issue',
    });

    const text = "Mas'ullar qayerga qarayapti o'zi, nima bo'lyapti?";
    const intakeId = await createTestIntake(text, '108');
    await processCandidateJob(intakeId, text, '108');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_IRRELEVANT');
    expect((op.resultPayload as any).exclusion_reason).toBe('GENERAL_CHATTER');

    // 2. raw_payload in DB sanitized to EXCLUDED and purgedAt
    const [intake] = await db
      .select()
      .from(telegramIntakeRecords)
      .where(eq(telegramIntakeRecords.id, intakeId));
    expect(intake!.rawPayload).toEqual({
      status: 'EXCLUDED',
      exclusionReason: 'GENERAL_CHATTER',
      purgedAt: expect.any(String),
    });

    // 3. No downstream topic assignment job enqueued
    const jobs = await boss.fetch<TelegramTopicAssignmentJobData>(TELEGRAM_TOPIC_ASSIGNMENT_QUEUE, {
      batchSize: 10,
    });
    const matched = (jobs || []).find((j) => j.data.intakeId === intakeId);
    expect(matched).toBeUndefined();
  });

  it('Matrix #9: Planned Outage Announcement excluded as PLANNED_ANNOUNCEMENT', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: false,
      relevant_lanes: [],
      exclusion_reason: 'PLANNED_ANNOUNCEMENT',
      reasoning: 'Official planned maintenance notice',
    });

    const text = "Ertaga soat 10:00 dan 16:00 gacha ta'mirlash sababli elektr o'chiriladi";
    const intakeId = await createTestIntake(text, '109');
    await processCandidateJob(intakeId, text, '109');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_IRRELEVANT');
    expect((op.resultPayload as any).exclusion_reason).toBe('PLANNED_ANNOUNCEMENT');
  });

  it('Matrix #10: Commercial Ad with Municipal Keywords excluded as ADVERTISEMENT_OR_SPAM', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: false,
      relevant_lanes: [],
      exclusion_reason: 'ADVERTISEMENT_OR_SPAM',
      reasoning: 'Commercial advertisement for water filters and gas stoves',
    });

    const text = 'Arzon narxda suv filtrlari va gaz plitalari sotamiz. Tel: 901234567';
    const intakeId = await createTestIntake(text, '110');
    await processCandidateJob(intakeId, text, '110');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_IRRELEVANT');
    expect((op.resultPayload as any).exclusion_reason).toBe('ADVERTISEMENT_OR_SPAM');
  });

  it('Matrix #11: Rumor & Speculation excluded as SPECULATION_OR_RUMOR', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: false,
      relevant_lanes: [],
      exclusion_reason: 'SPECULATION_OR_RUMOR',
      reasoning: 'Unconfirmed rumor regarding future gas price hike',
    });

    const text = 'Eshitishimcha gaz narxi 2 baravar oshar emish';
    const intakeId = await createTestIntake(text, '111');
    await processCandidateJob(intakeId, text, '111');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_IRRELEVANT');
    expect((op.resultPayload as any).exclusion_reason).toBe('SPECULATION_OR_RUMOR');
  });

  it('Matrix #12: Gratitude / Neutral Mention excluded as NEUTRAL_OR_PRAISE', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: false,
      relevant_lanes: [],
      exclusion_reason: 'NEUTRAL_OR_PRAISE',
      reasoning: 'Gratitude message that power is restored',
    });

    const text = 'Rahmat, svet yondi, ustalar tez kelishdi';
    const intakeId = await createTestIntake(text, '112');
    await processCandidateJob(intakeId, text, '112');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_IRRELEVANT');
    expect((op.resultPayload as any).exclusion_reason).toBe('NEUTRAL_OR_PRAISE');
  });

  it('Matrix #13: General Chat / Greeting excluded as GENERAL_CHATTER', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: false,
      relevant_lanes: [],
      exclusion_reason: 'GENERAL_CHATTER',
      reasoning: 'Neighborly greeting without civic issue',
    });

    const text = "Assalomu alaykum qo'shnilar, xayrli tong";
    const intakeId = await createTestIntake(text, '113');
    await processCandidateJob(intakeId, text, '113');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_IRRELEVANT');
    expect((op.resultPayload as any).exclusion_reason).toBe('GENERAL_CHATTER');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Matrix #14 - #18: Context Snapshots, Forward Isolation & Guidance Vocabulary
  // ──────────────────────────────────────────────────────────────────────────

  it('Matrix #14: Ambiguous Fragment with Same-Day Context qualifies under ELECTRICITY (AC 5)', async () => {
    const key = `${testDistrictId}:Guliston:2026-08-22`;
    customEvidenceStore.set(key, [
      {
        id: 'ev_prior_1',
        telegramMessageId: '99',
        originalTimestamp: '2026-08-22T08:00:00.000Z',
        verbatimText: "Svet o'chdi 14-domda",
        lane: 'ELECTRICITY',
      },
    ]);

    aiController.mockAdapter.setNextResponse({
      is_relevant: true,
      relevant_lanes: ['ELECTRICITY'],
      exclusion_reason: null,
      reasoning: 'Short fragment linked to earlier electricity outage in Mahalla',
    });

    const text = "Bizda ham o'chdi";
    const intakeId = await createTestIntake(text, '114');
    await processCandidateJob(intakeId, text, '114');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_RELEVANT');
    expect((op.resultPayload as any).relevant_lanes).toEqual(['ELECTRICITY']);
    expect(op.contextRevision).toBe(1);

    const calls = aiController.mockAdapter.getCalls();
    expect(calls[0]!.userPrompt).toContain("Svet o'chdi 14-domda");
  });

  it('Matrix #15: Ambiguous Fragment without Context excluded as UNRESOLVED_AMBIGUOUS_FRAGMENT', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: false,
      relevant_lanes: [],
      exclusion_reason: 'UNRESOLVED_AMBIGUOUS_FRAGMENT',
      reasoning: 'Ambiguous fragment without linking same-day context',
    });

    const text = 'Bizdayam shu ahvol';
    const intakeId = await createTestIntake(text, '115');
    await processCandidateJob(intakeId, text, '115');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_IRRELEVANT');
    expect((op.resultPayload as any).exclusion_reason).toBe('UNRESOLVED_AMBIGUOUS_FRAGMENT');
  });

  it('Matrix #16: Self-Contained Reply to Forwarded Parent qualifies without parent text (AC 6)', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: true,
      relevant_lanes: ['GAS'],
      exclusion_reason: null,
      reasoning: 'Self-contained gas pressure complaint in reply',
    });

    const text = 'Bizning 4-domda ham gaz bosimi tushib ketdi';
    const intakeId = await createTestIntake(text, '116');
    await processCandidateJob(intakeId, text, '116', {
      replyToMessageId: '888',
      replyToIsForwarded: true,
      replyToIsBot: false,
    });

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_RELEVANT');
    expect((op.resultPayload as any).relevant_lanes).toEqual(['GAS']);

    const calls = aiController.mockAdapter.getCalls();
    expect(calls[0]!.userPrompt).toContain('reply to a Telegram-forwarded parent');
    expect(calls[0]!.userPrompt).toContain('Isolation Rule');
  });

  it('Matrix #17: Context-Dependent Reply to Forwarded Parent excluded as UNRESOLVED_AMBIGUOUS_FRAGMENT (AC 6)', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: false,
      relevant_lanes: [],
      exclusion_reason: 'UNRESOLVED_AMBIGUOUS_FRAGMENT',
      reasoning: 'Reply depends entirely on excluded forwarded parent',
    });

    const text = "Shuni qachon to'g'rilaysizlar?";
    const intakeId = await createTestIntake(text, '117');
    await processCandidateJob(intakeId, text, '117', {
      replyToMessageId: '889',
      replyToIsForwarded: true,
      replyToIsBot: false,
    });

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_IRRELEVANT');
    expect((op.resultPayload as any).exclusion_reason).toBe('UNRESOLVED_AMBIGUOUS_FRAGMENT');
  });

  it('Matrix #18: Guidance Vocabulary Override Prevention qualifies under WATER without keywords (AC 2)', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: true,
      relevant_lanes: ['WATER'],
      exclusion_reason: null,
      reasoning: 'Sewage overflow civic complaint without standard dictionary keyword',
    });

    const text = "Ko'chada kanalizatsiya toshib ketdi";
    const intakeId = await createTestIntake(text, '118');
    await processCandidateJob(intakeId, text, '118');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_RELEVANT');
    expect((op.resultPayload as any).relevant_lanes).toEqual(['WATER']);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Matrix #19 - #25: CAS, Lifecycle Gates, Resilience & Idempotency
  // ──────────────────────────────────────────────────────────────────────────

  it('Matrix #19: Optimistic CAS Revision Failure (STALE_SNAPSHOT) rejects commit and retries (AC 10)', async () => {
    // Simulate new evidence arriving while AI call is in-flight
    aiController.mockAdapter.enqueueBehavior({
      response: {
        is_relevant: true,
        relevant_lanes: ['ELECTRICITY'],
        exclusion_reason: null,
        reasoning: 'First attempt with stale context',
      },
      delayMs: 20,
    });

    let accessCount = 0;
    dynamicResolver = async () => {
      accessCount++;
      if (accessCount === 1) {
        return []; // Initial snapshot revision 0
      } else {
        return [
          {
            id: 'ev_new',
            telegramMessageId: '999',
            originalTimestamp: '2026-08-22T08:50:00.000Z',
            verbatimText: "Svet o'chdi yangi domda",
            lane: 'ELECTRICITY',
          },
        ]; // Changed to revision 1 during call
      }
    };

    const text = "Bizda ham o'chdi";
    const intakeId = await createTestIntake(text, '119');

    // Send candidate job
    await processCandidateJob(intakeId, text, '119');

    // Wait a brief period; because of STALE_SNAPSHOT, the commit will be aborted
    await new Promise((resolve) => setTimeout(resolve, 300));

    const ops = await db.select().from(aiOperations).where(eq(aiOperations.targetId, intakeId));
    expect(ops).toHaveLength(0);
  });

  it('Matrix #20: Pre-AI Lifecycle Gate 1 Rejection drops job when District is SUSPENDED (AC 13)', async () => {
    await db
      .update(districts)
      .set({ status: 'SUSPENDED', accessEligible: false })
      .where(eq(districts.id, testDistrictId));

    const text = 'Suv yoq';
    const intakeId = await createTestIntake(text, '120');
    await processCandidateJob(intakeId, text, '120');

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(aiController.mockAdapter.getCalls()).toHaveLength(0);
    const ops = await db.select().from(aiOperations).where(eq(aiOperations.targetId, intakeId));
    expect(ops).toHaveLength(0);
  });

  it('Matrix #21: Pre-Commit Lifecycle Gate 2 Rejection aborts commit if District deactivates during call (AC 13)', async () => {
    aiController.mockAdapter.enqueueBehavior({
      response: {
        is_relevant: true,
        relevant_lanes: ['WATER'],
        exclusion_reason: null,
        reasoning: 'Valid water complaint',
      },
      delayMs: 80,
    });

    const text = 'Suv yoq';
    const intakeId = await createTestIntake(text, '121');

    setTimeout(async () => {
      await db
        .update(districts)
        .set({ status: 'SUSPENDED', accessEligible: false })
        .where(eq(districts.id, testDistrictId));
    }, 20);

    await processCandidateJob(intakeId, text, '121');
    await new Promise((resolve) => setTimeout(resolve, 300));

    const ops = await db.select().from(aiOperations).where(eq(aiOperations.targetId, intakeId));
    expect(ops).toHaveLength(0);
  });

  it('Matrix #22: Provider Timeout / Rate-Limit (429) retried per profile policy (AC 11)', async () => {
    aiController.mockAdapter.enqueueBehavior({
      error: new AiGatewayError('RATE_LIMIT_EXCEEDED', 'Rate limited', {
        status: 429,
        retryable: true,
      }),
    });
    aiController.mockAdapter.enqueueBehavior({
      response: {
        is_relevant: true,
        relevant_lanes: ['GAS'],
        exclusion_reason: null,
        reasoning: 'Gas leak reported',
      },
    });

    const text = 'Gaz hidi kelyapti';
    const intakeId = await createTestIntake(text, '122');
    await processCandidateJob(intakeId, text, '122');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_RELEVANT');
    expect(aiController.mockAdapter.getCalls()).toHaveLength(2);
  });

  it('Matrix #23: Invalid Schema / Syntax Output retried up to attempt budget (AC 11)', async () => {
    aiController.mockAdapter.setNextResponse('MALFORMED_JSON');
    aiController.mockAdapter.setNextResponse({
      is_relevant: true,
      relevant_lanes: ['WASTE'],
      exclusion_reason: null,
      reasoning: 'Waste overflow',
    });

    const text = 'Musorxona toshib ketdi';
    const intakeId = await createTestIntake(text, '123');
    await processCandidateJob(intakeId, text, '123');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();
    expect(op.finalStatus).toBe('COMPLETED_RELEVANT');
    expect(aiController.mockAdapter.getCalls()).toHaveLength(2);
  });

  it('Matrix #24: Deterministic Context Ordering Check (09:00 -> 09:30 -> 10:00) (AC 5)', async () => {
    const key = `${testDistrictId}:Guliston:2026-08-22`;
    customEvidenceStore.set(key, [
      {
        id: 'ev_3',
        telegramMessageId: '103',
        originalTimestamp: '2026-08-22T10:00:00.000Z',
        verbatimText: "Elektr 10da o'chdi",
      },
      {
        id: 'ev_1',
        telegramMessageId: '101',
        originalTimestamp: '2026-08-22T09:00:00.000Z',
        verbatimText: "Elektr 9da o'chdi",
      },
      {
        id: 'ev_2',
        telegramMessageId: '102',
        originalTimestamp: '2026-08-22T09:30:00.000Z',
        verbatimText: "Elektr 9:30da o'chdi",
      },
    ]);

    aiController.mockAdapter.setNextResponse({
      is_relevant: true,
      relevant_lanes: ['ELECTRICITY'],
      exclusion_reason: null,
      reasoning: 'Electricity blackout corroborated by daily timeline',
    });

    const text = "Bizda ham o'chdi";
    const intakeId = await createTestIntake(text, '124');
    await processCandidateJob(intakeId, text, '124');

    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();

    const calls = aiController.mockAdapter.getCalls();
    expect(calls.length).toBeGreaterThan(0);
    const prompt = calls[0]!.userPrompt;

    const pos1 = prompt.indexOf("Elektr 9da o'chdi");
    const pos2 = prompt.indexOf("Elektr 9:30da o'chdi");
    const pos3 = prompt.indexOf("Elektr 10da o'chdi");

    expect(pos1).toBeGreaterThan(-1);
    expect(pos2).toBeGreaterThan(pos1);
    expect(pos3).toBeGreaterThan(pos2);
  });

  it('Matrix #25: Redelivery & Restart Idempotency skips duplicate and creates exactly 1 downstream job (AC 8)', async () => {
    aiController.mockAdapter.setNextResponse({
      is_relevant: true,
      relevant_lanes: ['WATER'],
      exclusion_reason: null,
      reasoning: 'First delivery water outage',
    });

    const text = "12-uyda suv to'xtab qoldi";
    const intakeId = await createTestIntake(text, '125');

    // 1st delivery
    await processCandidateJob(intakeId, text, '125');
    const op = await waitForOperation(intakeId);
    expect(op).toBeDefined();

    // 2nd duplicate redelivery of same intake
    await processCandidateJob(intakeId, text, '125');
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Only 1 ai_operations record exists
    const ops = await db.select().from(aiOperations).where(eq(aiOperations.targetId, intakeId));
    expect(ops).toHaveLength(1);

    // Only 1 AI request made
    expect(aiController.mockAdapter.getCalls()).toHaveLength(1);
  });
});
