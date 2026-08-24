import React, { useState, useCallback, useEffect, useRef, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button, Alert, Typography } from 'antd';
import { ReloadOutlined, DisconnectOutlined, WarningOutlined } from '@ant-design/icons';
import { TopicCardItem } from '@mahalla-ovozi/api-contracts';
import { BoardToolbar } from '../components/topics/BoardToolbar.js';
import { FilterBar } from '../components/topics/FilterBar.js';
import { FilterModalSheet } from '../components/topics/FilterModalSheet.js';
import { TopicStatisticsStrip } from '../components/topics/TopicStatisticsStrip.js';
import { FiveLaneBoard } from '../components/topics/FiveLaneBoard.js';
import { TopicEvidenceDrawer } from '../components/topics/TopicEvidenceDrawer.js';
import { DashboardHelpDrawer } from '../components/topics/DashboardHelpDrawer.js';
import { useHokimTopicBoard } from '../topics/useHokimTopicBoard.js';
import { useTopicStatistics } from '../topics/useTopicStatistics.js';
import { useTopicEvidence } from '../topics/useTopicEvidence.js';
import { useDashboardFilterParams } from '../hooks/useDashboardFilterParams.js';
import { useFocusFallback } from '../hooks/useFocusFallback.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { LiveAnnouncerContext, formatSearchAnnouncement } from '../hooks/useLiveAnnouncer.js';
import { FullPageLoader } from '../components/FullPageLoader.js';
import { formatTashkentTime } from '../lib/formatters.js';

const { Title, Paragraph } = Typography;

