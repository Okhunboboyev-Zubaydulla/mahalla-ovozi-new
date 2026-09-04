import React, { useState } from 'react';
import { Tag, Typography, Space } from 'antd';
import {
  ClockCircleOutlined,
  MessageOutlined,
  EnvironmentOutlined,
  BankOutlined,
  ThunderboltOutlined,
  FireOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { TopicCardItem, QualifyingLane } from '@mahalla-ovozi/api-contracts';
import { formatTashkentCalendarDate, formatTashkentTime } from '../../lib/formatters.js';
import { HighlightText } from './HighlightText.js';
import { themeColors } from '../../theme/antd-theme.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';

const { Text, Paragraph } = Typography;

export const WaterDropIcon: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <span role="img" aria-label="сув" className="anticon" style={style}>
    <svg
      viewBox="0 0 1024 1024"
      width="1em"
      height="1em"
      fill="currentColor"
      focusable="false"
    >
      <path d="M512 64C512 64 213.33 469.33 213.33 682.67c0 164.95 133.72 298.66 298.67 298.66s298.67-133.71 298.67-298.66C810.67 469.33 512 64 512 64z m0 810.67c-120.53 0-218.67-98.13-218.67-218.67 0-117.33 149.34-362.67 218.67-469.33 69.33 106.66 218.67 352 218.67 469.33 0 120.54-98.14 218.67-218.67 218.67z" />
    </svg>
  </span>
);

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

export const LANE_ICONS: Record<QualifyingLane, React.ReactNode> = {
  HOKIM_RELATED: <BankOutlined aria-hidden="true" />,
  WATER: <WaterDropIcon style={{ fontSize: 13 }} />,
  ELECTRICITY: <ThunderboltOutlined aria-hidden="true" />,
  GAS: <FireOutlined aria-hidden="true" />,
  WASTE: <DeleteOutlined aria-hidden="true" />,
};

export interface TopicCardProps {
  topic: TopicCardItem;
  currentLane?: QualifyingLane;
  isSelected?: boolean;
  searchQuery?: string;
  onClick?: () => void;
}

const TopicCardComponent: React.FC<TopicCardProps> = ({
  topic,
  currentLane: _currentLane,
  isSelected = false,
  searchQuery,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();

  const formattedMahallaName = topic.mahallaName.toLowerCase().includes('маҳалла')
    ? topic.mahallaName
    : `${topic.mahallaName} маҳалласи`;

  const formattedDate = formatTashkentCalendarDate(topic.calendarDay);
  const timeStr = formatTashkentTime(topic.latestMeaningfulActivityTimestamp);
  const formattedTimestamp = timeStr ? `${formattedDate}, ${timeStr}` : formattedDate;

  const isInteractive = Boolean(onClick);
  const isElevated = isInteractive && isHovered;

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
      onMouseEnter={isInteractive ? () => setIsHovered(true) : undefined}
      onMouseLeave={isInteractive ? () => setIsHovered(false) : undefined}
      onFocus={(e) => {
        if (e.target !== e.currentTarget) return;
        setIsFocused(true);
      }}
      onBlur={(e) => {
        if (e.target !== e.currentTarget) return;
        setIsFocused(false);
      }}
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${
          isSelected || isFocused ? '#0284C7' : isElevated ? '#CBD5E1' : '#E2E8F0'
        }`,
        borderRadius: 8,
        padding: '16px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        cursor: isInteractive ? 'pointer' : 'default',
        boxShadow: isElevated ? themeColors.shadowCardHover : themeColors.shadowCard,
        outline: isSelected || isFocused ? '2px solid #0284C7' : 'none',
        outlineOffset: isSelected || isFocused ? '2px' : undefined,
        transition: prefersReducedMotion
          ? 'none'
          : 'border-color 0.15s ease, box-shadow 0.15s ease',
      }}
      aria-current={isSelected ? 'true' : undefined}
      aria-label={`Мавзу: ${formattedMahallaName}, ${topic.summary}`}
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
          <EnvironmentOutlined style={{ color: '#0284C7', fontSize: 13 }} />
          <Text
            strong
            style={{
              fontSize: 13,
              color: '#475569',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {formattedMahallaName}
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
          fontWeight: 500,
          color: '#0F172A',
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

      {/* Footer: Evidence Count & Latest Activity Timestamp */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 6,
          paddingTop: 8,
          borderTop: '1px solid #E2E8F0',
          marginTop: 2,
        }}
      >
        <Space size={4} style={{ color: '#64748B', fontSize: 13 }}>
          <MessageOutlined style={{ fontSize: 13, color: '#94A3B8' }} />
          <Text style={{ fontSize: 13, color: '#64748B' }}>
            <span style={{ fontWeight: 600, color: '#0F172A' }}>{topic.evidenceCount}</span> та хабар
          </Text>
        </Space>

        {formattedTimestamp && (
          <Space size={4} style={{ color: '#64748B', fontSize: 13 }}>
            <ClockCircleOutlined style={{ fontSize: 13, color: '#94A3B8' }} />
            <Text style={{ fontSize: 13, color: '#64748B' }}>{formattedTimestamp}</Text>
          </Space>
        )}
      </div>
    </article>
  );
};

export const TopicCard = React.memo(TopicCardComponent);

