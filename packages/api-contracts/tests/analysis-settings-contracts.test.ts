import { describe, it, expect } from 'vitest';
import { SaveGlobalAnalysisSettingsDraftSchema } from '../src/analysis-settings.js';

describe('SaveGlobalAnalysisSettingsDraftSchema validation', () => {
  const validPayload = {
    modelProvider: 'OPENAI',
    modelId: 'gpt-4o-mini',
    temperature: 0.2,
    maxOutputTokens: 1000,
    relevanceSystemPrompt: 'This is a valid relevance prompt with enough characters to pass validation.',
    topicMatchingSystemPrompt: 'This is a valid topic matching prompt with enough characters to pass validation.',
    topicProjectionSystemPrompt: 'This is a valid topic projection prompt with enough characters to pass validation.',
    globalServiceVocabulary: [
      {
        term: 'gaz',
        category: 'GAS',
        description: 'Gaz ta’minoti',
      },
    ],
  };

  it('accepts valid payload with reasonable vocabulary size', () => {
    const result = SaveGlobalAnalysisSettingsDraftSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('rejects vocabulary with more than 1000 items (DoS prevention)', () => {
    const oversizedVocabulary = Array.from({ length: 1001 }, (_, i) => ({
      term: `term_${i}`,
      category: 'OTHER' as const,
    }));

    const result = SaveGlobalAnalysisSettingsDraftSchema.safeParse({
      ...validPayload,
      globalServiceVocabulary: oversizedVocabulary,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path.includes('globalServiceVocabulary'));
      expect(issue).toBeDefined();
      expect(issue?.message).toContain('1000');
    }
  });
});
