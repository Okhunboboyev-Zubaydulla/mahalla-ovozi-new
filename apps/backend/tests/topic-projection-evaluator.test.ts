import { describe, it, expect } from 'vitest';
import {
  TopicProjectionEvaluator,
  TopicProjectionResultSchema,
  isUzbekCyrillic,
  type TopicProjectionResult,
} from '../src/modules/topics/topic-projection-evaluator.js';
import type { AiGatewayPort } from '../src/modules/ai/ai-gateway.js';
import type { GenerateStructuredOptions, AiGatewayResult } from '../src/modules/ai/types.js';
import type { MahallaDailySnapshot } from '../src/modules/ai/context-snapshot.js';

describe('Story 2.5: Topic Projection Contracts & Evaluator Unit Tests', () => {
  describe('isUzbekCyrillic Validator', () => {
    it('returns true for authentic Uzbek Cyrillic text', () => {
      expect(isUzbekCyrillic('Маҳаллада электр таъминоти узилган')).toBe(true);
      expect(isUzbekCyrillic('Сув босими жуда паст, қачон тўғирланади?')).toBe(true);
      expect(isUzbekCyrillic('Чиқиндилар олиб кетилмаган')).toBe(true);
      expect(isUzbekCyrillic('Ҳоким ёрдамчисига мурожаат қилинди')).toBe(true);
    });

    it('returns false for pure Latin, English, empty, or numeric strings', () => {
      expect(isUzbekCyrillic('Mahallada elektr taminoti uzilgan')).toBe(false);
      expect(isUzbekCyrillic('Electricity outage reported in mahalla')).toBe(false);
      expect(isUzbekCyrillic('')).toBe(false);
      expect(isUzbekCyrillic('1234567890 !@#$%^&*()')).toBe(false);
    });

    it('returns false for predominantly Latin text with isolated rogue Cyrillic character', () => {
      expect(isUzbekCyrillic('Water outage in district 4 (А)')).toBe(false);
      expect(isUzbekCyrillic('Power failure occurred in mahalla а')).toBe(false);
    });
  });

  describe('TopicProjectionResultSchema Validation', () => {
    const validBase: TopicProjectionResult = {
      summary: 'Маҳаллада электр таъминотида узилишлар кузатилмоқда.',
      lanes: ['ELECTRICITY'],
      anchor_evidence_id: 'evi_1001',
      anchor_quote: 'Свет ўчди, 2 соат бўлди',
      latest_meaningful_activity_timestamp: '2026-08-22T08:30:00.000Z',
      attribution: 'Маҳалла аҳолиси хабарига кўра',
      is_hokim_related: false,
    };

    it('validates a correct single-lane projection result', () => {
      const parsed = TopicProjectionResultSchema.parse(validBase);
      expect(parsed.is_hokim_related).toBe(false);
      expect(parsed.lanes).toEqual(['ELECTRICITY']);
    });

    it('deduplicates duplicate lanes array items', () => {
      const parsed = TopicProjectionResultSchema.parse({
        ...validBase,
        lanes: ['ELECTRICITY', 'ELECTRICITY'],
      });
      expect(parsed.lanes).toEqual(['ELECTRICITY']);
    });

    it('validates a multi-lane projection with HOKIM_RELATED and is_hokim_related = true', () => {
      const parsed = TopicProjectionResultSchema.parse({
        ...validBase,
        lanes: ['WATER', 'HOKIM_RELATED'],
        is_hokim_related: true,
      });
      expect(parsed.is_hokim_related).toBe(true);
      expect(parsed.lanes).toEqual(['WATER', 'HOKIM_RELATED']);
    });

    it('validates Hokim-only projection with lanes: [HOKIM_RELATED]', () => {
      const parsed = TopicProjectionResultSchema.parse({
        ...validBase,
        lanes: ['HOKIM_RELATED'],
        is_hokim_related: true,
      });
      expect(parsed.is_hokim_related).toBe(true);
    });

    it('fails when lanes array is empty', () => {
      expect(() =>
        TopicProjectionResultSchema.parse({
          ...validBase,
          lanes: [],
          is_hokim_related: false,
        }),
      ).toThrow();
    });

    it('fails when is_hokim_related is false but HOKIM_RELATED is present in lanes', () => {
      expect(() =>
        TopicProjectionResultSchema.parse({
          ...validBase,
          lanes: ['WATER', 'HOKIM_RELATED'],
          is_hokim_related: false,
        }),
      ).toThrow('is_hokim_related must be true if and only if HOKIM_RELATED is present in lanes');
    });

    it('fails when is_hokim_related is true but HOKIM_RELATED is missing from lanes', () => {
      expect(() =>
        TopicProjectionResultSchema.parse({
          ...validBase,
          lanes: ['WATER'],
          is_hokim_related: true,
        }),
      ).toThrow('is_hokim_related must be true if and only if HOKIM_RELATED is present in lanes');
    });

    it('fails when timestamp is not valid ISO-8601 datetime', () => {
      expect(() =>
        TopicProjectionResultSchema.parse({
          ...validBase,
          latest_meaningful_activity_timestamp: 'invalid-date',
        }),
      ).toThrow();
    });
  });

  describe('TopicProjectionEvaluator Guardrails & Execution', () => {
    const createMockAiGateway = (returnData: TopicProjectionResult): AiGatewayPort => {
      return {
        generateStructured: async <T>(
          _options: GenerateStructuredOptions<T>,
        ): Promise<AiGatewayResult<T>> => {
          return {
            data: returnData as unknown as T,
            profileId: 'prof_proj_2026_08_v1',
            provider: 'OPENAI',
            modelId: 'gpt-4o-mini-2024-07-18',
            providerRequestId: 'req_test_1',
            durationMs: 120,
            tokens: { inputTokens: 250, outputTokens: 60 },
            estimatedCostUsd: 0.0001,
            attempts: [],
          };
        },
      } as unknown as AiGatewayPort;
    };

    const sampleSnapshot: MahallaDailySnapshot = {
      districtId: 'dist_tashkent_chilanzar',
      mahallaName: 'Guliston',
      calendarDay: '2026-08-22',
      contextRevision: 2,
      snapshotFingerprint: 'fp_123',
      evidence: [
        {
          id: 'evi_target_1',
          topicId: 'top_elec_1',
          telegramMessageId: '101',
          originalTimestamp: '2026-08-22T08:00:00.000Z',
          verbatimText: 'Свет ўчди, 1-домда умуман йўқ',
          lane: 'ELECTRICITY',
        },
        {
          id: 'evi_target_2',
          topicId: 'top_elec_1',
          telegramMessageId: '102',
          originalTimestamp: '2026-08-22T08:30:00.000Z',
          verbatimText: 'Бизда ҳам ўчди',
          lane: 'ELECTRICITY',
        },
        {
          id: 'evi_other_1',
          topicId: 'top_water_2',
          telegramMessageId: '103',
          originalTimestamp: '2026-08-22T08:45:00.000Z',
          verbatimText: 'Сув босими пасайиб кетди',
          lane: 'WATER',
        },
      ],
    };

    it('builds clear user prompt with target topic and context separation', () => {
      const evaluator = new TopicProjectionEvaluator(createMockAiGateway({} as any));
      const prompt = evaluator.buildUserPrompt({
        topicId: 'top_elec_1',
        primaryLane: 'ELECTRICITY',
        generation: 1,
        snapshot: sampleSnapshot,
      });

      expect(prompt).toContain('### TARGET TOPIC TO RECALCULATE');
      expect(prompt).toContain('Topic ID: top_elec_1');
      expect(prompt).toContain('Primary Lane (Immutable): ELECTRICITY');
      expect(prompt).toContain('### ACCEPTED EVIDENCE FOR TARGET TOPIC (top_elec_1)');
      expect(prompt).toContain('evi_target_1');
      expect(prompt).toContain('### OTHER SAME-DAY TOPICS IN MAHALLA (Context Only)');
      expect(prompt).toContain('top_water_2');
    });

    it('successfully evaluates and returns projection when all guardrails pass', async () => {
      const validResult: TopicProjectionResult = {
        summary: 'Маҳалла аҳолиси хабарига кўра, электр таъминотида узилиш юз берган.',
        lanes: ['ELECTRICITY'],
        anchor_evidence_id: 'evi_target_1',
        anchor_quote: 'Свет ўчди, 1-домда умуман йўқ',
        latest_meaningful_activity_timestamp: '2026-08-22T08:30:00.000Z',
        attribution: 'Маҳалла аҳолиси хабарига кўра',
        is_hokim_related: false,
      };

      const evaluator = new TopicProjectionEvaluator(createMockAiGateway(validResult));
      const evaluation = await evaluator.evaluateTopicProjection({
        topicId: 'top_elec_1',
        primaryLane: 'ELECTRICITY',
        generation: 1,
        snapshot: sampleSnapshot,
      });

      expect(evaluation.summary).toBe(validResult.summary);
      expect(evaluation.lanes).toEqual(['ELECTRICITY']);
      expect(evaluation.primaryLane).toBe('ELECTRICITY');
      expect(evaluation.anchorEvidenceId).toBe('evi_target_1');
      expect(evaluation.latestMeaningfulActivityTimestamp).toBe('2026-08-22T08:30:00.000Z');
      expect(evaluation.isHokimRelated).toBe(false);
      expect(evaluation.generation).toBe(1);
    });

    it('rejects when anchor_evidence_id belongs to another topic', async () => {
      const foreignAnchorResult: TopicProjectionResult = {
        summary: 'Маҳаллада электр таъминоти узилганлиги хабар қилинди.',
        lanes: ['ELECTRICITY'],
        anchor_evidence_id: 'evi_other_1', // belongs to top_water_2!
        anchor_quote: 'Сув босими пасайиб кетди',
        latest_meaningful_activity_timestamp: '2026-08-22T08:00:00.000Z',
        attribution: 'Маҳалла аҳолиси',
        is_hokim_related: false,
      };

      const evaluator = new TopicProjectionEvaluator(createMockAiGateway(foreignAnchorResult));
      await expect(
        evaluator.evaluateTopicProjection({
          topicId: 'top_elec_1',
          primaryLane: 'ELECTRICITY',
          generation: 1,
          snapshot: sampleSnapshot,
        }),
      ).rejects.toThrow(
        'anchor_evidence_id "evi_other_1" does not belong to target topic top_elec_1',
      );
    });

    it('rejects when latest_meaningful_activity_timestamp does not match any target evidence timestamp', async () => {
      const invalidTimestampResult: TopicProjectionResult = {
        summary: 'Маҳаллада электр таъминоти узилганлиги хабар қилинди.',
        lanes: ['ELECTRICITY'],
        anchor_evidence_id: 'evi_target_1',
        anchor_quote: 'Свет ўчди',
        latest_meaningful_activity_timestamp: '2026-08-22T09:15:00.000Z', // Not in target topic!
        attribution: 'Маҳалла аҳолиси',
        is_hokim_related: false,
      };

      const evaluator = new TopicProjectionEvaluator(
        createMockAiGateway(invalidTimestampResult),
      );
      await expect(
        evaluator.evaluateTopicProjection({
          topicId: 'top_elec_1',
          primaryLane: 'ELECTRICITY',
          generation: 1,
          snapshot: sampleSnapshot,
        }),
      ).rejects.toThrow(
        'latest_meaningful_activity_timestamp "2026-08-22T09:15:00.000Z" does not match any evidence timestamp in target topic top_elec_1',
      );
    });

    it('rejects when derived lanes array misses target topic immutable primaryLane', async () => {
      const missingPrimaryResult: TopicProjectionResult = {
        summary: 'Маҳаллада сув таъминоти ва ҳокимят назорати хабар қилинди.',
        lanes: ['WATER', 'HOKIM_RELATED'], // Missing ELECTRICITY!
        anchor_evidence_id: 'evi_target_1',
        anchor_quote: 'Свет ўчди',
        latest_meaningful_activity_timestamp: '2026-08-22T08:00:00.000Z',
        attribution: 'Маҳалла аҳолиси',
        is_hokim_related: true,
      };

      const evaluator = new TopicProjectionEvaluator(
        createMockAiGateway(missingPrimaryResult),
      );
      await expect(
        evaluator.evaluateTopicProjection({
          topicId: 'top_elec_1',
          primaryLane: 'ELECTRICITY',
          generation: 1,
          snapshot: sampleSnapshot,
        }),
      ).rejects.toThrow(
        'Derived lanes [WATER, HOKIM_RELATED] must include target topic\'s immutable primary lane "ELECTRICITY"',
      );
    });

    it('rejects when summary is not in authentic Uzbek Cyrillic text', async () => {
      const latinSummaryResult: TopicProjectionResult = {
        summary: 'Mahallada elektr taminoti uzilganligi haqida xabar berildi.', // Pure Latin!
        lanes: ['ELECTRICITY'],
        anchor_evidence_id: 'evi_target_1',
        anchor_quote: 'Свет ўчди',
        latest_meaningful_activity_timestamp: '2026-08-22T08:00:00.000Z',
        attribution: 'Mahalla aholisi',
        is_hokim_related: false,
      };

      const evaluator = new TopicProjectionEvaluator(
        createMockAiGateway(latinSummaryResult),
      );
      await expect(
        evaluator.evaluateTopicProjection({
          topicId: 'top_elec_1',
          primaryLane: 'ELECTRICITY',
          generation: 1,
          snapshot: sampleSnapshot,
        }),
      ).rejects.toThrow('Summary must contain authentic Uzbek Cyrillic characters');
    });

    it('rejects when target topic has 0 evidence in snapshot', async () => {
      const evaluator = new TopicProjectionEvaluator(createMockAiGateway({} as any));
      await expect(
        evaluator.evaluateTopicProjection({
          topicId: 'top_non_existent',
          primaryLane: 'ELECTRICITY',
          generation: 1,
          snapshot: sampleSnapshot,
        }),
      ).rejects.toThrow('Cannot calculate topic projection: target topic top_non_existent has no accepted evidence in snapshot');
    });

    it('rejects when output contains forbidden phone number patterns', async () => {
      const phoneSummaryResult: TopicProjectionResult = {
        summary: 'Маҳаллада свет ўчди, мурожаат учун +998901234567 га қўнғироқ қилинг.',
        lanes: ['ELECTRICITY'],
        anchor_evidence_id: 'evi_target_1',
        anchor_quote: 'Свет ўчди',
        latest_meaningful_activity_timestamp: '2026-08-22T08:00:00.000Z',
        attribution: 'Маҳалла аҳолиси',
        is_hokim_related: false,
      };

      const evaluator = new TopicProjectionEvaluator(
        createMockAiGateway(phoneSummaryResult),
      );
      await expect(
        evaluator.evaluateTopicProjection({
          topicId: 'top_elec_1',
          primaryLane: 'ELECTRICITY',
          generation: 1,
          snapshot: sampleSnapshot,
        }),
      ).rejects.toThrow('Output contains forbidden phone number pattern violating privacy invariants');
    });

    it('rejects when timestamp string is invalid and cannot be parsed', async () => {
      const invalidTimestampResult: TopicProjectionResult = {
        summary: 'Маҳаллада свет ўчди.',
        lanes: ['ELECTRICITY'],
        anchor_evidence_id: 'evi_target_1',
        anchor_quote: 'Свет ўчди',
        latest_meaningful_activity_timestamp: 'invalid-date-string',
        attribution: 'Маҳалла аҳолиси',
        is_hokim_related: false,
      };

      const evaluator = new TopicProjectionEvaluator(
        createMockAiGateway(invalidTimestampResult),
      );
      await expect(
        evaluator.evaluateTopicProjection({
          topicId: 'top_elec_1',
          primaryLane: 'ELECTRICITY',
          generation: 1,
          snapshot: sampleSnapshot,
        }),
      ).rejects.toThrow('is not a valid ISO-8601 date string');
    });
  });

  describe('Pragmatic Core Civic Disruption & Volume-Aware Attribution Scenarios', () => {
    const createMockAiGateway = (returnData: TopicProjectionResult): AiGatewayPort => {
      return {
        generateStructured: async <T>(
          _options: GenerateStructuredOptions<T>,
        ): Promise<AiGatewayResult<T>> => {
          return {
            data: returnData as unknown as T,
            profileId: 'prof_proj_2026_08_v1',
            provider: 'OPENAI',
            modelId: 'gpt-4o-mini-2024-07-18',
            providerRequestId: 'req_test_inquiry',
            durationMs: 110,
            tokens: { inputTokens: 220, outputTokens: 50 },
            estimatedCostUsd: 0.0001,
            attempts: [],
          };
        },
      } as unknown as AiGatewayPort;
    };

    it('evaluates single-citizen inquiry message with concise disruption summary and single-citizen attribution', async () => {
      const singleInquirySnapshot: MahallaDailySnapshot = {
        districtId: 'dist_tashkent_chilanzar',
        mahallaName: 'Guliston',
        calendarDay: '2026-08-22',
        contextRevision: 1,
        snapshotFingerprint: 'fp_inquiry_1',
        evidence: [
          {
            id: 'evi_inquiry_1',
            topicId: 'top_elec_inquiry',
            telegramMessageId: '501',
            originalTimestamp: '2026-08-22T10:15:00.000Z',
            verbatimText: 'salom mahalladoshlar! svet hammada ucdimi yoki bizdami faqat?',
            lane: 'ELECTRICITY',
          },
        ],
      };

      const expectedProjection: TopicProjectionResult = {
        summary: 'Электр таъминотида узилиш юз бергани хабар қилинмоқда.',
        lanes: ['ELECTRICITY'],
        anchor_evidence_id: 'evi_inquiry_1',
        anchor_quote: 'salom mahalladoshlar! svet hammada ucdimi yoki bizdami faqat?',
        latest_meaningful_activity_timestamp: '2026-08-22T10:15:00.000Z',
        attribution: 'Маҳалла фуқароси',
        is_hokim_related: false,
      };

      const evaluator = new TopicProjectionEvaluator(createMockAiGateway(expectedProjection));
      const result = await evaluator.evaluateTopicProjection({
        topicId: 'top_elec_inquiry',
        primaryLane: 'ELECTRICITY',
        generation: 1,
        snapshot: singleInquirySnapshot,
      });

      expect(result.summary).toBe('Электр таъминотида узилиш юз бергани хабар қилинмоқда.');
      expect(result.attribution).toBe('Маҳалла фуқароси');
      expect(result.lanes).toEqual(['ELECTRICITY']);
      expect(isUzbekCyrillic(result.summary)).toBe(true);
      expect(isUzbekCyrillic(result.attribution)).toBe(true);
    });

    it('evaluates multi-resident corroborating topic with multi-resident attribution', async () => {
      const multiEvidenceSnapshot: MahallaDailySnapshot = {
        districtId: 'dist_tashkent_chilanzar',
        mahallaName: 'Guliston',
        calendarDay: '2026-08-22',
        contextRevision: 2,
        snapshotFingerprint: 'fp_multi_1',
        evidence: [
          {
            id: 'evi_multi_1',
            topicId: 'top_elec_multi',
            telegramMessageId: '601',
            originalTimestamp: '2026-08-22T10:15:00.000Z',
            verbatimText: 'svet ochdi 12-domda',
            lane: 'ELECTRICITY',
          },
          {
            id: 'evi_multi_2',
            topicId: 'top_elec_multi',
            telegramMessageId: '602',
            originalTimestamp: '2026-08-22T10:18:00.000Z',
            verbatimText: 'bizda ham yoq 14-dom',
            lane: 'ELECTRICITY',
          },
        ],
      };

      const multiProjection: TopicProjectionResult = {
        summary: 'Электр таъминотида узилиш сақланиб қолмоқда.',
        lanes: ['ELECTRICITY'],
        anchor_evidence_id: 'evi_multi_1',
        anchor_quote: 'svet ochdi 12-domda',
        latest_meaningful_activity_timestamp: '2026-08-22T10:18:00.000Z',
        attribution: 'Маҳалла аҳолиси',
        is_hokim_related: false,
      };

      const evaluator = new TopicProjectionEvaluator(createMockAiGateway(multiProjection));
      const result = await evaluator.evaluateTopicProjection({
        topicId: 'top_elec_multi',
        primaryLane: 'ELECTRICITY',
        generation: 2,
        snapshot: multiEvidenceSnapshot,
      });

      expect(result.summary).toBe('Электр таъминотида узилиш сақланиб қолмоқда.');
      expect(result.attribution).toBe('Маҳалла аҳолиси');
    });

    it('rejects summary containing prohibited bureaucratic filler placeholder (Guardrail 6)', async () => {
      const testSnapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Navbahor',
        calendarDay: '2026-09-02',
        contextRevision: 1,
        snapshotFingerprint: 'fp_bureau_1',
        evidence: [
          {
            id: 'evi_bureau_1',
            topicId: 'top_water_bureau',
            telegramMessageId: '801',
            originalTimestamp: '2026-09-02T22:02:00.000Z',
            verbatimText: 'suv keb turgandedi',
            lane: 'WATER',
          },
        ],
      };

      const bureaucraticResult: TopicProjectionResult = {
        summary: 'Сув таъминотининг барқарорлиги ҳақида маълумот олинмоқда.',
        lanes: ['WATER'],
        anchor_evidence_id: 'evi_bureau_1',
        anchor_quote: 'suv keb turgandedi',
        latest_meaningful_activity_timestamp: '2026-09-02T22:02:00.000Z',
        attribution: 'Маҳалла фуқароси',
        is_hokim_related: false,
      };

      const evaluator = new TopicProjectionEvaluator(
        createMockAiGateway(bureaucraticResult),
      );
      await expect(
        evaluator.evaluateTopicProjection({
          topicId: 'top_water_bureau',
          primaryLane: 'WATER',
          generation: 1,
          snapshot: testSnapshot,
        }),
      ).rejects.toThrow(
        'Summary contains prohibited bureaucratic filler/placeholder',
      );

      const discussionResult: TopicProjectionResult = {
        ...bureaucraticResult,
        summary: 'Чиқинди муаммоси маҳаллада муҳокама қилинмоқда.',
      };
      const discussionEvaluator = new TopicProjectionEvaluator(
        createMockAiGateway(discussionResult),
      );
      await expect(
        discussionEvaluator.evaluateTopicProjection({
          topicId: 'top_water_bureau',
          primaryLane: 'WATER',
          generation: 1,
          snapshot: testSnapshot,
        }),
      ).rejects.toThrow(
        'Summary contains prohibited bureaucratic filler/placeholder',
      );
    });

    it('validates canonical disruption summary for colloquial past-continuous lamentation', async () => {
      const waterSnapshot: MahallaDailySnapshot = {
        districtId: 'dist_1',
        mahallaName: 'Navbahor',
        calendarDay: '2026-09-02',
        contextRevision: 2,
        snapshotFingerprint: 'fp_water_past',
        evidence: [
          {
            id: 'evi_water_1',
            topicId: 'top_water_past',
            telegramMessageId: '701',
            originalTimestamp: '2026-09-02T22:02:00.000Z',
            verbatimText: 'hec bumasa',
            lane: 'WATER',
          },
          {
            id: 'evi_water_2',
            topicId: 'top_water_past',
            telegramMessageId: '702',
            originalTimestamp: '2026-09-02T22:02:00.000Z',
            verbatimText: 'suv keb turgandedi',
            lane: 'WATER',
          },
        ],
      };

      const validWaterProjection: TopicProjectionResult = {
        summary: 'Сув таъминотида узилиш юз бергани хабар қилинмоқда.',
        lanes: ['WATER'],
        anchor_evidence_id: 'evi_water_2',
        anchor_quote: 'suv keb turgandedi',
        latest_meaningful_activity_timestamp: '2026-09-02T22:02:00.000Z',
        attribution: 'Маҳалла фуқароси',
        is_hokim_related: false,
      };

      const evaluator = new TopicProjectionEvaluator(createMockAiGateway(validWaterProjection));
      const result = await evaluator.evaluateTopicProjection({
        topicId: 'top_water_past',
        primaryLane: 'WATER',
        generation: 1,
        snapshot: waterSnapshot,
      });

      expect(result.summary).toBe('Сув таъминотида узилиш юз бергани хабар қилинмоқда.');
      expect(result.anchorEvidenceId).toBe('evi_water_2');
      expect(result.anchorQuote).toBe('suv keb turgandedi');
    });

    it('enforces prompt budgeting: caps target evidence to 15 items and other topics to 5 topics with 2 items each', () => {
      const mockGateway = createMockAiGateway({
        summary: 'test',
        lanes: ['WATER'],
        anchor_evidence_id: 'evi_1',
        anchor_quote: 'quote',
        latest_meaningful_activity_timestamp: '2026-09-02T22:00:00.000Z',
        attribution: 'test',
        is_hokim_related: false,
      });
      const evaluator = new TopicProjectionEvaluator(mockGateway);

      const targetItems = Array.from({ length: 20 }, (_, i) => ({
        id: `evi_target_${i + 1}`,
        topicId: 'top_target',
        telegramMessageId: `${100 + i}`,
        originalTimestamp: new Date(Date.now() + i * 1000).toISOString(),
        verbatimText: `message ${i + 1}`,
        lane: 'WATER',
      }));

      const otherItems: any[] = [];
      for (let t = 1; t <= 8; t++) {
        for (let m = 1; m <= 4; m++) {
          otherItems.push({
            id: `evi_other_${t}_${m}`,
            topicId: `top_other_${t}`,
            telegramMessageId: `${200 + t * 10 + m}`,
            originalTimestamp: new Date(Date.now() + (t * 10 + m) * 1000).toISOString(),
            verbatimText: `other topic ${t} message ${m}`,
            lane: 'ELECTRICITY',
          });
        }
      }

      const prompt = evaluator.buildUserPrompt({
        topicId: 'top_target',
        primaryLane: 'WATER',
        generation: 1,
        snapshot: {
          districtId: 'dist_1',
          mahallaName: 'Navbahor',
          calendarDay: '2026-09-02',
          contextRevision: 1,
          snapshotFingerprint: 'fp_large',
          evidence: [...targetItems, ...otherItems],
        },
      });

      expect(prompt).toContain('Evidence #15');
      expect(prompt).not.toContain('Evidence #16');
      expect(prompt).toContain('top_other_5');
      expect(prompt).toContain('additional same-day topics omitted for brevity');
      expect(prompt).toContain('other topic 1 message 4');
      expect(prompt).toContain('other topic 1 message 3');
      expect(prompt).not.toContain('other topic 1 message 2');
      expect(prompt).not.toContain('other topic 1 message 1');
    });
  });
});
