import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  TopicCardItem,
  TopicEvidenceItem,
  TopicEvidenceResponse,
} from '@mahalla-ovozi/api-contracts';
import { hokimTopicsClient } from './hokim-topics-client.js';
import { useAuth } from '../auth/auth-context.js';

export interface UseTopicEvidenceResult {
  topic: TopicCardItem | null;
  anchorQuote: string;
  anchorEvidenceId: string;
  evidenceList: TopicEvidenceItem[];
  totalCount: number;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  hasNextPage: boolean;
  fetchNextPage: () => Promise<unknown>;
  refetch: () => Promise<unknown>;
}

export function useTopicEvidence(topicId: string | null | undefined): UseTopicEvidenceResult {
  const { actor } = useAuth();
  const districtId = actor?.districtId || '';

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
    retry: false,
    placeholderData: undefined, // Strictly omit keepPreviousData to prevent ghost evidence cache during topic switching (AC 7)
  });

  const firstPage = data?.pages[0];

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

    return list;
  }, [data?.pages]);

  return {
    topic: firstPage?.topic ?? null,
    anchorQuote: firstPage?.anchorQuote ?? '',
    anchorEvidenceId: firstPage?.anchorEvidenceId ?? '',
    evidenceList,
    totalCount: firstPage?.totalCount ?? 0,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage: Boolean(hasNextPage),
    fetchNextPage,
    refetch,
  };
}
