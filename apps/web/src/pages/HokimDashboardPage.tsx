import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Alert, Typography } from 'antd';
import { ReloadOutlined, DisconnectOutlined, WarningOutlined } from '@ant-design/icons';
import { TopicCardItem } from '@mahalla-ovozi/api-contracts';
import { BoardToolbar } from '../components/topics/BoardToolbar.js';
import { FiveLaneBoard } from '../components/topics/FiveLaneBoard.js';
import { TopicEvidenceDrawer } from '../components/topics/TopicEvidenceDrawer.js';
import { useHokimTopicBoard } from '../topics/useHokimTopicBoard.js';
import { useTopicEvidence } from '../topics/useTopicEvidence.js';
import { useFocusFallback } from '../hooks/useFocusFallback.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { FullPageLoader } from '../components/FullPageLoader.js';
import { formatTashkentTime } from '../lib/formatters.js';

const { Title, Paragraph } = Typography;

export const HokimDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { returnFocus } = useFocusFallback();
  const isOffline = useOnlineStatus();
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [originatingLane, setOriginatingLane] = useState<string | undefined>(undefined);

  const {
    board,
    isLoading,
    isRefreshing,
    isError,
    error,
    lastRefreshedAt,
    hasProcessingDelay,
    lanes,
    loadMore,
    revealNewTopics,
    manualRefresh,
    refetch,
  } = useHokimTopicBoard();

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

  const handleSelectTopic = (topic: TopicCardItem) => {
    setOriginatingLane(topic.primaryLane);
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
              style={{ fontWeight: 600, height: 40, borderRadius: 8, boxShadow: 'none' }}
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
        onRefresh={manualRefresh}
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

      {/* Stale Error Alert Banner on Background Refresh Failure (AC 8) */}
      {isError && board && !isOffline && (
        <Alert
          message={
            <span style={{ fontSize: 13, color: '#991B1B' }}>
              Янги маълумотларни юклаб бўлмади
              {formattedRefreshTime ? ` (охирги муваффақиятли янгиланиш: ${formattedRefreshTime})` : ''}.
            </span>
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
        selectedTopicId={selectedTopicId}
        onLoadMore={loadMore}
        onSelectTopic={handleSelectTopic}
        onRevealNewTopics={revealNewTopics}
      />
      <TopicEvidenceDrawer
        topicId={selectedTopicId}
        onClose={handleCloseDrawer}
      />
    </div>
  );
};
