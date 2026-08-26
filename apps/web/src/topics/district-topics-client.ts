import { useQuery, useInfiniteQuery, InfiniteData } from '@tanstack/react-query';
import {
  DistrictTopicsSearchBody,
  DistrictTopicsPageResponse,
  DistrictTopicsPageResponseSchema,
  DistrictMahallasResponse,
  DistrictMahallasResponseSchema,
  TopicEvidenceQuery,
  TopicEvidenceResponse,
  TopicEvidenceResponseSchema,
} from '@mahalla-ovozi/api-contracts';
import { request } from '../lib/api-client.js';

export const districtTopicsClient = {
  async listTopics(
    districtId: string,
    filter: DistrictTopicsSearchBody = {},
    signal?: AbortSignal,
  ): Promise<DistrictTopicsPageResponse> {
    return request<DistrictTopicsPageResponse>(
      `/api/v1/districts/${encodeURIComponent(districtId)}/topics/search`,
      {
        method: 'POST',
        body: JSON.stringify(filter),
        signal,
      },
      DistrictTopicsPageResponseSchema,
    );
  },

  async getTopicEvidence(
    districtId: string,
    topicId: string,
    query: TopicEvidenceQuery = {},
    signal?: AbortSignal,
  ): Promise<TopicEvidenceResponse> {
    const searchParams = new URLSearchParams();
    if (query.cursor) {
      searchParams.set('cursor', query.cursor);
    }
    if (query.limit) {
      searchParams.set('limit', String(query.limit));
    }
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

    return request<TopicEvidenceResponse>(
      `/api/v1/districts/${encodeURIComponent(districtId)}/topics/${encodeURIComponent(topicId)}/evidence${queryString}`,
      {
        method: 'GET',
        signal,
      },
      TopicEvidenceResponseSchema,
    );
  },

  async listMahallas(
    districtId: string,
    signal?: AbortSignal,
  ): Promise<DistrictMahallasResponse> {
    return request<DistrictMahallasResponse>(
      `/api/v1/districts/${encodeURIComponent(districtId)}/topics/mahallas`,
      {
        method: 'GET',
        signal,
      },
      DistrictMahallasResponseSchema,
    );
  },
};

export function useDistrictTopics(
  districtId: string | null,
  filter: DistrictTopicsSearchBody = {},
) {
  return useInfiniteQuery<
    DistrictTopicsPageResponse,
    Error,
    InfiniteData<DistrictTopicsPageResponse>,
    (string | DistrictTopicsSearchBody | null)[],
    string | undefined
  >({
    queryKey: ['district-topics', districtId, filter],
    queryFn: ({ pageParam, signal }) =>
      districtTopicsClient.listTopics(
        districtId!,
        { ...filter, cursor: pageParam },
        signal,
      ),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    placeholderData: undefined,
    enabled: Boolean(districtId),
    staleTime: 15_000,
  });
}

export function useDistrictTopicEvidence(
  districtId: string | null,
  topicId: string | null,
) {
  return useInfiniteQuery<
    TopicEvidenceResponse,
    Error,
    InfiniteData<TopicEvidenceResponse>,
    (string | null)[],
    string | undefined
  >({
    queryKey: ['district-topic-evidence', districtId, topicId],
    queryFn: ({ pageParam, signal }) =>
      districtTopicsClient.getTopicEvidence(
        districtId!,
        topicId!,
        { cursor: pageParam },
        signal,
      ),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) =>
      lastPage.hasNextPage && lastPage.nextCursor ? lastPage.nextCursor : undefined,
    placeholderData: undefined,
    enabled: Boolean(districtId && topicId),
    staleTime: 15_000,
  });
}

export function useDistrictTopicsMahallas(districtId: string | null) {
  return useQuery<DistrictMahallasResponse, Error>({
    queryKey: ['district-mahallas', districtId],
    queryFn: ({ signal }) => districtTopicsClient.listMahallas(districtId!, signal),
    enabled: Boolean(districtId),
    staleTime: 60_000,
  });
}

export { useDistrictTopicsMahallas as useDistrictMahallas };
