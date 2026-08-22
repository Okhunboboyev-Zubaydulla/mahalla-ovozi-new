import { describe, it, expect } from 'vitest';
import {
  TopicProjectionResultSchema,
  isUzbekCyrillic,
  type TopicProjectionResult,
} from '../src/modules/ai/topic-projection-contracts.js';
import {
  TopicProjectionEvaluator,
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
  });
});
