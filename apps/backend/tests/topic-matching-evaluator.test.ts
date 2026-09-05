import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import {
  TopicMatchingEvaluator,
  TopicMatchingResultSchema,
  TOPIC_MATCHING_SYSTEM_PROMPT,
  type TopicMatchingResult,
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
      expect(prompt).toContain('Current Topic Summary: (Initial report: "Svet o‘chdi 5-domda")');
      expect(prompt).toContain('Nearest Earlier Same-Day Message in Mahalla: MsgID 102');
    });

    it('renders canonical topic summary in prompt when topicSummary is present in snapshot', () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Navbahor',
        calendarDay: '2026-08-22',
        contextRevision: 1,
        snapshotFingerprint: 'abc123',
        evidence: [
          {
            id: 'evi_1',
            topicId: 'top_water_1',
            telegramMessageId: '101',
            originalTimestamp: '2026-08-22T09:00:00.000Z',
            verbatimText: 'Suv o‘chdi',
            lane: 'WATER',
            topicSummary: 'Сув таъминотида узилиш юз бергани хабар қилинмоқда.',
          },
        ],
      };

      const prompt = evaluator.buildUserPrompt({
        candidateText: 'hech bo‘lmasa suv kelib turgandi',
        telegramMessageId: '102',
        originalTimestamp: '2026-08-22T14:30:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['WATER'],
        snapshot,
      });

      expect(prompt).toContain('Current Topic Summary: "Сув таъминотида узилиш юз бергани хабар қилинмоқда."');
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

    it('builds prompt highlighting relative time delta and domain shift message', () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Guliston',
        calendarDay: '2026-09-01',
        contextRevision: 2,
        snapshotFingerprint: 'abc_fingerprint',
        evidence: [
          {
            id: 'evi_1',
            topicId: 'top_elec_1',
            telegramMessageId: '101',
            originalTimestamp: '2026-09-01T13:43:00.000Z',
            verbatimText: 'salom mahalladoshlar! svet hammada ucdimi yoki bizdami faqat?',
            lane: 'ELECTRICITY',
          },
          {
            id: 'evi_2',
            topicId: 'top_elec_1',
            telegramMessageId: '102',
            originalTimestamp: '2026-09-01T13:44:00.000Z',
            verbatimText: 'Cherez den uciroriw odat bub qoldi ln. Remon diyiladi.',
            lane: 'ELECTRICITY',
          },
        ],
      };

      const prompt = evaluator.buildUserPrompt({
        candidateText: 'Suvam ucdi mana. Xalq cidoradi',
        telegramMessageId: '103',
        originalTimestamp: '2026-09-01T14:36:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['WATER'],
        relevanceReasoning: 'Water outage reported with contracted suffix',
        snapshot,
      });

      expect(prompt).toContain('Suvam ucdi mana. Xalq cidoradi');
      expect(prompt).toContain('Relevant Lanes: [WATER]');
      expect(prompt).toContain('Nearest Earlier Same-Day Message in Mahalla: MsgID 102 (+52m before candidate)');
      expect(prompt).toContain('top_elec_1 (Primary Lane: ELECTRICITY)');
    });

    it('executes AI evaluation creating NEW_TOPIC for distinct utility domain shift', async () => {
      const expectedOutput: TopicMatchingResult = {
        decision: 'NEW_TOPIC',
        matched_topic_id: null,
        primary_lane: 'WATER',
        reasoning: 'Explicit water domain outage reports distinct utility incident from electricity',
      };

      mockAdapter.setNextResponse(expectedOutput);

      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Guliston',
        calendarDay: '2026-09-01',
        contextRevision: 2,
        snapshotFingerprint: 'abc_fingerprint',
        evidence: [
          {
            id: 'evi_1',
            topicId: 'top_elec_1',
            telegramMessageId: '101',
            originalTimestamp: '2026-09-01T13:43:00.000Z',
            verbatimText: 'salom mahalladoshlar! svet hammada ucdimi yoki bizdami faqat?',
            lane: 'ELECTRICITY',
          },
        ],
      };

      const result = await evaluator.evaluateTopicAssignment({
        candidateText: 'Suvam ucdi mana. Xalq cidoradi',
        telegramMessageId: '103',
        originalTimestamp: '2026-09-01T14:36:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['WATER'],
        snapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      expect(result.data.decision).toBe('NEW_TOPIC');
      expect(result.data.matched_topic_id).toBeNull();
      expect(result.data.primary_lane).toBe('WATER');
    });

    it('matches N-1 electricity topic for subjectless follow-up in rapid multi-topic sequence', async () => {
      const expectedOutput: TopicMatchingResult = {
        decision: 'MATCH_EXISTING_TOPIC',
        matched_topic_id: 'top_elec_1',
        primary_lane: null,
        reasoning: 'Subjectless maintenance complaint binds strictly to immediate preceding electricity topic (N-1)',
      };

      mockAdapter.setNextResponse(expectedOutput);

      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Guliston',
        calendarDay: '2026-09-01',
        contextRevision: 2,
        snapshotFingerprint: 'seq_hash_123',
        evidence: [
          {
            id: 'evi_1',
            topicId: 'top_gas_1',
            telegramMessageId: '101',
            originalTimestamp: '2026-09-01T15:50:00.000Z',
            verbatimText: 'salom mahalladoshlar! gaz hammada ucdimi yoki bizdami faqat?',
            lane: 'GAS',
          },
          {
            id: 'evi_2',
            topicId: 'top_elec_1',
            telegramMessageId: '102',
            originalTimestamp: '2026-09-01T15:50:30.000Z',
            verbatimText: 'kamiga svetam yu',
            lane: 'ELECTRICITY',
          },
        ],
      };

      const result = await evaluator.evaluateTopicAssignment({
        candidateText: 'Cherez den uciroriw odat bub qoldi ln. Remon diyiladi.',
        telegramMessageId: '103',
        originalTimestamp: '2026-09-01T15:51:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['ELECTRICITY'],
        snapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      expect(result.data.decision).toBe('MATCH_EXISTING_TOPIC');
      expect(result.data.matched_topic_id).toBe('top_elec_1');
      expect(result.data.primary_lane).toBeNull();
    });

    it('seeds NEW_TOPIC for distinct localized infrastructure failure within same service lane (water outage vs pipe leak)', async () => {
      const expectedOutput: TopicMatchingResult = {
        decision: 'NEW_TOPIC',
        matched_topic_id: null,
        primary_lane: 'WATER',
        reasoning: 'Active pipe burst and street flooding on Bogzor street is a distinct physical incident from general tap water outage',
      };

      mockAdapter.setNextResponse(expectedOutput);

      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Guliston',
        calendarDay: '2026-09-02',
        contextRevision: 3,
        snapshotFingerprint: 'pipe_leak_hash',
        evidence: [
          {
            id: 'evi_1',
            topicId: 'top_elec_1',
            telegramMessageId: '101',
            originalTimestamp: '2026-09-02T14:57:00.000Z',
            verbatimText: 'bugunam yu\nbugunam kemadi\nsvet',
            lane: 'ELECTRICITY',
          },
          {
            id: 'evi_2',
            topicId: 'top_water_outage_1',
            telegramMessageId: '102',
            originalTimestamp: '2026-09-02T15:22:00.000Z',
            verbatimText: 'qachon keladi\nsuv',
            lane: 'WATER',
          },
        ],
      };

      const result = await evaluator.evaluateTopicAssignment({
        candidateText: 'bogzor kucada suv oqib yotpti. 2 kun buldi. daryo bb ketmagunca vodokanal qaramedimi,\nsuvni tejela diyishadi uzlari qaramedi',
        telegramMessageId: '103',
        originalTimestamp: '2026-09-02T15:41:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['WATER'],
        snapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      expect(result.data.decision).toBe('NEW_TOPIC');
      expect(result.data.matched_topic_id).toBeNull();
      expect(result.data.primary_lane).toBe('WATER');
    });

    it('seeds NEW_TOPIC for distinct localized physical hazard within same service lane (power outage vs sparking transformer)', async () => {
      const expectedOutput: TopicMatchingResult = {
        decision: 'NEW_TOPIC',
        matched_topic_id: null,
        primary_lane: 'ELECTRICITY',
        reasoning: 'Sparking transformer on Navoiy street represents an independent physical hazard from general grid outage',
      };

      mockAdapter.setNextResponse(expectedOutput);

      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Guliston',
        calendarDay: '2026-09-02',
        contextRevision: 2,
        snapshotFingerprint: 'elec_trans_hash',
        evidence: [
          {
            id: 'evi_1',
            topicId: 'top_elec_outage_1',
            telegramMessageId: '201',
            originalTimestamp: '2026-09-02T10:00:00.000Z',
            verbatimText: 'Hamma joyda chiroq o‘chdi',
            lane: 'ELECTRICITY',
          },
        ],
      };

      const result = await evaluator.evaluateTopicAssignment({
        candidateText: 'Navoiy ko‘chasidagi transformatordan uchqun chiqyapti, xavfli holat',
        telegramMessageId: '202',
        originalTimestamp: '2026-09-02T10:45:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['ELECTRICITY'],
        snapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      expect(result.data.decision).toBe('NEW_TOPIC');
      expect(result.data.matched_topic_id).toBeNull();
      expect(result.data.primary_lane).toBe('ELECTRICITY');
    });

    it('matches same-day general outage follow-up after multi-hour silence to general outage topic when localized leak also coexists', async () => {
      const expectedOutput: TopicMatchingResult = {
        decision: 'MATCH_EXISTING_TOPIC',
        matched_topic_id: 'top_water_outage_1',
        primary_lane: null,
        reasoning: 'General water supply follow-up belongs to ongoing same-day general water outage, not localized street pipe leak',
      };

      mockAdapter.setNextResponse(expectedOutput);

      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Navbahor',
        calendarDay: '2026-09-02',
        contextRevision: 2,
        snapshotFingerprint: 'water_continuity_hash',
        evidence: [
          {
            id: 'evi_1',
            topicId: 'top_water_outage_1',
            telegramMessageId: '101',
            originalTimestamp: '2026-09-02T17:00:00.000Z',
            verbatimText: 'qachon keladi\nsuv\nkemasa kereya xaloyiq',
            lane: 'WATER',
            topicSummary: 'Сув таъминотида узилиш юз бергани хабар қилинмоқда.',
          },
          {
            id: 'evi_2',
            topicId: 'top_water_pipe_2',
            telegramMessageId: '102',
            originalTimestamp: '2026-09-02T17:02:00.000Z',
            verbatimText: 'bogzor kucada suv oqib yotpti. 2 kun buldi. daryo bb ketmagunca vodokanal qaramedimi,',
            lane: 'WATER',
            topicSummary: 'Боғзор кўчасида сув қувурининг сизиш ёки оқиб кетиши натижасида сув йўқотилиши юз берганлиги хабар қилинмоқда.',
          },
        ],
      };

      const prompt = evaluator.buildUserPrompt({
        candidateText: 'hec bumasa\nsuv keb turgandedi',
        telegramMessageId: '103',
        originalTimestamp: '2026-09-02T22:02:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['WATER'],
        snapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      // Assert prompt includes both topic summaries so LLM has clear context
      expect(prompt).toContain('Current Topic Summary: "Сув таъминотида узилиш юз бергани хабар қилинмоқда."');
      expect(prompt).toContain('Current Topic Summary: "Боғзор кўчасида сув қувурининг сизиш');

      const result = await evaluator.evaluateTopicAssignment({
        candidateText: 'hec bumasa\nsuv keb turgandedi',
        telegramMessageId: '103',
        originalTimestamp: '2026-09-02T22:02:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['WATER'],
        snapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      expect(result.data.decision).toBe('MATCH_EXISTING_TOPIC');
      expect(result.data.matched_topic_id).toBe('top_water_outage_1');
      expect(result.data.primary_lane).toBeNull();
    });

    it('ensures system prompt defines incident-level semantic relevance safeguard for private peer requests', () => {
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('Incident Semantic Relevance Precedence (Municipal Disruption vs. Private Peer Requests)');
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('bakalashka oladigan nomeri');
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('remont chiqindisiga muravey bormi');
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('santexnik kerak');
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('UNASSIGNABLE_VAGUE');
    });

    it('designates private peer requests (Shahob & Dildora cases) as UNASSIGNABLE_VAGUE instead of merging into active municipal waste topic', async () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: "Navro'z",
        calendarDay: '2026-09-03',
        contextRevision: 4,
        snapshotFingerprint: 'sha256_navroz_waste_v1',
        evidence: [
          {
            id: 'evi_waste_1',
            topicId: 'top_navroz_waste_truck',
            telegramMessageId: '8001',
            originalTimestamp: '2026-09-03T10:57:00.000Z',
            verbatimText: 'ХУДО. ХОХЛАСА. ЭРТАГА. МУСОР. МАШИНАСИ. КЕЛАДИМИ ИЛТИМОС. ШАФЕР. ТАЙИНЛАНГ ПАЛЬИКЛИНИКАНИ. ОРКА. КУЧАСИГА КЕЛСИН.',
            lane: 'WASTE',
            topicSummary: 'Чиқиндиларни олиб кетиш хизматининг тўхтаб қолганлиги ва мусоратланиши хабар қилинмоқда.',
          },
          {
            id: 'evi_waste_2',
            topicId: 'top_navroz_waste_truck',
            telegramMessageId: '8002',
            originalTimestamp: '2026-09-03T11:01:00.000Z',
            verbatimText: 'АХОЛИ. МАХАЛЛАДАГИЛАР. ХАММАМИЗ. ВАКТИДА. ПУЛИНИ. ТУЛАЯПМИЗ. УЗИМИЗ. УН. ТУЛАЙМИЗ. ШАФЕР. НИМА. КУЧАЛАРНИ. БИЛМАЙДИМИ',
            lane: 'WASTE',
            topicSummary: 'Чиқиндиларни олиб кетиш хизматининг тўхтаб қолганлиги ва мусоратланиши хабар қилинмоқда.',
          },
        ],
      };

      // 1. Shahob case: private recyclable bottle inquiry
      mockAdapter.setNextResponse({
        decision: 'UNASSIGNABLE_VAGUE',
        matched_topic_id: null,
        primary_lane: null,
        reasoning: 'Private peer inquiry asking for phone number of scrap plastic bottle collectors, not a communal waste service incident',
      });

      const shahobResult = await evaluator.evaluateTopicAssignment({
        candidateText: 'Bakalashka olekkanlani nomerini aytvorila',
        telegramMessageId: '8003',
        originalTimestamp: '2026-09-03T13:58:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['WASTE'],
        relevanceReasoning: 'Mentioned recyclable waste',
        snapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      expect(shahobResult.data.decision).toBe('UNASSIGNABLE_VAGUE');
      expect(shahobResult.data.matched_topic_id).toBeNull();
      expect(shahobResult.data.primary_lane).toBeNull();

      // 2. Dildora case: private vehicle hire for renovation debris
      mockAdapter.setNextResponse({
        decision: 'UNASSIGNABLE_VAGUE',
        matched_topic_id: null,
        primary_lane: null,
        reasoning: 'Inquiry seeking private vehicle hire for home renovation rubble, not a municipal waste service failure',
      });

      const dildoraResult = await evaluator.evaluateTopicAssignment({
        candidateText: 'Ассалому алайкум ремонтдан кейинги чикиндини олиб кетишга муравейча борми',
        telegramMessageId: '8004',
        originalTimestamp: '2026-09-03T14:00:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['WASTE'],
        relevanceReasoning: 'Mentioned waste removal vehicle',
        snapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      expect(dildoraResult.data.decision).toBe('UNASSIGNABLE_VAGUE');
      expect(dildoraResult.data.matched_topic_id).toBeNull();
      expect(dildoraResult.data.primary_lane).toBeNull();

      // 3. Genuine Municipal Waste Follow-up: Matches existing topic
      mockAdapter.setNextResponse({
        decision: 'MATCH_EXISTING_TOPIC',
        matched_topic_id: 'top_navroz_waste_truck',
        primary_lane: null,
        reasoning: 'Direct continuation of municipal garbage truck route complaint for adjacent street',
      });

      const validFollowupResult = await evaluator.evaluateTopicAssignment({
        candidateText: 'ЮКОРИ. КУЧАГА ЯЪНИ. КАТЕЖ ЛАР. ОРАЛАБ. МУСОРНИ. ЙИГИБ. КЕТГАН. БИЗНИ. КУЧАГАЯМ. ТУШСИН. МУСОРНИ. ОЛИШГА.',
        telegramMessageId: '8005',
        originalTimestamp: '2026-09-03T14:05:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['WASTE'],
        relevanceReasoning: 'Garbage truck route complaint',
        snapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      expect(validFollowupResult.data.decision).toBe('MATCH_EXISTING_TOPIC');
      expect(validFollowupResult.data.matched_topic_id).toBe('top_navroz_waste_truck');
      expect(validFollowupResult.data.primary_lane).toBeNull();
    });

    it('ensures system prompt defines multi-incident disambiguation rules for localized infrastructure follow-ups', () => {
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('Multi-Incident Disambiguation for Localized Follow-ups');
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('The AI MUST NOT guess between the two localized streets');
    });

    it('handles multi-incident follow-ups: binds to thread within 30m and avoids arbitrary guessing after chat silence', async () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_sharof_rashidov',
        mahallaName: 'Navbahor',
        calendarDay: '2026-09-03',
        contextRevision: 4,
        snapshotFingerprint: 'fp_navbahor_multi_leak',
        evidence: [
          {
            id: 'evi_bogzor_1',
            topicId: 'top_bogzor_pipe',
            telegramMessageId: '7001',
            originalTimestamp: '2026-09-03T07:42:00.000Z',
            verbatimText: 'bogzor kucada suv oqib yotpti. 2 kun buldi. daryo bb ketmagunca vodokanal qaramedimi,',
            lane: 'WATER',
            topicSummary: 'Боғзор кўчасида сув қувурининг сизиши ёки оқиб кетиши хабар қилинмоқда.',
          },
          {
            id: 'evi_elektroset_1',
            topicId: 'top_elektroset_pipe',
            telegramMessageId: '7002',
            originalTimestamp: '2026-09-03T12:39:00.000Z',
            verbatimText: 'elektroset arqasideyi kucada suv oqib yotipti shetda. 2 kun buldi.',
            lane: 'WATER',
            topicSummary: 'Электросеть орқасидаги кўчада сув қувурининг сизиши ёки оқиб кетиши хабар қилинмоқда.',
          },
        ],
      };

      // Case 1: Thread continuation within 2m of Elektroset report -> matches Elektroset topic
      mockAdapter.setNextResponse({
        decision: 'MATCH_EXISTING_TOPIC',
        matched_topic_id: 'top_elektroset_pipe',
        primary_lane: null,
        reasoning: 'Immediate chat thread continuation regarding pipe leak behind Elektroset',
      });

      const threadContinuation = await evaluator.evaluateTopicAssignment({
        candidateText: 'ula kegunca daryo bub ketmasa buldi',
        telegramMessageId: '7003',
        originalTimestamp: '2026-09-03T12:41:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['WATER'],
        snapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      expect(threadContinuation.data.decision).toBe('MATCH_EXISTING_TOPIC');
      expect(threadContinuation.data.matched_topic_id).toBe('top_elektroset_pipe');

      // Case 2: Isolated follow-up (>4h later) with multiple localized pipe bursts and no general water outage -> UNASSIGNABLE_VAGUE (no guessing)
      mockAdapter.setNextResponse({
        decision: 'UNASSIGNABLE_VAGUE',
        matched_topic_id: null,
        primary_lane: null,
        reasoning: 'Ambiguous pipe leak report after chat silence with multiple active localized pipe bursts',
      });

      const isolatedAmbiguous = await evaluator.evaluateTopicAssignment({
        candidateText: 'suv oqib yotipti hali ham tuzatishmadi',
        telegramMessageId: '7004',
        originalTimestamp: '2026-09-03T17:00:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['WATER'],
        snapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      expect(isolatedAmbiguous.data.decision).toBe('UNASSIGNABLE_VAGUE');
      expect(isolatedAmbiguous.data.matched_topic_id).toBeNull();
    });

    it('ensures system prompt defines spatial orientir exceptions and binds primary_lane to Relevant Lanes', () => {
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('CRITICAL EXCEPTION (SPATIAL ORIENTIRS / ADDRESSES)');
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('MUST strictly be chosen from the candidate\'s upstream Relevant Lanes');
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('elektrosvet orqa tarafideyi kucagayam kesin');
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('NEVER ELECTRICITY');
    });

    it('ensures system prompt defines HOKIM_RELATED isolation for direct complaints and appeals only', () => {
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('HOKIM_RELATED is strictly reserved for civic complaints');
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('explicitly addressed to or demanding action from the District Hokim or Hokimiyat');
      expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('Messages that do NOT address or criticize the Hokim/Hokimiyat MUST NEVER be assigned to or matched into HOKIM_RELATED');
    });

    it('treats "elektrosvet orqa tarafideyi kucagayam kesin" as WASTE and avoids ELECTRICITY (Navbahor case)', async () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_sharof_rashidov',
        mahallaName: 'Navbahor',
        calendarDay: '2026-09-04',
        contextRevision: 1,
        snapshotFingerprint: 'sha256_navbahor_orientir',
        evidence: [
          {
            id: 'evi_navbahor_waste_1',
            topicId: 'top_navbahor_waste_active',
            telegramMessageId: '8010',
            originalTimestamp: '2026-09-04T08:10:00.000Z',
            verbatimText: 'musor mashinasi kelmadi bugun',
            lane: 'WASTE',
            topicSummary: 'Чиқиндилар олиб кетилмагани хабар қилинмоқда.',
          },
        ],
      };

      // Case 1: Active waste topic exists -> matches existing waste topic
      mockAdapter.setNextResponse({
        decision: 'MATCH_EXISTING_TOPIC',
        matched_topic_id: 'top_navbahor_waste_active',
        primary_lane: null,
        reasoning: 'Follow-up request for municipal waste truck to service the street behind the electric utility office',
      });

      const matchResult = await evaluator.evaluateTopicAssignment({
        candidateText: 'elektrosvet orqa tarafideyi kucagayam kesin',
        telegramMessageId: '8161',
        originalTimestamp: '2026-09-04T08:16:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['WASTE'],
        relevanceReasoning: 'Waste collection route request',
        snapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      expect(matchResult.data.decision).toBe('MATCH_EXISTING_TOPIC');
      expect(matchResult.data.matched_topic_id).toBe('top_navbahor_waste_active');

      // Case 2: Empty snapshot (no active waste topic) -> seeds NEW_TOPIC in WASTE, NOT ELECTRICITY
      const emptySnapshot: MahallaDailySnapshot = {
        districtId: 'dist_sharof_rashidov',
        mahallaName: 'Navbahor',
        calendarDay: '2026-09-04',
        contextRevision: 0,
        snapshotFingerprint: 'sha256_empty',
        evidence: [],
      };

      mockAdapter.setNextResponse({
        decision: 'NEW_TOPIC',
        matched_topic_id: null,
        primary_lane: 'WASTE',
        reasoning: 'New topic for missed municipal waste truck route for street behind electric office',
      });

      const newTopicResult = await evaluator.evaluateTopicAssignment({
        candidateText: 'elektrosvet orqa tarafideyi kucagayam kesin',
        telegramMessageId: '8162',
        originalTimestamp: '2026-09-04T08:16:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        relevantLanes: ['WASTE'],
        relevanceReasoning: 'Waste collection route request',
        snapshot: emptySnapshot,
        profileId: 'prof_match_2026_08_v1',
      });

      expect(newTopicResult.data.decision).toBe('NEW_TOPIC');
      expect(newTopicResult.data.primary_lane).toBe('WASTE');
      expect(newTopicResult.data.primary_lane).not.toBe('ELECTRICITY');
    });

    describe('High-Level Communal Outage & Domain Consolidation Rules', () => {
      it('ensures system prompt defines location-agnostic communal consolidation and Hokim causal aggregation', () => {
        expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('COMMUNAL UTILITY & SERVICE DISRUPTIONS ARE MAHALLA-WIDE (LOCATION-AGNOSTIC)');
        expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('Street names, landmarks, or lack of address in supply outage reports are SPATIAL DETAILS / EVIDENCE, NOT indicators of separate incidents!');
        expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('You MUST NOT create separate topics simply because residents name different streets when reporting the same general utility disruption');
        expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('Same-Day Community-Wide Outage Consolidation (Location-Agnostic)');
        expect(TOPIC_MATCHING_SYSTEM_PROMPT).toContain('Causal Domain Aggregation for HOKIM_RELATED');
      });

      it('consolidates multi-street gas outage reports into single communal GAS topic', async () => {
        const snapshot: MahallaDailySnapshot = {
          districtId: 'dist_sharof_rashidov',
          mahallaName: 'Navbahor',
          calendarDay: '2026-09-04',
          contextRevision: 2,
          snapshotFingerprint: 'fp_communal_gas',
          evidence: [
            {
              id: 'evi_gas_1',
              topicId: 'top_gas_communal',
              telegramMessageId: '9001',
              originalTimestamp: '2026-09-04T10:00:00.000Z',
              verbatimText: "Bog'zor ko'chasida gaz yo'q, o'chib qoldi",
              lane: 'GAS',
              topicSummary: 'Газ таъминотида узилиш ёки босим пастлиги хабар қилинмоқда.',
            },
          ],
        };

        // Candidate 1: Resident naming Navro'z street
        mockAdapter.setNextResponse({
          decision: 'MATCH_EXISTING_TOPIC',
          matched_topic_id: 'top_gas_communal',
          primary_lane: null,
          reasoning: 'Communal gas outage affects Mahalla across streets; matches active communal gas topic',
        });
        const matchNavroz = await evaluator.evaluateTopicAssignment({
          candidateText: "Navro'z ko'chasidayam gaz o'chdi, sovuq bo'lib ketyapti",
          telegramMessageId: '9002',
          originalTimestamp: '2026-09-04T10:15:00.000Z',
          contentType: 'TEXT',
          replyMetadata: null,
          relevantLanes: ['GAS'],
          snapshot,
          profileId: 'prof_match_2026_08_v1',
        });
        expect(matchNavroz.data.decision).toBe('MATCH_EXISTING_TOPIC');
        expect(matchNavroz.data.matched_topic_id).toBe('top_gas_communal');

        // Candidate 2: Resident with no street address
        mockAdapter.setNextResponse({
          decision: 'MATCH_EXISTING_TOPIC',
          matched_topic_id: 'top_gas_communal',
          primary_lane: null,
          reasoning: 'Unaddressed gas outage complaint matches ongoing communal gas topic',
        });
        const matchNoAddress = await evaluator.evaluateTopicAssignment({
          candidateText: "Bizda ham gaz yo'q, qachon keladi?",
          telegramMessageId: '9003',
          originalTimestamp: '2026-09-04T10:20:00.000Z',
          contentType: 'TEXT',
          replyMetadata: null,
          relevantLanes: ['GAS'],
          snapshot,
          profileId: 'prof_match_2026_08_v1',
        });
        expect(matchNoAddress.data.decision).toBe('MATCH_EXISTING_TOPIC');
        expect(matchNoAddress.data.matched_topic_id).toBe('top_gas_communal');

        // Candidate 3: Low pressure report on a 3rd street
        mockAdapter.setNextResponse({
          decision: 'MATCH_EXISTING_TOPIC',
          matched_topic_id: 'top_gas_communal',
          primary_lane: null,
          reasoning: 'Low pressure report on Amir Temur street merges into communal gas disruption',
        });
        const matchPressure = await evaluator.evaluateTopicAssignment({
          candidateText: "Amir Temur ko'chasida ham gaz bosimi nolga tushdi",
          telegramMessageId: '9004',
          originalTimestamp: '2026-09-04T10:35:00.000Z',
          contentType: 'TEXT',
          replyMetadata: null,
          relevantLanes: ['GAS'],
          snapshot,
          profileId: 'prof_match_2026_08_v1',
        });
        expect(matchPressure.data.decision).toBe('MATCH_EXISTING_TOPIC');
        expect(matchPressure.data.matched_topic_id).toBe('top_gas_communal');
      });

      it('consolidates multi-street road repair Hokim grievances into single HOKIM_RELATED topic', async () => {
        const snapshot: MahallaDailySnapshot = {
          districtId: 'dist_sharof_rashidov',
          mahallaName: 'Navbahor',
          calendarDay: '2026-09-04',
          contextRevision: 2,
          snapshotFingerprint: 'fp_hokim_roads',
          evidence: [
            {
              id: 'evi_hokim_road_1',
              topicId: 'top_hokim_road_communal',
              telegramMessageId: '9010',
              originalTimestamp: '2026-09-04T11:00:00.000Z',
              verbatimText: "Tuman hokimi qachon 4-ko'chadagi chuqurlarni yamaydi?",
              lane: 'HOKIM_RELATED',
              topicSummary: 'Йўл таъмири бўйича мутасаддилар эътиборсизлиги юзасидан ҳокимликка эътироз билдирилгани хабар қилинмоқда.',
            },
          ],
        };

        mockAdapter.setNextResponse({
          decision: 'MATCH_EXISTING_TOPIC',
          matched_topic_id: 'top_hokim_road_communal',
          primary_lane: null,
          reasoning: 'Road mud grievance addressed to Hokim merges into active Hokim road repair topic',
        });

        const matchRoad = await evaluator.evaluateTopicAssignment({
          candidateText: "Xokim buva Bog'zor ko'chasidagi loyga qachon qaraysiz?",
          telegramMessageId: '9011',
          originalTimestamp: '2026-09-04T11:30:00.000Z',
          contentType: 'TEXT',
          replyMetadata: null,
          relevantLanes: ['HOKIM_RELATED'],
          snapshot,
          profileId: 'prof_match_2026_08_v1',
        });

        expect(matchRoad.data.decision).toBe('MATCH_EXISTING_TOPIC');
        expect(matchRoad.data.matched_topic_id).toBe('top_hokim_road_communal');
      });
      it('evaluates isolated operational vehicle tracking inquiry to UNASSIGNABLE_VAGUE', async () => {
        const snapshot: MahallaDailySnapshot = {
          districtId: 'dist_sharof_rashidov',
          mahallaName: 'Navbahor',
          calendarDay: '2026-09-05',
          contextRevision: 0,
          snapshotFingerprint: 'sha256_empty_v1',
          evidence: [],
        };

        mockAdapter.setNextResponse({
          decision: 'UNASSIGNABLE_VAGUE',
          matched_topic_id: null,
          primary_lane: null,
          reasoning: 'Vehicle tracking inquiry lacks an active failure report and cannot seed a municipal topic',
        });

        const result = await evaluator.evaluateTopicAssignment({
          candidateText: "Musur moshina qaysi ko'cheda ekan aytvoringlar",
          telegramMessageId: '9610',
          originalTimestamp: '2026-09-05T12:02:00.000Z',
          contentType: 'TEXT',
          replyMetadata: null,
          relevantLanes: ['WASTE'],
          snapshot,
          profileId: 'prof_match_2026_08_v1',
        });

        expect(result.data.decision).toBe('UNASSIGNABLE_VAGUE');
        expect(result.data.matched_topic_id).toBeNull();
        expect(result.data.primary_lane).toBeNull();
      });
      it('matches 24/7 continuous utility inquiry ("Bugun gaz keladimi?") into active communal gas topic', async () => {
        const snapshot: MahallaDailySnapshot = {
          districtId: 'dist_sharof_rashidov',
          mahallaName: 'Navbahor',
          calendarDay: '2026-09-05',
          contextRevision: 2,
          snapshotFingerprint: 'sha256_gas_inquiry_communal',
          evidence: [
            {
              id: 'evi_gas_1',
              topicId: 'top_gas_communal',
              telegramMessageId: '9001',
              originalTimestamp: '2026-09-05T08:00:00.000Z',
              verbatimText: "Bog'zor ko'chasida gaz yo'q, o'chib qoldi",
              lane: 'GAS',
              topicSummary: 'Газ таъминотида узилиш ёки босим пастлиги хабар қилинмоқда.',
            },
          ],
        };

        mockAdapter.setNextResponse({
          decision: 'MATCH_EXISTING_TOPIC',
          matched_topic_id: 'top_gas_communal',
          primary_lane: null,
          reasoning: 'Continuous grid gas presence inquiry inherently refers to ongoing communal gas outage',
        });

        const result = await evaluator.evaluateTopicAssignment({
          candidateText: 'Bugun gaz keladimi?',
          telegramMessageId: '9711',
          originalTimestamp: '2026-09-05T08:45:00.000Z',
          contentType: 'TEXT',
          replyMetadata: null,
          relevantLanes: ['GAS'],
          snapshot,
          profileId: 'prof_match_2026_08_v1',
        });

        expect(result.data.decision).toBe('MATCH_EXISTING_TOPIC');
        expect(result.data.matched_topic_id).toBe('top_gas_communal');
        expect(result.data.primary_lane).toBeNull();
      });
    });
  });
});