export const HokimDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { returnFocus } = useFocusFallback();
  const isOffline = useOnlineStatus();
  const liveAnnouncer = useContext(LiveAnnouncerContext);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [originatingLane, setOriginatingLane] = useState<string | undefined>(undefined);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const mobileFilterButtonRef = useRef<HTMLButtonElement | null>(null);
  const [helpDrawerOpen, setHelpDrawerOpen] = useState(false);
  const helpButtonRef = useRef<HTMLButtonElement | null>(null);

  // In-Memory Search Query (AD-09: Never serialized to URL/Storage)
  const [searchQuery, setSearchQuery] = useState<string>('');

  const {
    filters,
    isDefaultFilters,
    activeFilterCount,
    setFilters,
    resetFilters,
  } = useDashboardFilterParams();

  const {
    board,
    isLoading,
    isRefreshing,
    isFilterTransitioning,
    isError,
    error,
    lastRefreshedAt,
    hasProcessingDelay,
    lanes,
    activeLanes,
    loadMore,
    revealNewTopics,
    manualRefresh,
    refetch,
    retryFilter,
  } = useHokimTopicBoard(filters, searchQuery);

  const {
    statistics,
    isLoading: isStatsLoading,
    isFetching: isStatsFetching,
    refetch: refetchStats,
  } = useTopicStatistics(filters, searchQuery);

  // Announce search result count when search query settles (AC 3, AC 7)
  const prevSearchAnnouncedRef = useRef<string>('');
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed && !isFilterTransitioning && !isStatsLoading && !isStatsFetching && statistics !== undefined) {
      const searchScopeSignature = `${trimmed}:${statistics.totalUniqueTopics}`;
      if (prevSearchAnnouncedRef.current !== searchScopeSignature) {
        prevSearchAnnouncedRef.current = searchScopeSignature;
        liveAnnouncer?.announce(formatSearchAnnouncement(statistics.totalUniqueTopics));
      }
    } else if (!trimmed) {
      prevSearchAnnouncedRef.current = '';
    }
  }, [searchQuery, isFilterTransitioning, isStatsLoading, isStatsFetching, statistics, liveAnnouncer]);

  const handleResetAll = useCallback(() => {
    resetFilters();
    setSearchQuery('');
  }, [resetFilters]);

  const handleManualRefresh = useCallback(() => {
    manualRefresh();
    refetchStats();
  }, [manualRefresh, refetchStats]);

  const handleRetry = useCallback(() => {
    retryFilter();
    refetchStats();
  }, [retryFilter, refetchStats]);

  const handleInvalidatedTopic = useCallback(() => {
    const prevLane = originatingLane;
    setSelectedTopicId(null);
    setTimeout(() => {
      returnFocus(prevLane);
    }, 50);
  }, [originatingLane, returnFocus]);

  const evidenceQuery = useTopicEvidence(selectedTopicId, {
    onInvalidated: handleInvalidatedTopic,
  });
  const refetchEvidence = evidenceQuery.refetch;

  // Revalidate open evidence drawer when board refresh completes (AC 5)
  const prevRefreshedAtRef = useRef<string | null>(lastRefreshedAt);
  useEffect(() => {
    if (lastRefreshedAt && lastRefreshedAt !== prevRefreshedAtRef.current) {
      prevRefreshedAtRef.current = lastRefreshedAt;
      if (selectedTopicId) {
        refetchEvidence();
      }
    }
  }, [lastRefreshedAt, selectedTopicId, refetchEvidence]);

  const handleOpenHelp = useCallback(() => {
    if (window.innerWidth < 1024) {
      navigate({ pathname: '/help', search: location.search });
    } else {
      setSelectedTopicId(null);
      setHelpDrawerOpen(true);
    }
  }, [navigate, location.search]);

  const handleCloseHelp = useCallback(() => {
    setHelpDrawerOpen(false);
    setTimeout(() => {
      if (helpButtonRef.current) {
        helpButtonRef.current.focus();
      } else {
        const btn = document.getElementById('dashboard-help-button');
        if (btn) {
          btn.focus();
        } else {
          returnFocus();
        }
      }
    }, 50);
  }, [returnFocus]);

  const handleSelectTopic = (topic: TopicCardItem) => {
    setOriginatingLane(topic.primaryLane);
    setHelpDrawerOpen(false);
    if (window.innerWidth < 1024) {
      navigate(`/topics/${topic.id}/evidence`);
    } else {
      setSelectedTopicId(topic.id);
    }
  };

  const handleCloseDrawer = () => {
    const prevTopicId = selectedTopicId;
    const prevLane = originatingLane;
    setSelectedTopicId(null);
    setTimeout(() => {
      const card = prevTopicId ? document.getElementById(`topic-card-${prevTopicId}`) : null;
      if (card) {
        card.focus();
      } else {
        returnFocus(prevLane);
      }
    }, 50);
  };

  const formattedRefreshTime = lastRefreshedAt ? formatTashkentTime(lastRefreshedAt) : null;

  if (isLoading && !board) {
    return <FullPageLoader />;
  }

  // Cold load failure: no existing board data to show
  if (isError && !board) {
    const errorMessage =
      error instanceof Error ? error.message : 'Мавзулар тахтасини юклаб бўлмади.';

    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F4F6F8',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <BoardToolbar districtName="Маҳалла Овози" isOffline={isOffline} />
        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '36px 32px',
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              boxShadow: 'none',
            }}
          >
            <Alert
              type="error"
              showIcon
              message={
                <Title level={5} style={{ margin: 0, color: '#EF4444' }}>
                  Юклашда хатолик
                </Title>
              }
              description={
                <Paragraph style={{ margin: '8px 0 16px 0', color: '#64748B' }}>
                  {errorMessage}
                </Paragraph>
              }
              style={{
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                marginBottom: 20,
                textAlign: 'left',
              }}
            />
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              disabled={isOffline}
              style={{ fontWeight: 600, height: 44, borderRadius: 8, boxShadow: 'none' }}
            >
              Қайта уриниш
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F4F6F8',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <BoardToolbar
        districtName={board?.districtName}
        calendarDay={board?.calendarDay}
        lastRefreshedAt={lastRefreshedAt}
        isRefreshing={isRefreshing}
        isOffline={isOffline}
        hasProcessingDelay={hasProcessingDelay}
        onRefresh={handleManualRefresh}
        onOpenFilters={() => setFilterModalOpen(true)}
        activeFilterCount={activeFilterCount}
        mobileFilterButtonRef={mobileFilterButtonRef}
        onOpenHelp={handleOpenHelp}
        helpButtonRef={helpButtonRef}
      />

      {/* Desktop Sticky Filter Bar */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        onResetFilters={handleResetAll}
        isDefaultFilters={isDefaultFilters}
        isLoading={isFilterTransitioning}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Mobile Responsive Filter Modal Sheet */}
      <FilterModalSheet
        open={filterModalOpen}
        onClose={() => setFilterModalOpen(false)}
        filters={filters}
        onApplyFilters={setFilters}
        onResetFilters={handleResetAll}
        openerRef={mobileFilterButtonRef}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* 5-Card Statistics Strip (AC 1, AC 14) */}
      <TopicStatisticsStrip
        statistics={statistics}
        isLoading={isStatsLoading && !statistics}
      />

      {/* Offline Warning Banner (AC 8) */}
      {isOffline && (
        <Alert
          message={
            <span style={{ fontSize: 13, color: '#B45309' }}>
              Интернет алоқаси йўқ
              {formattedRefreshTime ? `. Охирги муваффақиятли янгиланиш: ${formattedRefreshTime}` : ''}.
            </span>
          }
          type="warning"
          showIcon
          icon={<DisconnectOutlined style={{ color: '#D97706' }} />}
          banner
          style={{
            backgroundColor: '#FEF3C7',
            borderBottom: '1px solid #FDE68A',
            padding: '6px 24px',
          }}
        />
      )}

      {/* Stale Error Alert Banner on Background Refresh or Filter Failure (AC 8, AC 10) */}
      {isError && board && !isOffline && (
        <Alert
          message={
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <span style={{ fontSize: 13, color: '#991B1B' }}>
                {searchQuery.trim()
                  ? `Қидирув бўйича маълумотларни юклаб бўлмади${formattedRefreshTime ? ` (охирги муваффақиятли янгиланиш: ${formattedRefreshTime})` : ''}.`
                  : isDefaultFilters
                  ? `Янги маълумотларни юклаб бўлмади${formattedRefreshTime ? ` (охирги муваффақиятли янгиланиш: ${formattedRefreshTime})` : ''}.`
                  : `Танланган фильтрлар бўйича маълумотларни юклаб бўлмади${formattedRefreshTime ? ` (охирги муваффақиятли янгиланиш: ${formattedRefreshTime})` : ''}.`}
              </span>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={handleRetry}
                style={{
                  borderColor: '#FCA5A5',
                  color: '#991B1B',
                  fontSize: 12,
                  height: 36,
                  borderRadius: 6,
                  boxShadow: 'none',
                }}
              >
                Қайта уриниш
              </Button>
            </div>
          }
          type="error"
          showIcon
          icon={<WarningOutlined style={{ color: '#EF4444' }} />}
          banner
          style={{
            backgroundColor: '#FEE2E2',
            borderBottom: '1px solid #FECACA',
            padding: '6px 24px',
          }}
        />
      )}

      <FiveLaneBoard
        lanes={lanes}
        activeLanes={activeLanes}
        isFiltered={!isDefaultFilters || Boolean(searchQuery.trim())}
        onResetFilters={handleResetAll}
        selectedTopicId={selectedTopicId}
        searchQuery={searchQuery}
        onLoadMore={loadMore}
        onSelectTopic={handleSelectTopic}
        onRevealNewTopics={revealNewTopics}
      />

      <TopicEvidenceDrawer
        topicId={selectedTopicId}
        onClose={handleCloseDrawer}
      />

      <DashboardHelpDrawer
        open={helpDrawerOpen}
        onClose={handleCloseHelp}
      />
    </div>
  );
};
