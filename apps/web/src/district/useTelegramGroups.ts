import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { telegramGroupClient } from './telegram-group-client.js';
import {
  TelegramGroupMapping,
  CreateTelegramGroupRequest,
  CreateTelegramGroupResponse,
  UpdateTelegramGroupRequest,
  UpdateTelegramGroupResponse,
  DeleteTelegramGroupResponse,
  StartGroupTestResponse,
  SimulateTestMessageRequest,
  SimulateTestMessageResponse,
} from '@mahalla-ovozi/api-contracts';

export function useTelegramGroups(districtId: string | null) {
  const queryClient = useQueryClient();

  const query = useQuery<TelegramGroupMapping[]>({
    queryKey: ['district', districtId, 'telegram-groups'],
    queryFn: async () => {
      if (!districtId) {
        throw new Error('Туман танланмаган.');
      }
      const response = await telegramGroupClient.listGroups(districtId);
      return response.groups;
    },
    enabled: !!districtId,
  });

  const createMutation = useMutation<
    CreateTelegramGroupResponse,
    Error,
    CreateTelegramGroupRequest
  >({
    mutationFn: async (payload) => {
      if (!districtId) {
        throw new Error('Туман танланмаган.');
      }
      return telegramGroupClient.createGroup(districtId, payload);
    },
    onSuccess: () => {
      if (districtId) {
        queryClient.invalidateQueries({
          queryKey: ['district', districtId, 'telegram-groups'],
        });
        queryClient.invalidateQueries({
          queryKey: ['district', districtId, 'readiness'],
        });
      }
    },
  });

  const updateMutation = useMutation<
    UpdateTelegramGroupResponse,
    Error,
    { groupId: string; payload: UpdateTelegramGroupRequest }
  >({
    mutationFn: async ({ groupId, payload }) => {
      if (!districtId) {
        throw new Error('Туман танланмаган.');
      }
      return telegramGroupClient.updateGroup(districtId, groupId, payload);
    },
    onSuccess: () => {
      if (districtId) {
        queryClient.invalidateQueries({
          queryKey: ['district', districtId, 'telegram-groups'],
        });
        queryClient.invalidateQueries({
          queryKey: ['district', districtId, 'readiness'],
        });
      }
    },
  });

  const deleteMutation = useMutation<DeleteTelegramGroupResponse, Error, { groupId: string }>({
    mutationFn: async ({ groupId }) => {
      if (!districtId) {
        throw new Error('Туман танланмаган.');
      }
      return telegramGroupClient.deleteGroup(districtId, groupId);
    },
    onSuccess: () => {
      if (districtId) {
        queryClient.invalidateQueries({
          queryKey: ['district', districtId, 'telegram-groups'],
        });
        queryClient.invalidateQueries({
          queryKey: ['district', districtId, 'readiness'],
        });
      }
    },
  });

  const startTestMutation = useMutation<StartGroupTestResponse, Error, { groupId: string }>({
    mutationFn: async ({ groupId }) => {
      if (!districtId) {
        throw new Error('Туман танланмаган.');
      }
      return telegramGroupClient.startTest(districtId, groupId);
    },
    onSuccess: () => {
      if (districtId) {
        queryClient.invalidateQueries({
          queryKey: ['district', districtId, 'telegram-groups'],
        });
      }
    },
  });

  const simulateMutation = useMutation<
    SimulateTestMessageResponse,
    Error,
    { groupId: string; payload: SimulateTestMessageRequest }
  >({
    mutationFn: async ({ groupId, payload }) => {
      if (!districtId) {
        throw new Error('Туман танланмаган.');
      }
      return telegramGroupClient.simulateTestMessage(districtId, groupId, payload);
    },
    onSuccess: () => {
      if (districtId) {
        queryClient.invalidateQueries({
          queryKey: ['district', districtId, 'telegram-groups'],
        });
        queryClient.invalidateQueries({
          queryKey: ['district', districtId, 'readiness'],
        });
      }
    },
  });

  return {
    ...query,
    groups: query.data ?? [],
    createGroup: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error,
    resetCreateError: createMutation.reset,
    updateGroup: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error,
    resetUpdateError: updateMutation.reset,
    deleteGroup: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    deleteError: deleteMutation.error,
    startTest: startTestMutation.mutateAsync,
    isStartingTest: startTestMutation.isPending,
    simulateMessage: simulateMutation.mutateAsync,
    isSimulating: simulateMutation.isPending,
  };
}
