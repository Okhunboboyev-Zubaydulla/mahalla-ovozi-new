import React from 'react';
import { Typography, Tag, Button, Space } from 'antd';
import {
  ClockCircleOutlined,
  UserOutlined,
  SendOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import { TopicEvidenceItem } from '@mahalla-ovozi/api-contracts';

const { Text, Paragraph } = Typography;

export interface EvidenceItemProps {
  evidence: TopicEvidenceItem;
}

export const EvidenceItem: React.FC<EvidenceItemProps> = ({ evidence }) => {
  const senderDisplay = evidence.authorUsername || evidence.authorName || 'Фуқаро';

  return (
    <article
      tabIndex={0}
      aria-label={`Далил: ${senderDisplay}, ${evidence.formattedTime}`}
      style={{
        backgroundColor: '#FFFFFF',
        border: evidence.isAnchor ? '1.5px solid #0284C7' : '1px solid #E2E8F0',
        borderRadius: 8,
        padding: '14px 16px',
        marginBottom: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: 'none',
        outline: 'none',
        transition: 'border-color 0.15s ease',
      }}
      onFocus={(e) => {
        if (!evidence.isAnchor) {
          e.currentTarget.style.borderColor = '#0284C7';
        }
        e.currentTarget.style.outline = '2px solid #0284C7';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        if (!evidence.isAnchor) {
          e.currentTarget.style.borderColor = '#E2E8F0';
        }
        e.currentTarget.style.outline = 'none';
      }}
    >
      {/* Header: Sender attribution + Timestamp + In-situ Anchor badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        <Space size={6} style={{ minWidth: 0 }}>
          <UserOutlined style={{ color: '#0284C7', fontSize: 13 }} />
          <Text
            strong
            style={{
              fontSize: 13,
              color: '#0F172A',
            }}
          >
            {senderDisplay}
          </Text>
          {evidence.contentType === 'MEDIA_CAPTION' && (
            <Tag
              icon={<PictureOutlined style={{ fontSize: 11 }} />}
              style={{
                fontSize: 11,
                borderRadius: 4,
                margin: 0,
                backgroundColor: '#F1F5F9',
                color: '#475569',
                borderColor: '#CBD5E1',
              }}
            >
              Медиа
            </Tag>
          )}
        </Space>

        <Space size={8} style={{ flexShrink: 0 }}>
          {evidence.isAnchor && (
            <Tag
              style={{
                backgroundColor: '#E0F2FE',
                color: '#0284C7',
                borderColor: '#BAE6FD',
                fontWeight: 600,
                fontSize: 12,
                borderRadius: 4,
                margin: 0,
              }}
            >
              Асосий далил
            </Tag>
          )}
          <Space size={4} style={{ color: '#64748B', fontSize: 12 }}>
            <ClockCircleOutlined style={{ fontSize: 12, color: '#94A3B8' }} />
            <Text style={{ fontSize: 12, color: '#64748B' }}>{evidence.formattedTime}</Text>
          </Space>
        </Space>
      </div>

      {/* Body: Verbatim message text preserving line breaks */}
      <Paragraph
        style={{
          fontSize: 14,
          lineHeight: '20px',
          color: '#1E293B',
          margin: '4px 0 0 0',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {evidence.verbatimText}
      </Paragraph>

      {/* Footer Action: Best-effort Telegram deep link button (AC 6) */}
      {evidence.telegramDeepLink && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
          <Button
            size="small"
            type="default"
            icon={<SendOutlined style={{ fontSize: 12 }} />}
            href={evidence.telegramDeepLink}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              borderRadius: 6,
              borderColor: '#CBD5E1',
              color: '#0284C7',
              fontWeight: 500,
              boxShadow: 'none',
              height: 28,
            }}
          >
            Telegramда очиш
          </Button>
        </div>
      )}
    </article>
  );
};
