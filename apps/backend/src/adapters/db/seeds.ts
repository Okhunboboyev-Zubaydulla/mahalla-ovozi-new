import { and, ne } from 'drizzle-orm';
import {
  aiProfiles,
  NewAiProfile,
  districtAnalysisSettingsVersions,
  NewDistrictAnalysisSettingsVersion,
} from './schema/ai.js';
import { DEFAULT_HOKIM_RECOGNITION_TERMS } from '@mahalla-ovozi/api-contracts';
import type { DbOrTx } from './client.js';

const defaultProvider: 'OPENAI' | 'GEMINI' | 'GROQ' | 'OLLAMA' =
  (process.env.AI_PROVIDER as 'OPENAI' | 'GEMINI' | 'GROQ' | 'OLLAMA') || 'OLLAMA';
const defaultModelId: string =
  process.env.AI_MODEL_ID ||
  (defaultProvider === 'GROQ'
    ? 'llama-3.3-70b-versatile'
    : defaultProvider === 'GEMINI'
      ? 'gemini-2.0-flash'
      : defaultProvider === 'OPENAI'
        ? 'gpt-4o-mini'
        : 'gemma4:12b');
const defaultTimeoutMs = defaultProvider === 'GROQ' ? 15000 : 30000;

export const defaultSemanticRelevanceProfile: NewAiProfile = {
  id: 'prof_rel_2026_08_v1',
  version: 1,
  operationType: 'SEMANTIC_RELEVANCE',
  provider: defaultProvider,
  modelId: defaultModelId,
  promptVersion: 'prom_rel_v1',
  schemaVersion: 'sch_rel_v1',
  temperature: 0.0,
  maxOutputTokens: 500,
  timeoutMs: defaultTimeoutMs,
  retryPolicy: {
    maxAttempts: 3,
    backoffFactor: 2,
    initialDelayMs: 1000,
  },
  capabilities: {
    structuredOutputs: true,
    jsonSchemaMode: 'strict',
  },
  isActive: true,
};

export const defaultTopicMatchingProfile: NewAiProfile = {
  id: 'prof_match_2026_08_v1',
  version: 1,
  operationType: 'TOPIC_MATCHING',
  provider: defaultProvider,
  modelId: defaultModelId,
  promptVersion: 'prom_match_v1',
  schemaVersion: 'sch_match_v1',
  temperature: 0.0,
  maxOutputTokens: 500,
  timeoutMs: defaultTimeoutMs,
  retryPolicy: {
    maxAttempts: 3,
    backoffFactor: 2,
    initialDelayMs: 1000,
  },
  capabilities: {
    structuredOutputs: true,
    jsonSchemaMode: 'strict',
  },
  isActive: true,
};

export const defaultTopicProjectionProfile: NewAiProfile = {
  id: 'prof_proj_2026_08_v1',
  version: 1,
  operationType: 'TOPIC_DERIVED_PROJECTION',
  provider: defaultProvider,
  modelId: defaultModelId,
  promptVersion: 'prom_proj_v1',
  schemaVersion: 'sch_proj_v1',
  temperature: 0.0,
  maxOutputTokens: 600,
  timeoutMs: defaultTimeoutMs,
  retryPolicy: {
    maxAttempts: 3,
    backoffFactor: 2,
    initialDelayMs: 1000,
  },
  capabilities: {
    structuredOutputs: true,
    jsonSchemaMode: 'strict',
  },
  isActive: true,
};


export async function ensureDefaultAiProfiles(db: DbOrTx): Promise<void> {
  await db
    .update(aiProfiles)
    .set({ isActive: false })
    .where(
      and(
        ne(aiProfiles.id, defaultSemanticRelevanceProfile.id),
        ne(aiProfiles.id, defaultTopicMatchingProfile.id),
        ne(aiProfiles.id, defaultTopicProjectionProfile.id),
      ),
    );

  await db
    .insert(aiProfiles)
    .values(defaultSemanticRelevanceProfile)
    .onConflictDoUpdate({
      target: aiProfiles.id,
      set: {
        provider: defaultSemanticRelevanceProfile.provider,
        modelId: defaultSemanticRelevanceProfile.modelId,
        timeoutMs: defaultSemanticRelevanceProfile.timeoutMs,
        isActive: true,
      },
    });
  await db
    .insert(aiProfiles)
    .values(defaultTopicMatchingProfile)
    .onConflictDoUpdate({
      target: aiProfiles.id,
      set: {
        provider: defaultTopicMatchingProfile.provider,
        modelId: defaultTopicMatchingProfile.modelId,
        timeoutMs: defaultTopicMatchingProfile.timeoutMs,
        isActive: true,
      },
    });
  await db
    .insert(aiProfiles)
    .values(defaultTopicProjectionProfile)
    .onConflictDoUpdate({
      target: aiProfiles.id,
      set: {
        provider: defaultTopicProjectionProfile.provider,
        modelId: defaultTopicProjectionProfile.modelId,
        timeoutMs: defaultTopicProjectionProfile.timeoutMs,
        isActive: true,
      },
    });
}

export function createDefaultDistrictAnalysisSettingsVersion(
  districtId: string,
): NewDistrictAnalysisSettingsVersion {
  return {
    id: `dcfg_${districtId}_v1`,
    districtId,
    version: 1,
    hokimRecognitionTerms: [...DEFAULT_HOKIM_RECOGNITION_TERMS],
    localVocabularyAdditions: [],
    isActive: true,
    activatedAt: new Date('2026-08-01T00:00:00.000Z'),
    activatedBy: null,
    changeReason: 'Туманнинг дастлабки фаол созламалари',
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
  };
}

export async function ensureDefaultDistrictAnalysisSettings(
  db: DbOrTx,
  districtId: string,
): Promise<void> {
  const defaultVersion = createDefaultDistrictAnalysisSettingsVersion(districtId);
  await db
    .insert(districtAnalysisSettingsVersions)
    .values(defaultVersion)
    .onConflictDoNothing({ target: districtAnalysisSettingsVersions.id });
}


