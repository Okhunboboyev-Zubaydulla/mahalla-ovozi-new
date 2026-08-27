import {
  type GetGlobalAnalysisSettingsResponse,
  type SaveGlobalAnalysisSettingsDraftResponse,
  type SaveGlobalAnalysisSettingsDraftRequest,
  GetGlobalAnalysisSettingsResponseSchema,
  SaveGlobalAnalysisSettingsDraftResponseSchema,
} from '@mahalla-ovozi/api-contracts';
import { request } from '../lib/api-client.js';

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

export const globalSettingsClient = {
  getGlobalSettings,
  saveGlobalSettingsDraft,
};
