import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HokimDashboardPage } from '../../src/pages/HokimDashboardPage.js';
import { FiveLaneBoard } from '../../src/components/topics/FiveLaneBoard.js';
import { TopicCard } from '../../src/components/topics/TopicCard.js';
import { LaneColumn } from '../../src/components/topics/LaneColumn.js';
import { BoardToolbar } from '../../src/components/topics/BoardToolbar.js';
import { hokimTopicsClient } from '../../src/topics/hokim-topics-client.js';
import { AuthProvider } from '../../src/auth/auth-context.js';
import { authClient } from '../../src/auth/auth-client.js';
import { mahallaTheme } from '../../src/theme/antd-theme.js';
import { HokimTopicBoardResponse, TopicCardItem } from '@mahalla-ovozi/api-contracts';

function setupMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

beforeAll(() => {
  setupMatchMedia();
});

const mockTopic: TopicCardItem = {
  id: 'top_1',
  districtId: 'dist_1',
  mahallaName: 'Боғсарой маҳалласи',
  calendarDay: '2026-08-23',
  summary: 'Сув босими пасайиши кузатилмоқда.',
  primaryLane: 'WATER',
  lanes: ['WATER', 'HOKIM_RELATED'],
  additionalLanes: ['HOKIM_RELATED'],
  evidenceCount: 4,
  latestMeaningfulActivityTimestamp: '2026-08-23T10:30:00.000Z',
  isNew: true,
  isUpdated: false,
  createdAt: '2026-08-23T10:00:00.000Z',
  updatedAt: '2026-08-23T10:30:00.000Z',
};

