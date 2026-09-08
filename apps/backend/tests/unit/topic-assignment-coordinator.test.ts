import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import type pg from 'pg';
import { eq } from 'drizzle-orm';
import {
  createDbPool,
  createDbClient,
  type DbClient,
} from '../../src/adapters/db/client.js';
import {
  districts,
  telegramIntakeRecords,
  topics,
  acceptedEvidence,
} from '../../src/adapters/db/schema/index.js';
import { ensureDefaultAiProfiles } from '../../src/adapters/db/seeds.js';
import { createMockAiGateway, type MockAiGatewayController } from '../helpers/mock-ai-gateway.js';
import {
  TopicMatchingEvaluator,
  type TopicMatchingResult,
} from '../../src/modules/topics/topic-matching-evaluator.js';
import {
  createTopicAssignmentCoordinator,
  type TopicAssignmentCoordinator,
} from '../../src/modules/topics/topic-assignment-coordinator.js';
import { StaleSnapshotRevisionError } from '../../src/modules/ai/context-snapshot.js';

describe('TopicAssignmentCoordinator Direct Unit Tests', () => {
  let pool: pg.Pool;
  let db: DbClient;
  let aiController: MockAiGatewayController;
  let evaluator: TopicMatchingEvaluator;
  let coordinator: TopicAssignmentCoordinator;
  let testDistrictId: string;
  let testChatId: string;

  beforeAll(async () => {
    pool = createDbPool();
    db = createDbClient(pool);
    await ensureDefaultAiProfiles(db);

    const defaultResponse: TopicMatchingResult = {
      decision: 'NEW_TOPIC',
      matched_topic_id: null,
      primary_lane: 'WATER',
      reasoning: 'Direct test new topic assignment',
    };
    aiController = createMockAiGateway(defaultResponse);
    evaluator = new TopicMatchingEvaluator(aiController.gateway);

    coordinator = createTopicAssignmentCoordinator({
      db,
      pool,
      topicMatchingEvaluator: evaluator,
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    aiController.mockAdapter.clearHistory();
    testDistrictId = `dist_coord_${crypto.randomUUID().slice(0, 8)}`;
    testChatId = `-100${Date.now()}${Math.floor(Math.random() * 1000)}`;

    await db.insert(districts).values({
      id: testDistrictId,
      name: `CoordinatorDistrict_${crypto.randomUUID().slice(0, 6)}`,
      status: 'ACTIVE',
      accessEligible: true,
    });
  });

  it('creates a new topic when AI evaluates NEW_TOPIC', async () => {
    aiController.mockAdapter.setNextResponse({
      decision: 'NEW_TOPIC',
      matched_topic_id: null,
      primary_lane: 'GAS',
      reasoning: 'Reports a central gas outage on street 4',
    });

    const intakeId = `intake_${crypto.randomUUID()}`;
    const messageId = `msg_${Date.now()}`;

    await db.insert(telegramIntakeRecords).values({
      id: intakeId,
      districtId: testDistrictId,
      mahallaName: 'Navbahor',
      calendarDay: '2026-09-08',
      telegramBotId: 'bot_1',
      telegramChatId: testChatId,
      telegramMessageId: messageId,
      telegramUserId: 'user_123',
      originalTimestamp: new Date(),
      rawPayload: { message: { message_id: 101, text: 'Gaz o\'chdi' } },
    });

    const outcome = await coordinator.assignEvidenceToTopic({
      intakeId,
      districtId: testDistrictId,
      mahallaName: 'Navbahor',
      calendarDay: '2026-09-08',
      telegramChatId: testChatId,
      telegramMessageId: messageId,
      telegramUserId: 'user_123',
      originalTimestamp: new Date().toISOString(),
      contentType: 'TEXT',
      verbatimText: "Gaz o'chdi",
      replyMetadata: null,
      userMetadata: { telegramUserId: 'user_123', username: 'resident_test' },
      aiOperationId: null,
      relevantLanes: ['GAS'],
      reasoning: 'Central gas cut',
      burstMessages: null,
      issueId: null,
    });

    expect(outcome.status).toBe('CREATED_NEW');
    if (outcome.status === 'CREATED_NEW') {
      expect(outcome.primaryLane).toBe('GAS');
      expect(outcome.evidenceCount).toBe(1);

      const [createdTopic] = await db
        .select()
        .from(topics)
        .where(eq(topics.id, outcome.topicId))
        .limit(1);

      expect(createdTopic).toBeDefined();
      expect(createdTopic?.primaryLane).toBe('GAS');
      expect(createdTopic?.status).toBe('ACTIVE');

      const evidence = await db
        .select()
        .from(acceptedEvidence)
        .where(eq(acceptedEvidence.topicId, outcome.topicId));

      expect(evidence.length).toBe(1);
      expect(evidence[0]?.verbatimText).toBe("Gaz o'chdi");
    }
  });

  it('bypasses AI and attaches directly when direct Telegram reply exists', async () => {
    // 1. Seed existing topic and evidence
    const topicId = `top_${crypto.randomUUID()}`;
    await db.insert(topics).values({
      id: topicId,
      districtId: testDistrictId,
      mahallaName: 'Navbahor',
      calendarDay: '2026-09-08',
      primaryLane: 'WATER',
      status: 'ACTIVE',
      latestRelevantEvidenceTimestamp: new Date(),
      retentionExpiresAt: new Date(Date.now() + 86400000),
      requiredDerivedGeneration: 1,
      appliedDerivedGeneration: 0,
    });

    const parentMessageId = `parent_msg_${Date.now()}`;
    const parentIntakeId = `intake_parent_${crypto.randomUUID()}`;
    await db.insert(telegramIntakeRecords).values({
      id: parentIntakeId,
      districtId: testDistrictId,
      mahallaName: 'Navbahor',
      calendarDay: '2026-09-08',
      telegramBotId: 'bot_1',
      telegramChatId: testChatId,
      telegramMessageId: parentMessageId,
      originalTimestamp: new Date(),
      rawPayload: { message: { message_id: 100, text: 'Suv kelmadi' } },
    });

    await db.insert(acceptedEvidence).values({
      id: `evi_${crypto.randomUUID()}`,
      topicId,
      districtId: testDistrictId,
      mahallaName: 'Navbahor',
      calendarDay: '2026-09-08',
      intakeRecordId: parentIntakeId,
      telegramChatId: testChatId,
      telegramMessageId: parentMessageId,
      originalTimestamp: new Date(),
      verbatimText: "Suv kelmadi",
      contentType: 'TEXT',
    });

    // 2. Incoming direct reply
    const replyIntakeId = `intake_reply_${crypto.randomUUID()}`;
    const replyMessageId = `reply_msg_${Date.now()}`;

    await db.insert(telegramIntakeRecords).values({
      id: replyIntakeId,
      districtId: testDistrictId,
      mahallaName: 'Navbahor',
      calendarDay: '2026-09-08',
      telegramBotId: 'bot_1',
      telegramChatId: testChatId,
      telegramMessageId: replyMessageId,
      originalTimestamp: new Date(),
      rawPayload: { message: { message_id: 102, text: 'Bizdayam yo\'q' } },
    });

    const outcome = await coordinator.assignEvidenceToTopic({
      intakeId: replyIntakeId,
      districtId: testDistrictId,
      mahallaName: 'Navbahor',
      calendarDay: '2026-09-08',
      telegramChatId: testChatId,
      telegramMessageId: replyMessageId,
      telegramUserId: 'user_456',
      originalTimestamp: new Date().toISOString(),
      contentType: 'TEXT',
      verbatimText: "Bizdayam yo'q",
      replyMetadata: {
        replyToMessageId: parentMessageId,
        replyToIsForwarded: false,
        replyToIsBot: false,
        replyToUserId: 'user_123',
      },
      userMetadata: null,
      aiOperationId: null,
      relevantLanes: ['WATER'],
      reasoning: 'Direct reply',
      burstMessages: null,
      issueId: null,
    });

    expect(outcome.status).toBe('ASSIGNED_EXISTING');
    if (outcome.status === 'ASSIGNED_EXISTING') {
      expect(outcome.topicId).toBe(topicId);
      expect(outcome.isDirectReply).toBe(true);
      expect(outcome.method).toBe('DIRECT_REPLY');
      expect(outcome.generation).toBe(2);

      // AI Adapter should not have been called at all!
      expect(aiController.mockAdapter.getCalls().length).toBe(0);
    }
  });

  it('skips processing and returns SKIPPED_INACTIVE_DISTRICT when district is not active', async () => {
    const inactiveDistrictId = `dist_inactive_${crypto.randomUUID().slice(0, 8)}`;
    await db.insert(districts).values({
      id: inactiveDistrictId,
      name: `InactiveDistrict_${crypto.randomUUID().slice(0, 8)}`,
      status: 'CANCELLED',
      accessEligible: false,
    });

    const outcome = await coordinator.assignEvidenceToTopic({
      intakeId: `intake_${crypto.randomUUID()}`,
      districtId: inactiveDistrictId,
      mahallaName: 'Navbahor',
      calendarDay: '2026-09-08',
      telegramChatId: testChatId,
      telegramMessageId: `msg_${Date.now()}`,
      telegramUserId: null,
      originalTimestamp: new Date().toISOString(),
      contentType: 'TEXT',
      verbatimText: 'Elektr o\'chdi',
      replyMetadata: null,
      userMetadata: null,
      aiOperationId: null,
      relevantLanes: ['ELECTRICITY'],
      reasoning: 'Outage',
      burstMessages: null,
      issueId: null,
    });

    expect(outcome.status).toBe('SKIPPED_INACTIVE_DISTRICT');
    if (outcome.status === 'SKIPPED_INACTIVE_DISTRICT') {
      expect(outcome.districtStatus).toBe('CANCELLED');
    }
  });

  it('skips duplicate submissions and returns SKIPPED_DUPLICATE', async () => {
    // 1. Seed existing accepted evidence
    const topicId = `top_${crypto.randomUUID()}`;
    await db.insert(topics).values({
      id: topicId,
      districtId: testDistrictId,
      mahallaName: 'Navbahor',
      calendarDay: '2026-09-08',
      primaryLane: 'WATER',
      status: 'ACTIVE',
      latestRelevantEvidenceTimestamp: new Date(),
      retentionExpiresAt: new Date(Date.now() + 86400000),
      requiredDerivedGeneration: 1,
      appliedDerivedGeneration: 0,
    });

    const messageId = `dup_msg_${Date.now()}`;
    const evidenceId = `evi_dup_${crypto.randomUUID()}`;
    const dupIntakeId = `intake_dup_${crypto.randomUUID()}`;

    await db.insert(telegramIntakeRecords).values({
      id: dupIntakeId,
      districtId: testDistrictId,
      mahallaName: 'Navbahor',
      calendarDay: '2026-09-08',
      telegramBotId: 'bot_1',
      telegramChatId: testChatId,
      telegramMessageId: messageId,
      originalTimestamp: new Date(),
      rawPayload: { message: { message_id: 104, text: "Suv to'xtadi" } },
    });

    await db.insert(acceptedEvidence).values({
      id: evidenceId,
      topicId,
      districtId: testDistrictId,
      mahallaName: 'Navbahor',
      calendarDay: '2026-09-08',
      intakeRecordId: dupIntakeId,
      telegramChatId: testChatId,
      telegramMessageId: messageId,
      originalTimestamp: new Date(),
      verbatimText: "Suv to'xtadi",
      contentType: 'TEXT',
    });

    // 2. Try to assign the same messageId in the same chat
    const outcome = await coordinator.assignEvidenceToTopic({
      intakeId: `intake_replay_${crypto.randomUUID()}`,
      districtId: testDistrictId,
      mahallaName: 'Navbahor',
      calendarDay: '2026-09-08',
      telegramChatId: testChatId,
      telegramMessageId: messageId,
      telegramUserId: null,
      originalTimestamp: new Date().toISOString(),
      contentType: 'TEXT',
      verbatimText: 'Suv to\'xtadi',
      replyMetadata: null,
      userMetadata: null,
      aiOperationId: null,
      relevantLanes: ['WATER'],
      reasoning: null,
      burstMessages: null,
      issueId: null,
    });

    expect(outcome.status).toBe('SKIPPED_DUPLICATE');
    if (outcome.status === 'SKIPPED_DUPLICATE') {
      expect(outcome.existingEvidenceId).toBe(evidenceId);
      expect(outcome.topicId).toBe(topicId);
    }
  });

  it('raises StaleSnapshotRevisionError on CAS revision advance', async () => {
    let callCount = 0;
    const dynamicResolver = async (): Promise<any[]> => {
      callCount++;
      // On first call (before AI), return 1 item (revision 1)
      if (callCount === 1) {
        return [
          {
            id: 'evi_1',
            topicId: 'top_1',
            telegramMessageId: 'msg_1',
            originalTimestamp: '2026-09-08T10:00:00.000Z',
            verbatimText: 'Suv kelmadi',
            lane: 'WATER',
          },
        ];
      }
      // On second call (CAS check after AI), return 2 items (revision 2) -> collision!
      return [
        {
          id: 'evi_1',
          topicId: 'top_1',
          telegramMessageId: 'msg_1',
          originalTimestamp: '2026-09-08T10:00:00.000Z',
          verbatimText: 'Suv kelmadi',
          lane: 'WATER',
        },
        {
          id: 'evi_2',
          topicId: 'top_1',
          telegramMessageId: 'msg_2',
          originalTimestamp: '2026-09-08T10:01:00.000Z',
          verbatimText: 'Suv hali ham yo\'q',
          lane: 'WATER',
        },
      ];
    };

    const casCoordinator = createTopicAssignmentCoordinator({
      db,
      pool,
      topicMatchingEvaluator: evaluator,
      injectedEvidenceResolver: dynamicResolver,
    });

    const intakeId = `intake_cas_${crypto.randomUUID()}`;
    const messageId = `msg_cas_${Date.now()}`;

    await db.insert(telegramIntakeRecords).values({
      id: intakeId,
      districtId: testDistrictId,
      mahallaName: 'Navbahor',
      calendarDay: '2026-09-08',
      telegramBotId: 'bot_1',
      telegramChatId: testChatId,
      telegramMessageId: messageId,
      originalTimestamp: new Date(),
      rawPayload: { message: { message_id: 103, text: 'Suv yo\'q' } },
    });

    await expect(
      casCoordinator.assignEvidenceToTopic({
        intakeId,
        districtId: testDistrictId,
        mahallaName: 'Navbahor',
        calendarDay: '2026-09-08',
        telegramChatId: testChatId,
        telegramMessageId: messageId,
        telegramUserId: null,
        originalTimestamp: new Date().toISOString(),
        contentType: 'TEXT',
        verbatimText: 'Suv yo\'q',
        replyMetadata: null,
        userMetadata: null,
        aiOperationId: null,
        relevantLanes: ['WATER'],
        reasoning: null,
        burstMessages: null,
        issueId: null,
      }),
    ).rejects.toThrow(StaleSnapshotRevisionError);
  });
});
