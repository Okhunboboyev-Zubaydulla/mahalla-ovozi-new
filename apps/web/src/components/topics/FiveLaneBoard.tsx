import React, { useRef, useState, useEffect } from 'react';
import { Button, Typography } from 'antd';
import { LeftOutlined, RightOutlined } from '@ant-design/icons';
import { QualifyingLane, TopicCardItem } from '@mahalla-ovozi/api-contracts';
import { LaneColumn } from './LaneColumn.js';
import { LaneLocalState } from '../../topics/useHokimTopicBoard.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';

const { Text } = Typography;

const CANONICAL_LANE_ORDER: QualifyingLane[] = [
  'HOKIM_RELATED',
  'WATER',
  'ELECTRICITY',
  'GAS',
  'WASTE',
];

export interface FiveLaneBoardProps {
  lanes: Record<QualifyingLane, LaneLocalState>;
  activeLanes?: QualifyingLane[];
  isFiltered?: boolean;
  onResetFilters?: () => void;
  selectedTopicId?: string | null;
  searchQuery?: string;
  onLoadMore: (lane: QualifyingLane) => void;
  onSelectTopic?: (topic: TopicCardItem) => void;
  onRevealNewTopics?: (lane: QualifyingLane) => void;
}

export const FiveLaneBoard: React.FC<FiveLaneBoardProps> = ({
  lanes,
  activeLanes,
  isFiltered = false,
  selectedTopicId,
  searchQuery,
  onLoadMore,
  onSelectTopic,
  onRevealNewTopics,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const lanesToRender =
    activeLanes && activeLanes.length > 0
      ? CANONICAL_LANE_ORDER.filter((l) => activeLanes.includes(l))
      : CANONICAL_LANE_ORDER;

  const totalVisibleCount = lanesToRender.reduce(
    (sum, laneKey) => sum + (lanes[laneKey]?.topics?.length || 0),
    0,
  );
  const totalBufferedCount = lanesToRender.reduce(
    (sum, laneKey) => sum + (lanes[laneKey]?.bufferedNewTopics?.length || 0),
    0,
  );

  const updateScrollButtons = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  };

  useEffect(() => {
    updateScrollButtons();
    const el = scrollContainerRef.current;
    if (!el) return;

    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [lanes, lanesToRender]);

  const scrollByLane = (direction: 'left' | 'right') => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const laneWidth = 320; // Approx lane column width + gap
    const behavior: ScrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

    el.scrollBy({
      left: direction === 'left' ? -laneWidth : laneWidth,
      behavior,
    });
  };

  const isBoardEmpty = totalVisibleCount === 0 && totalBufferedCount === 0;

  return (
    <main
      style={{
        position: 'relative',
        flex: 1,
        backgroundColor: '#F4F6F8',
        padding: '16px 20px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Informative Empty State Banner (AC 12 & UX Design Spec) */}
      {isBoardEmpty && (
        <div
          role="status"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div>
            <Text strong style={{ color: '#0F172A', fontSize: 14 }}>
              {isFiltered
                ? 'Танланган шартлар бўйича мавзулар топилмади'
                : 'Бугун ҳозирча мавзулар йўқ'}
            </Text>
            <span style={{ color: '#64748B', fontSize: 13, marginLeft: 8 }}>
              {isFiltered
                ? 'Бошқа сана оралиғи, маҳалла ёки йўналишларни танлаб кўринг.'
                : 'Туман маҳаллалари гуруҳларидан янги хабарлар келиб тушганда бу ерда мавзулар шаклланади.'}
            </span>
          </div>
        </div>
      )}
      {/* Scroll Navigation Controls (Mobile / Narrow screens < 1200px) */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          right: 28,
          zIndex: 10,
          display: canScrollLeft || canScrollRight ? 'flex' : 'none',
          gap: 8,
        }}
      >
        <Button
          shape="circle"
          size="small"
          icon={<LeftOutlined />}
          disabled={!canScrollLeft}
          onClick={() => scrollByLane('left')}
          aria-label="Олдинги йўналиш"
          className="focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#CBD5E1',
            boxShadow: 'none',
          }}
        />
        <Button
          shape="circle"
          size="small"
          icon={<RightOutlined />}
          disabled={!canScrollRight}
          onClick={() => scrollByLane('right')}
          aria-label="Кейинги йўналиш"
          className="focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:outline-none"
          style={{
            backgroundColor: '#FFFFFF',
            borderColor: '#CBD5E1',
            boxShadow: 'none',
          }}
        />
      </div>

      {/* Horizontal Scroll Region */}
      <div
        ref={scrollContainerRef}
        role="region"
        aria-label="Йўналишлар тахтаси"
        tabIndex={0}
        style={{
          display: 'flex',
          gap: 16,
          overflowX: 'auto',
          overflowY: 'hidden',
          paddingBottom: 8,
          scrollbarWidth: 'thin',
          outline: 'none',
        }}
        onFocus={(e) => {
          if (e.target === e.currentTarget) {
            e.currentTarget.style.outline = '2px solid #0284C7';
          }
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        {lanesToRender.map((laneKey) => {
          const laneData = lanes[laneKey] || {
            lane: laneKey,
            topics: [],
            bufferedNewTopics: [],
            newItemsCount: 0,
            totalCount: 0,
            nextCursor: null,
            hasNextPage: false,
            isLoadingMore: false,
            loadMoreError: null,
          };

          return (
            <LaneColumn
              key={laneKey}
              lane={laneKey}
              topics={laneData.topics}
              totalCount={laneData.totalCount}
              newItemsCount={laneData.newItemsCount || 0}
              hasNextPage={laneData.hasNextPage}
              isLoadingMore={laneData.isLoadingMore}
              loadMoreError={laneData.loadMoreError}
              selectedTopicId={selectedTopicId}
              searchQuery={searchQuery}
              onLoadMore={() => onLoadMore(laneKey)}
              onSelectTopic={onSelectTopic}
              onRevealNewItems={() => onRevealNewTopics?.(laneKey)}
            />
          );
        })}
      </div>
    </main>
  );
};
