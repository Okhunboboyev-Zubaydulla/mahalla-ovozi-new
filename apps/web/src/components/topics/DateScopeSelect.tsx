import React from 'react';
import { Segmented, DatePicker, Space } from 'antd';
import { CalendarOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { DateFilterScope } from '@mahalla-ovozi/api-contracts';

const { RangePicker } = DatePicker;

export interface DateScopeSelectProps {
  dateScope: DateFilterScope;
  dateFrom?: string;
  dateTo?: string;
  onChange: (scope: { dateScope: DateFilterScope; dateFrom?: string; dateTo?: string }) => void;
  disabled?: boolean;
}

export const DateScopeSelect: React.FC<DateScopeSelectProps> = ({
  dateScope,
  dateFrom,
  dateTo,
  onChange,
  disabled = false,
}) => {
  const today = dayjs();
  const ninetyDaysAgo = today.subtract(90, 'day').startOf('day');

  const rangeValue: [Dayjs | null, Dayjs | null] | null =
    dateFrom && dateTo ? [dayjs(dateFrom, 'YYYY-MM-DD'), dayjs(dateTo, 'YYYY-MM-DD')] : null;

  const handleScopeChange = (value: string | number) => {
    const scope = value as DateFilterScope;
    if (scope === 'today') {
      onChange({ dateScope: 'today' });
    } else if (scope === 'yesterday') {
      onChange({ dateScope: 'yesterday' });
    } else if (scope === 'custom') {
      // Default custom to yesterday or past 7 days if not set
      const defaultFrom = dateFrom || today.subtract(7, 'day').format('YYYY-MM-DD');
      const defaultTo = dateTo || today.format('YYYY-MM-DD');
      onChange({ dateScope: 'custom', dateFrom: defaultFrom, dateTo: defaultTo });
    }
  };

  const handleRangeChange = (dates: [Dayjs | null, Dayjs | null] | null) => {
    if (!dates || !dates[0] || !dates[1]) {
      return;
    }
    onChange({
      dateScope: 'custom',
      dateFrom: dates[0].format('YYYY-MM-DD'),
      dateTo: dates[1].format('YYYY-MM-DD'),
    });
  };

  return (
    <Space direction="horizontal" size={8} wrap style={{ alignItems: 'center' }}>
      <Segmented
        value={dateScope}
        onChange={handleScopeChange}
        disabled={disabled}
        options={[
          { label: 'Бугун', value: 'today' },
          { label: 'Кеча', value: 'yesterday' },
          {
            label: (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CalendarOutlined />
                Сана бўйича
              </span>
            ),
            value: 'custom',
          },
        ]}
        style={{
          backgroundColor: '#F1F5F9',
          padding: 3,
          borderRadius: 8,
          height: 44,
          display: 'flex',
          alignItems: 'center',
          fontWeight: 500,
        }}
      />

      {dateScope === 'custom' && (
        <RangePicker
          value={rangeValue}
          onChange={handleRangeChange}
          disabled={disabled}
          format="DD.MM.YYYY"
          placeholder={['Бошланиш', 'Тугаш']}
          allowClear={false}
          disabledDate={(current) => {
            if (!current) return false;
            return current.isAfter(today.endOf('day')) || current.isBefore(ninetyDaysAgo);
          }}
          style={{
            height: 44,
            borderRadius: 8,
            borderColor: '#CBD5E1',
            boxShadow: 'none',
            fontSize: 14,
          }}
          aria-label="Сана оралиғини танлаш"
        />
      )}
    </Space>
  );
};
