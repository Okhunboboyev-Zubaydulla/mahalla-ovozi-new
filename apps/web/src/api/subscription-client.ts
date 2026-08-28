import {
  ListDistrictSubscriptionsResponse,
  ListDistrictSubscriptionsResponseSchema,
  GetDistrictSubscriptionResponse,
  GetDistrictSubscriptionResponseSchema,
  UpdateDistrictSubscriptionRequest,
  UpdateDistrictSubscriptionResponse,
  UpdateDistrictSubscriptionResponseSchema,
  StartGraceRequest,
  StartGraceResponse,
  StartGraceResponseSchema,
  RestoreActiveRequest,
  RestoreActiveResponse,
  RestoreActiveResponseSchema,
} from '@mahalla-ovozi/api-contracts';
import { request } from '../lib/api-client.js';

export const subscriptionClient = {
  listDistrictSubscriptions(): Promise<ListDistrictSubscriptionsResponse> {
    return request<ListDistrictSubscriptionsResponse>(
      '/api/v1/subscriptions',
      {
        method: 'GET',
      },
      ListDistrictSubscriptionsResponseSchema,
    );
  },

  getDistrictSubscription(districtId: string): Promise<GetDistrictSubscriptionResponse> {
    return request<GetDistrictSubscriptionResponse>(
      `/api/v1/districts/${encodeURIComponent(districtId)}/subscription`,
      {
        method: 'GET',
      },
      GetDistrictSubscriptionResponseSchema,
    );
  },

  updateDistrictSubscription(
    districtId: string,
    payload: UpdateDistrictSubscriptionRequest,
  ): Promise<UpdateDistrictSubscriptionResponse> {
    return request<UpdateDistrictSubscriptionResponse>(
      `/api/v1/districts/${encodeURIComponent(districtId)}/subscription`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
      UpdateDistrictSubscriptionResponseSchema,
    );
  },

  startDistrictGrace(
    districtId: string,
    payload?: StartGraceRequest,
  ): Promise<StartGraceResponse> {
    return request<StartGraceResponse>(
      `/api/v1/districts/${encodeURIComponent(districtId)}/subscription/start-grace`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      },
      StartGraceResponseSchema,
    );
  },

  restoreDistrictActive(
    districtId: string,
    payload?: RestoreActiveRequest,
  ): Promise<RestoreActiveResponse> {
    return request<RestoreActiveResponse>(
      `/api/v1/districts/${encodeURIComponent(districtId)}/subscription/restore-active`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      },
      RestoreActiveResponseSchema,
    );
  },
};
