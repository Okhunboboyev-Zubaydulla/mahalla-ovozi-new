import {
  HokimTopicBoardResponse,
  HokimTopicBoardResponseSchema,
  HokimLaneQuery,
  HokimLaneResponse,
  HokimLaneResponseSchema,
  TopicEvidenceQuery,
  TopicEvidenceResponse,
  TopicEvidenceResponseSchema,
} from '@mahalla-ovozi/api-contracts';
import { request } from '../lib/api-client.js';

export const hokimTopicsClient = {
  getTodayBoard(calendarDay?: string): Promise<HokimTopicBoardResponse> {
    const searchParams = new URLSearchParams();
    if (calendarDay) {
      searchParams.set('calendarDay', calendarDay);
    }
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

    return request<HokimTopicBoardResponse>(
      `/api/v1/hokim/topics/board${queryString}`,
      {
        method: 'GET',
      },
      HokimTopicBoardResponseSchema,
    );
  },

  getLaneBatch(params: HokimLaneQuery): Promise<HokimLaneResponse> {
    const searchParams = new URLSearchParams();
    searchParams.set('lane', params.lane);
    if (params.calendarDay) {
      searchParams.set('calendarDay', params.calendarDay);
    }
    if (params.cursor) {
      searchParams.set('cursor', params.cursor);
    }
    if (params.limit) {
      searchParams.set('limit', String(params.limit));
    }
    if (params.baselineTimestamp) {
      searchParams.set('baselineTimestamp', params.baselineTimestamp);
    }

    return request<HokimLaneResponse>(
      `/api/v1/hokim/topics/lane?${searchParams.toString()}`,
      {
        method: 'GET',
      },
      HokimLaneResponseSchema,
    );
  },

  getTopicEvidence(
    topicId: string,
    query?: TopicEvidenceQuery,
    signal?: AbortSignal,
  ): Promise<TopicEvidenceResponse> {
    const searchParams = new URLSearchParams();
    if (query?.cursor) {
      searchParams.set('cursor', query.cursor);
    }
    if (query?.limit) {
      searchParams.set('limit', String(query.limit));
    }
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

    return request<TopicEvidenceResponse>(
      `/api/v1/hokim/topics/${encodeURIComponent(topicId)}/evidence${queryString}`,
      {
        method: 'GET',
        signal,
      },
      TopicEvidenceResponseSchema,
    );
  },
};
