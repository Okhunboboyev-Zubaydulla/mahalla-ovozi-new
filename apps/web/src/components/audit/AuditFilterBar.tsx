import React, { useState, useEffect } from 'react';
import { Flex, Select, DatePicker, Input, Button, theme } from 'antd';
import { ClearOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import {
  AuditActionCategory,
  AuditActorRole,
  AuditActionOutcome,
} from '@mahalla-ovozi/api-contracts';
import { districtClient } from '../../district/district-client.js';

const { RangePicker } = DatePicker;

export interface AuditFilters {
  districtId?: string;
  startDate?: string;
  endDate?: string;
  category?: AuditActionCategory;
  actorRole?: AuditActorRole;
  outcome?: AuditActionOutcome;
  action?: string;
  search?: string;
}

interface AuditFilterBarProps {
  filters: AuditFilters;
  onChange: (filters: AuditFilters) => void;
  onReset: () => void;
}

export const AuditFilterBar: React.FC<AuditFilterBarProps> = ({
  filters,
  onChange,
  onReset,
}) => {
  const { token } = theme.useToken();
  const [searchInput, setSearchInput] = useState(filters.search || '');

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== (filters.search || '')) {
        onChange({ ...filters, search: searchInput ? searchInput.trim() : undefined });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync external filter changes to searchInput
  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  // Fetch districts for dropdown
  const { data: districtsData } = useQuery({
    queryKey: ['districts', 'list'],
    queryFn: districtClient.listDistricts,
    staleTime: 60_000,
  });

  const districtOptions = [
    { label: 'Барча туманлар', value: '' },
    { label: 'Глобал (Платформа)', value: 'global' },
    ...(districtsData?.districts || []).map((d) => ({
      label: d.name,
      value: d.id,
    })),
  ];

  const categoryOptions = [
    { label: 'Барча тоифалар', value: '' },
    { label: 'Хавфсизлик ва авторизация', value: 'AUTH_SECURITY' },
    { label: 'Туман бошқаруви', value: 'DISTRICT_ADMINISTRATION' },
    { label: 'Ҳоким ҳисоблари', value: 'HOKIM_MANAGEMENT' },
    { label: 'Телеграм интеграцияси', value: 'TELEGRAM_INTEGRATION' },
    { label: 'Операцион жараёнлар', value: 'OPERATIONAL_LIFECYCLE' },
  ];

  const actorRoleOptions = [
    { label: 'Барча роллар', value: '' },
    { label: 'Маҳсулот эгаси', value: 'PRODUCT_OWNER' },
    { label: 'Туман ҳокими', value: 'DISTRICT_HOKIM' },
    { label: 'Тизим', value: 'SYSTEM' },
  ];

  const outcomeOptions = [
    { label: 'Барча натижалар', value: '' },
    { label: 'Муваффақиятли', value: 'SUCCESS' },
    { label: 'Хатолик', value: 'FAILURE' },
  ];

  const dateValue: [Dayjs | null, Dayjs | null] | null =
    filters.startDate && filters.endDate
      ? [dayjs(filters.startDate, 'YYYY-MM-DD'), dayjs(filters.endDate, 'YYYY-MM-DD')]
      : filters.startDate
        ? [dayjs(filters.startDate, 'YYYY-MM-DD'), null]
        : filters.endDate
          ? [null, dayjs(filters.endDate, 'YYYY-MM-DD')]
          : null;

  const handleDateChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (!dates || (!dates[0] && !dates[1])) {
      onChange({ ...filters, startDate: undefined, endDate: undefined });
      return;
    }

    const startDate = dates[0] ? dates[0].format('YYYY-MM-DD') : undefined;
    const endDate = dates[1] ? dates[1].format('YYYY-MM-DD') : undefined;

    onChange({ ...filters, startDate, endDate });
  };

  const rangePresets: { label: string; value: [Dayjs, Dayjs] }[] = [
    { label: 'Бугун', value: [dayjs(), dayjs()] },
    { label: 'Охирги 7 кун', value: [dayjs().subtract(6, 'day'), dayjs()] },
    { label: 'Охирги 30 кун', value: [dayjs().subtract(29, 'day'), dayjs()] },
  ];

  const hasActiveFilters = Boolean(
    filters.districtId ||
      filters.startDate ||
      filters.endDate ||
      filters.category ||
      filters.actorRole ||
      filters.outcome ||
      filters.action ||
      filters.search,
  );

  return (
    <Flex
      wrap="wrap"
      gap={token.marginSM}
      align="center"
      style={{
        padding: token.paddingSM,
        background: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
    >
      <Select
        placeholder="Туман"
        value={filters.districtId || ''}
        options={districtOptions}
        onChange={(val) =>
          onChange({
            ...filters,
            districtId: val ? val : undefined,
          })
        }
        style={{ minWidth: 180 }}
        aria-label="Туман танлаш"
      />

      <RangePicker
        value={dateValue}
        onChange={handleDateChange}
        presets={rangePresets}
        placeholder={['Бошланиш санаси', 'Тугаш санаси']}
        style={{ minWidth: 260 }}
        aria-label="Сана оралиғи"
      />

      <Select
        placeholder="Тоифа"
        value={filters.category || ''}
        options={categoryOptions}
        onChange={(val) =>
          onChange({
            ...filters,
            category: val ? (val as AuditActionCategory) : undefined,
          })
        }
        style={{ minWidth: 190 }}
        aria-label="Ҳаракат тоифаси"
      />

      <Select
        placeholder="Бажарувчи роли"
        value={filters.actorRole || ''}
        options={actorRoleOptions}
        onChange={(val) =>
          onChange({
            ...filters,
            actorRole: val ? (val as AuditActorRole) : undefined,
          })
        }
        style={{ minWidth: 160 }}
        aria-label="Бажарувчи роли"
      />

      <Select
        placeholder="Натижа"
        value={filters.outcome || ''}
        options={outcomeOptions}
        onChange={(val) =>
          onChange({
            ...filters,
            outcome: val ? (val as AuditActionOutcome) : undefined,
          })
        }
        style={{ minWidth: 140 }}
        aria-label="Натижа"
      />

      <Input
        placeholder="ID, амал, муаммо ёки сабаб бўйича..."
        prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        allowClear
        style={{ minWidth: 240, flex: 1 }}
        aria-label="Аудит қидируви"
      />

      {hasActiveFilters && (
        <Button
          icon={<ClearOutlined />}
          onClick={onReset}
          aria-label="Филтрларни тозалаш"
        >
          Тозалаш
        </Button>
      )}
    </Flex>
  );
};
