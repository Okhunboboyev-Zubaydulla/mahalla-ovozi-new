import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { telegramBotClient } from './telegram-bot-client.js';
export function useTelegramBot(districtId) {
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: ['district', districtId, 'telegram-bot'],
        queryFn: async () => {
            if (!districtId) {
                throw new Error('Туман танланмаган.');
            }
            const response = await telegramBotClient.getDistrictTelegramBot(districtId);
            return response.bot;
        },
        enabled: !!districtId,
    });
    const connectMutation = useMutation({
        mutationFn: async ({ token }) => {
            if (!districtId) {
                throw new Error('Туман танланмаган.');
            }
            return telegramBotClient.connectDistrictTelegramBot(districtId, { token });
        },
        onSuccess: () => {
            if (districtId) {
                queryClient.invalidateQueries({
                    queryKey: ['district', districtId, 'telegram-bot'],
                });
                queryClient.invalidateQueries({
                    queryKey: ['district', districtId, 'readiness'],
                });
            }
        },
    });
    const disconnectMutation = useMutation({
        mutationFn: async () => {
            if (!districtId) {
                throw new Error('Туман танланмаган.');
            }
            return telegramBotClient.disconnectDistrictTelegramBot(districtId);
        },
        onSuccess: () => {
            if (districtId) {
                queryClient.invalidateQueries({
                    queryKey: ['district', districtId, 'telegram-bot'],
                });
                queryClient.invalidateQueries({
                    queryKey: ['district', districtId, 'readiness'],
                });
            }
        },
    });
    return {
        ...query,
        bot: query.data ?? null,
        connectBot: connectMutation.mutateAsync,
        isConnecting: connectMutation.isPending,
        connectError: connectMutation.error,
        resetConnectError: connectMutation.reset,
        disconnectBot: disconnectMutation.mutateAsync,
        isDisconnecting: disconnectMutation.isPending,
        disconnectError: disconnectMutation.error,
        resetDisconnectError: disconnectMutation.reset,
    };
}
