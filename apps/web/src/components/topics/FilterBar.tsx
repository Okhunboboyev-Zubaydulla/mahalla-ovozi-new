import React from 'react';
import { Button, Space, Typography, Spin } from 'antd';
import { ClearOutlined, LoadingOutlined } from '@ant-design/icons';
import { DateScopeSelect } from './DateScopeSelect.js';
import { MahallaSelect } from './MahallaSelect.js';
import { LaneMultiSelect } from './LaneMultiSelect.js';
import { DashboardFilterState } from '../../hooks/useDashboardFilterParams.js';

const { Text } = Typography;

export interface FilterBarProps {
  filters: DashboardFilterState;
  onFilterChange: (newFilters: Partial<DashboardFilterState>) => void;
  onResetFilters: () => void;
  isDefaultFilters: boolean;
  isLoading?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  isDefaultFilters,
  isLoading = false,
}) => {
  return (
    <nav
      aria-label="Фильтрлар панели"
      style={{
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Date Scope Filter */}
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
          disabled={isLoading}
        />

        <div style={{ width: 1, height: 24, backgroundColor: '#E2E8F0' }} />

        {/* Mahalla Filter */}
        <MahallaSelect
          value={filters.mahallaName}
          onChange={(mahallaName) => onFilterChange({ mahallaName })}
          disabled={isLoading}
        />

        {/* Lane Multi-Select */}
        <LaneMultiSelect
          value={filters.lanes}
          onChange={(lanes) => onFilterChange({ lanes })}
          disabled={isLoading}
        />

        {/* Loading / Transition Spinner */}
        {isLoading && (
          <Space size={6} style={{ marginLeft: 4 }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 16, color: '#0284C7' }} spin />} />
            <Text type="secondary" style={{ fontSize: 13, color: '#64748B' }}>
              Юкланмоқда...
            </Text>
          </Space>
        )}
      </div>

      {/* Clear Filters Action */}
      {!isDefaultFilters && (
        <Button
          type="link"
          icon={<ClearOutlined />}
          onClick={onResetFilters}
          disabled={isLoading}
          style={{
            color: '#DC2626',
            fontWeight: 500,
            fontSize: 13,
            padding: '0 8px',
            height: 44,
            display: 'inline-flex',
            alignItems: 'center',
          }}
          aria-label="Барча фильтрларни тозалаш"
        >
          Фильтрларни тозалаш
        </Button>
      )}
    </nav>
  );
};
