import React from 'react';
import { Skeleton } from 'antd';

export interface TopicStatisticCardProps {
  id?: string;
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor?: string;
  isLoading?: boolean;
}

export const TopicStatisticCard: React.FC<TopicStatisticCardProps> = ({
  id,
  title,
  value,
  subtitle,
  icon,
  iconBgColor,
  iconColor,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div
        id={id}
        tabIndex={-1}
        role="group"
        aria-label={`${title}: Юкланмоқда...`}
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '14px 16px',
          boxShadow: 'none',
          minHeight: 110,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          outline: 'none',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <Skeleton.Input active size="small" style={{ width: 80, height: 16 }} />
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              backgroundColor: iconBgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.6,
            }}
          />
        </div>
        <Skeleton.Input active size="large" style={{ width: 60, height: 28, margin: '4px 0' }} />
        <Skeleton.Input active size="small" style={{ width: 100, height: 14 }} />
      </div>
    );
  }

  return (
    <div
      id={id}
      tabIndex={-1}
      role="group"
      aria-label={`${title}: ${value} ${subtitle}`}
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 8,
        padding: '14px 16px',
        boxShadow: 'none',
        minHeight: 110,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        outline: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 6,
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#64748B',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={title}
        >
          {title}
        </span>
        <div
          style={{
            width: 36,
            height: 36,
            minWidth: 36,
            borderRadius: 8,
            backgroundColor: iconBgColor,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 600,
          lineHeight: '34px',
          color: '#0F172A',
          fontVariantNumeric: 'tabular-nums',
          fontFeatureSettings: '"tnum"',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={typeof value === 'string' ? value : String(value)}
      >
        {value}
      </div>

      <div
        style={{
          fontSize: 13,
          lineHeight: '18px',
          color: '#64748B',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          marginTop: 2,
        }}
        title={subtitle}
      >
        {subtitle}
      </div>
    </div>
  );
};
