import { useMemo, useEffect, useRef } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import {
  TopicCardItem,
  TopicEvidenceItem,
  TopicEvidenceResponse,
} from '@mahalla-ovozi/api-contracts';
import { hokimTopicsClient } from './hokim-topics-client.js';
import { useAuth } from '../auth/auth-context.js';

export interface UseTopicEvidenceOptions {
  onInvalidated?: () => void;
}

export interface UseTopicEvidenceResult {
  topic: TopicCardItem | null;
  anchorQuote: string;
  anchorEvidenceId: string;
  evidenceList: TopicEvidenceItem[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  isInvalidated: boolean;
  error: unknown;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
}

export function useTopicEvidence(
  topicId: string | null | undefined,
  options?: UseTopicEvidenceOptions,
): UseTopicEvidenceResult {
  const { actor } = useAuth();
  const districtId = actor?.districtId || '';
  const queryClient = useQueryClient();

  const queryKey = ['topic-evidence', districtId, topicId || ''];

  const {
    data,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery<
    TopicEvidenceResponse,
    Error,
    { pages: TopicEvidenceResponse[]; pageParams: (string | undefined)[] },
    string[],
    string | undefined
  >({
    queryKey,
    queryFn: async ({ pageParam, signal }) => {
      if (!topicId) {
        throw new Error('Мавзу идентификатори талаб қилинади.');
      }
      return hokimTopicsClient.getTopicEvidence(
        topicId,
        {
          cursor: pageParam,
          limit: 50,
        },
        signal,
      );
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    enabled: Boolean(districtId && topicId && actor?.role === 'DISTRICT_HOKIM'),
    staleTime: 5 * 60 * 1000,
    networkMode: 'online',
    retry: false,
    placeholderData: undefined, // Strictly omit keepPreviousData to prevent ghost evidence cache during topic switching (AC 7)
  });

  const firstPage = data?.pages[0];

  // Merge newly arrived evidence items and order oldest-to-newest (AC 5)
  const evidenceList = useMemo(() => {
    if (!data?.pages || data.pages.length === 0) {
      return [];
    }

    const seenIds = new Set<string>();
    const list: TopicEvidenceItem[] = [];

    for (const page of data.pages) {
      for (const item of page.evidence) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          list.push(item);
        }
      }
    }

    // Sort chronologically (oldest to newest)
    list.sort((a, b) => {
      const timeA = new Date(a.originalTimestamp).getTime();
      const timeB = new Date(b.originalTimestamp).getTime();
      return timeA - timeB;
    });

    return list;
  }, [data?.pages]);

  // Intercept 404 (Topic deleted/superseded) or auth invalidation (AC 5)
  const isInvalidated = useMemo(() => {
    if (!isError || !error) return false;
    const msg = error instanceof Error ? error.message : String(error);
    return (
      msg.includes('404') ||
      msg.includes('not found') ||
      msg.includes('топилмади') ||
      msg.includes('401') ||
      msg.includes('403')
    );
  }, [isError, error]);

  const onInvalidatedRef = useRef(options?.onInvalidated);
  onInvalidatedRef.current = options?.onInvalidated;

  useEffect(() => {
    if (isInvalidated && topicId) {
      // Purge query cache for this topic and notify caller
      queryClient.removeQueries({ queryKey });
      onInvalidatedRef.current?.();
    }
  }, [isInvalidated, topicId, queryClient]);

  return {
    topic: firstPage?.topic ?? null,
    anchorQuote: firstPage?.anchorQuote ?? '',
    anchorEvidenceId: firstPage?.anchorEvidenceId ?? '',
    evidenceList,
    totalCount: firstPage?.totalCount ?? 0,
    isLoading,
    isError,
    isInvalidated,
    error,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage: Boolean(hasNextPage),
    fetchNextPage,
    refetch,
  };
}
