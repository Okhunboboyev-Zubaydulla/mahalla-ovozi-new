import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useHokimTopicBoard } from '../../src/topics/useHokimTopicBoard.js';
import { hokimTopicsClient } from '../../src/topics/hokim-topics-client.js';
import { LiveAnnouncerContext, LiveAnnouncerContextValue } from '../../src/hooks/useLiveAnnouncer.js';
import { AuthProvider } from '../../src/auth/auth-context.js';
import { authClient } from '../../src/auth/auth-client.js';
import { TopicCardItem, HokimTopicBoardResponse } from '@mahalla-ovozi/api-contracts';

const mockActor = {
  id: 'acc_hokim_1',
  username: 'hokim_yakkasaroy',
  role: 'DISTRICT_HOKIM' as const,
  districtId: 'dist_yakka_1',
  mustChangePassword: false,
};

const initialTopicWater: TopicCardItem = {
  id: 'top_w1',
  districtId: 'dist_yakka_1',
  mahallaName: 'Дўстлик',
  calendarDay: '2026-08-24',
  summary: 'Сув босими пасайиши кузатилмоқда.',
  primaryLane: 'WATER',
  lanes: ['WATER', 'HOKIM_RELATED'],
  additionalLanes: ['HOKIM_RELATED'],
  evidenceCount: 2,
  latestMeaningfulActivityTimestamp: '2026-08-24T08:00:00.000Z',
  isNew: false,
  isUpdated: false,
  createdAt: '2026-08-24T07:30:00.000Z',
  updatedAt: '2026-08-24T08:00:00.000Z',
};

const initialBoardResponse: HokimTopicBoardResponse = {
  districtId: 'dist_yakka_1',
  districtName: 'Яккасарой тумани',
  calendarDay: '2026-08-24',
  visitBaselineTimestamp: '2026-08-24T07:00:00.000Z',
  currentVisitTimestamp: '2026-08-24T08:30:00.000Z',
  serverEvaluatedAt: '2026-08-24T08:30:00.000Z',
  hasProcessingDelay: false,
  lanes: {
    HOKIM_RELATED: {
      lane: 'HOKIM_RELATED',
      topics: [initialTopicWater],
      totalCount: 1,
      nextCursor: null,
      hasNextPage: false,
    },
    WATER: {
      lane: 'WATER',
      topics: [initialTopicWater],
      totalCount: 1,
      nextCursor: null,
      hasNextPage: false,
    },
    ELECTRICITY: {
      lane: 'ELECTRICITY',
      topics: [],
      totalCount: 0,
      nextCursor: null,
      hasNextPage: false,
    },
    GAS: {
      lane: 'GAS',
      topics: [],
      totalCount: 0,
      nextCursor: null,
      hasNextPage: false,
    },
    WASTE: {
      lane: 'WASTE',
      topics: [],
      totalCount: 0,
      nextCursor: null,
      hasNextPage: false,
    },
  },
};

