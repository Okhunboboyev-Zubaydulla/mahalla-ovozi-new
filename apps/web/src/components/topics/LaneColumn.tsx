import React, { useRef, useEffect, useContext } from 'react';
import { Button, Typography, Empty, Alert } from 'antd';
import { ReloadOutlined, DownOutlined } from '@ant-design/icons';
import { QualifyingLane, TopicCardItem } from '@mahalla-ovozi/api-contracts';
import { TopicCard, LANE_LABELS, LANE_STYLES } from './TopicCard.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { LiveAnnouncerContext } from '../../hooks/useLiveAnnouncer.js';

const { Text } = Typography;

export interface LaneColumnProps {
  lane: QualifyingLane;
  topics: TopicCardItem[];
  totalCount: number;
  newItemsCount?: number;
  hasNextPage: boolean;
  isLoadingMore: boolean;
  loadMoreError: string | null;
  selectedTopicId?: string | null;
  searchQuery?: string;
  onLoadMore: () => void;
  onSelectTopic?: (topic: TopicCardItem) => void;
  onRevealNewItems?: () => void;
}

export const LaneColumn: React.FC<LaneColumnProps> = ({
  lane,
  topics,
  totalCount,
  newItemsCount = 0,
  hasNextPage,
  isLoadingMore,
  loadMoreError,
  selectedTopicId,
  searchQuery,
  onLoadMore,
  onSelectTopic,
  onRevealNewItems,
}) => {
  const laneLabel = LANE_LABELS[lane];
  const laneStyle = LANE_STYLES[lane];
  const prefersReducedMotion = usePrefersReducedMotion();
  const liveAnnouncer = useContext(LiveAnnouncerContext);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevTopicsLengthRef = useRef(topics.length);
  const isKeyboardTriggerRef = useRef(false);

  useEffect(() => {
    const prevLength = prevTopicsLengthRef.current;
    if (topics.length > prevLength) {
      const newTopicsCount = topics.length - prevLength;
      liveAnnouncer?.announce(`${laneLabel} йўналиши: ${newTopicsCount} та янги мавзу қўшилди`);

      if (isKeyboardTriggerRef.current) {
        const firstNewTopic = topics[prevLength];
        if (firstNewTopic) {
          requestAnimationFrame(() => {
            const cardEl = document.getElementById(`topic-card-${firstNewTopic.id}`);
            if (cardEl) {
              cardEl.setAttribute('tabindex', '0');
              cardEl.focus();
            }
          });
        }
      }
      isKeyboardTriggerRef.current = false;
    }
    prevTopicsLengthRef.current = topics.length;
  }, [topics, laneLabel, liveAnnouncer]);

  const handleReveal = () => {
    onRevealNewItems?.();
    if (scrollContainerRef.current) {
      if (typeof scrollContainerRef.current.scrollTo === 'function') {
        scrollContainerRef.current.scrollTo({
          top: 0,
          behavior: prefersReducedMotion ? 'auto' : 'smooth',
        });
      } else {
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  };

  return (
    <section
      aria-labelledby={`lane-header-${lane}`}
      style={{
        flex: '1 0 280px',
        minWidth: 280,
        maxWidth: 360,
        backgroundColor: '#F8FAFC',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 80px)',
        overflow: 'hidden',
        boxShadow: 'none',
      }}
    >
      {/* Fixed Lane Header */}
      <header
        id={`lane-header-${lane}`}
        tabIndex={-1}
        style={{
          padding: '12px 16px',
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          outline: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              backgroundColor: laneStyle.bg,
              color: laneStyle.text,
              border: `1px solid ${laneStyle.border}`,
            }}
          >
            {laneLabel}
          </span>

          {/* Discoverability Badge for Buffered Items (AC 3, AC 9) */}
          {newItemsCount > 0 && (
            <span
              role="button"
              tabIndex={0}
              aria-label={`${newItemsCount} та янги мавзуни кўрсатиш`}
              onClick={handleReveal}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleReveal();
                }
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                border: '1px solid #FDE68A',
                borderRadius: 12,
                padding: '2px 8px',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              +{newItemsCount} янги
            </span>
          )}
        </div>

        <span
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#64748B',
            backgroundColor: '#F1F5F9',
            padding: '2px 8px',
            borderRadius: 12,
          }}
        >
          {totalCount}
        </span>
      </header>

      {/* Scrollable Topic Cards List */}
      <div
        ref={scrollContainerRef}
        aria-busy={isLoadingMore}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {topics.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 8px',
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text style={{ color: '#64748B', fontSize: 14 }}>
                  Мос мавзу топилмади
                </Text>
              }
              style={{ margin: 0 }}
            />
          </div>
        ) : (
          topics.map((topic) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              currentLane={lane}
              isSelected={topic.id === selectedTopicId}
              searchQuery={searchQuery}
              onClick={onSelectTopic ? () => onSelectTopic(topic) : undefined}
            />
          ))
        )}

        {/* Local Failure Retry Banner (Preserving existing cards) */}
        {loadMoreError && (
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <Alert
              message={loadMoreError}
              type="error"
              showIcon
              style={{
                fontSize: 13,
                borderRadius: 6,
                border: '1px solid #FECACA',
                backgroundColor: '#FEE2E2',
                boxShadow: 'none',
              }}
              action={
                <Button
                  size="small"
                  type="text"
                  danger
                  icon={<ReloadOutlined />}
                  onClick={onLoadMore}
                  style={{ fontWeight: 600, fontSize: 12, boxShadow: 'none' }}
                >
                  Қайта уриниш
                </Button>
              }
            />
          </div>
        )}

        {/* Keyset Pagination Load More Button */}
        {hasNextPage && !loadMoreError && (
          <div style={{ marginTop: 4, marginBottom: 8, textAlign: 'center' }}>
            <Button
              block
              onClick={(e) => {
                isKeyboardTriggerRef.current = e.detail === 0;
                onLoadMore();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  isKeyboardTriggerRef.current = true;
                }
              }}
              loading={isLoadingMore}
              icon={!isLoadingMore ? <DownOutlined style={{ fontSize: 12 }} /> : undefined}
              aria-label={`${laneLabel} бўйича яна 20 та мавзуни юклаш`}
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#CBD5E1',
                color: '#0F172A',
                fontWeight: 600,
                fontSize: 13,
                minHeight: 44,
                height: 44,
                borderRadius: 6,
                boxShadow: 'none',
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid #0284C7';
                e.currentTarget.style.outlineOffset = '2px';
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none';
              }}
            >
              {isLoadingMore ? 'Юкланмоқда...' : 'Яна кўрсатиш'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};
