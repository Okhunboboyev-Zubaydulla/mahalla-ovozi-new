import { useMutation, useQueryClient } from '@tanstack/react-query';
import { districtClient } from './district-client.js';
import { ActivateDistrictResponse } from '@mahalla-ovozi/api-contracts';
import { ApiError } from '../lib/api-client.js';

export function useDistrictActivation(districtId: string | null) {
  const queryClient = useQueryClient();

  const mutation = useMutation<ActivateDistrictResponse, ApiError | Error, void>({
    mutationFn: async () => {
      if (!districtId) {
        throw new Error('Туман танланмаган.');
      }
      return districtClient.activateDistrict(districtId);
    },
    onSuccess: (data) => {
      if (districtId) {
        queryClient.setQueryData(['district', districtId], { district: data.district });
        queryClient.invalidateQueries({
          queryKey: ['district', districtId, 'readiness'],
        });
        queryClient.invalidateQueries({
          queryKey: ['districts'],
        });
      }
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'DISTRICT_ALREADY_ACTIVE' && districtId) {
        queryClient.invalidateQueries({ queryKey: ['district', districtId] });
        queryClient.invalidateQueries({ queryKey: ['district', districtId, 'readiness'] });
        queryClient.invalidateQueries({ queryKey: ['districts'] });
      }
    },
  });

  return {
    activateDistrict: mutation.mutateAsync,
    isActivating: mutation.isPending,
    activationError: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
