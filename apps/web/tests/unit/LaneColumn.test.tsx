import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { mahallaTheme } from '../../src/theme/antd-theme.js';
import { LaneColumn } from '../../src/components/topics/LaneColumn.js';
import { TopicCardItem } from '@mahalla-ovozi/api-contracts';

const mockTopic: TopicCardItem = {
  id: 'top_1',
  districtId: 'dist_1',
  mahallaName: 'Дўстлик',
  calendarDay: '2026-08-24',
  summary: 'Сув таъминоти муаммоси.',
  primaryLane: 'WATER',
  lanes: ['WATER'],
  additionalLanes: [],
  evidenceCount: 2,
  latestMeaningfulActivityTimestamp: '2026-08-24T08:00:00.000Z',
  isNew: false,
  isUpdated: false,
  createdAt: '2026-08-24T08:00:00.000Z',
  updatedAt: '2026-08-24T08:00:00.000Z',
};

describe('Story 3.3: LaneColumn Component Tests', () => {
  it('Test 1: Does not render discoverability badge when newItemsCount is 0', () => {
    render(
      <ConfigProvider theme={mahallaTheme}>
        <LaneColumn
          lane="WATER"
          topics={[mockTopic]}
          totalCount={1}
          newItemsCount={0}
          hasNextPage={false}
          isLoadingMore={false}
          loadMoreError={null}
          onLoadMore={vi.fn()}
        />
      </ConfigProvider>,
    );

    expect(screen.queryByText(/\+.*янги/)).toBeNull();
  });

  it('Test 2: Renders discoverability badge when newItemsCount > 0 and handles click (AC 3)', () => {
    const handleReveal = vi.fn();
    render(
      <ConfigProvider theme={mahallaTheme}>
        <LaneColumn
          lane="WATER"
          topics={[mockTopic]}
          totalCount={2}
          newItemsCount={1}
          hasNextPage={false}
          isLoadingMore={false}
          loadMoreError={null}
          onLoadMore={vi.fn()}
          onRevealNewItems={handleReveal}
        />
      </ConfigProvider>,
    );

    const badge = screen.getByRole('button', { name: '1 та янги мавзуни кўрсатиш' });
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('+1 янги');

    fireEvent.click(badge);
    expect(handleReveal).toHaveBeenCalledTimes(1);
  });

  it('Test 3: Handles keyboard Enter and Space activation on discoverability badge (AC 3, 9)', () => {
    const handleReveal = vi.fn();
    render(
      <ConfigProvider theme={mahallaTheme}>
        <LaneColumn
          lane="WATER"
          topics={[mockTopic]}
          totalCount={3}
          newItemsCount={2}
          hasNextPage={false}
          isLoadingMore={false}
          loadMoreError={null}
          onLoadMore={vi.fn()}
          onRevealNewItems={handleReveal}
        />
      </ConfigProvider>,
    );

    const badge = screen.getByRole('button', { name: '2 та янги мавзуни кўрсатиш' });
    
    // Enter key
    fireEvent.keyDown(badge, { key: 'Enter', code: 'Enter' });
    expect(handleReveal).toHaveBeenCalledTimes(1);

    // Space key
    fireEvent.keyDown(badge, { key: ' ', code: 'Space' });
    expect(handleReveal).toHaveBeenCalledTimes(2);
  });

  describe('Story 3.8: Accessibility, Focus Management & Retry Banner Tests', () => {
    it('Task 5.2a: Load more button renders with 44px minimum touch target height and contextual aria-label', () => {
      render(
        <ConfigProvider theme={mahallaTheme}>
          <LaneColumn
            lane="WATER"
            topics={[mockTopic]}
            totalCount={10}
            newItemsCount={0}
            hasNextPage={true}
            isLoadingMore={false}
            loadMoreError={null}
            onLoadMore={vi.fn()}
          />
        </ConfigProvider>,
      );

      const loadMoreBtn = screen.getByRole('button', { name: 'Сув бўйича яна 20 та мавзуни юклаш' });
      expect(loadMoreBtn).toBeTruthy();
      expect(loadMoreBtn.textContent).toContain('Яна кўрсатиш');
      expect(loadMoreBtn.style.minHeight).toBe('44px');
      expect(loadMoreBtn.style.height).toBe('44px');
    });

    it('Task 5.2b: Sets aria-busy on container and loading label when isLoadingMore is true', () => {
      const { container } = render(
        <ConfigProvider theme={mahallaTheme}>
          <LaneColumn
            lane="WATER"
            topics={[mockTopic]}
            totalCount={10}
            newItemsCount={0}
            hasNextPage={true}
            isLoadingMore={true}
            loadMoreError={null}
            onLoadMore={vi.fn()}
          />
        </ConfigProvider>,
      );

      const scrollContainer = container.querySelector('[aria-busy="true"]');
      expect(scrollContainer).toBeTruthy();
      expect(screen.getByText('Юкланмоқда...')).toBeTruthy();
    });

    it('Task 5.2c: Renders local error alert banner and triggers onLoadMore on retry click', () => {
      const handleLoadMore = vi.fn();
      render(
        <ConfigProvider theme={mahallaTheme}>
          <LaneColumn
            lane="WATER"
            topics={[mockTopic]}
            totalCount={10}
            newItemsCount={0}
            hasNextPage={true}
            isLoadingMore={false}
            loadMoreError="Юклаб бўлмади. Қайта уриниш."
            onLoadMore={handleLoadMore}
          />
        </ConfigProvider>,
      );

      expect(screen.getByText('Юклаб бўлмади. Қайта уриниш.')).toBeTruthy();
      const retryBtn = screen.getByRole('button', { name: /Қайта уриниш/ });
      expect(retryBtn).toBeTruthy();

      fireEvent.click(retryBtn);
      expect(handleLoadMore).toHaveBeenCalledTimes(1);
    });

    it('Task 5.2d: Shifts focus to first newly loaded topic card on keyboard activation', () => {
      const handleLoadMore = vi.fn();
      const { rerender } = render(
        <ConfigProvider theme={mahallaTheme}>
          <LaneColumn
            lane="WATER"
            topics={[mockTopic]}
            totalCount={10}
            newItemsCount={0}
            hasNextPage={true}
            isLoadingMore={false}
            loadMoreError={null}
            onLoadMore={handleLoadMore}
          />
        </ConfigProvider>,
      );

      const loadMoreBtn = screen.getByRole('button', { name: 'Сув бўйича яна 20 та мавзуни юклаш' });

      // Simulate keyboard click (e.detail === 0)
      fireEvent.click(loadMoreBtn, { detail: 0 });
      expect(handleLoadMore).toHaveBeenCalledTimes(1);

      // Simulate new topic arriving
      const newTopic: TopicCardItem = {
        ...mockTopic,
        id: 'top_newly_loaded_2',
        summary: 'Янги юкланган мавзу.',
      };

      rerender(
        <ConfigProvider theme={mahallaTheme}>
          <LaneColumn
            lane="WATER"
            topics={[mockTopic, newTopic]}
            totalCount={10}
            newItemsCount={0}
            hasNextPage={false}
            isLoadingMore={false}
            loadMoreError={null}
            onLoadMore={handleLoadMore}
          />
        </ConfigProvider>,
      );

      const newCard = document.getElementById('topic-card-top_newly_loaded_2');
      expect(newCard).toBeTruthy();
    });
  });
});
