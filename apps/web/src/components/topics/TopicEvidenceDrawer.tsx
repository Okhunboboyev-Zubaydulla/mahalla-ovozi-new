import React, { useEffect, useRef } from 'react';
import { Drawer, Typography, Tag, Space, Skeleton, Button, Alert } from 'antd';
import {
  CloseOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useTopicEvidence } from '../../topics/useTopicEvidence.js';
import { LANE_LABELS, LANE_STYLES } from './TopicCard.js';
import { EvidenceTimeline } from './EvidenceTimeline.js';
import { formatTashkentActivityTime } from '../../lib/formatters.js';

const { Title, Text, Paragraph } = Typography;

export interface TopicEvidenceDrawerProps {
  topicId: string | null;
  onClose: () => void;
}

export const TopicEvidenceDrawer: React.FC<TopicEvidenceDrawerProps> = ({
  topicId,
  onClose,
}) => {
  const headingRef = useRef<HTMLDivElement>(null);

  const {
    topic,
    anchorQuote,
    evidenceList,
    totalCount,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    isFetchNextPageError,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useTopicEvidence(topicId);

  // Programmatic focus on drawer heading when topicId opens or changes (AC 7)
  useEffect(() => {
    if (!topicId) {
      return;
    }
    // Small timeout allows DOM to mount drawer contents before focusing
    const timer = setTimeout(() => {
      headingRef.current?.focus();
    }, 50);
    return () => clearTimeout(timer);
  }, [topicId]);

  // Keyboard Escape listener to close drawer and restore focus (AC 7)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && topicId) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [topicId, onClose]);

  const formattedActivityTime = topic
    ? formatTashkentActivityTime(
        topic.latestMeaningfulActivityTimestamp,
        topic.calendarDay,
      )
    : '';

  const errorMessage =
    error instanceof Error ? error.message : 'Далилларни юклашда хатолик юз берди.';

  return (
    <Drawer
      open={Boolean(topicId)}
      onClose={onClose}
      mask={false}
      rootStyle={{ pointerEvents: 'none' }}
      width={520}
      aria-label="Мавзу далиллари"
      aria-modal={false}
      keyboard={false}
      closeIcon={<CloseOutlined aria-label="Ёпиш" style={{ fontSize: 16, color: '#64748B' }} />}
      styles={{
        wrapper: {
          boxShadow: 'none',
          pointerEvents: 'auto',
        },
        content: {
          boxShadow: 'none',
          borderLeft: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
        },
        header: {
          borderBottom: '1px solid #E2E8F0',
          padding: '14px 20px',
        },
        body: {
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflowY: 'auto',
          backgroundColor: '#F8FAFC',
        },
      }}
      title={
        <div
          ref={headingRef}
          tabIndex={-1}
          id="topic-evidence-heading"
          style={{ outline: 'none' }}
        >
          <Title
            level={5}
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: '#0F172A',
            }}
          >
            Мавзу далиллари
          </Title>
        </div>
      }
    >
      <section
        role="region"
        aria-label="Мавзу далиллари"
        style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      >
        {/* 1. Loading Skeleton during Initial Fetch / In-place Switching (AC 7) */}
        {isLoading && (
          <div style={{ padding: '12px 0' }}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        )}

        {/* 2. Error State for Initial Load (AC 7) */}
        {!isLoading && isError && !topic && (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
          <Alert
            type="error"
            showIcon
            message="Юклашда хатолик"
            description={errorMessage}
            style={{
              textAlign: 'left',
              backgroundColor: '#FEE2E2',
              borderColor: '#FECACA',
              marginBottom: 16,
              borderRadius: 8,
              boxShadow: 'none',
            }}
          />
          <Button
            type="primary"
            icon={<ReloadOutlined />}
            onClick={() => refetch()}
            style={{ fontWeight: 600, borderRadius: 6, boxShadow: 'none' }}
          >
            Қайта уриниш
          </Button>
        </div>
      )}

      {/* 3. Loaded Topic Header & Evidence Stream */}
      {!isLoading && topic && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Topic Metadata & Summary Card */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              boxShadow: 'none',
            }}
          >
            {/* Mahalla + Lane Tags */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <Space size={6}>
                <EnvironmentOutlined style={{ color: '#0284C7', fontSize: 14 }} />
                <Text strong style={{ fontSize: 15, color: '#0F172A' }}>
                  {topic.mahallaName}
                </Text>
              </Space>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {topic.lanes.map((lane) => {
                  const style = LANE_STYLES[lane] || LANE_STYLES.HOKIM_RELATED;
                  const label = LANE_LABELS[lane] || lane;
                  return (
                    <Tag
                      key={lane}
                      style={{
                        backgroundColor: style.bg,
                        color: style.text,
                        borderColor: style.border,
                        fontSize: 11,
                        fontWeight: 600,
                        margin: 0,
                        borderRadius: 4,
                      }}
                    >
                      {label}
                    </Tag>
                  );
                })}
              </div>
            </div>

            {/* Summary Text */}
            <Paragraph
              style={{
                fontSize: 14,
                lineHeight: '20px',
                color: '#1E293B',
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {topic.summary}
            </Paragraph>

            {/* Latest Activity Time + Total Evidence Count */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: 8,
                borderTop: '1px solid #F1F5F9',
                fontSize: 13,
                color: '#64748B',
              }}
            >
              <Space size={4}>
                <MessageOutlined style={{ fontSize: 13, color: '#94A3B8' }} />
                <Text style={{ fontSize: 13, color: '#64748B' }}>
                  Жами: <span style={{ fontWeight: 600, color: '#0F172A' }}>{totalCount}</span> та хабар
                </Text>
              </Space>

              {formattedActivityTime && (
                <Space size={4}>
                  <ClockCircleOutlined style={{ fontSize: 13, color: '#94A3B8' }} />
                  <Text style={{ fontSize: 13, color: '#64748B' }}>{formattedActivityTime}</Text>
                </Space>
              )}
            </div>
          </div>

          {/* Anchor Quote Callout Box (AC 9) */}
          {anchorQuote && (
            <div
              style={{
                backgroundColor: '#F0F9FF',
                border: '1px solid #BAE6FD',
                borderLeft: '4px solid #0284C7',
                borderRadius: '0 8px 8px 0',
                padding: '12px 14px',
                boxShadow: 'none',
              }}
            >
              <Text
                style={{
                  display: 'block',
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#0369A1',
                  marginBottom: 4,
                  textTransform: 'uppercase',
                  letterSpacing: '0.03em',
                }}
              >
                Асосий далил иқтибоси:
              </Text>
              <Text
                italic
                style={{
                  fontSize: 13,
                  color: '#0C4A6E',
                  lineHeight: '18px',
                  display: 'block',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                «{anchorQuote}»
              </Text>
            </div>
          )}

          {/* Evidence Section Header */}
          <div style={{ marginTop: 4 }}>
            <Text
              strong
              style={{
                fontSize: 14,
                color: '#0F172A',
                display: 'block',
                marginBottom: 8,
              }}
            >
              Сақланган далиллар рўйхати ({evidenceList.length} / {totalCount})
            </Text>

            {/* Evidence Timeline */}
            <EvidenceTimeline
              evidenceList={evidenceList}
              totalCount={totalCount}
              hasNextPage={hasNextPage}
              isFetchingNextPage={isFetchingNextPage}
              isFetchNextPageError={isFetchNextPageError}
              onFetchNextPage={fetchNextPage}
            />
          </div>
        </div>
      )}
      </section>
    </Drawer>
  );
};
