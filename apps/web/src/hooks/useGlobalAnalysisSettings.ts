import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type GetGlobalAnalysisSettingsResponse,
  type SaveGlobalAnalysisSettingsDraftResponse,
  type SaveGlobalAnalysisSettingsDraftRequest,
  type ActivateGlobalAnalysisSettingsResponse,
  type ActivateGlobalAnalysisSettingsRequest,
  type GlobalAnalysisSettingsHistoryResponse,
  type RollbackGlobalAnalysisSettingsRequest,
  type RollbackGlobalAnalysisSettingsResponse,
} from '@mahalla-ovozi/api-contracts';
import { globalSettingsClient } from '../api/global-settings-client.js';

export const GLOBAL_SETTINGS_QUERY_KEY = ['ai', 'settings', 'global'] as const;
export const GLOBAL_SETTINGS_HISTORY_QUERY_KEY = [
  'ai',
  'settings',
  'global',
  'history',
] as const;

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

export function useActivateGlobalSettings() {
  const queryClient = useQueryClient();

  return useMutation<
    ActivateGlobalAnalysisSettingsResponse,
    Error,
    ActivateGlobalAnalysisSettingsRequest
  >({
    mutationFn: (payload: ActivateGlobalAnalysisSettingsRequest) =>
      globalSettingsClient.activateGlobalSettings(payload),
    onSuccess: (data) => {
      // Set updated active configuration and clear draft in query cache
      queryClient.setQueryData<GetGlobalAnalysisSettingsResponse>(
        GLOBAL_SETTINGS_QUERY_KEY,
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activeConfiguration: data.activeConfiguration,
            draft: null,
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: GLOBAL_SETTINGS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: GLOBAL_SETTINGS_HISTORY_QUERY_KEY,
      });
    },
  });
}

export function useGlobalAnalysisSettingsHistory() {
  return useQuery<GlobalAnalysisSettingsHistoryResponse>({
    queryKey: GLOBAL_SETTINGS_HISTORY_QUERY_KEY,
    queryFn: () => globalSettingsClient.getGlobalSettingsHistory(),
    staleTime: 30_000,
  });
}

export function useRollbackGlobalSettings() {
  const queryClient = useQueryClient();

  return useMutation<
    RollbackGlobalAnalysisSettingsResponse,
    Error,
    RollbackGlobalAnalysisSettingsRequest
  >({
    mutationFn: (payload: RollbackGlobalAnalysisSettingsRequest) =>
      globalSettingsClient.rollbackGlobalSettings(payload),
    onSuccess: (data) => {
      // Update active configuration in query cache
      queryClient.setQueryData<GetGlobalAnalysisSettingsResponse>(
        GLOBAL_SETTINGS_QUERY_KEY,
        (prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            activeConfiguration: data.activeConfiguration,
          };
        },
      );
      void queryClient.invalidateQueries({ queryKey: GLOBAL_SETTINGS_QUERY_KEY });
      void queryClient.invalidateQueries({
        queryKey: GLOBAL_SETTINGS_HISTORY_QUERY_KEY,
      });
    },
  });
}
