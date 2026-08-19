import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hokimAccountClient } from './hokim-account-client.js';
import {
  GetDistrictHokimAccountResponse,
  CreateHokimAccountResponse,
  ResetHokimPasswordResponse,
  DisableHokimAccountResponse,
  ReplaceHokimAccountResponse,
} from '@mahalla-ovozi/api-contracts';

export function useHokimAccount(districtId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery<GetDistrictHokimAccountResponse>({
    queryKey: ['district', districtId, 'hokim-account'],
    queryFn: async () => {
      if (!districtId) {
        throw new Error('Туман танланмаган.');
      }
      return hokimAccountClient.getDistrictHokimAccount(districtId);
    },
    enabled: !!districtId,
  });

  const invalidateHokimAndReadiness = () => {
    if (districtId) {
      queryClient.invalidateQueries({
        queryKey: ['district', districtId, 'hokim-account'],
      });
      queryClient.invalidateQueries({
        queryKey: ['district', districtId, 'readiness'],
      });
    }
  };

  const createMutation = useMutation<CreateHokimAccountResponse, Error, { username: string }>({
    mutationFn: async ({ username }) => {
      if (!districtId) {
        throw new Error('Туман танланмаган.');
      }
      return hokimAccountClient.createDistrictHokimAccount(districtId, { username });
    },
    onSuccess: invalidateHokimAndReadiness,
  });

  const resetPasswordMutation = useMutation<ResetHokimPasswordResponse, Error, void>({
    mutationFn: async () => {
      if (!districtId) {
        throw new Error('Туман танланмаган.');
      }
      return hokimAccountClient.resetDistrictHokimPassword(districtId);
    },
    onSuccess: invalidateHokimAndReadiness,
  });

  const disableMutation = useMutation<DisableHokimAccountResponse, Error, void>({
    mutationFn: async () => {
      if (!districtId) {
        throw new Error('Туман танланмаган.');
      }
      return hokimAccountClient.disableDistrictHokimAccount(districtId);
    },
    onSuccess: invalidateHokimAndReadiness,
  });

  const replaceMutation = useMutation<ReplaceHokimAccountResponse, Error, { newUsername: string }>({
    mutationFn: async ({ newUsername }) => {
      if (!districtId) {
        throw new Error('Туман танланмаган.');
      }
      return hokimAccountClient.replaceDistrictHokimAccount(districtId, { newUsername });
    },
    onSuccess: invalidateHokimAndReadiness,
  });

  return {
    ...query,
    hokimState: query.data?.state ?? 'NO_ACCOUNT',
    account: query.data?.account ?? null,
    createHokimAccount: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    resetCreateError: createMutation.reset,

    resetPassword: resetPasswordMutation.mutateAsync,
    isResetting: resetPasswordMutation.isPending,
    resetPasswordError: resetPasswordMutation.error,
    resetPasswordResetError: resetPasswordMutation.reset,

    disableHokimAccount: disableMutation.mutateAsync,
    isDisabling: disableMutation.isPending,
    disableError: disableMutation.error,
    resetDisableError: disableMutation.reset,

    replaceHokimAccount: replaceMutation.mutateAsync,
    isReplacing: replaceMutation.isPending,
    replaceError: replaceMutation.error,
    resetReplaceError: replaceMutation.reset,
  };
}