describe('Story 3.3: useHokimTopicBoard In-Session Reconciliation & Buffer Tests', () => {
  let queryClient: QueryClient;
  const mockAnnounce = vi.fn();
  const mockAnnounceTopicUpdate = vi.fn();

  const mockAnnouncerValue: LiveAnnouncerContextValue = {
    message: '',
    announce: mockAnnounce,
    announceTopicUpdate: mockAnnounceTopicUpdate,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    queryClient.setQueryData(['auth', 'session'], {
      actor: mockActor,
      session: { expiresAt: new Date(Date.now() + 3600000).toISOString() },
    });

    vi.spyOn(authClient, 'fetchSession').mockResolvedValue({
      actor: mockActor,
      session: { expiresAt: new Date(Date.now() + 3600000).toISOString() },
    });
  });

  const createWrapper = () => {
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <LiveAnnouncerContext.Provider value={mockAnnouncerValue}>
            {children}
          </LiveAnnouncerContext.Provider>
        </AuthProvider>
      </QueryClientProvider>
    );
  };

  it('Test 1: Initial cold load populates 5 lanes directly with 0 buffered items', async () => {
    vi.spyOn(hokimTopicsClient, 'getTodayBoard').mockResolvedValue(initialBoardResponse);

    const { result } = renderHook(() => useHokimTopicBoard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.board).toBeDefined());

    expect(result.current.lanes.WATER.topics.length).toBe(1);
    expect(result.current.lanes.WATER.topics[0]?.id).toBe('top_w1');
    expect(result.current.lanes.WATER.bufferedNewTopics.length).toBe(0);
    expect(result.current.lanes.WATER.newItemsCount).toBe(0);
    expect(result.current.newTopicsPerLane.WATER).toBe(0);
    expect(result.current.lastRefreshedAt).toBe('2026-08-24T08:30:00.000Z');
  });

  it('Test 2: Background revalidation updates existing card in-place preserving array position', async () => {
    let currentBoardResponse = initialBoardResponse;
    vi.spyOn(hokimTopicsClient, 'getTodayBoard').mockImplementation(async () => currentBoardResponse);

    const { result } = renderHook(() => useHokimTopicBoard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.board).toBeDefined());
    expect(result.current.lanes.WATER.topics[0]?.summary).toBe('Сув босими пасайиши кузатилмоқда.');

    // Simulate second query (background refresh) with updated summary and evidenceCount
    const updatedTopic: TopicCardItem = {
      ...initialTopicWater,
      summary: 'Сув таъминоти тикланди, босим меъёрида.',
      evidenceCount: 5,
      isUpdated: true,
      updatedAt: '2026-08-24T09:00:00.000Z',
    };

    currentBoardResponse = {
      ...initialBoardResponse,
      serverEvaluatedAt: '2026-08-24T09:00:00.000Z',
      lanes: {
        ...initialBoardResponse.lanes,
        WATER: {
          ...initialBoardResponse.lanes.WATER!,
          topics: [updatedTopic],
        },
      },
    };

    await act(async () => {
      await result.current.manualRefresh();
    });

    await waitFor(() => {
      expect(result.current.lanes.WATER.topics[0]?.summary).toBe(
        'Сув таъминоти тикланди, босим меъёрида.',
      );
      expect(result.current.lanes.WATER.topics[0]?.evidenceCount).toBe(5);
      expect(result.current.lanes.WATER.topics[0]?.isUpdated).toBe(true);
    });

    // In-place update: array length unchanged and buffered items is 0
    expect(result.current.lanes.WATER.topics.length).toBe(1);
    expect(result.current.lanes.WATER.bufferedNewTopics.length).toBe(0);
  });

  it('Test 3: Newly arriving topics are staged in bufferedNewTopics and revealed via revealNewTopics', async () => {
    let currentBoardResponse = initialBoardResponse;
    vi.spyOn(hokimTopicsClient, 'getTodayBoard').mockImplementation(async () => currentBoardResponse);

    const { result } = renderHook(() => useHokimTopicBoard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.board).toBeDefined());

    // Incoming new topic in WATER lane
    const brandNewTopic: TopicCardItem = {
      id: 'top_w2_brand_new',
      districtId: 'dist_yakka_1',
      mahallaName: 'Боғсарой',
      calendarDay: '2026-08-24',
      summary: 'Янги сув қувури ёрилиши.',
      primaryLane: 'WATER',
      lanes: ['WATER'],
      additionalLanes: [],
      evidenceCount: 1,
      latestMeaningfulActivityTimestamp: '2026-08-24T09:15:00.000Z',
      isNew: true,
      isUpdated: false,
      createdAt: '2026-08-24T09:15:00.000Z',
      updatedAt: '2026-08-24T09:15:00.000Z',
    };

    currentBoardResponse = {
      ...initialBoardResponse,
      serverEvaluatedAt: '2026-08-24T09:15:00.000Z',
      lanes: {
        ...initialBoardResponse.lanes,
        WATER: {
          ...initialBoardResponse.lanes.WATER!,
          topics: [brandNewTopic, initialTopicWater],
          totalCount: 2,
        },
      },
    };

    await act(async () => {
      await result.current.manualRefresh();
    });

    // Visible topics array MUST remain 1 item (no layout shift), new item buffered
    await waitFor(() => {
      expect(result.current.lanes.WATER.newItemsCount).toBe(1);
      expect(result.current.newTopicsPerLane.WATER).toBe(1);
    });

    expect(result.current.lanes.WATER.topics.length).toBe(1);
    expect(result.current.lanes.WATER.topics[0]?.id).toBe('top_w1');
    expect(result.current.lanes.WATER.bufferedNewTopics.length).toBe(1);
    expect(result.current.lanes.WATER.bufferedNewTopics[0]?.id).toBe('top_w2_brand_new');

    // Reveal buffered topics
    act(() => {
      result.current.revealNewTopics('WATER');
    });

    // Now prepended to topics and buffer cleared
    expect(result.current.lanes.WATER.topics.length).toBe(2);
    expect(result.current.lanes.WATER.topics[0]?.id).toBe('top_w2_brand_new');
    expect(result.current.lanes.WATER.topics[1]?.id).toBe('top_w1');
    expect(result.current.lanes.WATER.bufferedNewTopics.length).toBe(0);
    expect(result.current.lanes.WATER.newItemsCount).toBe(0);
  });

  it('Test 4: Multi-lane topic updates deduplicate canonical count in live announcement (AC 4)', async () => {
    let currentBoardResponse = initialBoardResponse;
    vi.spyOn(hokimTopicsClient, 'getTodayBoard').mockImplementation(async () => currentBoardResponse);

    const { result } = renderHook(() => useHokimTopicBoard(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.board).toBeDefined());

    // A new topic appearing in BOTH WATER and HOKIM_RELATED
    const multiLaneNewTopic: TopicCardItem = {
      id: 'top_multi_new',
      districtId: 'dist_yakka_1',
      mahallaName: 'Шоҳжаҳон',
      calendarDay: '2026-08-24',
      summary: 'Катта сув аварияси ҳокимлик назоратида.',
      primaryLane: 'WATER',
      lanes: ['WATER', 'HOKIM_RELATED'],
      additionalLanes: ['HOKIM_RELATED'],
      evidenceCount: 3,
      latestMeaningfulActivityTimestamp: '2026-08-24T09:20:00.000Z',
      isNew: true,
      isUpdated: false,
      createdAt: '2026-08-24T09:20:00.000Z',
      updatedAt: '2026-08-24T09:20:00.000Z',
    };

    currentBoardResponse = {
      ...initialBoardResponse,
      serverEvaluatedAt: '2026-08-24T09:20:00.000Z',
      lanes: {
        ...initialBoardResponse.lanes,
        WATER: {
          ...initialBoardResponse.lanes.WATER!,
          topics: [multiLaneNewTopic, initialTopicWater],
          totalCount: 2,
        },
        HOKIM_RELATED: {
          ...initialBoardResponse.lanes.HOKIM_RELATED!,
          topics: [multiLaneNewTopic, initialTopicWater],
          totalCount: 2,
        },
      },
    };

    await act(async () => {
      await result.current.manualRefresh();
    });

    await waitFor(() => {
      expect(mockAnnounceTopicUpdate).toHaveBeenCalledWith(1, 0);
    });
  });
});
