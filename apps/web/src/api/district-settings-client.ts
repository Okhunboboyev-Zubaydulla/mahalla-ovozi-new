import {
  type GetDistrictAnalysisSettingsResponse,
  type SaveDistrictAnalysisSettingsDraftRequest,
  type SaveDistrictAnalysisSettingsDraftResponse,
  GetDistrictAnalysisSettingsResponseSchema,
  SaveDistrictAnalysisSettingsDraftResponseSchema,
} from '@mahalla-ovozi/api-contracts';
import { request } from '../lib/api-client.js';

export async function getDistrictAnalysisSettings(
  districtId: string,
  signal?: AbortSignal,
): Promise<GetDistrictAnalysisSettingsResponse> {
  return request<GetDistrictAnalysisSettingsResponse>(
    `/api/v1/ai/settings/districts/${encodeURIComponent(districtId)}`,
    { method: 'GET', signal },
    GetDistrictAnalysisSettingsResponseSchema,
  );
}

export async function saveDistrictAnalysisSettingsDraft(
  districtId: string,
  payload: SaveDistrictAnalysisSettingsDraftRequest,
): Promise<SaveDistrictAnalysisSettingsDraftResponse> {
  return request<SaveDistrictAnalysisSettingsDraftResponse>(
    `/api/v1/ai/settings/districts/${encodeURIComponent(districtId)}/draft`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    SaveDistrictAnalysisSettingsDraftResponseSchema,
  );
}

export const districtSettingsClient = {
  getDistrictAnalysisSettings,
  saveDistrictAnalysisSettingsDraft,
};

