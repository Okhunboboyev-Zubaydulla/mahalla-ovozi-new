import {
  OperationalIssuesListResponse,
  OperationalIssuesListResponseSchema,
  OperationalIssueDetailResponse,
  OperationalIssueDetailResponseSchema,
} from '@mahalla-ovozi/api-contracts';
import { request } from '../lib/api-client.js';

export interface GetIssuesParams {
  districtId?: string | null;
  status?: string;
  severity?: string;
}

export const issuesClient = {
  /**
   * Fetches operational issues with optional filters (Story 4.2 AC 1, AC 4).
   */
  getOperationalIssues(
    params: GetIssuesParams = {},
  ): Promise<OperationalIssuesListResponse> {
    const query = new URLSearchParams();
    if (params.districtId) {
      query.set('districtId', params.districtId);
    }
    if (params.status) {
      query.set('status', params.status);
    }
    if (params.severity) {
      query.set('severity', params.severity);
    }

    const queryString = query.toString();
    const url = queryString
      ? `/api/v1/issues?${queryString}`
      : '/api/v1/issues';

    return request<OperationalIssuesListResponse>(
      url,
      { method: 'GET' },
      OperationalIssuesListResponseSchema,
    );
  },

  /**
   * Fetches detailed issue diagnosis and audit event timeline (Story 4.2 AC 5).
   */
  getOperationalIssueDetail(
    issueId: string,
  ): Promise<OperationalIssueDetailResponse> {
    return request<OperationalIssueDetailResponse>(
      `/api/v1/issues/${encodeURIComponent(issueId)}`,
      { method: 'GET' },
      OperationalIssueDetailResponseSchema,
    );
  },
};
