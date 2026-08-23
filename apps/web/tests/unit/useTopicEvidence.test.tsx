import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useTopicEvidence } from '../../src/topics/useTopicEvidence.js';
import { hokimTopicsClient } from '../../src/topics/hokim-topics-client.js';
import {
  TopicEvidenceResponse,
  TopicCardItem,
  TopicEvidenceItem,
} from '@mahalla-ovozi/api-contracts';

// Mock useAuth
vi.mock('../../src/auth/auth-context.js', () => ({
  useAuth: () => ({
    actor: {
      id: 'acc_hokim_1',
      districtId: 'dist_test_1',
      role: 'DISTRICT_HOKIM',
    },
  }),
}));

const mockTopicCard: TopicCardItem = {
  id: 'top_1',
  districtId: 'dist_test_1',
  mahallaName: 'Бобур',
  calendarDay: '2026-08-23',
  summary: 'Бобур маҳалласида сув қувури ёрилиши.',
  primaryLane: 'WATER',
  lanes: ['WATER'],
  additionalLanes: [],
  evidenceCount: 3,
  latestMeaningfulActivityTimestamp: '2026-08-23T10:00:00.000Z',
  isNew: false,
  isUpdated: false,
  createdAt: '2026-08-23T06:00:00.000Z',
  updatedAt: '2026-08-23T10:00:00.000Z',
};

const mockEvidence1: TopicEvidenceItem = {
  id: 'evi_1',
  topicId: 'top_1',
  verbatimText: 'Сув босими пастлади.',
  contentType: 'TEXT',
  originalTimestamp: '2026-08-23T06:00:00.000Z',
  formattedTime: '23.08.2026 11:00',
  authorName: 'Anvar Qodirov',
  authorUsername: '@anvar_uz',
  isAnchor: false,
  telegramDeepLink: 'https://t.me/bobur_public/101',
};

const mockEvidence2: TopicEvidenceItem = {
  id: 'evi_2',
  topicId: 'top_1',
  verbatimText: 'Қувур ёрилиб кетди!',
  contentType: 'TEXT',
  originalTimestamp: '2026-08-23T07:00:00.000Z',
  formattedTime: '23.08.2026 12:00',
  authorName: 'Dilshod',
  authorUsername: null,
  isAnchor: true,
  telegramDeepLink: 'https://t.me/c/123456789/102',
};

const mockEvidence3: TopicEvidenceItem = {
  id: 'evi_3',
  topicId: 'top_1',
  verbatimText: 'Таъмирлаш бригадаси келди.',
  contentType: 'TEXT',
  originalTimestamp: '2026-08-23T10:00:00.000Z',
  formattedTime: '23.08.2026 15:00',
  authorName: null,
  authorUsername: null,
  isAnchor: false,
  telegramDeepLink: null,
};

const mockPage1: TopicEvidenceResponse = {
  topic: mockTopicCard,
  anchorQuote: 'Қувур ёрилиб кетди!',
  anchorEvidenceId: 'evi_2',
  evidence: [mockEvidence1, mockEvidence2],
  totalCount: 3,
  nextCursor: 'cursor_page_2',
  hasNextPage: true,
};

const mockPage2: TopicEvidenceResponse = {
  topic: mockTopicCard,
  anchorQuote: 'Қувур ёрилиб кетди!',
  anchorEvidenceId: 'evi_2',
  evidence: [mockEvidence3],
  totalCount: 3,
  nextCursor: null,
  hasNextPage: false,
};

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return {
    queryClient,
    wrapper: ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    ),
  };
}

