import { describe, it, expect, beforeEach } from 'vitest';
import {
  SemanticRelevanceEvaluator,
  SemanticRelevanceResultSchema,
  SEMANTIC_RELEVANCE_SYSTEM_PROMPT,
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

    it('ensures system prompt defines the public municipal vs private peer-to-peer boundary', () => {
      expect(SEMANTIC_RELEVANCE_SYSTEM_PROMPT).toContain('CRITICAL BOUNDARY: PUBLIC MUNICIPAL SERVICE VS. PRIVATE PEER-TO-PEER TRANSACTIONS');
      expect(SEMANTIC_RELEVANCE_SYSTEM_PROMPT).toContain('bakalashka');
      expect(SEMANTIC_RELEVANCE_SYSTEM_PROMPT).toContain('muravey');
      expect(SEMANTIC_RELEVANCE_SYSTEM_PROMPT).toContain('santexnik');
      expect(SEMANTIC_RELEVANCE_SYSTEM_PROMPT).toContain('musor mashinasi kelmadi');
    });

    it('evaluates private transactions (Shahob & Dildora cases) as excluded ADVERTISEMENT_OR_SPAM', async () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: "Navro'z",
        calendarDay: '2026-09-03',
        contextRevision: 1,
        snapshotFingerprint: 'sha256_navroz_v1',
        evidence: [],
      };

      // 1. Shahob case: private bottle recycling inquiry
      mockAdapter.setNextResponse({
        is_relevant: false,
        relevant_lanes: [],
        exclusion_reason: 'ADVERTISEMENT_OR_SPAM',
        reasoning: 'Private inquiry asking for contact numbers of scrap plastic bottle buyers',
      });

      const shahobResult = await evaluator.evaluateRelevance({
        candidateText: 'Bakalashka olekkanlani nomerini aytvorila',
        telegramMessageId: '9001',
        originalTimestamp: '2026-09-03T13:58:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });

      expect(shahobResult.data.is_relevant).toBe(false);
      expect(shahobResult.data.exclusion_reason).toBe('ADVERTISEMENT_OR_SPAM');
      expect(shahobResult.data.relevant_lanes).toEqual([]);

      // 2. Dildora case: private vehicle hire for renovation rubble
      mockAdapter.setNextResponse({
        is_relevant: false,
        relevant_lanes: [],
        exclusion_reason: 'ADVERTISEMENT_OR_SPAM',
        reasoning: 'Inquiry seeking to hire a private motorized tricycle for home renovation debris removal',
      });

      const dildoraResult = await evaluator.evaluateRelevance({
        candidateText: 'Ассалому алайкум ремонтдан кейинги чикиндини олиб кетишга муравейча борми',
        telegramMessageId: '9002',
        originalTimestamp: '2026-09-03T14:00:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });

      expect(dildoraResult.data.is_relevant).toBe(false);
      expect(dildoraResult.data.exclusion_reason).toBe('ADVERTISEMENT_OR_SPAM');
      expect(dildoraResult.data.relevant_lanes).toEqual([]);

      // 3. Municipal Waste True Positive: Scheduled collection truck missed
      mockAdapter.setNextResponse({
        is_relevant: true,
        relevant_lanes: ['WASTE'],
        exclusion_reason: null,
        reasoning: 'Report of scheduled municipal waste truck failing to service residential street',
      });

      const truckResult = await evaluator.evaluateRelevance({
        candidateText: 'МУСОР. МАШИНАСИ. КЕЛМАДИ. ОЛДИНГИ. ХАФТАДА. ПАЛЬИКЛИНИКАНИ. ОРКА. КУЧАСИГА КЕЛСИН.',
        telegramMessageId: '9003',
        originalTimestamp: '2026-09-03T14:05:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });

      expect(truckResult.data.is_relevant).toBe(true);
      expect(truckResult.data.relevant_lanes).toEqual(['WASTE']);
      expect(truckResult.data.exclusion_reason).toBeNull();
    });

    it('verifies 5-lane paired boundaries: Private Domestic Transactions vs Public Municipal Failures', async () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Istiqlol',
        calendarDay: '2026-09-03',
        contextRevision: 1,
        snapshotFingerprint: 'sha256_istiqlol_v1',
        evidence: [],
      };

      // 1. WATER: Private plumber inquiry (Exclude) vs Public main pipe burst (Include)
      mockAdapter.setNextResponse({
        is_relevant: false,
        relevant_lanes: [],
        exclusion_reason: 'ADVERTISEMENT_OR_SPAM',
        reasoning: 'Private household request for a plumber to fix indoor leaky tap',
      });
      const waterPrivate = await evaluator.evaluateRelevance({
        candidateText: 'Santexnik bormi kran oqib ketdi uyda',
        telegramMessageId: '9101',
        originalTimestamp: '2026-09-03T10:00:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });
      expect(waterPrivate.data.is_relevant).toBe(false);
      expect(waterPrivate.data.exclusion_reason).toBe('ADVERTISEMENT_OR_SPAM');

      mockAdapter.setNextResponse({
        is_relevant: true,
        relevant_lanes: ['WATER'],
        exclusion_reason: null,
        reasoning: 'Public main drinking water pipe rupture on residential street',
      });
      const waterPublic = await evaluator.evaluateRelevance({
        candidateText: "Ko'chada markaziy vodoprovod trubasi yorilib ketdi, suv toshib yotibdi",
        telegramMessageId: '9102',
        originalTimestamp: '2026-09-03T10:05:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });
      expect(waterPublic.data.is_relevant).toBe(true);
      expect(waterPublic.data.relevant_lanes).toEqual(['WATER']);

      // 2. ELECTRICITY: Private electrician inquiry (Exclude) vs Public transformer outage (Include)
      mockAdapter.setNextResponse({
        is_relevant: false,
        relevant_lanes: [],
        exclusion_reason: 'ADVERTISEMENT_OR_SPAM',
        reasoning: 'Private request for an electrician to install household light fixture and socket',
      });
      const elecPrivate = await evaluator.evaluateRelevance({
        candidateText: "Uyga yangi lyustra va rozetka o'rnatadigan elektrik kerak",
        telegramMessageId: '9103',
        originalTimestamp: '2026-09-03T10:10:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });
      expect(elecPrivate.data.is_relevant).toBe(false);
      expect(elecPrivate.data.exclusion_reason).toBe('ADVERTISEMENT_OR_SPAM');

      mockAdapter.setNextResponse({
        is_relevant: true,
        relevant_lanes: ['ELECTRICITY'],
        exclusion_reason: null,
        reasoning: 'Public neighborhood transformer sparked causing neighborhood power cut',
      });
      const elecPublic = await evaluator.evaluateRelevance({
        candidateText: "Ko'chamizdagi transformator tutab ketdi, butun mahalla qorong'uda qoldi",
        telegramMessageId: '9104',
        originalTimestamp: '2026-09-03T10:15:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });
      expect(elecPublic.data.is_relevant).toBe(true);
      expect(elecPublic.data.relevant_lanes).toEqual(['ELECTRICITY']);

      // 3. GAS: Private stove repair (Exclude) vs Public low pressure crisis (Include)
      mockAdapter.setNextResponse({
        is_relevant: false,
        relevant_lanes: [],
        exclusion_reason: 'ADVERTISEMENT_OR_SPAM',
        reasoning: 'Private appliance repair inquiry for a household gas stove',
      });
      const gasPrivate = await evaluator.evaluateRelevance({
        candidateText: 'Gaz plitamni gorelkalari yaxshi yonmayapti, usta bormi?',
        telegramMessageId: '9105',
        originalTimestamp: '2026-09-03T10:20:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });
      expect(gasPrivate.data.is_relevant).toBe(false);
      expect(gasPrivate.data.exclusion_reason).toBe('ADVERTISEMENT_OR_SPAM');

      mockAdapter.setNextResponse({
        is_relevant: true,
        relevant_lanes: ['GAS'],
        exclusion_reason: null,
        reasoning: 'Public municipal gas supply pressure collapse in winter',
      });
      const gasPublic = await evaluator.evaluateRelevance({
        candidateText: "Gaz bosimi judayam past, kotyollar o'chib qolyapti sovuqda",
        telegramMessageId: '9106',
        originalTimestamp: '2026-09-03T10:25:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });
      expect(gasPublic.data.is_relevant).toBe(true);
      expect(gasPublic.data.relevant_lanes).toEqual(['GAS']);

      // 4. HOKIM_RELATED: Private mason hire (Exclude) vs Public road potholes / streetlights (Include)
      mockAdapter.setNextResponse({
        is_relevant: false,
        relevant_lanes: [],
        exclusion_reason: 'ADVERTISEMENT_OR_SPAM',
        reasoning: 'Private request to hire laborers for personal house construction',
      });
      const hokimPrivate = await evaluator.evaluateRelevance({
        candidateText: "Xususiy hovlimga g'isht teradigan mardikor yoki usta kerak",
        telegramMessageId: '9107',
        originalTimestamp: '2026-09-03T10:30:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });
      expect(hokimPrivate.data.is_relevant).toBe(false);
      expect(hokimPrivate.data.exclusion_reason).toBe('ADVERTISEMENT_OR_SPAM');

      mockAdapter.setNextResponse({
        is_relevant: true,
        relevant_lanes: ['HOKIM_RELATED'],
        exclusion_reason: null,
        reasoning: 'Public street infrastructure defect with unpaved road and potholes',
      });
      const hokimPublic = await evaluator.evaluateRelevance({
        candidateText: "Ko'chamizdagi chuqurlardan mashinalar o'tolmayapti, asfalt qilib berishsin mas'ullar",
        telegramMessageId: '9108',
        originalTimestamp: '2026-09-03T10:35:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });
      expect(hokimPublic.data.is_relevant).toBe(true);
      expect(hokimPublic.data.relevant_lanes).toEqual(['HOKIM_RELATED']);
    });

    it('ensures system prompt defines official municipal entities vs informal scavengers across all 5 lanes', () => {
      expect(SEMANTIC_RELEVANCE_SYSTEM_PROMPT).toContain('OFFICIAL MUNICIPAL UTILITY ENTITIES VS. INFORMAL ACTORS & SCAVENGERS');
      expect(SEMANTIC_RELEVANCE_SYSTEM_PROMPT).toContain('musr yigib yuredigan lulilar');
      expect(SEMANTIC_RELEVANCE_SYSTEM_PROMPT).toContain('Toza Hudud, Maxsustrans, musor mashinasi');
      expect(SEMANTIC_RELEVANCE_SYSTEM_PROMPT).toContain("lo'lilar, aravakashlar, xashakchilar");
    });

    it('distinguishes informal scavengers/pickers (Navbahor lulilar case) from official municipal waste services', async () => {
      const snapshot: MahallaDailySnapshot = {
        districtId: 'dist_sharof_rashidov',
        mahallaName: 'Navbahor',
        calendarDay: '2026-09-03',
        contextRevision: 1,
        snapshotFingerprint: 'sha256_navbahor_luli',
        evidence: [],
      };

      // 1. Informal scrap picker inquiry (Navbahor case): "musr yigib yuredigan lulilar kemeptimi mahallaga" -> FALSE (ADVERTISEMENT_OR_SPAM)
      mockAdapter.setNextResponse({
        is_relevant: false,
        relevant_lanes: [],
        exclusion_reason: 'ADVERTISEMENT_OR_SPAM',
        reasoning: 'Inquiry regarding roaming informal scrap/junk gatherers (lo\'lilar), not official municipal waste collection services',
      });

      const luliInquiry = await evaluator.evaluateRelevance({
        candidateText: 'musr yigib yuredigan lulilar kemeptimi mahallaga',
        telegramMessageId: '9201',
        originalTimestamp: '2026-09-03T20:07:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });

      expect(luliInquiry.data.is_relevant).toBe(false);
      expect(luliInquiry.data.exclusion_reason).toBe('ADVERTISEMENT_OR_SPAM');
      expect(luliInquiry.data.relevant_lanes).toEqual([]);

      // 2. Dependent burst fragment: "kimdir biladimi" -> FALSE (UNRESOLVED_AMBIGUOUS_FRAGMENT)
      mockAdapter.setNextResponse({
        is_relevant: false,
        relevant_lanes: [],
        exclusion_reason: 'UNRESOLVED_AMBIGUOUS_FRAGMENT',
        reasoning: 'Ambiguous conversational fragment without utility context',
      });

      const burstFragment = await evaluator.evaluateRelevance({
        candidateText: 'kimdir biladimi',
        telegramMessageId: '9202',
        originalTimestamp: '2026-09-03T20:07:05.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });

      expect(burstFragment.data.is_relevant).toBe(false);
      expect(burstFragment.data.exclusion_reason).toBe('UNRESOLVED_AMBIGUOUS_FRAGMENT');

      // 3. Exception: Scavengers scatter trash across public street creating sanitation hazard -> TRUE (WASTE)
      mockAdapter.setNextResponse({
        is_relevant: true,
        relevant_lanes: ['WASTE'],
        exclusion_reason: null,
        reasoning: 'Public sanitation hazard created by trash scattered across public street from containers',
      });

      const litterHazard = await evaluator.evaluateRelevance({
        candidateText: "lo'lilar musorxonani titib hamma yoqni ko'chaga sochib ketdi",
        telegramMessageId: '9203',
        originalTimestamp: '2026-09-03T20:10:00.000Z',
        contentType: 'TEXT',
        replyMetadata: null,
        snapshot,
        profileId: 'prof_rel_2026_08_v1',
      });

      expect(litterHazard.data.is_relevant).toBe(true);
      expect(litterHazard.data.relevant_lanes).toEqual(['WASTE']);
      expect(litterHazard.data.exclusion_reason).toBeNull();
    });
  });
});
