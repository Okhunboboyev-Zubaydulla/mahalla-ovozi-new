import {
  type GetGlobalAnalysisSettingsResponse,
  type SaveGlobalAnalysisSettingsDraftResponse,
  type SaveGlobalAnalysisSettingsDraftRequest,
  type ActivateGlobalAnalysisSettingsRequest,
  type ActivateGlobalAnalysisSettingsResponse,
  type GlobalAnalysisSettingsHistoryResponse,
  type RollbackGlobalAnalysisSettingsRequest,
  type RollbackGlobalAnalysisSettingsResponse,
  type GetOllamaModelsResponse,
  GetGlobalAnalysisSettingsResponseSchema,
  SaveGlobalAnalysisSettingsDraftResponseSchema,
  ActivateGlobalAnalysisSettingsResponseSchema,
  GlobalAnalysisSettingsHistoryResponseSchema,
  RollbackGlobalAnalysisSettingsResponseSchema,
  GetOllamaModelsResponseSchema,
} from '@mahalla-ovozi/api-contracts';
import { request } from '../lib/api-client.js';

export async function getOllamaModels(): Promise<GetOllamaModelsResponse> {
  return request<GetOllamaModelsResponse>(
    '/api/v1/ai/settings/ollama-models',
    { method: 'GET' },
    GetOllamaModelsResponseSchema,
  );
}

export async function getGlobalSettings(): Promise<GetGlobalAnalysisSettingsResponse> {
  return request<GetGlobalAnalysisSettingsResponse>(
    '/api/v1/ai/settings/global',
    { method: 'GET' },
    GetGlobalAnalysisSettingsResponseSchema,
  );
}

export async function saveGlobalSettingsDraft(
  payload: SaveGlobalAnalysisSettingsDraftRequest,
): Promise<SaveGlobalAnalysisSettingsDraftResponse> {
  return request<SaveGlobalAnalysisSettingsDraftResponse>(
    '/api/v1/ai/settings/global/draft',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    SaveGlobalAnalysisSettingsDraftResponseSchema,
  );
}

export async function activateGlobalSettings(
  payload: ActivateGlobalAnalysisSettingsRequest,
): Promise<ActivateGlobalAnalysisSettingsResponse> {
  return request<ActivateGlobalAnalysisSettingsResponse>(
    '/api/v1/ai/settings/global/activate',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    ActivateGlobalAnalysisSettingsResponseSchema,
  );
}

export async function getGlobalSettingsHistory(): Promise<GlobalAnalysisSettingsHistoryResponse> {
  return request<GlobalAnalysisSettingsHistoryResponse>(
    '/api/v1/ai/settings/global/history',
    { method: 'GET' },
    GlobalAnalysisSettingsHistoryResponseSchema,
  );
}

export async function rollbackGlobalSettings(
  payload: RollbackGlobalAnalysisSettingsRequest,
): Promise<RollbackGlobalAnalysisSettingsResponse> {
  return request<RollbackGlobalAnalysisSettingsResponse>(
    '/api/v1/ai/settings/global/rollback',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    RollbackGlobalAnalysisSettingsResponseSchema,
  );
}

export const globalSettingsClient = {
  getOllamaModels,
  getGlobalSettings,
  saveGlobalSettingsDraft,
  activateGlobalSettings,
  getGlobalSettingsHistory,
  rollbackGlobalSettings,
};



