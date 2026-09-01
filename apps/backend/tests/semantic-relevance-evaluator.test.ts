import { describe, it, expect, beforeEach } from 'vitest';
import {
  SemanticRelevanceEvaluator,
  SemanticRelevanceResultSchema,
  type SemanticRelevanceResult,
} from '../src/modules/ai/semantic-relevance-evaluator.js';
import {
  computeSnapshotFingerprint,
  type AcceptedEvidenceItem,
  type MahallaDailySnapshot,
} from '../src/modules/ai/context-snapshot.js';
import { MockProviderAdapter } from '../src/adapters/ai-providers/mock-provider-adapter.js';
import { AiGateway } from '../src/modules/ai/ai-gateway.js';
import type { AiProfile } from '../src/adapters/db/schema/ai.js';

describe('Semantic Relevance Domain Evaluator & Contracts Unit Tests', () => {
  describe('SemanticRelevanceResultSchema Invariants', () => {
    it('accepts valid relevant result with lanes and null exclusion reason', () => {
      const validRelevant: SemanticRelevanceResult = {
        is_relevant: true,
        relevant_lanes: ['WATER'],
        exclusion_reason: null,
        reasoning: 'Tap water outage reported',
      };

      const result = SemanticRelevanceResultSchema.safeParse(validRelevant);
      expect(result.success).toBe(true);
    });

    it('accepts valid relevant result with multi-lane overlap (WATER + HOKIM_RELATED)', () => {
      const validOverlap: SemanticRelevanceResult = {
        is_relevant: true,
        relevant_lanes: ['WATER', 'HOKIM_RELATED'],
        exclusion_reason: null,
        reasoning: 'Direct Hokim appeal regarding water pipe repair',
      };

      const result = SemanticRelevanceResultSchema.safeParse(validOverlap);
      expect(result.success).toBe(true);
    });

    it('accepts valid irrelevant result with empty lanes and non-null exclusion reason', () => {
      const validIrrelevant: SemanticRelevanceResult = {
        is_relevant: false,
        relevant_lanes: [],
        exclusion_reason: 'PLANNED_ANNOUNCEMENT',
        reasoning: 'Official electricity maintenance announcement',
      };

      const result = SemanticRelevanceResultSchema.safeParse(validIrrelevant);
      expect(result.success).toBe(true);
    });

    it('rejects is_relevant: true when exclusion_reason is not null', () => {
      const invalid = {
        is_relevant: true,
        relevant_lanes: ['WATER'],
        exclusion_reason: 'GENERAL_CHATTER',
        reasoning: 'Contradictory output',
      };

      const result = SemanticRelevanceResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects is_relevant: true when relevant_lanes is empty', () => {
      const invalid = {
        is_relevant: true,
        relevant_lanes: [],
        exclusion_reason: null,
        reasoning: 'No lanes specified',
      };

      const result = SemanticRelevanceResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects is_relevant: false when relevant_lanes has entries', () => {
      const invalid = {
        is_relevant: false,
        relevant_lanes: ['ELECTRICITY'],
        exclusion_reason: 'ADVERTISEMENT_OR_SPAM',
        reasoning: 'Contradictory output',
      };

      const result = SemanticRelevanceResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('rejects is_relevant: false when exclusion_reason is null', () => {
      const invalid = {
        is_relevant: false,
        relevant_lanes: [],
        exclusion_reason: null,
        reasoning: 'Missing exclusion reason',
      };

      const result = SemanticRelevanceResultSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Deterministic Snapshot Fingerprinting', () => {
    it('produces sha256_empty_v1 for empty evidence', () => {
      const fingerprint = computeSnapshotFingerprint([]);
      expect(fingerprint).toBe('sha256_empty_v1');
    });

    it('produces stable sha256 hash for identical evidence items', () => {
      const evidence: AcceptedEvidenceItem[] = [
        {
          id: 'ev_1',
          telegramMessageId: '101',
          originalTimestamp: '2026-08-22T08:00:00.000Z',
          verbatimText: "Svet o'chdi",
        },
      ];

      const hash1 = computeSnapshotFingerprint(evidence);
      const hash2 = computeSnapshotFingerprint(evidence);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('Prompt Assembly & Reply Forward Isolation', () => {
    let evaluator: SemanticRelevanceEvaluator;
    let mockAdapter: MockProviderAdapter;

    beforeEach(() => {
      mockAdapter = new MockProviderAdapter({
        is_relevant: true,
        relevant_lanes: ['WATER'],
        exclusion_reason: null,
        reasoning: 'Valid water complaint',
      });

      const customAdapters = new Map<string, any>();
      customAdapters.set('MOCK', mockAdapter);

      const defaultProfiles = new Map<string, AiProfile>();
      defaultProfiles.set('prof_rel_2026_08_v1', {
        id: 'prof_rel_2026_08_v1',
        version: 1,
        operationType: 'SEMANTIC_RELEVANCE',
        provider: 'MOCK',
        modelId: 'mock-v1',
        promptVersion: 'prom_v1',
        schemaVersion: 'sch_v1',
        temperature: 0.0,
        maxOutputTokens: 500,
        timeoutMs: 5000,
        retryPolicy: { maxAttempts: 1, backoffFactor: 1, initialDelayMs: 0 },
        capabilities: { structuredOutputs: true },
        isActive: true,
        createdAt: new Date(),
      });

      const gateway = new AiGateway({ customAdapters, defaultProfiles });
      evaluator = new SemanticRelevanceEvaluator(gateway);
    });

    it('builds user prompt with candidate message verbatim', () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Guliston',
        calendarDay: '2026-08-22',
        contextRevision: 0,
        snapshotFingerprint: 'sha256_empty_v1',
        evidence: [],
      };

      const prompt = evaluator.buildUserPrompt({
        candidateText: "12-uyda suv to'xtab qoldi",
        telegramMessageId: '54321',
        originalTimestamp: '2026-08-22T08:30:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
      });

      expect(prompt).toContain('12-uyda suv to\'xtab qoldi');
      expect(prompt).toContain('54321');
      expect(prompt).toContain('(No accepted evidence recorded yet today for this Mahalla)');
    });

    it('isolates reply to forwarded parent by omitting parent text and adding isolation rule (AC 6)', () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Guliston',
        calendarDay: '2026-08-22',
        contextRevision: 0,
        snapshotFingerprint: 'sha256_empty_v1',
        evidence: [],
      };

      const prompt = evaluator.buildUserPrompt({
        candidateText: 'Shuni qachon tozalaysizlar?',
        telegramMessageId: '54322',
        originalTimestamp: '2026-08-22T08:31:00.000Z',
        contentType: 'TEXT',
        replyMetadata: {
          replyToMessageId: '1001',
          replyToIsForwarded: true,
          replyToIsBot: false,
        },
        snapshot,
      });

      expect(prompt).toContain('This message is a reply to a Telegram-forwarded parent message.');
      expect(prompt).toContain('Isolation Rule: The parent message is excluded and not provided.');
    });

    it('formats multiple chronological evidence items in context (AC 5)', () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Navbahor',
        calendarDay: '2026-08-22',
        contextRevision: 2,
        snapshotFingerprint: 'mock_hash',
        evidence: [
          {
            id: 'ev_1',
            telegramMessageId: '101',
            originalTimestamp: '2026-08-22T08:00:00.000Z',
            verbatimText: "Svet o'chdi 14-domda",
            lane: 'ELECTRICITY',
          },
          {
            id: 'ev_2',
            telegramMessageId: '102',
            originalTimestamp: '2026-08-22T08:15:00.000Z',
            verbatimText: 'Bizda ham chiroq yoq',
            lane: 'ELECTRICITY',
          },
        ],
      };

      const prompt = evaluator.buildUserPrompt({
        candidateText: 'Bizdayam ochdi',
        telegramMessageId: '103',
        originalTimestamp: '2026-08-22T08:20:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        vocabularyGuidance: ['elektr', 'chiroq', 'svet'],
      });

      expect(prompt).toContain('[#1] Timestamp: 2026-08-22T08:00:00.000Z | MsgID: 101 | Lane: [ELECTRICITY] | Text: "Svet o\'chdi 14-domda"');
      expect(prompt).toContain('[#2] Timestamp: 2026-08-22T08:15:00.000Z (+15m from previous) | MsgID: 102 | Lane: [ELECTRICITY] | Text: "Bizda ham chiroq yoq"');
      expect(prompt).toContain('[elektr, chiroq, svet]');
    });

    it('evaluates candidate successfully through AI Gateway', async () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Guliston',
        calendarDay: '2026-08-22',
        contextRevision: 0,
        snapshotFingerprint: 'sha256_empty_v1',
        evidence: [],
      };

      const result = await evaluator.evaluateRelevance({
        candidateText: "12-uyda suv to'xtab qoldi",
        telegramMessageId: '54321',
        originalTimestamp: '2026-08-22T08:30:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });

      expect(result.data.is_relevant).toBe(true);
      expect(result.data.relevant_lanes).toEqual(['WATER']);
      expect(result.data.exclusion_reason).toBeNull();
    });

    it('builds prompt containing Uzbek contracted suffix message', () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Guliston',
        calendarDay: '2026-09-01',
        contextRevision: 2,
        snapshotFingerprint: 'mock_hash',
        evidence: [
          {
            id: 'ev_1',
            telegramMessageId: '101',
            originalTimestamp: '2026-09-01T13:43:00.000Z',
            verbatimText: 'salom mahalladoshlar! svet hammada ucdimi yoki bizdami faqat?',
            lane: 'ELECTRICITY',
          },
          {
            id: 'ev_2',
            telegramMessageId: '102',
            originalTimestamp: '2026-09-01T13:44:00.000Z',
            verbatimText: 'Cherez den uciroriw odat bub qoldi ln.',
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
        snapshot,
      });

      expect(prompt).toContain('Suvam ucdi mana. Xalq cidoradi');
      expect(prompt).toContain('103');
      expect(prompt).toContain('[#2] Timestamp: 2026-09-01T13:44:00.000Z (+1m from previous) | MsgID: 102 | Lane: [ELECTRICITY]');
    });

    it('injects explicit Immediate Preceding Message (N-1) block for subjectless follow-up', () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Guliston',
        calendarDay: '2026-09-01',
        contextRevision: 2,
        snapshotFingerprint: 'mock_hash_seq',
        evidence: [
          {
            id: 'ev_1',
            telegramMessageId: '101',
            originalTimestamp: '2026-09-01T15:50:00.000Z',
            verbatimText: 'salom mahalladoshlar! gaz hammada ucdimi yoki bizdami faqat?',
            lane: 'GAS',
          },
          {
            id: 'ev_2',
            telegramMessageId: '102',
            originalTimestamp: '2026-09-01T15:50:30.000Z',
            verbatimText: 'kamiga svetam yu',
            lane: 'ELECTRICITY',
          },
        ],
      };

      const prompt = evaluator.buildUserPrompt({
        candidateText: 'Cherez den uciroriw odat bub qoldi ln. Remon diyiladi.',
        telegramMessageId: '103',
        originalTimestamp: '2026-09-01T15:51:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
      });

      expect(prompt).toContain('### IMMEDIATE PRECEDING MESSAGE (N-1 IN CHAT)');
      expect(prompt).toContain('Message ID: 102 (+1m before candidate) (Lane: [ELECTRICITY])');
      expect(prompt).toContain('Text: "kamiga svetam yu"');
    });
  });
});
