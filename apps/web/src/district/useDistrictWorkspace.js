import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { districtClient } from './district-client.js';
import { telegramBotClient } from './telegram-bot-client.js';
import { telegramGroupClient } from './telegram-group-client.js';
import { hokimAccountClient } from './hokim-account-client.js';
import { useDistrict } from './district-context.js';
import { ApiError } from '../lib/api-client.js';
/* ── Standardized Cache Keys ── */
export const districtQueryKeys = {
    all: ['district'],
    list: () => ['districts'],
    district: (id) => ['district', id],
    details: (id) => ['district', id, 'details'],
    readiness: (id) => ['district', id, 'readiness'],
    bot: (id) => ['district', id, 'telegram-bot'],
    groups: (id) => ['district', id, 'telegram-groups'],
    hokim: (id) => ['district', id, 'hokim-account'],
};
/* ── Deep Facade Hook Implementation ── */
export function useDistrictWorkspace(optionsOrDistrictId) {
    const queryClient = useQueryClient();
    const districtContext = useDistrict();
    const options = typeof optionsOrDistrictId === 'string' || optionsOrDistrictId === null
        ? { districtId: optionsOrDistrictId }
        : optionsOrDistrictId ?? {};
    const districtId = options.districtId !== undefined ? options.districtId : districtContext.activeDistrictId;
    const includeDetails = options.includeDetails ?? true;
    const includeReadiness = options.includeReadiness ?? true;
    const includeBot = options.includeBot ?? true;
    const includeGroups = options.includeGroups ?? true;
    const includeHokim = options.includeHokim ?? true;
    const isEnabled = Boolean(districtId);
    /* ── 1. Sub-Resource Queries ── */
    const detailsQuery = useQuery({
        queryKey: districtQueryKeys.details(districtId),
        queryFn: async () => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            const res = await districtClient.getDistrict(districtId);
            return res.district;
        },
        enabled: isEnabled && includeDetails,
    });
    const readinessQuery = useQuery({
        queryKey: districtQueryKeys.readiness(districtId),
        queryFn: async () => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            const res = await districtClient.getDistrictReadiness(districtId);
            return res.readiness;
        },
        enabled: isEnabled && includeReadiness,
    });
    const botQuery = useQuery({
        queryKey: districtQueryKeys.bot(districtId),
        queryFn: async () => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            const res = await telegramBotClient.getDistrictTelegramBot(districtId);
            return res.bot;
        },
        enabled: isEnabled && includeBot,
    });
    const groupsQuery = useQuery({
        queryKey: districtQueryKeys.groups(districtId),
        queryFn: async () => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            const res = await telegramGroupClient.listGroups(districtId);
            return res.groups;
        },
        enabled: isEnabled && includeGroups,
    });
    const hokimQuery = useQuery({
        queryKey: districtQueryKeys.hokim(districtId),
        queryFn: async () => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return hokimAccountClient.getDistrictHokimAccount(districtId);
        },
        enabled: isEnabled && includeHokim,
    });
    /* ── 2. Cache Invalidation Helpers ── */
    const invalidateReadiness = useCallback(async () => {
        if (!districtId)
            return;
        await queryClient.invalidateQueries({
            queryKey: districtQueryKeys.readiness(districtId),
        });
    }, [queryClient, districtId]);
    const invalidateWorkspace = useCallback(async () => {
        if (!districtId)
            return;
        await Promise.all([
            queryClient.invalidateQueries({ queryKey: districtQueryKeys.details(districtId) }),
            queryClient.invalidateQueries({ queryKey: districtQueryKeys.readiness(districtId) }),
            queryClient.invalidateQueries({ queryKey: districtQueryKeys.bot(districtId) }),
            queryClient.invalidateQueries({ queryKey: districtQueryKeys.groups(districtId) }),
            queryClient.invalidateQueries({ queryKey: districtQueryKeys.hokim(districtId) }),
        ]);
    }, [queryClient, districtId]);
    /* ── 3. Action Mutations with Automatic Invalidation ── */
    const confirmDisclosureMutation = useMutation({
        mutationFn: async () => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return districtClient.confirmDisclosure(districtId);
        },
        onSuccess: async () => {
            await invalidateReadiness();
        },
    });
    const activateDistrictMutation = useMutation({
        mutationFn: async () => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return districtClient.activateDistrict(districtId);
        },
        onSuccess: async (data) => {
            if (districtId) {
                queryClient.setQueryData(districtQueryKeys.details(districtId), data.district);
                queryClient.setQueryData(districtQueryKeys.district(districtId), { district: data.district });
                await Promise.all([
                    invalidateReadiness(),
                    queryClient.invalidateQueries({ queryKey: districtQueryKeys.list() }),
                ]);
            }
        },
        onError: async (err) => {
            if (err instanceof ApiError && err.code === 'DISTRICT_ALREADY_ACTIVE' && districtId) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: districtQueryKeys.district(districtId) }),
                    invalidateReadiness(),
                    queryClient.invalidateQueries({ queryKey: districtQueryKeys.list() }),
                ]);
            }
        },
    });
    const connectBotMutation = useMutation({
        mutationFn: async (token) => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return telegramBotClient.connectDistrictTelegramBot(districtId, { token });
        },
        onSuccess: async () => {
            if (districtId) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: districtQueryKeys.bot(districtId) }),
                    invalidateReadiness(),
                ]);
            }
        },
    });
    const disconnectBotMutation = useMutation({
        mutationFn: async () => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return telegramBotClient.disconnectDistrictTelegramBot(districtId);
        },
        onSuccess: async () => {
            if (districtId) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: districtQueryKeys.bot(districtId) }),
                    invalidateReadiness(),
                ]);
            }
        },
    });
    const createGroupMutation = useMutation({
        mutationFn: async (payload) => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return telegramGroupClient.createGroup(districtId, payload);
        },
        onSuccess: async () => {
            if (districtId) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: districtQueryKeys.groups(districtId) }),
                    invalidateReadiness(),
                ]);
            }
        },
    });
    const updateGroupMutation = useMutation({
        mutationFn: async ({ groupId, payload }) => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return telegramGroupClient.updateGroup(districtId, groupId, payload);
        },
        onSuccess: async () => {
            if (districtId) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: districtQueryKeys.groups(districtId) }),
                    invalidateReadiness(),
                ]);
            }
        },
    });
    const deleteGroupMutation = useMutation({
        mutationFn: async (groupId) => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return telegramGroupClient.deleteGroup(districtId, groupId);
        },
        onSuccess: async () => {
            if (districtId) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: districtQueryKeys.groups(districtId) }),
                    invalidateReadiness(),
                ]);
            }
        },
    });
    const startGroupTestMutation = useMutation({
        mutationFn: async (groupId) => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return telegramGroupClient.startTest(districtId, groupId);
        },
        onSuccess: async () => {
            if (districtId) {
                await queryClient.invalidateQueries({ queryKey: districtQueryKeys.groups(districtId) });
            }
        },
    });
    const simulateGroupMessageMutation = useMutation({
        mutationFn: async ({ groupId, payload }) => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return telegramGroupClient.simulateTestMessage(districtId, groupId, payload);
        },
        onSuccess: async () => {
            if (districtId) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: districtQueryKeys.groups(districtId) }),
                    invalidateReadiness(),
                ]);
            }
        },
    });
    const createHokimMutation = useMutation({
        mutationFn: async (username) => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return hokimAccountClient.createDistrictHokimAccount(districtId, { username });
        },
        onSuccess: async () => {
            if (districtId) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: districtQueryKeys.hokim(districtId) }),
                    invalidateReadiness(),
                ]);
            }
        },
    });
    const resetHokimPasswordMutation = useMutation({
        mutationFn: async () => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return hokimAccountClient.resetDistrictHokimPassword(districtId);
        },
        onSuccess: async () => {
            if (districtId) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: districtQueryKeys.hokim(districtId) }),
                    invalidateReadiness(),
                ]);
            }
        },
    });
    const disableHokimMutation = useMutation({
        mutationFn: async () => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return hokimAccountClient.disableDistrictHokimAccount(districtId);
        },
        onSuccess: async () => {
            if (districtId) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: districtQueryKeys.hokim(districtId) }),
                    invalidateReadiness(),
                ]);
            }
        },
    });
    const replaceHokimMutation = useMutation({
        mutationFn: async (newUsername) => {
            if (!districtId)
                throw new Error('Туман танланмаган.');
            return hokimAccountClient.replaceDistrictHokimAccount(districtId, { newUsername });
        },
        onSuccess: async () => {
            if (districtId) {
                await Promise.all([
                    queryClient.invalidateQueries({ queryKey: districtQueryKeys.hokim(districtId) }),
                    invalidateReadiness(),
                ]);
            }
        },
    });
    /* ── 4. Derived & Aggregate States ── */
    const readiness = readinessQuery.data ?? null;
    const district = detailsQuery.data ?? null;
    const bot = botQuery.data ?? null;
    const groups = groupsQuery.data ?? [];
    const hokimData = hokimQuery.data;
    const isLoading = (includeDetails && detailsQuery.isLoading) ||
        (includeReadiness && readinessQuery.isLoading) ||
        (includeBot && botQuery.isLoading) ||
        (includeGroups && groupsQuery.isLoading) ||
        (includeHokim && hokimQuery.isLoading);
    const isRefreshing = (includeDetails && detailsQuery.isFetching && !detailsQuery.isLoading) ||
        (includeReadiness && readinessQuery.isFetching && !readinessQuery.isLoading) ||
        (includeBot && botQuery.isFetching && !botQuery.isLoading) ||
        (includeGroups && groupsQuery.isFetching && !groupsQuery.isLoading) ||
        (includeHokim && hokimQuery.isFetching && !hokimQuery.isLoading);
    const isError = (includeDetails && detailsQuery.isError) ||
        (includeReadiness && readinessQuery.isError) ||
        (includeBot && botQuery.isError) ||
        (includeGroups && groupsQuery.isError) ||
        (includeHokim && hokimQuery.isError);
    const isAlreadyActive = readiness?.status === 'ACTIVE' || district?.status === 'ACTIVE';
    const isActivationReady = readiness?.isActivationReady ?? false;
    const passedCount = readiness?.passedCount ?? 0;
    const totalCount = readiness?.totalCount ?? 8;
    const refetchAll = useCallback(async () => {
        const promises = [];
        if (includeDetails)
            promises.push(detailsQuery.refetch());
        if (includeReadiness)
            promises.push(readinessQuery.refetch());
        if (includeBot)
            promises.push(botQuery.refetch());
        if (includeGroups)
            promises.push(groupsQuery.refetch());
        if (includeHokim)
            promises.push(hokimQuery.refetch());
        await Promise.all(promises);
    }, [includeDetails, includeReadiness, includeBot, includeGroups, includeHokim, detailsQuery, readinessQuery, botQuery, groupsQuery, hokimQuery]);
    return {
        districtId,
        district,
        readiness,
        bot,
        groups,
        hokimState: hokimData?.state ?? 'NO_ACCOUNT',
        hokimAccount: hokimData?.account ?? null,
        isLoading,
        isRefreshing,
        isError,
        isActivationReady,
        isAlreadyActive,
        passedCount,
        totalCount,
        isActivating: activateDistrictMutation.isPending,
        activationError: activateDistrictMutation.error,
        isConfirmingDisclosure: confirmDisclosureMutation.isPending,
        isConnectingBot: connectBotMutation.isPending,
        isDisconnectingBot: disconnectBotMutation.isPending,
        isCreatingGroup: createGroupMutation.isPending,
        isUpdatingGroup: updateGroupMutation.isPending,
        isDeletingGroup: deleteGroupMutation.isPending,
        isStartingGroupTest: startGroupTestMutation.isPending,
        isSimulatingGroupMessage: simulateGroupMessageMutation.isPending,
        isCreatingHokim: createHokimMutation.isPending,
        isResettingHokimPassword: resetHokimPasswordMutation.isPending,
        isDisablingHokim: disableHokimMutation.isPending,
        isReplacingHokim: replaceHokimMutation.isPending,
        confirmDisclosure: confirmDisclosureMutation.mutateAsync,
        activateDistrict: activateDistrictMutation.mutateAsync,
        connectBot: (token) => connectBotMutation.mutateAsync(token),
        disconnectBot: () => disconnectBotMutation.mutateAsync(),
        createGroup: (payload) => createGroupMutation.mutateAsync(payload),
        updateGroup: (groupId, payload) => updateGroupMutation.mutateAsync({ groupId, payload }),
        deleteGroup: (groupId) => deleteGroupMutation.mutateAsync(groupId),
        startGroupTest: (groupId) => startGroupTestMutation.mutateAsync(groupId),
        simulateGroupMessage: (groupId, payload) => simulateGroupMessageMutation.mutateAsync({ groupId, payload }),
        createHokimAccount: (username) => createHokimMutation.mutateAsync(username),
        resetHokimPassword: () => resetHokimPasswordMutation.mutateAsync(),
        disableHokimAccount: () => disableHokimMutation.mutateAsync(),
        replaceHokimAccount: (newUsername) => replaceHokimMutation.mutateAsync(newUsername),
        invalidateReadiness,
        invalidateWorkspace,
        refetchAll,
    };
}
