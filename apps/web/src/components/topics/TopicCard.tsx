import React from 'react';
import { Tag, Typography, Space } from 'antd';
import { ClockCircleOutlined, MessageOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { TopicCardItem, QualifyingLane } from '@mahalla-ovozi/api-contracts';
import { formatTashkentActivityTime } from '../../lib/formatters.js';
import { HighlightText } from './HighlightText.js';

const { Text, Paragraph } = Typography;

export const LANE_LABELS: Record<QualifyingLane, string> = {
  HOKIM_RELATED: 'Ҳокимга оид',
  WATER: 'Сув',
  ELECTRICITY: 'Электр',
  GAS: 'Газ',
  WASTE: 'Чиқинди',
};

export const LANE_STYLES: Record<
  QualifyingLane,
  { bg: string; text: string; border: string }
> = {
  HOKIM_RELATED: { bg: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
  WATER: { bg: '#DBEAFE', text: '#1D4ED8', border: '#BFDBFE' },
  ELECTRICITY: { bg: '#F3E8FF', text: '#6D28D9', border: '#E9D5FF' },
  GAS: { bg: '#FFEDD5', text: '#C2410C', border: '#FED7AA' },
  WASTE: { bg: '#D1FAE5', text: '#047857', border: '#A7F3D0' },
};

export interface TopicCardProps {
  topic: TopicCardItem;
  currentLane?: QualifyingLane;
  isSelected?: boolean;
  searchQuery?: string;
  onClick?: () => void;
}

export const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  currentLane: _currentLane,
  isSelected = false,
  searchQuery,
  onClick,
}) => {
  const formattedTime = formatTashkentActivityTime(
    topic.latestMeaningfulActivityTimestamp,
    topic.calendarDay,
  );

  return (
    <article
      id={`topic-card-${topic.id}`}
      role={onClick ? 'button' : undefined}
      aria-pressed={onClick ? isSelected : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        backgroundColor: isSelected ? '#F8FAFC' : '#FFFFFF',
        border: isSelected ? '1px solid #0284C7' : '1px solid #E2E8F0',
        borderRadius: 8,
        padding: '16px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: 'none',
        outline: isSelected ? '2px solid #0284C7' : 'none',
        outlineOffset: isSelected ? '2px' : undefined,
        transition: 'border-color 0.15s ease',
      }}
      onFocus={(e) => {
        if (e.target !== e.currentTarget) return;
        e.currentTarget.style.borderColor = '#0284C7';
        e.currentTarget.style.outline = '2px solid #0284C7';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        if (e.target !== e.currentTarget) return;
        if (!isSelected) {
          e.currentTarget.style.borderColor = '#E2E8F0';
          e.currentTarget.style.outline = 'none';
        }
      }}
      aria-current={isSelected ? 'true' : undefined}
      aria-label={`Мавзу: ${topic.mahallaName}, ${topic.summary}`}
    >
      {/* Header: Mahalla name + Badges (New / Updated / Search Match) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Space size={6} style={{ minWidth: 0, flex: 1 }}>
          <EnvironmentOutlined style={{ color: '#0284C7', fontSize: 14 }} />
          <Text
            strong
            style={{
              fontSize: 14,
              color: '#0F172A',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {topic.mahallaName}
          </Text>
        </Space>

        <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
          {/* Match Badges (AC 2) */}
          {topic.searchMatchBadge === 'evidence' && (
            <Tag
              style={{
                backgroundColor: '#FEF3C7',
                color: '#B45309',
                borderColor: '#FDE68A',
                fontWeight: 500,
                fontSize: 11,
                margin: 0,
                borderRadius: 4,
              }}
            >
              Далилда топилди
            </Tag>
          )}
          {topic.searchMatchBadge === 'author' && (
            <Tag
              style={{
                backgroundColor: '#E0E7FF',
                color: '#4338CA',
                borderColor: '#C7D2FE',
                fontWeight: 500,
                fontSize: 11,
                margin: 0,
                borderRadius: 4,
              }}
            >
              Фойдаланувчида топилди
            </Tag>
          )}
          {topic.isNew && (
            <Tag
              color="#DC2626"
              style={{
                backgroundColor: '#FEE2E2',
                color: '#DC2626',
                borderColor: '#FECACA',
                fontWeight: 600,
                fontSize: 12,
                margin: 0,
                borderRadius: 4,
              }}
            >
              Янги
            </Tag>
          )}
          {!topic.isNew && topic.isUpdated && (
            <Tag
              color="#D97706"
              style={{
                backgroundColor: '#FEF3C7',
                color: '#D97706',
                borderColor: '#FDE68A',
                fontWeight: 600,
                fontSize: 12,
                margin: 0,
                borderRadius: 4,
              }}
            >
              Янгиланди
            </Tag>
          )}
        </div>
      </div>

      {/* Summary Body (Complete Unclamped Text in Uzbek Cyrillic with Highlight) */}
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
        <HighlightText text={topic.summary} searchQuery={searchQuery} />
      </Paragraph>

      {/* Additional Lanes Textual Indication */}
      {topic.additionalLanes && topic.additionalLanes.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: '#64748B' }}>Қўшимча:</Text>
          {topic.additionalLanes.map((lane) => {
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
                  fontWeight: 500,
                  margin: 0,
                  borderRadius: 4,
                }}
              >
                {label}
              </Tag>
            );
          })}
        </div>
      )}

      {/* Footer: Evidence Count & Latest Meaningful Activity Time */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 8,
          borderTop: '1px solid #F1F5F9',
          marginTop: 2,
        }}
      >
        <Space size={4} style={{ color: '#64748B', fontSize: 13 }}>
          <MessageOutlined style={{ fontSize: 13, color: '#94A3B8' }} />
          <Text style={{ fontSize: 13, color: '#64748B' }}>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>{topic.evidenceCount}</span> та хабар
          </Text>
        </Space>

        {formattedTime && (
          <Space size={4} style={{ color: '#64748B', fontSize: 13 }}>
            <ClockCircleOutlined style={{ fontSize: 13, color: '#94A3B8' }} />
            <Text style={{ fontSize: 13, color: '#64748B' }}>{formattedTime}</Text>
          </Space>
        )}
      </div>
    </article>
  );
};
