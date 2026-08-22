import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  TopicMatchingResultSchema,
  type TopicMatchingResult,
} from '../src/modules/ai/topic-matching-contracts.js';
import {
  TopicMatchingEvaluator,
  findDirectReplyTopic,
} from '../src/modules/topics/topic-matching-evaluator.js';
import type { MahallaDailySnapshot } from '../src/modules/ai/context-snapshot.js';
import { MockProviderAdapter } from '../src/adapters/ai-providers/mock-provider-adapter.js';
import { AiGateway } from '../src/modules/ai/ai-gateway.js';
import type { AiProfile } from '../src/adapters/db/schema/ai.js';
import { createDbPool, createDbClient, type DbClient } from '../src/adapters/db/client.js';
import {
  districts,
  topics,
  telegramIntakeRecords,
  acceptedEvidence,
} from '../src/adapters/db/schema/index.js';
import { eq } from 'drizzle-orm';
import pg from 'pg';
import crypto from 'node:crypto';

describe('Story 2.4: Topic Matching Evaluator & Contracts Unit Tests', () => {
  describe('TopicMatchingResultSchema Invariants & Refinements', () => {
    it('accepts valid MATCH_EXISTING_TOPIC with matched_topic_id and null primary_lane', () => {
      const validMatch: TopicMatchingResult = {
        decision: 'MATCH_EXISTING_TOPIC',
        matched_topic_id: 'top_12345678-abcd-ef01-2345-6789abcdef01',
        primary_lane: null,
        reasoning: 'Resident reports voltage drop in ongoing electricity disruption',
      };

      const result = TopicMatchingResultSchema.safeParse(validMatch);
      expect(result.success).toBe(true);
    });

    it('accepts valid NEW_TOPIC with null matched_topic_id and non-null primary_lane', () => {
      const validNew: TopicMatchingResult = {
        decision: 'NEW_TOPIC',
        matched_topic_id: null,
        primary_lane: 'WATER',
        reasoning: 'Burst drinking water pipe on Amir Temur street',
      };

      const result = TopicMatchingResultSchema.safeParse(validNew);
      expect(result.success).toBe(true);
    });

    it('accepts valid UNASSIGNABLE_VAGUE with null matched_topic_id and null primary_lane', () => {
      const validVague: TopicMatchingResult = {
        decision: 'UNASSIGNABLE_VAGUE',
        matched_topic_id: null,
        primary_lane: null,
        reasoning: 'Context-dependent fragment with no matching active topic',
      };

      const result = TopicMatchingResultSchema.safeParse(validVague);
      expect(result.success).toBe(true);
    });

    it('rejects MATCH_EXISTING_TOPIC if matched_topic_id is null', () => {
      const invalid = {
        decision: 'MATCH_EXISTING_TOPIC',
        matched_topic_id: null,
        primary_lane: null,
        reasoning: 'Missing topic ID',
      };

      const result = TopicMatchingResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects MATCH_EXISTING_TOPIC if primary_lane is provided', () => {
      const invalid = {
        decision: 'MATCH_EXISTING_TOPIC',
        matched_topic_id: 'top_123',
        primary_lane: 'ELECTRICITY',
        reasoning: 'Cannot override topic lane on match',
      };

      const result = TopicMatchingResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects NEW_TOPIC if primary_lane is null', () => {
      const invalid = {
        decision: 'NEW_TOPIC',
        matched_topic_id: null,
        primary_lane: null,
        reasoning: 'New topic must have a primary lane',
      };

      const result = TopicMatchingResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects NEW_TOPIC if matched_topic_id is provided', () => {
      const invalid = {
        decision: 'NEW_TOPIC',
        matched_topic_id: 'top_123',
        primary_lane: 'GAS',
        reasoning: 'New topic cannot reference existing topic',
      };

      const result = TopicMatchingResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects UNASSIGNABLE_VAGUE if either matched_topic_id or primary_lane is non-null', () => {
      const invalidWithTopic = {
        decision: 'UNASSIGNABLE_VAGUE',
        matched_topic_id: 'top_123',
        primary_lane: null,
        reasoning: 'Contradictory vague with topic',
      };
      expect(TopicMatchingResultSchema.safeParse(invalidWithTopic).success).toBe(false);

      const invalidWithLane = {
        decision: 'UNASSIGNABLE_VAGUE',
        matched_topic_id: null,
        primary_lane: 'WASTE',
        reasoning: 'Contradictory vague with lane',
      };
      expect(TopicMatchingResultSchema.safeParse(invalidWithLane).success).toBe(false);
    });
  });

  describe('Direct Reply Fast Matcher (findDirectReplyTopic)', () => {
    let pool: pg.Pool;
    let db: DbClient;

    beforeAll(async () => {
      pool = createDbPool();
      db = createDbClient(pool);
    });

    afterAll(async () => {
      await pool.end();
    });

    it('returns canonical topicId when parent exists in same district, chat, mahalla, and calendar day (AC 2)', async () => {
      const districtId = `dist_dr_${crypto.randomUUID()}`;
      const topicId = `top_dr_${crypto.randomUUID()}`;
      const intakeId = `intk_dr_${crypto.randomUUID()}`;
      const evidenceId = `evi_dr_${crypto.randomUUID()}`;
      const now = new Date('2026-08-22T09:00:00Z');

      await db.insert(districts).values({
        id: districtId,
        name: `DirectReplyDist_${crypto.randomUUID().slice(0, 8)}`,
        status: 'ACTIVE',
      });

      await db.insert(topics).values({
        id: topicId,
        districtId,
        mahallaName: 'Guliston',
        calendarDay: '2026-08-22',
        primaryLane: 'ELECTRICITY',
        status: 'ACTIVE',
        latestRelevantEvidenceTimestamp: now,
        retentionExpiresAt: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000),
        requiredDerivedGeneration: 1,
        appliedDerivedGeneration: 0,
      });

      await db.insert(telegramIntakeRecords).values({
        id: intakeId,
        districtId,
        mahallaName: 'Guliston',
        telegramBotId: 'bot_123',
        telegramChatId: '-100123456789',
        telegramMessageId: '5001',
        originalTimestamp: now,
        calendarDay: '2026-08-22',
        rawPayload: { text: 'Svet o‘chdi' },
      });

      await db.insert(acceptedEvidence).values({
        id: evidenceId,
        topicId,
        districtId,
        mahallaName: 'Guliston',
        calendarDay: '2026-08-22',
        intakeRecordId: intakeId,
        telegramChatId: '-100123456789',
        telegramMessageId: '5001',
        originalTimestamp: now,
        verbatimText: 'Svet o‘chdi',
        contentType: 'TEXT',
      });

      const matchedTopic = await findDirectReplyTopic(
        db,
        districtId,
        'Guliston',
        '2026-08-22',
        '-100123456789',
        '5001',
      );

      expect(matchedTopic).toBe(topicId);

      // Clean up
      await db.delete(acceptedEvidence).where(eq(acceptedEvidence.id, evidenceId));
      await db.delete(topics).where(eq(topics.id, topicId));
      await db.delete(telegramIntakeRecords).where(eq(telegramIntakeRecords.id, intakeId));
      await db.delete(districts).where(eq(districts.id, districtId));
    });

    it('returns null when reply target is from a different calendar day (AC 3)', async () => {
      const districtId = `dist_dr_cross_${crypto.randomUUID()}`;
      const topicId = `top_dr_cross_${crypto.randomUUID()}`;
      const intakeId = `intk_dr_cross_${crypto.randomUUID()}`;
      const evidenceId = `evi_dr_cross_${crypto.randomUUID()}`;
      const yesterday = new Date('2026-08-21T09:00:00Z');

      await db.insert(districts).values({
        id: districtId,
        name: `CrossDayDist_${crypto.randomUUID().slice(0, 8)}`,
        status: 'ACTIVE',
      });

      await db.insert(topics).values({
        id: topicId,
        districtId,
        mahallaName: 'Guliston',
        calendarDay: '2026-08-21',
        primaryLane: 'ELECTRICITY',
        status: 'ACTIVE',
        latestRelevantEvidenceTimestamp: yesterday,
        retentionExpiresAt: new Date(yesterday.getTime() + 90 * 24 * 60 * 60 * 1000),
        requiredDerivedGeneration: 1,
        appliedDerivedGeneration: 0,
      });

      await db.insert(telegramIntakeRecords).values({
        id: intakeId,
        districtId,
        mahallaName: 'Guliston',
        telegramBotId: 'bot_123',
        telegramChatId: '-100123456789',
        telegramMessageId: '5002',
        originalTimestamp: yesterday,
        calendarDay: '2026-08-21',
        rawPayload: { text: 'Kecha svet o‘chgan edi' },
      });

      await db.insert(acceptedEvidence).values({
        id: evidenceId,
        topicId,
        districtId,
        mahallaName: 'Guliston',
        calendarDay: '2026-08-21',
        intakeRecordId: intakeId,
        telegramChatId: '-100123456789',
        telegramMessageId: '5002',
        originalTimestamp: yesterday,
        verbatimText: 'Kecha svet o‘chgan edi',
        contentType: 'TEXT',
      });

      // Today is 2026-08-22: must return null (isolation from cross-day reply targets)
      const matchedTopic = await findDirectReplyTopic(
        db,
        districtId,
        'Guliston',
        '2026-08-22',
        '-100123456789',
        '5002',
      );

      expect(matchedTopic).toBeNull();

      // Clean up
      await db.delete(acceptedEvidence).where(eq(acceptedEvidence.id, evidenceId));
      await db.delete(topics).where(eq(topics.id, topicId));
      await db.delete(telegramIntakeRecords).where(eq(telegramIntakeRecords.id, intakeId));
      await db.delete(districts).where(eq(districts.id, districtId));
    });

    it('returns null when parent message does not exist in accepted_evidence', async () => {
      const result = await findDirectReplyTopic(
        db,
        'non_existent_district',
        'Guliston',
        '2026-08-22',
        '-100123456789',
        '999999',
      );
      expect(result).toBeNull();
    });
  });

  describe('TopicMatchingEvaluator Prompt Generation & AI Execution', () => {
    let evaluator: TopicMatchingEvaluator;
    let mockAdapter: MockProviderAdapter;
    let aiGateway: AiGateway;

    const testProfile: AiProfile = {
      id: 'prof_match_2026_08_v1',
      version: 1,
      operationType: 'TOPIC_MATCHING',
      provider: 'OPENAI',
      modelId: 'gpt-4o-mini-2024-07-18',
      promptVersion: 'prom_match_v1',
      schemaVersion: 'sch_match_v1',
      temperature: 0.0,
      maxOutputTokens: 500,
      timeoutMs: 10000,
      retryPolicy: { maxAttempts: 3, backoffFactor: 2, initialDelayMs: 1000 },
      capabilities: { structuredOutputs: true, jsonSchemaMode: 'strict' },
      isActive: true,
      createdAt: new Date(),
    };

    beforeEach(() => {
      mockAdapter = new MockProviderAdapter();
      aiGateway = new AiGateway();
      aiGateway.registerAdapter('OPENAI', mockAdapter);
      aiGateway.setStaticProfile(testProfile);
      evaluator = new TopicMatchingEvaluator(aiGateway);
    });

    it('builds comprehensive user prompt grouping evidence by topic and highlighting nearest earlier message', () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Navbahor',
        calendarDay: '2026-08-22',
        contextRevision: 2,
        snapshotFingerprint: 'abc123',
        evidence: [
          {
            id: 'evi_1',
            topicId: 'top_elec_1',
            telegramMessageId: '101',
            originalTimestamp: '2026-08-22T09:00:00.000Z',
            verbatimText: 'Svet o‘chdi 5-domda',
            lane: 'ELECTRICITY',
          },
          {
            id: 'evi_2',
            topicId: 'top_elec_1',
            telegramMessageId: '102',
            originalTimestamp: '2026-08-22T09:15:00.000Z',
            verbatimText: 'Bizda ham chiroq yo‘q',
            lane: 'ELECTRICITY',
          },
        ],
      };

      const prompt = evaluator.buildUserPrompt({
        candidateText: 'Tok 160V bo‘lib qoldi',
        telegramMessageId: '103',
        originalTimestamp: '2026-08-22T09:30:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['ELECTRICITY'],
        relevanceReasoning: 'Reports voltage fluctuation',
        snapshot,
      });

      expect(prompt).toContain('### CANDIDATE RELEVANT TELEGRAM MESSAGE TO ASSIGN');
      expect(prompt).toContain('Tok 160V bo‘lib qoldi');
      expect(prompt).toContain('top_elec_1 (Primary Lane: ELECTRICITY)');
      expect(prompt).toContain('Nearest Earlier Same-Day Message in Mahalla: MsgID 102');
    });

    it('executes AI structured evaluation returning typed TopicMatchingResult', async () => {
      const expectedOutput: TopicMatchingResult = {
        decision: 'MATCH_EXISTING_TOPIC',
        matched_topic_id: 'top_elec_1',
        primary_lane: null,
        reasoning: 'Voltage fluctuation belongs to active electricity outage topic',
      };

      mockAdapter.setNextResponse(expectedOutput);

      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Navbahor',
        calendarDay: '2026-08-22',
        contextRevision: 1,
        snapshotFingerprint: 'abc123',
        evidence: [
          {
            id: 'evi_1',
            topicId: 'top_elec_1',
            telegramMessageId: '101',
            originalTimestamp: '2026-08-22T09:00:00.000Z',
            verbatimText: 'Svet o‘chdi',
            lane: 'ELECTRICITY',
          },
        ],
      };

      const result = await evaluator.evaluateTopicAssignment({
        candidateText: 'Tok 160V bo‘lyapti',
        telegramMessageId: '102',
        originalTimestamp: '2026-08-22T09:15:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['ELECTRICITY'],
        snapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      expect(result.data.decision).toBe('MATCH_EXISTING_TOPIC');
      expect(result.data.matched_topic_id).toBe('top_elec_1');
      expect(result.data.primary_lane).toBeNull();
      expect(result.profileId).toBe('prof_match_2026_08_v1');
    });
  });
});
