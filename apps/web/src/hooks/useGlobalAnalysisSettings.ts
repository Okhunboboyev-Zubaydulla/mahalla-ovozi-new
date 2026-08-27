import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type GetGlobalAnalysisSettingsResponse,
  type SaveGlobalAnalysisSettingsDraftResponse,
  type SaveGlobalAnalysisSettingsDraftRequest,
} from '@mahalla-ovozi/api-contracts';
import { globalSettingsClient } from '../api/global-settings-client.js';

export const GLOBAL_SETTINGS_QUERY_KEY = ['ai', 'settings', 'global'] as const;

export function useGlobalAnalysisSettings() {
  return useQuery<GetGlobalAnalysisSettingsResponse>({
    queryKey: GLOBAL_SETTINGS_QUERY_KEY,
    queryFn: () => globalSettingsClient.getGlobalSettings(),
    staleTime: 30_000,
  });
}

export function useSaveGlobalSettingsDraft() {
  const queryClient = useQueryClient();

  return useMutation<
    SaveGlobalAnalysisSettingsDraftResponse,
    Error,
    SaveGlobalAnalysisSettingsDraftRequest
  >({
    mutationFn: (payload: SaveGlobalAnalysisSettingsDraftRequest) =>
      globalSettingsClient.saveGlobalSettingsDraft(payload),
    onSuccess: (data) => {
      // Invalidate and set updated data in query cache
      queryClient.setQueryData<GetGlobalAnalysisSettingsResponse>(
        GLOBAL_SETTINGS_QUERY_KEY,
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            draft: data.draft,
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: GLOBAL_SETTINGS_QUERY_KEY });
    },
  });
}
