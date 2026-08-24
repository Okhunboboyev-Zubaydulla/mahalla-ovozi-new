import { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  QualifyingLane,
  TopicCardItem,
  HokimLaneBoardData,
} from '@mahalla-ovozi/api-contracts';
import { hokimTopicsClient } from './hokim-topics-client.js';
import { useAuth } from '../auth/auth-context.js';
import { LiveAnnouncerContext } from '../hooks/useLiveAnnouncer.js';

export interface LaneLocalState extends HokimLaneBoardData {
  bufferedNewTopics: TopicCardItem[];
  newItemsCount: number;
  isLoadingMore: boolean;
  loadMoreError: string | null;
}

const CANONICAL_LANES: QualifyingLane[] = [
  'HOKIM_RELATED',
  'WATER',
  'ELECTRICITY',
  'GAS',
  'WASTE',
];

export function useHokimTopicBoard(calendarDayOverride?: string) {
  const { actor } = useAuth();
  const districtId = actor?.districtId || '';
  const liveAnnouncer = useContext(LiveAnnouncerContext);
  const liveAnnouncerRef = useRef(liveAnnouncer);
  liveAnnouncerRef.current = liveAnnouncer;

  const baselineTimestampRef = useRef<string | null>(null);
  const isInitialLoadRef = useRef<boolean>(true);
  const previousKnownTopicIdsRef = useRef<Set<string>>(new Set());
  const previousTopicTimestampsRef = useRef<Map<string, string>>(new Map());

  // Reset baseline and known topic tracking when scope changes
  const prevScopeKeyRef = useRef<string>(`${districtId}:${calendarDayOverride || 'today'}`);
  const currentScopeKey = `${districtId}:${calendarDayOverride || 'today'}`;
  if (prevScopeKeyRef.current !== currentScopeKey) {
    prevScopeKeyRef.current = currentScopeKey;
    isInitialLoadRef.current = true;
    baselineTimestampRef.current = null;
    previousKnownTopicIdsRef.current.clear();
    previousTopicTimestampsRef.current.clear();
  }

  const queryKey = ['hokim-board', districtId, calendarDayOverride || 'today'];

  const boardQuery = useQuery({
    queryKey,
    queryFn: ({ signal }) =>
      hokimTopicsClient.getTodayBoard(
        {
          calendarDay: calendarDayOverride,
          baselineTimestamp: baselineTimestampRef.current ?? undefined,
        },
        signal,
      ),
    enabled: Boolean(districtId && actor?.role === 'DISTRICT_HOKIM'),
    staleTime: 5 * 60 * 1000,
    networkMode: 'online',
    retry: false,
  });

  const [lanesState, setLanesState] = useState<Record<QualifyingLane, LaneLocalState>>({
    HOKIM_RELATED: {
      lane: 'HOKIM_RELATED',
      topics: [],
      bufferedNewTopics: [],
      newItemsCount: 0,
      totalCount: 0,
      nextCursor: null,
      hasNextPage: false,
      isLoadingMore: false,
      loadMoreError: null,
    },
    WATER: {
      lane: 'WATER',
      topics: [],
      bufferedNewTopics: [],
      newItemsCount: 0,
      totalCount: 0,
      nextCursor: null,
      hasNextPage: false,
      isLoadingMore: false,
      loadMoreError: null,
    },
    ELECTRICITY: {
      lane: 'ELECTRICITY',
      topics: [],
      bufferedNewTopics: [],
      newItemsCount: 0,
      totalCount: 0,
      nextCursor: null,
      hasNextPage: false,
      isLoadingMore: false,
      loadMoreError: null,
    },
    GAS: {
      lane: 'GAS',
      topics: [],
      bufferedNewTopics: [],
      newItemsCount: 0,
      totalCount: 0,
      nextCursor: null,
      hasNextPage: false,
      isLoadingMore: false,
      loadMoreError: null,
    },
    WASTE: {
      lane: 'WASTE',
      topics: [],
      bufferedNewTopics: [],
      newItemsCount: 0,
      totalCount: 0,
      nextCursor: null,
      hasNextPage: false,
      isLoadingMore: false,
      loadMoreError: null,
    },
  });

  const lanesStateRef = useRef(lanesState);
  lanesStateRef.current = lanesState;

  // Reconcile board data on initial load and subsequent background/manual refreshes (AC 1, 2, 3, 4)
  useEffect(() => {
    if (!boardQuery.data?.lanes) {
      return;
    }

    const incomingLanes = boardQuery.data.lanes;

    if (isInitialLoadRef.current) {
      // 1. Initial Cold Load: Establish baseline and populate lanes directly
      isInitialLoadRef.current = false;
      baselineTimestampRef.current = boardQuery.data.currentVisitTimestamp;

      const newLanes: Record<QualifyingLane, LaneLocalState> = {} as Record<QualifyingLane, LaneLocalState>;
      const initialIds = new Set<string>();
      const initialTimestamps = new Map<string, string>();

      for (const k of CANONICAL_LANES) {
        const laneData = incomingLanes[k];
        const topics = laneData?.topics || [];
        for (const t of topics) {
          initialIds.add(t.id);
          initialTimestamps.set(t.id, t.updatedAt);
        }

        newLanes[k] = {
          lane: k,
          topics,
          bufferedNewTopics: [],
          newItemsCount: 0,
          totalCount: laneData?.totalCount || 0,
          nextCursor: laneData?.nextCursor ?? null,
          hasNextPage: Boolean(laneData?.hasNextPage),
          isLoadingMore: false,
          loadMoreError: null,
        };
      }

      previousKnownTopicIdsRef.current = initialIds;
      previousTopicTimestampsRef.current = initialTimestamps;
      setLanesState(newLanes);
    } else {
      // 2. In-Session Reconciliation: Preserve existing card positions & pagination batches, buffer new cards
      const newCanonicalTopicIds = new Set<string>();
      const updatedCanonicalTopicIds = new Set<string>();
      const currentKnownIds = previousKnownTopicIdsRef.current;
      const currentTimestamps = previousTopicTimestampsRef.current;
      const prevLanes = lanesStateRef.current;

      const updatedLanes: Record<QualifyingLane, LaneLocalState> = {} as Record<QualifyingLane, LaneLocalState>;

      for (const k of CANONICAL_LANES) {
        const prevLane = prevLanes[k];
        const incomingLane = incomingLanes[k];
        if (!incomingLane) {
          updatedLanes[k] = prevLane;
          continue;
        }

        // Build map of incoming topics by ID for this lane
        const incomingMap = new Map<string, TopicCardItem>();
        for (const item of incomingLane.topics) {
          incomingMap.set(item.id, item);
        }

        // Reconcile existing visible topics in-place (preserving exact indices & pagination pages)
        const existingVisibleIds = new Set<string>();
        const reconciledTopics: TopicCardItem[] = prevLane.topics.map((existingItem) => {
          existingVisibleIds.add(existingItem.id);
          const freshItem = incomingMap.get(existingItem.id);
          if (freshItem) {
            // Check if updated
            const prevTs = currentTimestamps.get(existingItem.id);
            if (freshItem.isUpdated || (prevTs && freshItem.updatedAt !== prevTs)) {
              updatedCanonicalTopicIds.add(existingItem.id);
            }
            return { ...existingItem, ...freshItem };
          }
          return existingItem;
        });

        // Identify newly incoming topics for this lane
        const existingBufferedIds = new Set(prevLane.bufferedNewTopics.map((b) => b.id));
        const newBufferedItems: TopicCardItem[] = [...prevLane.bufferedNewTopics];

        for (const item of incomingLane.topics) {
          if (!existingVisibleIds.has(item.id)) {
            // Not visible on screen
            if (!currentKnownIds.has(item.id)) {
              newCanonicalTopicIds.add(item.id);
            }
            if (!existingBufferedIds.has(item.id)) {
              newBufferedItems.push(item);
              existingBufferedIds.add(item.id);
            } else {
              // Update in buffer in-place
              const idx = newBufferedItems.findIndex((b) => b.id === item.id);
              if (idx !== -1) {
                newBufferedItems[idx] = { ...newBufferedItems[idx], ...item };
              }
            }
          }
        }

        updatedLanes[k] = {
          ...prevLane,
          topics: reconciledTopics,
          bufferedNewTopics: newBufferedItems,
          newItemsCount: newBufferedItems.length,
          totalCount: incomingLane.totalCount,
          // Keep existing nextCursor/hasNextPage unless not paginated yet
          nextCursor: prevLane.nextCursor ?? incomingLane.nextCursor,
          hasNextPage: prevLane.hasNextPage || incomingLane.hasNextPage,
        };
      }

      setLanesState(updatedLanes);

      // Deduplicate: remove any ID from updated if it is newly added (AC 4)
      for (const id of newCanonicalTopicIds) {
        updatedCanonicalTopicIds.delete(id);
      }

      // Emit atomic polite screen reader announcement if changes occurred (AC 4)
      const newCount = newCanonicalTopicIds.size;
      const updatedCount = updatedCanonicalTopicIds.size;
      if (newCount > 0 || updatedCount > 0) {
        liveAnnouncerRef.current?.announceTopicUpdate(newCount, updatedCount);
      }

      // Update known IDs and timestamps for subsequent diffs
      for (const id of newCanonicalTopicIds) {
        currentKnownIds.add(id);
      }
      for (const k of CANONICAL_LANES) {
        const lane = incomingLanes[k];
        if (lane?.topics) {
          for (const t of lane.topics) {
            currentTimestamps.set(t.id, t.updatedAt);
          }
        }
      }
    }
  }, [boardQuery.data]);

  // Reveal buffered new topics for a specific lane (AC 3)
  const revealNewTopics = useCallback((lane: QualifyingLane) => {
    setLanesState((prev) => {
      const targetLane = prev[lane];
      if (!targetLane || targetLane.bufferedNewTopics.length === 0) {
        return prev;
      }

      const existingIds = new Set(targetLane.topics.map((t) => t.id));
      const itemsToPrepend: TopicCardItem[] = [];

      for (const item of targetLane.bufferedNewTopics) {
        if (!existingIds.has(item.id)) {
          itemsToPrepend.push(item);
          existingIds.add(item.id);
        }
      }

      return {
        ...prev,
        [lane]: {
          ...targetLane,
          topics: [...itemsToPrepend, ...targetLane.topics],
          bufferedNewTopics: [],
          newItemsCount: 0,
        },
      };
    });
  }, []);

  const loadMore = useCallback(
    async (lane: QualifyingLane) => {
      const currentLane = lanesState[lane];
      if (
        !currentLane ||
        !currentLane.hasNextPage ||
        !currentLane.nextCursor ||
        currentLane.isLoadingMore
      ) {
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
          baselineTimestamp: baselineTimestampRef.current ?? undefined,
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
              previousKnownTopicIdsRef.current.add(item.id);
              previousTopicTimestampsRef.current.set(item.id, item.updatedAt);
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

  const manualRefresh = useCallback(async () => {
    await boardQuery.refetch();
  }, [boardQuery]);

  const newTopicsPerLane: Record<QualifyingLane, number> = {
    HOKIM_RELATED: lanesState.HOKIM_RELATED.newItemsCount,
    WATER: lanesState.WATER.newItemsCount,
    ELECTRICITY: lanesState.ELECTRICITY.newItemsCount,
    GAS: lanesState.GAS.newItemsCount,
    WASTE: lanesState.WASTE.newItemsCount,
  };

  const isRefreshing = boardQuery.isFetching && !boardQuery.isLoading;

  return {
    board: boardQuery.data,
    isLoading: boardQuery.isLoading,
    isRefreshing,
    isError: boardQuery.isError,
    error: boardQuery.error,
    isStale: boardQuery.isStale,
    lastRefreshedAt: boardQuery.data?.serverEvaluatedAt ?? null,
    hasProcessingDelay: Boolean(boardQuery.data?.hasProcessingDelay),
    newTopicsPerLane,
    lanes: lanesState,
    loadMore,
    revealNewTopics,
    manualRefresh,
    refetch: boardQuery.refetch,
  };
}
