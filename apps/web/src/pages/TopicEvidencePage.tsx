import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Tag, Space, Skeleton, Alert } from 'antd';
import {
  ArrowLeftOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useTopicEvidence } from '../topics/useTopicEvidence.js';
import { LANE_LABELS, LANE_STYLES } from '../components/topics/TopicCard.js';
import { EvidenceTimeline } from '../components/topics/EvidenceTimeline.js';
import { formatTashkentActivityTime } from '../lib/formatters.js';

const { Title, Text, Paragraph } = Typography;

export const TopicEvidencePage: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();

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

  const formattedActivityTime = topic
    ? formatTashkentActivityTime(
        topic.latestMeaningfulActivityTimestamp,
        topic.calendarDay,
      )
    : '';

  const errorMessage =
    error instanceof Error ? error.message : 'Далилларни юклашда хатолик юз берди.';

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F4F6F8',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          boxShadow: 'none',
        }}
      >
        <Space size={12}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/')}
            aria-label="Бош саҳифага қайтиш"
            style={{
              fontWeight: 600,
              fontSize: 14,
              color: '#0F172A',
            }}
          >
            Орқага
          </Button>

          <Title
            level={4}
            style={{
              margin: 0,
              fontSize: 16,
              fontWeight: 700,
              color: '#0F172A',
            }}
          >
            Мавзу далиллари
          </Title>
        </Space>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          maxWidth: 720,
          width: '100%',
          margin: '0 auto',
          padding: '20px 16px 40px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Loading Skeleton */}
        {isLoading && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '24px',
              boxShadow: 'none',
            }}
          >
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        )}

        {/* Error State */}
        {!isLoading && isError && !topic && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '32px 24px',
              textAlign: 'center',
              boxShadow: 'none',
            }}
          >
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

        {/* Empty / Not Found State */}
        {!isLoading && !isError && !topic && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '32px 24px',
              textAlign: 'center',
              boxShadow: 'none',
            }}
          >
            <Alert
              type="info"
              showIcon
              message="Мавзу топилмади"
              description="Ушбу мавзу топилмади ёки сизнинг туманингизга тегишли эмас."
              style={{
                textAlign: 'left',
                backgroundColor: '#F0F9FF',
                borderColor: '#BAE6FD',
                marginBottom: 16,
                borderRadius: 8,
                boxShadow: 'none',
              }}
            />
            <Button
              type="default"
              onClick={() => navigate('/')}
              style={{ fontWeight: 600, borderRadius: 6, boxShadow: 'none' }}
            >
              Тахтага қайтиш
            </Button>
          </div>
        )}

        {/* Loaded Topic & Evidence Content */}
        {!isLoading && topic && (
          <>
            {/* Topic Summary Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 10,
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                boxShadow: 'none',
              }}
            >
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
                  <EnvironmentOutlined style={{ color: '#0284C7', fontSize: 15 }} />
                  <Text strong style={{ fontSize: 16, color: '#0F172A' }}>
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

              <Paragraph
                style={{
                  fontSize: 14,
                  lineHeight: '22px',
                  color: '#1E293B',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {topic.summary}
              </Paragraph>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingTop: 10,
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

            {/* Anchor Quote Callout */}
            {anchorQuote && (
              <div
                style={{
                  backgroundColor: '#F0F9FF',
                  border: '1px solid #BAE6FD',
                  borderLeft: '4px solid #0284C7',
                  borderRadius: '0 8px 8px 0',
                  padding: '14px 16px',
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
                  Дастлабки хабар иқтибоси:
                </Text>
                <Text
                  italic
                  style={{
                    fontSize: 14,
                    color: '#0C4A6E',
                    lineHeight: '20px',
                    display: 'block',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  «{anchorQuote}»
                </Text>
              </div>
            )}

            {/* Evidence List Header */}
            <div>
              <Text
                strong
                style={{
                  fontSize: 15,
                  color: '#0F172A',
                  display: 'block',
                  marginBottom: 12,
                }}
              >
                Сақланган далиллар рўйхати ({evidenceList.length} / {totalCount})
              </Text>

              {/* Chronological Evidence Timeline */}
              <EvidenceTimeline
                evidenceList={evidenceList}
                totalCount={totalCount}
                hasNextPage={hasNextPage}
                isFetchingNextPage={isFetchingNextPage}
                isFetchNextPageError={isFetchNextPageError}
                onFetchNextPage={fetchNextPage}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
};
