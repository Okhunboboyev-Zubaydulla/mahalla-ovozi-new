import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hokimAccountClient } from './hokim-account-client.js';
export function useHokimAccount(districtId) {
    const queryClient = useQueryClient();
    const query = useQuery({
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
    const createMutation = useMutation({
        mutationFn: async ({ username }) => {
            if (!districtId) {
                throw new Error('Туман танланмаган.');
            }
            return hokimAccountClient.createDistrictHokimAccount(districtId, { username });
        },
        onSuccess: invalidateHokimAndReadiness,
    });
    const resetPasswordMutation = useMutation({
        mutationFn: async () => {
            if (!districtId) {
                throw new Error('Туман танланмаган.');
            }
            return hokimAccountClient.resetDistrictHokimPassword(districtId);
        },
        onSuccess: invalidateHokimAndReadiness,
    });
    const disableMutation = useMutation({
        mutationFn: async () => {
            if (!districtId) {
                throw new Error('Туман танланмаган.');
            }
            return hokimAccountClient.disableDistrictHokimAccount(districtId);
        },
        onSuccess: invalidateHokimAndReadiness,
    });
    const replaceMutation = useMutation({
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
