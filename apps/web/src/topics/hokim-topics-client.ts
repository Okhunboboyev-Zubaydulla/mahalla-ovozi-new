import {
  HokimTopicBoardResponse,
  HokimTopicBoardResponseSchema,
  HokimLaneQuery,
  HokimLaneResponse,
  HokimLaneResponseSchema,
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
};
