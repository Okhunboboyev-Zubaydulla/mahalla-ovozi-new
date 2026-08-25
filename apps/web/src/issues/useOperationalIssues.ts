import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  OperationalIssuesListResponse,
  OperationalIssueDetailResponse,
} from '@mahalla-ovozi/api-contracts';
import { issuesClient, GetIssuesParams } from './issues-client.js';

export const issueKeys = {
  all: ['issues'] as const,
  lists: () => [...issueKeys.all, 'list'] as const,
  list: (params?: GetIssuesParams) =>
    [...issueKeys.lists(), params ?? {}] as const,
  details: () => [...issueKeys.all, 'detail'] as const,
  detail: (id: string) => [...issueKeys.details(), id] as const,
};

/**
 * Custom TanStack Query hook for fetching operational issues list.
 * Features 30s background polling, cache preservation (0px CLS), and online-only error surfacing (Story 4.2 AC 15, AC 16).
 */
export function useOperationalIssues(params?: GetIssuesParams) {
  return useQuery<OperationalIssuesListResponse>({
    queryKey: issueKeys.list(params),
    queryFn: () => issuesClient.getOperationalIssues(params),
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
    networkMode: 'online',
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    gcTime: 600_000,
    retry: false,
  });
}

/**
 * Custom TanStack Query hook for fetching operational issue detail by ID.
 */
export function useOperationalIssueDetail(issueId: string | null) {
  const isEnabled = Boolean(issueId && issueId.trim().length > 0);

  return useQuery<OperationalIssueDetailResponse>({
    queryKey: issueId ? issueKeys.detail(issueId) : ['issues', 'detail', 'null'],
    queryFn: () => {
      if (!issueId) {
        throw new Error('Муаммо ID кўрсатилмади.');
      }
      return issuesClient.getOperationalIssueDetail(issueId);
    },
    enabled: isEnabled,
    networkMode: 'online',
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    gcTime: 600_000,
    retry: false,
  });
}
