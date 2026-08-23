import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  QualifyingLane,
  TopicCardItem,
  HokimLaneBoardData,
} from '@mahalla-ovozi/api-contracts';
import { hokimTopicsClient } from './hokim-topics-client.js';
import { useAuth } from '../auth/auth-context.js';

export interface LaneLocalState extends HokimLaneBoardData {
  isLoadingMore: boolean;
  loadMoreError: string | null;
}

export function useHokimTopicBoard(calendarDayOverride?: string) {
  const { actor } = useAuth();
  const districtId = actor?.districtId || '';

  const queryKey = ['hokim-board', districtId, calendarDayOverride || 'today'];

  const boardQuery = useQuery({
    queryKey,
    queryFn: () => hokimTopicsClient.getTodayBoard(calendarDayOverride),
    enabled: Boolean(districtId && actor?.role === 'DISTRICT_HOKIM'),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const [lanesState, setLanesState] = useState<Record<QualifyingLane, LaneLocalState>>({
    HOKIM_RELATED: { lane: 'HOKIM_RELATED', topics: [], totalCount: 0, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
    WATER: { lane: 'WATER', topics: [], totalCount: 0, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
    ELECTRICITY: { lane: 'ELECTRICITY', topics: [], totalCount: 0, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
    GAS: { lane: 'GAS', topics: [], totalCount: 0, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
    WASTE: { lane: 'WASTE', topics: [], totalCount: 0, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
  });

  // Synchronize when fresh board data is loaded
  useEffect(() => {
    if (boardQuery.data?.lanes) {
      const newLanes: Record<QualifyingLane, LaneLocalState> = {} as Record<QualifyingLane, LaneLocalState>;
      const keys = Object.keys(boardQuery.data.lanes) as QualifyingLane[];
      for (const k of keys) {
        const laneData = boardQuery.data.lanes[k];
        if (laneData) {
          newLanes[k] = {
            lane: k,
            topics: laneData.topics,
            totalCount: laneData.totalCount,
            nextCursor: laneData.nextCursor,
            hasNextPage: laneData.hasNextPage,
            isLoadingMore: false,
            loadMoreError: null,
          };
        }
      }
      setLanesState(newLanes);
    }
  }, [boardQuery.data]);

  const loadMore = useCallback(
    async (lane: QualifyingLane) => {
      const currentLane = lanesState[lane];
      if (!currentLane || !currentLane.hasNextPage || !currentLane.nextCursor || currentLane.isLoadingMore) {
        return;
      }

      setLanesState((prev) => ({
        ...prev,
        [lane]: {
          ...prev[lane],
          isLoadingMore: true,
          loadMoreError: null,
        },
      }));

      try {
        const response = await hokimTopicsClient.getLaneBatch({
          lane,
          limit: 20,
          calendarDay: boardQuery.data?.calendarDay,
          cursor: currentLane.nextCursor,
          baselineTimestamp: boardQuery.data?.visitBaselineTimestamp ?? undefined,
        });

        setLanesState((prev) => {
          const prevLane = prev[lane];
          // Deduplicate by ID
          const existingIds = new Set(prevLane.topics.map((t) => t.id));
          const newTopics: TopicCardItem[] = [...prevLane.topics];
          for (const item of response.topics) {
            if (!existingIds.has(item.id)) {
              newTopics.push(item);
              existingIds.add(item.id);
            }
          }

          return {
            ...prev,
            [lane]: {
              ...prevLane,
              topics: newTopics,
              nextCursor: response.nextCursor,
              hasNextPage: response.hasNextPage,
              isLoadingMore: false,
              loadMoreError: null,
            },
          };
        });
      } catch (err: unknown) {
        const errorMessage =
          err instanceof Error ? err.message : 'Юклаб бўлмади. Қайта уриниш.';
        setLanesState((prev) => ({
          ...prev,
          [lane]: {
            ...prev[lane],
            isLoadingMore: false,
            loadMoreError: errorMessage || 'Юклаб бўлмади. Қайта уриниш.',
          },
        }));
      }
    },
    [lanesState, boardQuery.data],
  );

  return {
    board: boardQuery.data,
    isLoading: boardQuery.isLoading,
    isError: boardQuery.isError,
    error: boardQuery.error,
    refetch: boardQuery.refetch,
    lanes: lanesState,
    loadMore,
  };
}
