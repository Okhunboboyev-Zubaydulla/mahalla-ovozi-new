import React, { useState, useRef } from 'react';
import { Button, Typography, Grid, Popover, Tag, Divider, Tooltip, Badge, Spin } from 'antd';
import {
  LogoutOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  WarningOutlined,
  FilterOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  ClearOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../auth/auth-context.js';
import { formatTashkentTime } from '../../lib/formatters.js';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import { DateScopeSelect } from './DateScopeSelect.js';
import { MahallaSelect } from './MahallaSelect.js';
import { LaneMultiSelect } from './LaneMultiSelect.js';
import { DashboardSearchInput } from './DashboardSearchInput.js';
import { DashboardFilterState } from '../../hooks/useDashboardFilterParams.js';

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

const LiveClock: React.FC = () => {
  const [time, setTime] = useState<string>(() => formatTashkentTime(new Date().toISOString()));

  React.useEffect(() => {
    const updateTime = () => {
      setTime(formatTashkentTime(new Date().toISOString()));
    };
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text
      type="secondary"
      style={{
        fontSize: 13,
        color: '#64748B',
        fontWeight: 500,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
      aria-label={`Ҳозирги вақт: ${time}`}
    >
      <ClockCircleOutlined style={{ color: '#94A3B8', fontSize: 13 }} />
      {time}
    </Text>
  );
};

export const MahallaOvoziLogo: React.FC<{ size?: number; style?: React.CSSProperties }> = ({
  size = 24,
  style,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0, ...style }}
    aria-hidden="true"
  >
    <rect width="24" height="24" rx="6" fill="#0284C7" />
    <path
      d="M4.5 10.5L12 4.5L19.5 10.5"
      stroke="white"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M8 17V13" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M12 18V11" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M16 17V13" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

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
  onOpenHelp?: () => void;
  helpButtonRef?: React.RefObject<HTMLButtonElement | null>;
  filters?: DashboardFilterState;
  onFilterChange?: (newFilters: Partial<DashboardFilterState>) => void;
  onResetFilters?: () => void;
  isDefaultFilters?: boolean;
  isFilterLoading?: boolean;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
}

export const BoardToolbar: React.FC<BoardToolbarProps> = ({
  districtName = 'Туман',
  calendarDay: _calendarDay,
  lastRefreshedAt,
  isRefreshing = false,
  isOffline = false,
  hasProcessingDelay = false,
  onRefresh,
  onOpenFilters,
  activeFilterCount = 0,
  mobileFilterButtonRef,
  onOpenHelp,
  helpButtonRef,
  filters,
  onFilterChange,
  onResetFilters,
  isDefaultFilters = true,
  isFilterLoading = false,
  searchQuery = '',
  onSearchChange,
}) => {
  const { actor, signOut, isSigningOut } = useAuth();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const profileButtonRef = useRef<HTMLButtonElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const screens = useBreakpoint();
  const isMobile = screens.lg === false;

  const formattedRefreshTime = lastRefreshedAt ? formatTashkentTime(lastRefreshedAt) : null;
  const isSearchActive = Boolean(searchQuery.trim());
  const canReset = !isDefaultFilters || isSearchActive;
  const formattedDistrictName = districtName.toLowerCase().includes('туман')
    ? districtName
    : `${districtName} тумани`;

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
        flexShrink: 0,
      }}
    >
      <div
        style={{
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          minHeight: 50,
          maxHeight: 52,
        }}
      >
        {/* Left Section: Logo & District */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <MahallaOvoziLogo />
          <Title
            level={4}
            id="dashboard-main-heading"
            tabIndex={-1}
            style={{
              margin: 0,
              color: '#0F172A',
              fontWeight: 700,
              fontSize: 18,
              outline: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            Маҳалла Овози
          </Title>
          <div style={{ width: 1, height: 18, backgroundColor: '#E2E8F0' }} />
          <Text
            strong
            style={{
              fontSize: 14,
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              whiteSpace: 'nowrap',
            }}
          >
            <EnvironmentOutlined style={{ color: '#0284C7', fontSize: 14, marginRight: 6 }} />
            <span>{formattedDistrictName}</span>
          </Text>
        </div>

        {/* Center Section: Desktop Filters */}
        {!isMobile && filters && onFilterChange && (
          <nav
            aria-label="Фильтрлар панели"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'nowrap',
              overflow: 'visible',
            }}
          >
            {/* Date Scope */}
            <DateScopeSelect
              dateScope={filters.dateScope}
              dateFrom={filters.dateFrom}
              dateTo={filters.dateTo}
              onChange={(scope) => {
                onFilterChange({
                  dateScope: scope.dateScope,
                  dateFrom: scope.dateFrom,
                  dateTo: scope.dateTo,
                });
              }}
            />

            {/* Mahalla */}
            <MahallaSelect
              value={filters.mahallaName}
              onChange={(mahallaName) => onFilterChange({ mahallaName })}
              style={{ width: 165, height: 32, fontSize: 14, fontWeight: 400 }}
            />

            {/* Lane */}
            <LaneMultiSelect
              value={filters.lanes}
              onChange={(lanes) => onFilterChange({ lanes })}
              style={{ height: 32, fontSize: 14, fontWeight: 400 }}
            />

            <div style={{ width: 1, height: 18, backgroundColor: '#E2E8F0', flexShrink: 0 }} />

            {/* Topic & Evidence Search (Moved to far right of filters) */}
            <DashboardSearchInput
              value={searchQuery}
              onChange={(val) => onSearchChange?.(val)}
              style={{ width: 300, height: 32, fontSize: 14, fontWeight: 400 }}
            />

            {/* Fixed-Width Feedback & Clear Action Slot (Zero Cumulative Layout Shift) */}
            <div
              style={{
                width: 80,
                height: 32,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                flexShrink: 0,
                position: 'relative',
              }}
            >
              {/* Spinner indicator when filter is applying */}
              {isFilterLoading && (
                <div
                  style={{
                    position: 'absolute',
                    left: 2,
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                >
                  <Spin indicator={<LoadingOutlined style={{ fontSize: 13, color: '#0284C7' }} spin />} />
                </div>
              )}

              {/* Clear button (smoothly transitions without altering bounding box) */}
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  visibility: canReset && onResetFilters ? 'visible' : 'hidden',
                  opacity: canReset && onResetFilters ? (isFilterLoading ? 0.5 : 1) : 0,
                  transition: 'opacity 0.15s ease, visibility 0.15s ease',
                  pointerEvents: canReset && onResetFilters && !isFilterLoading ? 'auto' : 'none',
                  paddingLeft: isFilterLoading ? 18 : 0,
                }}
              >
                {onResetFilters && (
                  <Button
                    type="link"
                    icon={!isFilterLoading ? <ClearOutlined style={{ fontSize: 12 }} /> : undefined}
                    onClick={onResetFilters}
                    disabled={isFilterLoading}
                    style={{
                      color: '#DC2626',
                      fontWeight: 500,
                      fontSize: 13,
                      padding: '0 4px',
                      height: 32,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 3,
                      flexShrink: 0,
                      whiteSpace: 'nowrap',
                    }}
                    aria-label="Барча фильтрларни тозалаш"
                  >
                    Тозалаш
                  </Button>
                )}
              </div>
            </div>
          </nav>
        )}

        {/* Right Section: Live Clock, Smart Refresh, Help, Profile Popover */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {!isMobile && (
            <>
              <LiveClock />
              <div style={{ width: 1, height: 18, backgroundColor: '#E2E8F0' }} />
            </>
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
                fontSize: 12,
                fontWeight: 500,
                height: 30,
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

          <Tooltip
            title={
              <div style={{ padding: '2px 0', fontSize: 12 }}>
                <div style={{ fontWeight: 600 }}>
                  {formattedRefreshTime
                    ? `Охирги янгиланиш: ${formattedRefreshTime}`
                    : 'Ҳали янгиланмаган'}
                </div>
                {hasProcessingDelay && (
                  <div
                    style={{
                      color: '#F59E0B',
                      marginTop: 4,
                      fontSize: 11,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <WarningOutlined /> Янгиланиш давом этмоқда — айрим сўнгги хабарлар ҳали кўринмаслиги мумкин.
                  </div>
                )}
                {isOffline && (
                  <div style={{ color: '#EF4444', marginTop: 4, fontSize: 11 }}>
                    Интернет алоқаси йўқ
                  </div>
                )}
              </div>
            }
            placement="bottom"
          >
            <Badge
              dot={hasProcessingDelay}
              status="warning"
              offset={[-2, 2]}
              aria-label={
                hasProcessingDelay
                  ? 'Янгиланиш давом этмоқда — айрим сўнгги хабарлар ҳали кўринмаслиги мумкин.'
                  : undefined
              }
            >
              <Button
                type="default"
                icon={
                  <ReloadOutlined
                    spin={Boolean(isRefreshing && !prefersReducedMotion)}
                    style={{
                      color: isRefreshing
                        ? '#0284C7'
                        : hasProcessingDelay
                        ? '#D97706'
                        : '#64748B',
                      fontSize: 14,
                    }}
                  />
                }
                onClick={onRefresh}
                disabled={isOffline || isRefreshing}
                loading={Boolean(isRefreshing && !prefersReducedMotion)}
                style={{
                  width: 32,
                  height: 32,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  borderRadius: 6,
                  borderColor: '#CBD5E1',
                  backgroundColor: '#FFFFFF',
                  boxShadow: 'none',
                }}
                aria-label="Маълумотларни янгилаш"
              />
            </Badge>
          </Tooltip>

          <Tooltip title="Тизим ёрдами" placement="bottom">
            <Button
              id="dashboard-help-button"
              ref={helpButtonRef}
              type="default"
              icon={<QuestionCircleOutlined style={{ color: '#64748B', fontSize: 15 }} />}
              onClick={onOpenHelp}
              style={{
                width: 32,
                height: 32,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 0,
                color: '#64748B',
                borderColor: '#CBD5E1',
                backgroundColor: '#FFFFFF',
                boxShadow: 'none',
                borderRadius: 6,
              }}
              aria-label="Тизим ёрдами"
            />
          </Tooltip>

          <div style={{ width: 1, height: 18, backgroundColor: '#E2E8F0' }} />

          <Popover
            content={
              <div
                role="dialog"
                aria-label="Ҳоким профили"
                style={{
                  minWidth: 220,
                  padding: '4px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div>
                  <Text strong style={{ fontSize: 15, color: '#0F172A', display: 'block' }}>
                    {actor?.username || 'Ҳоким'}
                  </Text>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 13,
                      color: '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginTop: 2,
                    }}
                  >
                    <EnvironmentOutlined style={{ color: '#0284C7' }} />
                    {districtName}
                  </Text>
                </div>

                <div>
                  <Tag
                    color="cyan"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: 4,
                      margin: 0,
                    }}
                  >
                    Туман ҳокими
                  </Tag>
                </div>

                <Divider style={{ margin: '6px 0', borderColor: '#E2E8F0' }} />

                <Button
                  type="text"
                  danger
                  icon={<LogoutOutlined />}
                  loading={isSigningOut}
                  onClick={() => {
                    setPopoverOpen(false);
                    signOut();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 14,
                    fontWeight: 500,
                    color: '#EF4444',
                    padding: '4px 8px',
                    height: 36,
                    width: '100%',
                    justifyContent: 'flex-start',
                    boxShadow: 'none',
                    borderRadius: 6,
                  }}
                  aria-label="Тизимдан чиқиш"
                >
                  Чиқиш
                </Button>
              </div>
            }
            trigger="click"
            open={popoverOpen}
            onOpenChange={(nextOpen) => {
              setPopoverOpen(nextOpen);
              if (!nextOpen) {
                profileButtonRef.current?.focus();
              }
            }}
            placement="bottomRight"
            styles={{
              body: {
                boxShadow: 'none',
                border: '1px solid #E2E8F0',
                backgroundColor: '#FFFFFF',
                borderRadius: 10,
                padding: '12px 16px',
              },
            }}
            overlayInnerStyle={{
              boxShadow: 'none',
              border: '1px solid #E2E8F0',
              backgroundColor: '#FFFFFF',
              borderRadius: 10,
              padding: '12px 16px',
            }}
          >
            <Button
              id="dashboard-profile-button"
              ref={profileButtonRef}
              type="text"
              icon={<UserOutlined style={{ color: '#0284C7', fontSize: 15 }} />}
              aria-label="Ҳоким профили ва сессия созламалари"
              aria-haspopup="dialog"
              aria-expanded={popoverOpen}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 14,
                fontWeight: 500,
                color: '#0F172A',
                boxShadow: 'none',
                height: 32,
                padding: '0 8px',
              }}
            >
              {actor?.username || 'Ҳоким'}
            </Button>
          </Popover>
        </div>
      </div>
    </header>
  );
};
