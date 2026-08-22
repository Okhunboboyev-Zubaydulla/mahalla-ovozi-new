import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { AiGateway } from '../src/modules/ai/ai-gateway.js';
import {
  compilePortableJsonSchema,
  compileProviderSchema,
} from '../src/modules/ai/schema-compiler.js';
import { MockProviderAdapter } from '../src/adapters/ai-providers/mock-provider-adapter.js';
import { AiGatewayError } from '../src/modules/ai/types.js';
import type { AiProfile } from '../src/adapters/db/schema/ai.js';

describe('AI Gateway & Portable Schema Compiler Unit Tests', () => {
  const TestSchema = z.object({
    title: z.string().describe('The title of the issue'),
    count: z.number().describe('Estimated count'),
    is_urgent: z.boolean().describe('Urgency flag'),
    category: z.enum(['WATER', 'ELECTRICITY', 'GAS']),
    notes: z.string().nullable().describe('Optional notes'),
  });

  const testProfile: AiProfile = {
    id: 'prof_test_v1',
    version: 1,
    operationType: 'SEMANTIC_RELEVANCE',
    provider: 'MOCK',
    modelId: 'mock-model-v1',
    promptVersion: 'prom_v1',
    schemaVersion: 'sch_v1',
    temperature: 0.0,
    maxOutputTokens: 200,
    timeoutMs: 5000,
    retryPolicy: {
      maxAttempts: 3,
      backoffFactor: 1.5,
      initialDelayMs: 10,
    },
    capabilities: {
      structuredOutputs: true,
      jsonSchemaMode: 'strict',
    },
    isActive: true,
    createdAt: new Date(),
  };

  describe('Portable JSON Schema Compiler', () => {
    it('compiles Zod schema to strict JSON Schema with required keys and additionalProperties: false', () => {
      const compiled = compilePortableJsonSchema(TestSchema);

      expect(compiled.type).toBe('object');
      expect(compiled.additionalProperties).toBe(false);
      expect(compiled.required).toEqual(['title', 'count', 'is_urgent', 'category', 'notes']);
      expect(compiled.properties?.title.type).toBe('string');
      expect(compiled.properties?.count.type).toBe('number');
      expect(compiled.properties?.is_urgent.type).toBe('boolean');
      expect(compiled.properties?.category.enum).toEqual(['WATER', 'ELECTRICITY', 'GAS']);
      expect(compiled.properties?.notes.nullable).toBe(true);
    });

    it('compiles for OpenAI and Groq with strict json_schema wrapper', () => {
      const openAiFormat: any = compileProviderSchema('OPENAI', TestSchema, 'test_payload');
      expect(openAiFormat.type).toBe('json_schema');
      expect(openAiFormat.json_schema.name).toBe('test_payload');
      expect(openAiFormat.json_schema.strict).toBe(true);
      expect(openAiFormat.json_schema.schema.additionalProperties).toBe(false);

      const groqFormat: any = compileProviderSchema('GROQ', TestSchema, 'test_payload');
      expect(groqFormat.type).toBe('json_schema');
      expect(groqFormat.json_schema.name).toBe('test_payload');
    });

    it('compiles for Gemini REST with responseSchema and uppercase types', () => {
      const geminiFormat: any = compileProviderSchema('GEMINI', TestSchema, 'test_payload');
      expect(geminiFormat.responseMimeType).toBe('application/json');
      expect(geminiFormat.responseSchema.type).toBe('OBJECT');
      expect(geminiFormat.responseSchema.properties.title.type).toBe('STRING');
      expect(geminiFormat.responseSchema.properties.count.type).toBe('NUMBER');
      expect(geminiFormat.responseSchema.properties.is_urgent.type).toBe('BOOLEAN');
      expect(geminiFormat.responseSchema.properties.notes.nullable).toBe(true);
      // Nullable field omitted from required in Gemini to prevent validation error
      expect(geminiFormat.responseSchema.required).not.toContain('notes');
    });

    it('compiles for Ollama format', () => {
      const ollamaFormat: any = compileProviderSchema('OLLAMA', TestSchema, 'test_payload');
      expect(ollamaFormat.type).toBe('object');
      expect(ollamaFormat.properties.title.type).toBe('string');
    });
  });

  describe('AI Gateway Execution & Retries', () => {
    let mockAdapter: MockProviderAdapter;
    let gateway: AiGateway;

    beforeEach(() => {
      mockAdapter = new MockProviderAdapter({
        title: 'Water Pipe Burst',
        count: 5,
        is_urgent: true,
        category: 'WATER',
        notes: null,
      });

      const customAdapters = new Map<string, any>();
      customAdapters.set('MOCK', mockAdapter);

      const defaultProfiles = new Map<string, AiProfile>();
      defaultProfiles.set('prof_test_v1', testProfile);

      gateway = new AiGateway({ customAdapters, defaultProfiles });
    });

    it('executes successfully and returns structured validated result with metrics', async () => {
      const result = await gateway.generateStructured({
        operationType: 'SEMANTIC_RELEVANCE',
        profileId: 'prof_test_v1',
        systemPrompt: 'You are an analyzer',
        userPrompt: 'Analyze this complaint',
        schema: TestSchema,
        schemaName: 'test_schema',
      });

      expect(result.data.title).toBe('Water Pipe Burst');
      expect(result.data.category).toBe('WATER');
      expect(result.profileId).toBe('prof_test_v1');
      expect(result.provider).toBe('MOCK');
      expect(result.tokens.inputTokens).toBeGreaterThan(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
      expect(result.estimatedCostUsd).toBeGreaterThanOrEqual(0);
    });

    it('throws PROFILE_NOT_FOUND when requested profile does not exist', async () => {
      await expect(
        gateway.generateStructured({
          operationType: 'SEMANTIC_RELEVANCE',
          profileId: 'non_existent_profile',
          systemPrompt: 'System',
          userPrompt: 'User',
          schema: TestSchema,
          schemaName: 'test_schema',
        }),
      ).rejects.toMatchObject({
        code: 'PROFILE_NOT_FOUND',
      });
    });

    it('retries on transient rate limit (429) and succeeds on subsequent attempt', async () => {
      // 1st attempt fails with rate limit, 2nd attempt succeeds
      mockAdapter.enqueueBehavior({
        error: new AiGatewayError('RATE_LIMIT_EXCEEDED', 'Rate limited', {
          status: 429,
          retryable: true,
        }),
      });

      const result = await gateway.generateStructured({
        operationType: 'SEMANTIC_RELEVANCE',
        profileId: 'prof_test_v1',
        systemPrompt: 'System',
        userPrompt: 'User',
        schema: TestSchema,
        schemaName: 'test_schema',
      });

      expect(result.data.title).toBe('Water Pipe Burst');
      expect(mockAdapter.getCalls()).toHaveLength(2);
    });

    it('retries on syntax error (invalid JSON string) and succeeds on subsequent attempt', async () => {
      // 1st attempt returns malformed JSON string
      mockAdapter.setNextResponse('INVALID_NOT_JSON');

      const result = await gateway.generateStructured({
        operationType: 'SEMANTIC_RELEVANCE',
        profileId: 'prof_test_v1',
        systemPrompt: 'System',
        userPrompt: 'User',
        schema: TestSchema,
        schemaName: 'test_schema',
      });

      expect(result.data.title).toBe('Water Pipe Burst');
      expect(mockAdapter.getCalls()).toHaveLength(2);
    });

    it('throws INVALID_OUTPUT_SYNTAX when model produces invalid JSON across all attempts', async () => {
      mockAdapter.setNextResponse('MALFORMED_JSON_1');
      mockAdapter.setNextResponse('MALFORMED_JSON_2');
      mockAdapter.setNextResponse('MALFORMED_JSON_3');

      await expect(
        gateway.generateStructured({
          operationType: 'SEMANTIC_RELEVANCE',
          profileId: 'prof_test_v1',
          systemPrompt: 'System',
          userPrompt: 'User',
          schema: TestSchema,
          schemaName: 'test_schema',
        }),
      ).rejects.toMatchObject({
        code: 'INVALID_OUTPUT_SYNTAX',
      });

      expect(mockAdapter.getCalls()).toHaveLength(3);
    });

    it('throws INVALID_OUTPUT_SEMANTICS when model output violates Zod schema across all attempts', async () => {
      const invalidData = {
        title: 'Title',
        count: 'NOT_A_NUMBER', // Violation
        is_urgent: true,
        category: 'INVALID_CATEGORY', // Violation
      };

      mockAdapter.setNextResponse(invalidData);
      mockAdapter.setNextResponse(invalidData);
      mockAdapter.setNextResponse(invalidData);

      await expect(
        gateway.generateStructured({
          operationType: 'SEMANTIC_RELEVANCE',
          profileId: 'prof_test_v1',
          systemPrompt: 'System',
          userPrompt: 'User',
          schema: TestSchema,
          schemaName: 'test_schema',
        }),
      ).rejects.toMatchObject({
        code: 'INVALID_OUTPUT_SEMANTICS',
      });

      expect(mockAdapter.getCalls()).toHaveLength(3);
    });

    it('does not retry on non-retryable error (e.g. AUTHENTICATION_ERROR)', async () => {
      mockAdapter.setNextError(
        new AiGatewayError('AUTHENTICATION_ERROR', 'Bad API Key', {
          status: 401,
          retryable: false,
        }),
      );

      await expect(
        gateway.generateStructured({
          operationType: 'SEMANTIC_RELEVANCE',
          profileId: 'prof_test_v1',
          systemPrompt: 'System',
          userPrompt: 'User',
          schema: TestSchema,
          schemaName: 'test_schema',
        }),
      ).rejects.toMatchObject({
        code: 'AUTHENTICATION_ERROR',
      });

      expect(mockAdapter.getCalls()).toHaveLength(1);
    });
  });
});
