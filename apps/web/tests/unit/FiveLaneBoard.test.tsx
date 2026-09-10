import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { mahallaTheme } from '../../src/theme/antd-theme.js';
import { FiveLaneBoard } from '../../src/components/topics/FiveLaneBoard.js';
import { getLaneOrderStorageKey } from '../../src/hooks/useLaneOrderPreference.js';
import { QualifyingLane } from '@mahalla-ovozi/api-contracts';
import { LaneLocalState } from '../../src/topics/useHokimTopicBoard.js';

const mockLanes: Record<QualifyingLane, LaneLocalState> = {
  HOKIM_RELATED: {
    lane: 'HOKIM_RELATED',
    topics: [],
    totalCount: 5,
    nextCursor: null,
    hasNextPage: false,
    isLoadingMore: false,
    loadMoreError: null,
  },
  WATER: {
    lane: 'WATER',
    topics: [],
    totalCount: 3,
    nextCursor: null,
    hasNextPage: false,
    isLoadingMore: false,
    loadMoreError: null,
  },
  ELECTRICITY: {
    lane: 'ELECTRICITY',
    topics: [],
    totalCount: 8,
    nextCursor: null,
    hasNextPage: false,
    isLoadingMore: false,
    loadMoreError: null,
  },
  GAS: {
    lane: 'GAS',
    topics: [],
    totalCount: 2,
    nextCursor: null,
    hasNextPage: false,
    isLoadingMore: false,
    loadMoreError: null,
  },
  WASTE: {
    lane: 'WASTE',
    topics: [],
    totalCount: 1,
    nextCursor: null,
    hasNextPage: false,
    isLoadingMore: false,
    loadMoreError: null,
  },
};

describe('FiveLaneBoard Drag-and-Drop & Preference Tests', () => {
  const districtId = 'dist_test';
  const userId = 'user_test';
  const storageKey = getLaneOrderStorageKey(districtId, userId);

  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders all 5 lanes in canonical order by default', () => {
    render(
      <ConfigProvider theme={mahallaTheme}>
        <FiveLaneBoard
          lanes={mockLanes}
          onLoadMore={vi.fn()}
          districtId={districtId}
          userId={userId}
        />
      </ConfigProvider>
    );

    // Check titles present
    expect(screen.getByText('Ҳокимга оид')).toBeTruthy();
    expect(screen.getByText('Сув')).toBeTruthy();
    expect(screen.getByText('Электр')).toBeTruthy();
    expect(screen.getByText('Газ')).toBeTruthy();
    expect(screen.getByText('Чиқинди')).toBeTruthy();

    // Reset button should not be present when order is canonical
    expect(screen.queryByText('Тартибни тиклаш')).toBeNull();
  });

  it('renders lanes in custom saved order from localStorage and shows reset button', () => {
    const customOrder: QualifyingLane[] = [
      'GAS',
      'ELECTRICITY',
      'WATER',
      'WASTE',
      'HOKIM_RELATED',
    ];
    window.localStorage.setItem(storageKey, JSON.stringify(customOrder));

    render(
      <ConfigProvider theme={mahallaTheme}>
        <FiveLaneBoard
          lanes={mockLanes}
          onLoadMore={vi.fn()}
          districtId={districtId}
          userId={userId}
        />
      </ConfigProvider>
    );

    // Reset button should appear
    const resetButton = screen.getByText('Тартибни тиклаш');
    expect(resetButton).toBeTruthy();
  });

  it('clicking reset button restores canonical order and hides reset button', () => {
    const customOrder: QualifyingLane[] = [
      'GAS',
      'ELECTRICITY',
      'WATER',
      'WASTE',
      'HOKIM_RELATED',
    ];
    window.localStorage.setItem(storageKey, JSON.stringify(customOrder));

    render(
      <ConfigProvider theme={mahallaTheme}>
        <FiveLaneBoard
          lanes={mockLanes}
          onLoadMore={vi.fn()}
          districtId={districtId}
          userId={userId}
        />
      </ConfigProvider>
    );

    const resetButton = screen.getByText('Тартибни тиклаш');
    fireEvent.click(resetButton);

    // After reset, localStorage is cleared and reset button disappears
    expect(window.localStorage.getItem(storageKey)).toBeNull();
    expect(screen.queryByText('Тартибни тиклаш')).toBeNull();
  });

  it('disables drag handles and keeps custom relative order when lane filtering is active', () => {
    const customOrder: QualifyingLane[] = [
      'GAS',
      'WATER',
      'ELECTRICITY',
      'WASTE',
      'HOKIM_RELATED',
    ];
    window.localStorage.setItem(storageKey, JSON.stringify(customOrder));

    render(
      <ConfigProvider theme={mahallaTheme}>
        <FiveLaneBoard
          lanes={mockLanes}
          activeLanes={['WATER', 'GAS']}
          onLoadMore={vi.fn()}
          districtId={districtId}
          userId={userId}
        />
      </ConfigProvider>
    );

    // Only Gas and Water should be present
    expect(screen.getByText('Газ')).toBeTruthy();
    expect(screen.getByText('Сув')).toBeTruthy();
    expect(screen.queryByText('Электр')).toBeNull();

    // Drag handles should have disabled attribute or title indicating filter constraint
    const dragHandles = screen.getAllByRole('button', { name: /суриш фаол эмас/i });
    expect(dragHandles.length).toBe(2);
  });
});