const mockBoardResponse: HokimTopicBoardResponse = {
  districtId: 'dist_1',
  districtName: 'Яккасарой тумани',
  calendarDay: '2026-08-23',
  visitBaselineTimestamp: '2026-08-23T08:00:00.000Z',
  currentVisitTimestamp: '2026-08-23T10:30:00.000Z',
  serverEvaluatedAt: '2026-08-23T10:30:00.000Z',
  hasProcessingDelay: false,
  lanes: {
    HOKIM_RELATED: {
      lane: 'HOKIM_RELATED',
      topics: [
        {
          ...mockTopic,
          id: 'top_1',
          additionalLanes: ['WATER'],
        },
      ],
      totalCount: 1,
      nextCursor: null,
      hasNextPage: false,
    },
    WATER: {
      lane: 'WATER',
      topics: [mockTopic],
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

describe('Hokim Dashboard Component & Integration Tests (Story 3.1)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    setupMatchMedia();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    vi.spyOn(authClient, 'fetchSession').mockResolvedValue({
      actor: {
        id: 'acc_hokim_1',
        username: 'hokim_yakkasaroy',
        role: 'DISTRICT_HOKIM',
        districtId: 'dist_1',
        mustChangePassword: false,
      },
      session: {
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
      },
    });
  });

  function renderPage() {
    return render(
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={mahallaTheme}>
          <AuthProvider>
            <BrowserRouter>
              <HokimDashboardPage />
            </BrowserRouter>
          </AuthProvider>
        </ConfigProvider>
      </QueryClientProvider>,
    );
  }

  describe('BoardToolbar Component (AC 2)', () => {
    it('renders wordmark, district name, formatted date, and sign out control', () => {
      render(
        <QueryClientProvider client={queryClient}>
          <ConfigProvider theme={mahallaTheme}>
            <AuthProvider>
              <BrowserRouter>
                <BoardToolbar
                  districtName="Яккасарой тумани"
                  calendarDay="2026-08-23"
                />
              </BrowserRouter>
            </AuthProvider>
          </ConfigProvider>
        </QueryClientProvider>,
      );

      expect(screen.getByText('Маҳалла Овози')).toBeTruthy();
      expect(screen.getByText('Яккасарой тумани')).toBeTruthy();
      expect(screen.getByText('23.08.2026')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Тизимдан чиқиш/i })).toBeTruthy();
    });
  });

  describe('TopicCard Component (AC 4)', () => {
    it('renders complete summary, mahalla name, activity time, evidence count, and new tag', () => {
      render(
        <ConfigProvider theme={mahallaTheme}>
          <TopicCard topic={mockTopic} currentLane="WATER" />
        </ConfigProvider>,
      );

      expect(screen.getByText('Боғсарой маҳалласи')).toBeTruthy();
      expect(screen.getByText('Сув босими пасайиши кузатилмоқда.')).toBeTruthy();
      expect(screen.getByText('4')).toBeTruthy();
      expect(screen.getByText('Янги')).toBeTruthy();
      expect(screen.getByText('Ҳокимга оид')).toBeTruthy();
    });

    it('renders updated badge when isUpdated is true and isNew is false', () => {
      const updatedTopic: TopicCardItem = {
        ...mockTopic,
        isNew: false,
        isUpdated: true,
      };

      render(
        <ConfigProvider theme={mahallaTheme}>
          <TopicCard topic={updatedTopic} currentLane="WATER" />
        </ConfigProvider>,
      );

      expect(screen.getByText('Янгиланди')).toBeTruthy();
      expect(screen.queryByText('Янги')).toBeNull();
    });
  });

  describe('LaneColumn & FiveLaneBoard Component (AC 3, 6, 7)', () => {
    it('renders all 5 fixed canonical lanes in order', () => {
      render(
        <ConfigProvider theme={mahallaTheme}>
          <FiveLaneBoard
            lanes={{
              HOKIM_RELATED: { lane: 'HOKIM_RELATED', topics: [mockTopic], bufferedNewTopics: [], newItemsCount: 0, totalCount: 1, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
              WATER: { lane: 'WATER', topics: [mockTopic], bufferedNewTopics: [], newItemsCount: 0, totalCount: 1, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
              ELECTRICITY: { lane: 'ELECTRICITY', topics: [], bufferedNewTopics: [], newItemsCount: 0, totalCount: 0, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
              GAS: { lane: 'GAS', topics: [], bufferedNewTopics: [], newItemsCount: 0, totalCount: 0, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
              WASTE: { lane: 'WASTE', topics: [], bufferedNewTopics: [], newItemsCount: 0, totalCount: 0, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
            }}
            onLoadMore={vi.fn()}
          />
        </ConfigProvider>,
      );

      expect(screen.getAllByText('Ҳокимга оид').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Сув').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Электр')).toBeTruthy();
      expect(screen.getByText('Газ')).toBeTruthy();
      expect(screen.getByText('Чиқинди')).toBeTruthy();
    });

    it('renders empty board state when all 5 lanes have 0 topics (AC 7)', () => {
      render(
        <ConfigProvider theme={mahallaTheme}>
          <FiveLaneBoard
            lanes={{
              HOKIM_RELATED: { lane: 'HOKIM_RELATED', topics: [], bufferedNewTopics: [], newItemsCount: 0, totalCount: 0, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
              WATER: { lane: 'WATER', topics: [], bufferedNewTopics: [], newItemsCount: 0, totalCount: 0, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
              ELECTRICITY: { lane: 'ELECTRICITY', topics: [], bufferedNewTopics: [], newItemsCount: 0, totalCount: 0, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
              GAS: { lane: 'GAS', topics: [], bufferedNewTopics: [], newItemsCount: 0, totalCount: 0, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
              WASTE: { lane: 'WASTE', topics: [], bufferedNewTopics: [], newItemsCount: 0, totalCount: 0, nextCursor: null, hasNextPage: false, isLoadingMore: false, loadMoreError: null },
            }}
            onLoadMore={vi.fn()}
          />
        </ConfigProvider>,
      );

      expect(screen.getByText('Бугун ҳозирча мавзулар йўқ')).toBeTruthy();
    });

    it('shows load more button and handles click', () => {
      const handleLoadMore = vi.fn();
      render(
        <ConfigProvider theme={mahallaTheme}>
          <LaneColumn
            lane="WATER"
            topics={[mockTopic]}
            totalCount={25}
            hasNextPage={true}
            isLoadingMore={false}
            loadMoreError={null}
            onLoadMore={handleLoadMore}
          />
        </ConfigProvider>,
      );

      const loadMoreBtn = screen.getByRole('button', { name: /Яна кўрсатиш/i });
      expect(loadMoreBtn).toBeTruthy();
      fireEvent.click(loadMoreBtn);
      expect(handleLoadMore).toHaveBeenCalledTimes(1);
    });

    it('shows retry banner on error and retains existing topic cards (AC 6)', () => {
      const handleRetry = vi.fn();
      render(
        <ConfigProvider theme={mahallaTheme}>
          <LaneColumn
            lane="WATER"
            topics={[mockTopic]}
            totalCount={25}
            hasNextPage={true}
            isLoadingMore={false}
            loadMoreError="Юклаб бўлмади. Қайта уриниш."
            onLoadMore={handleRetry}
          />
        </ConfigProvider>,
      );

      // Existing topic card remains visible
      expect(screen.getByText('Сув босими пасайиши кузатилмоқда.')).toBeTruthy();
      // Retry action visible
      const retryBtn = screen.getByRole('button', { name: /Қайта уриниш/i });
      expect(retryBtn).toBeTruthy();
      fireEvent.click(retryBtn);
      expect(handleRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('HokimDashboardPage Integration (AC 1, 2, 3, 5)', () => {
    it('fetches board and renders complete 5-lane unified dashboard', async () => {
      vi.spyOn(hokimTopicsClient, 'getTodayBoard').mockResolvedValueOnce(mockBoardResponse);

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Маҳалла Овози')).toBeTruthy();
        expect(screen.getByText('Яккасарой тумани')).toBeTruthy();
      });

      // Verify topic summary is rendered in both HOKIM_RELATED and WATER lanes
      const summaries = screen.getAllByText('Сув босими пасайиши кузатилмоқда.');
      expect(summaries.length).toBe(2);
    });

    it('renders stale error banner when background refresh fails but retains board (AC 8)', async () => {
      let shouldFail = false;
      vi.spyOn(hokimTopicsClient, 'getTodayBoard').mockImplementation(async () => {
        if (shouldFail) {
          throw new Error('Network timeout during refresh');
        }
        return mockBoardResponse;
      });

      renderPage();

      await waitFor(() => {
        expect(screen.getByText('Яккасарой тумани')).toBeTruthy();
      });

      // Trigger background refresh failure
      shouldFail = true;
      const refreshBtn = screen.getByRole('button', { name: 'Маълумотларни янгилаш' });
      fireEvent.click(refreshBtn);

      await waitFor(() => {
        expect(screen.getByText(/Янги маълумотларни юклаб бўлмади/)).toBeTruthy();
      });

      // Board remains mounted and visible
      expect(screen.getAllByText('Сув босими пасайиши кузатилмоқда.').length).toBe(2);
    });
  });
});
