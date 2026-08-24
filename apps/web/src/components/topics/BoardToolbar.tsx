import React from 'react';
import { Button, Space, Typography, Alert, Grid } from 'antd';
import {
  LogoutOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../auth/auth-context.js';
import { formatTashkentCalendarDate, formatTashkentTime } from '../../lib/formatters.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

export interface BoardToolbarProps {
  districtName?: string;
  calendarDay?: string;
  lastRefreshedAt?: string | null;
  isRefreshing?: boolean;
  isOffline?: boolean;
  hasProcessingDelay?: boolean;
  onRefresh?: () => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  mobileFilterButtonRef?: React.RefObject<HTMLButtonElement | null>;
}

export const BoardToolbar: React.FC<BoardToolbarProps> = ({
  districtName = 'Туман',
  calendarDay,
  lastRefreshedAt,
  isRefreshing = false,
  isOffline = false,
  hasProcessingDelay = false,
  onRefresh,
  onOpenFilters,
  activeFilterCount = 0,
  mobileFilterButtonRef,
}) => {
  const { signOut, isSigningOut } = useAuth();
  const prefersReducedMotion = usePrefersReducedMotion();
  const screens = useBreakpoint();
  const isMobile = screens.lg === false;

  const formattedDate = calendarDay
    ? formatTashkentCalendarDate(calendarDay)
    : formatTashkentCalendarDate(new Date().toISOString());

  const formattedRefreshTime = lastRefreshedAt ? formatTashkentTime(lastRefreshedAt) : null;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'none',
      }}
    >
      <div
        style={{
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left Section: Logo, District & Calendar Date */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Title
            level={4}
            id="dashboard-main-heading"
            tabIndex={-1}
            style={{
              margin: 0,
              color: '#0284C7',
              fontWeight: 700,
              fontSize: 18,
              outline: 'none',
            }}
          >
            Маҳалла Овози
          </Title>
          <div style={{ width: 1, height: 20, backgroundColor: '#E2E8F0' }} />
          <Space size={12}>
            <Text
              strong
              style={{
                fontSize: 15,
                color: '#0F172A',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <EnvironmentOutlined style={{ color: '#0284C7' }} />
              {districtName}
            </Text>
            <Text
              type="secondary"
              style={{
                fontSize: 14,
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#F1F5F9',
                padding: '4px 10px',
                borderRadius: 6,
              }}
            >
              <CalendarOutlined style={{ color: '#64748B' }} />
              {formattedDate}
            </Text>
          </Space>
        </div>

        {/* Right Section: Freshness indicator, Refresh button, Sign out */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {formattedRefreshTime && (
            <Text
              type="secondary"
              style={{
                fontSize: 13,
                color: '#64748B',
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <ClockCircleOutlined style={{ color: '#94A3B8' }} />
              Охирги янгиланиш: <strong style={{ color: '#334155' }}>{formattedRefreshTime}</strong>
            </Text>
          )}

          {onOpenFilters && (
            <Button
              id="mobile-filter-button"
              ref={mobileFilterButtonRef}
              icon={
                <FilterOutlined
                  style={{ color: activeFilterCount > 0 ? '#0284C7' : '#64748B' }}
                />
              }
              onClick={onOpenFilters}
              style={{
                display: isMobile ? 'inline-flex' : 'none',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 500,
                color: activeFilterCount > 0 ? '#0284C7' : '#334155',
                borderColor: activeFilterCount > 0 ? '#0284C7' : '#CBD5E1',
                backgroundColor: activeFilterCount > 0 ? '#F0F9FF' : '#FFFFFF',
                boxShadow: 'none',
              }}
              aria-label={`Фильтрлар: ${activeFilterCount} та фаол`}
            >
              Фильтрлар {activeFilterCount > 0 ? `(${activeFilterCount})` : ''}
            </Button>
          )}

          <Button
            type="default"
            icon={
              <ReloadOutlined
                spin={Boolean(isRefreshing && !prefersReducedMotion)}
                style={{ color: isRefreshing ? '#0284C7' : '#64748B' }}
              />
            }
            onClick={onRefresh}
            disabled={isOffline || isRefreshing}
            loading={Boolean(isRefreshing && !prefersReducedMotion)}
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#334155',
              borderColor: '#CBD5E1',
              boxShadow: 'none',
            }}
            aria-label="Маълумотларни янгилаш"
          >
            Янгилаш
          </Button>

          <div style={{ width: 1, height: 20, backgroundColor: '#E2E8F0' }} />

          <Button
            type="text"
            icon={<LogoutOutlined />}
            loading={isSigningOut}
            onClick={() => signOut()}
            style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#64748B',
              boxShadow: 'none',
            }}
            aria-label="Тизимдан чиқиш"
          >
            Чиқиш
          </Button>
        </div>
      </div>

      {/* Processing Delay Warning Banner (AC 6) */}
      {hasProcessingDelay && (
        <Alert
          message={
            <span style={{ fontSize: 13, color: '#92400E' }}>
              Янгиланиш давом этмоқда — айрим сўнгги хабарлар ҳали кўринмаслиги мумкин
              {formattedRefreshTime ? ` (охирги муваффақиятли янгиланиш: ${formattedRefreshTime})` : ''}.
            </span>
          }
          type="warning"
          showIcon
          icon={<WarningOutlined style={{ color: '#D97706' }} />}
          banner
          style={{
            backgroundColor: '#FFFBEB',
            borderTop: '1px solid #FDE68A',
            borderBottom: '1px solid #FDE68A',
            padding: '6px 24px',
          }}
        />
      )}
    </header>
  );
};
