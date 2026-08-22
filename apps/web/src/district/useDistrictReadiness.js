import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { districtClient } from './district-client.js';
export function useDistrictReadiness(districtId) {
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['district', districtId, 'readiness'],
        queryFn: async () => {
            if (!districtId) {
                throw new Error('Туман танланмаган.');
            }
            const response = await districtClient.getDistrictReadiness(districtId);
            return response.readiness;
        },
        enabled: !!districtId,
    });
    const confirmMutation = useMutation({
        mutationFn: async () => {
            if (!districtId) {
                throw new Error('Туман танланмаган.');
            }
            return districtClient.confirmDisclosure(districtId);
        },
        onSuccess: () => {
            if (districtId) {
                queryClient.invalidateQueries({
                    queryKey: ['district', districtId, 'readiness'],
                });
            }
        },
    });
    return {
        ...query,
        readiness: query.data,
        confirmDisclosure: confirmMutation.mutateAsync,
        isConfirming: confirmMutation.isPending,
        confirmError: confirmMutation.error,
    };
}