describe('useTopicEvidence Hook Unit Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('remains idle with empty evidence list when topicId is null or empty', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTopicEvidence(null), { wrapper });

    expect(result.current.topic).toBeNull();
    expect(result.current.evidenceList).toEqual([]);
    expect(result.current.totalCount).toBe(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('fetches initial evidence batch and exposes metadata correctly (AC 1, 2, 4)', async () => {
    vi.spyOn(hokimTopicsClient, 'getTopicEvidence').mockResolvedValueOnce(mockPage1);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTopicEvidence('top_1'), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.topic).toEqual(mockTopicCard);
    expect(result.current.anchorQuote).toBe('Қувур ёрилиб кетди!');
    expect(result.current.anchorEvidenceId).toBe('evi_2');
    expect(result.current.totalCount).toBe(3);
    expect(result.current.evidenceList.length).toBe(2);
    expect(result.current.hasNextPage).toBe(true);
    expect(result.current.evidenceList[1]!.isAnchor).toBe(true);
  });

  it('progressively appends subsequent batches upon fetchNextPage() without duplicating items (AC 3)', async () => {
    vi.spyOn(hokimTopicsClient, 'getTopicEvidence')
      .mockResolvedValueOnce(mockPage1)
      .mockResolvedValueOnce(mockPage2);

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTopicEvidence('top_1'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.evidenceList.length).toBe(2);
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    await waitFor(() => expect(result.current.evidenceList.length).toBe(3));
    expect(result.current.evidenceList.map((e) => e.id)).toEqual(['evi_1', 'evi_2', 'evi_3']);
    expect(result.current.hasNextPage).toBe(false);
  });

  it('isolates cache per topic and eliminates ghost-cache bleeding during topic switching (AC 7)', async () => {
    const mockTopic2: TopicCardItem = {
      ...mockTopicCard,
      id: 'top_2',
      mahallaName: 'Чилонзор-9',
      summary: 'Чилонзорда чироқ ўчди.',
      primaryLane: 'ELECTRICITY',
    };

    const mockPageTopic2: TopicEvidenceResponse = {
      topic: mockTopic2,
      anchorQuote: 'Трансформатор ёнди.',
      anchorEvidenceId: 'evi_elec_1',
      evidence: [
        {
          id: 'evi_elec_1',
          topicId: 'top_2',
          verbatimText: 'Трансформатор ёнди.',
          contentType: 'TEXT',
          originalTimestamp: '2026-08-23T08:00:00.000Z',
          formattedTime: '23.08.2026 13:00',
          authorName: null,
          authorUsername: null,
          isAnchor: true,
          telegramDeepLink: null,
        },
      ],
      totalCount: 1,
      nextCursor: null,
      hasNextPage: false,
    };

    vi.spyOn(hokimTopicsClient, 'getTopicEvidence')
      .mockResolvedValueOnce(mockPage1)
      .mockResolvedValueOnce(mockPageTopic2);

    const { wrapper } = createWrapper();
    let currentTopicId = 'top_1';
    const { result, rerender } = renderHook(() => useTopicEvidence(currentTopicId), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.topic?.id).toBe('top_1');
    expect(result.current.evidenceList.length).toBe(2);

    // Switch topic in-place
    currentTopicId = 'top_2';
    rerender();

    // While loading topic 2, evidenceList for topic 1 is not bled as placeholderData
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.topic?.id).toBe('top_2');
    expect(result.current.topic?.mahallaName).toBe('Чилонзор-9');
    expect(result.current.evidenceList.length).toBe(1);
    expect(result.current.evidenceList[0]!.id).toBe('evi_elec_1');
  });

  it('handles fetchNextPage() failure gracefully with scoped retry state (AC 3)', async () => {
    vi.spyOn(hokimTopicsClient, 'getTopicEvidence')
      .mockResolvedValueOnce(mockPage1)
      .mockRejectedValueOnce(new Error('Network error on batch 2'));

    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useTopicEvidence('top_1'), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.evidenceList.length).toBe(2);

    await act(async () => {
      await result.current.fetchNextPage();
    });

    // Existing evidence remains intact
    await waitFor(() => expect(result.current.isFetchNextPageError).toBe(true));
    expect(result.current.evidenceList.length).toBe(2);
  });
});
