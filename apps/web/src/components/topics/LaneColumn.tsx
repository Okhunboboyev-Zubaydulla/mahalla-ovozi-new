import React, { useRef, useEffect, useLayoutEffect, useContext, useState, useCallback } from 'react';
import { Button, Typography, Empty, Alert } from 'antd';
import { ReloadOutlined, DownOutlined } from '@ant-design/icons';
import { QualifyingLane, TopicCardItem } from '@mahalla-ovozi/api-contracts';
import { TopicCard, LANE_LABELS, LANE_STYLES, LANE_ICONS } from './TopicCard.js';
import { themeColors } from '../../theme/antd-theme.js';
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
  onLoadMore: (lane: QualifyingLane) => void;
  onSelectTopic?: (topic: TopicCardItem, options?: { focusHokim?: boolean }) => void;
  onRevealNewItems?: (lane: QualifyingLane) => void;
  style?: React.CSSProperties;
}

const LaneColumnComponent: React.FC<LaneColumnProps> = ({
  lane,
  topics,
  totalCount,
  newItemsCount: _newItemsCount,
  hasNextPage,
  isLoadingMore,
  loadMoreError,
  selectedTopicId,
  searchQuery,
  onLoadMore,
  onSelectTopic,
  onRevealNewItems: _onRevealNewItems,
  style,
}) => {
  const laneLabel = LANE_LABELS[lane];
  const laneStyle = LANE_STYLES[lane];
  const prefersReducedMotion = usePrefersReducedMotion();
  const liveAnnouncer = useContext(LiveAnnouncerContext);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevTopicsLengthRef = useRef(topics.length);
  const prevScrollHeightRef = useRef<number>(0);
  const prevFirstTopicIdRef = useRef<string | undefined>(topics[0]?.id);
  const isKeyboardTriggerRef = useRef(false);

  const [canScrollTop, setCanScrollTop] = useState(false);
  const [canScrollBottom, setCanScrollBottom] = useState(false);

  const updateScrollEdges = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const hasOverflow = scrollHeight > clientHeight + 1;
    setCanScrollTop(hasOverflow && scrollTop > 4);
    setCanScrollBottom(hasOverflow && scrollTop + clientHeight < scrollHeight - 4);
  }, []);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      updateScrollEdges();
    });
    const el = scrollContainerRef.current;
    if (!el) return () => cancelAnimationFrame(rafId);

    el.addEventListener('scroll', updateScrollEdges, { passive: true });
    window.addEventListener('resize', updateScrollEdges);
    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('scroll', updateScrollEdges);
      window.removeEventListener('resize', updateScrollEdges);
    };
  }, [topics, isLoadingMore, updateScrollEdges]);

  useLayoutEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const prevLength = prevTopicsLengthRef.current;
    const prevFirstId = prevFirstTopicIdRef.current;
    const currentFirstId = topics[0]?.id;

    // Detect if newly incoming topic(s) were prepended at index 0 (not a loadMore append)
    const isPrepended =
      topics.length > prevLength && prevFirstId !== undefined && currentFirstId !== prevFirstId;

    if (isPrepended && el.scrollTop > 20) {
      const prevScrollHeight = prevScrollHeightRef.current;
      const newScrollHeight = el.scrollHeight;
      const heightDelta = newScrollHeight - prevScrollHeight;
      if (heightDelta > 0) {
        // Anchor scroll position so existing cards remain stationary
        el.scrollTop += heightDelta;
      }
    }

    prevScrollHeightRef.current = el.scrollHeight;
    prevFirstTopicIdRef.current = currentFirstId;
  }, [topics]);

  useEffect(() => {
    const prevLength = prevTopicsLengthRef.current;
    if (topics.length > prevLength) {
      const newTopicsCount = topics.length - prevLength;
      liveAnnouncer?.announce(`${laneLabel} йўналиши: ${newTopicsCount} та янги мавзу қўшилди`);

      if (isKeyboardTriggerRef.current) {
        const firstNewTopic = topics[prevLength];
        if (firstNewTopic) {
          requestAnimationFrame(() => {
            const cardEl =
              scrollContainerRef.current?.querySelector<HTMLElement>(`#topic-card-${firstNewTopic.id}`) ||
              document.getElementById(`topic-card-${firstNewTopic.id}`);
            if (cardEl) {
              cardEl.setAttribute('tabindex', '0');
              cardEl.focus();
            }
          });
        }
      }
    }
    isKeyboardTriggerRef.current = false;
    prevTopicsLengthRef.current = topics.length;
  }, [topics, laneLabel, liveAnnouncer]);

  return (
    <section
      aria-labelledby={`lane-header-${lane}`}
      style={{
        flex: '1 1 0px',
        minWidth: 240,
        backgroundColor: themeColors.colorBgLaneTrack,
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
        boxShadow: themeColors.shadowCard,
        ...style,
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
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Domain Icon Badge */}
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 26,
              height: 26,
              borderRadius: 6,
              backgroundColor: laneStyle.bg,
              color: laneStyle.text,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {LANE_ICONS[lane]}
          </span>

          {/* Isolated Bold Lane Title */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: '#0F172A',
              letterSpacing: '-0.01em',
            }}
          >
            {laneLabel}
          </Text>
        </div>

        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: laneStyle.text,
            backgroundColor: laneStyle.bg,
            padding: '2px 8px',
            borderRadius: 12,
          }}
        >
          {totalCount}
        </span>
      </header>

      {/* Relative wrapper for scroll container and edge fade overlays */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Top Edge Gradient Fade */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 6,
            height: 24,
            background: 'linear-gradient(to bottom, #F8FAFC 0%, rgba(248, 250, 252, 0) 100%)',
            pointerEvents: 'none',
            zIndex: 2,
            opacity: canScrollTop ? 1 : 0,
            transition: prefersReducedMotion ? 'none' : 'opacity 0.2s ease',
          }}
        />

        {/* Scrollable Topic Cards List */}
        <div
          ref={scrollContainerRef}
          className="lane-scrollbar"
          aria-busy={isLoadingMore}
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(148, 163, 184, 0.35) transparent',
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
                onClick={
                  onSelectTopic
                    ? () => onSelectTopic(topic, { focusHokim: lane === 'HOKIM_RELATED' })
                    : undefined
                }
                onSelectHokimChip={
                  onSelectTopic
                    ? () => onSelectTopic(topic, { focusHokim: true })
                    : undefined
                }
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
                    onClick={(e) => {
                      isKeyboardTriggerRef.current = e.detail === 0;
                      onLoadMore(lane);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        isKeyboardTriggerRef.current = true;
                      }
                    }}
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
                  onLoadMore(lane);
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

        {/* Bottom Edge Gradient Fade */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 6,
            height: 24,
            background: 'linear-gradient(to top, #F8FAFC 0%, rgba(248, 250, 252, 0) 100%)',
            pointerEvents: 'none',
            zIndex: 2,
            opacity: canScrollBottom ? 1 : 0,
            transition: prefersReducedMotion ? 'none' : 'opacity 0.2s ease',
          }}
        />
      </div>
    </section>
  );
};

export const LaneColumn = React.memo(LaneColumnComponent);

