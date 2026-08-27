import {
  aiProfiles,
  NewAiProfile,
  globalAnalysisSettingsVersions,
  NewGlobalAnalysisSettingsVersion,
  districtAnalysisSettingsVersions,
  NewDistrictAnalysisSettingsVersion,
} from './schema/ai.js';
import type { DbOrTx } from './client.js';
import { SEMANTIC_RELEVANCE_SYSTEM_PROMPT } from '../../modules/ai/semantic-relevance-evaluator.js';
import { TOPIC_MATCHING_SYSTEM_PROMPT } from '../../modules/topics/topic-matching-evaluator.js';
import { TOPIC_PROJECTION_SYSTEM_PROMPT } from '../../modules/topics/topic-projection-evaluator.js';
import {
  DEFAULT_GLOBAL_SERVICE_VOCABULARY,
  DEFAULT_HOKIM_RECOGNITION_TERMS,
} from '@mahalla-ovozi/api-contracts';

export const defaultSemanticRelevanceProfile: NewAiProfile = {
  id: 'prof_rel_2026_08_v1',
  version: 1,
  operationType: 'SEMANTIC_RELEVANCE',
  provider: 'OPENAI',
  modelId: 'gpt-4o-mini-2024-07-18',
  promptVersion: 'prom_rel_v1',
  schemaVersion: 'sch_rel_v1',
  temperature: 0.0,
  maxOutputTokens: 500,
  timeoutMs: 10000,
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
  provider: 'OPENAI',
  modelId: 'gpt-4o-mini-2024-07-18',
  promptVersion: 'prom_match_v1',
  schemaVersion: 'sch_match_v1',
  temperature: 0.0,
  maxOutputTokens: 500,
  timeoutMs: 10000,
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
  provider: 'OPENAI',
  modelId: 'gpt-4o-mini-2024-07-18',
  promptVersion: 'prom_proj_v1',
  schemaVersion: 'sch_proj_v1',
  temperature: 0.0,
  maxOutputTokens: 600,
  timeoutMs: 10000,
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

export const defaultGlobalAnalysisSettingsVersion: NewGlobalAnalysisSettingsVersion = {
  id: 'gcfg_v1',
  version: 1,
  modelProvider: 'OPENAI',
  modelId: 'gpt-4o-mini-2024-07-18',
  temperature: 0.0,
  maxOutputTokens: 500,
  relevanceSystemPrompt: SEMANTIC_RELEVANCE_SYSTEM_PROMPT,
  topicMatchingSystemPrompt: TOPIC_MATCHING_SYSTEM_PROMPT,
  topicProjectionSystemPrompt: TOPIC_PROJECTION_SYSTEM_PROMPT,
  globalServiceVocabulary: DEFAULT_GLOBAL_SERVICE_VOCABULARY,
  isActive: true,
  activatedAt: new Date('2026-08-01T00:00:00.000Z'),
  activatedBy: null,
  changeReason: 'Тизимнинг дастлабки фаол глобал таҳлил конфигурацияси',
};

export async function ensureDefaultGlobalAnalysisSettings(db: DbOrTx): Promise<void> {
  await db
    .insert(globalAnalysisSettingsVersions)
    .values(defaultGlobalAnalysisSettingsVersion)
    .onConflictDoNothing({ target: globalAnalysisSettingsVersions.id });
}

export async function ensureDefaultAiProfiles(db: DbOrTx): Promise<void> {
  await db
    .insert(aiProfiles)
    .values(defaultSemanticRelevanceProfile)
    .onConflictDoNothing({ target: aiProfiles.id });
  await db
    .insert(aiProfiles)
    .values(defaultTopicMatchingProfile)
    .onConflictDoNothing({ target: aiProfiles.id });
  await db
    .insert(aiProfiles)
    .values(defaultTopicProjectionProfile)
    .onConflictDoNothing({ target: aiProfiles.id });
  await ensureDefaultGlobalAnalysisSettings(db);
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


