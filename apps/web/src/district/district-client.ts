import {
  CreateDistrictRequest,
  CreateDistrictResponse,
  ListDistrictsResponse,
  GetDistrictResponse,
  CreateDistrictResponseSchema,
  ListDistrictsResponseSchema,
  GetDistrictResponseSchema,
} from '@mahalla-ovozi/api-contracts';
import { request } from '../lib/api-client.js';

export const districtClient = {
  listDistricts(): Promise<ListDistrictsResponse> {
    return request<ListDistrictsResponse>(
      '/api/v1/districts',
      {
        method: 'GET',
      },
      ListDistrictsResponseSchema
    );
  },

  createDistrict(payload: CreateDistrictRequest): Promise<CreateDistrictResponse> {
    return request<CreateDistrictResponse>(
      '/api/v1/districts',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      CreateDistrictResponseSchema
    );
  },

  getDistrict(districtId: string): Promise<GetDistrictResponse> {
    return request<GetDistrictResponse>(
      `/api/v1/districts/${districtId}`,
      {
        method: 'GET',
      },
      GetDistrictResponseSchema
    );
  },
};
