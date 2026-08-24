import { useMemo } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  QualifyingLane,
  HokimTopicStatisticsResponse,
} from '@mahalla-ovozi/api-contracts';
import { hokimTopicsClient } from './hokim-topics-client.js';
import { useAuth } from '../auth/auth-context.js';
import { DashboardFilterState } from '../hooks/useDashboardFilterParams.js';

const CANONICAL_LANES: QualifyingLane[] = [
  'HOKIM_RELATED',
  'WATER',
  'ELECTRICITY',
  'GAS',
  'WASTE',
];

export interface UseTopicStatisticsResult {
  statistics: HokimTopicStatisticsResponse | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<unknown>;
}

export function useTopicStatistics(
  appliedFilters?: DashboardFilterState | string,
): UseTopicStatisticsResult {
  const { actor } = useAuth();
  const districtId = actor?.districtId || '';

  const filterState: DashboardFilterState = useMemo(() => {
    if (typeof appliedFilters === 'string') {
      return { dateScope: 'today', lanes: CANONICAL_LANES };
    }
    return (
      appliedFilters ?? {
        dateScope: 'today',
        lanes: CANONICAL_LANES,
      }
    );
  }, [appliedFilters]);

  const queryKey = [
    'hokim-statistics',
    districtId,
    filterState.dateScope,
    filterState.dateFrom ?? null,
    filterState.dateTo ?? null,
    filterState.mahallaName ?? null,
    filterState.lanes.join(','),
  ];

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      hokimTopicsClient.getStatistics(
        {
          dateScope: filterState.dateScope,
          dateFrom: filterState.dateFrom,
          dateTo: filterState.dateTo,
          mahallaName: filterState.mahallaName,
          lanes: filterState.lanes,
        },
        signal,
      ),
    enabled: Boolean(districtId && actor?.role === 'DISTRICT_HOKIM'),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    networkMode: 'online',
    retry: false,
  });

  return {
    statistics: data,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  };
}
