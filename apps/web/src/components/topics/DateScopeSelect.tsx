import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Segmented, ConfigProvider, Input, Button } from 'antd';
import { CalendarOutlined, CheckOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { DateFilterScope } from '@mahalla-ovozi/api-contracts';
import { getTashkentToday } from '../../lib/formatters.js';

export interface DateScopeSelectProps {
  dateScope: DateFilterScope;
  dateFrom?: string;
  dateTo?: string;
  onChange: (scope: { dateScope: DateFilterScope; dateFrom?: string; dateTo?: string }) => void;
  disabled?: boolean;
}

const PRESETS: { label: string; days: number }[] = [
  { label: '7 кун', days: 7 },
  { label: '14 кун', days: 14 },
  { label: '30 кун', days: 30 },
];

function parseDateInput(raw: string): Dayjs | null {
  const trimmed = raw.trim();
  const ddmmyyyy = dayjs(trimmed, 'DD.MM.YYYY', true);
  if (ddmmyyyy.isValid()) return ddmmyyyy;
  const yyyymmdd = dayjs(trimmed, 'YYYY-MM-DD', true);
  if (yyyymmdd.isValid()) return yyyymmdd;
  return null;
}

export const DateScopeSelect: React.FC<DateScopeSelectProps> = ({
  dateScope,
  dateFrom,
  dateTo,
  onChange,
  disabled = false,
}) => {
  const todayYmd = getTashkentToday();
  const ninetyDaysAgoYmd = dayjs(todayYmd, 'YYYY-MM-DD').subtract(90, 'day').format('YYYY-MM-DD');

  const [isOpen, setIsOpen] = useState(false);
  const [manualFrom, setManualFrom] = useState(() => (dateFrom ? dayjs(dateFrom).format('DD.MM.YYYY') : ''));
  const [manualTo, setManualTo] = useState(() => (dateTo ? dayjs(dateTo).format('DD.MM.YYYY') : ''));
  const [manualError, setManualError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Sync inputs when external value changes (e.g. reset) or overlay opens
  useEffect(() => {
    if (dateFrom) setManualFrom(dayjs(dateFrom).format('DD.MM.YYYY'));
    if (dateTo) setManualTo(dayjs(dateTo).format('DD.MM.YYYY'));
    setManualError(null);
  }, [dateFrom, dateTo, isOpen]);

  // Close overlay on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  const applyManual = useCallback(() => {
    const from = parseDateInput(manualFrom);
    const to = parseDateInput(manualTo);

    if (!from || !to) {
      setManualError('Сана формати нотўғри (КК.ОО.ЙЙЙЙ)');
      return;
    }
    if (from.isAfter(to)) {
      setManualError('Бошланғич сана якуний санадан кейин бўлиши мумкин эмас');
      return;
    }

    const fromYmd = from.format('YYYY-MM-DD');
    const toYmd = to.format('YYYY-MM-DD');

    if (toYmd > todayYmd) {
      setManualError('Келгуси саналарни танлаш мумкин эмас');
      return;
    }
    if (fromYmd < ninetyDaysAgoYmd) {
      setManualError('Сўнгги 90 кундан олдинги саналарни танлаш мумкин эмас');
      return;
    }

    setManualError(null);
    onChange({ dateScope: 'custom', dateFrom: fromYmd, dateTo: toYmd });
    setIsOpen(false);
  }, [manualFrom, manualTo, todayYmd, ninetyDaysAgoYmd, onChange]);

  // Determine if current manual inputs match a quick preset (updates button highlight immediately)
  const activePresetDays = (() => {
    const from = parseDateInput(manualFrom);
    const to = parseDateInput(manualTo);
    if (!from || !to) return null;
    const fromYmd = from.format('YYYY-MM-DD');
    const toYmd = to.format('YYYY-MM-DD');
    if (toYmd !== todayYmd) return null;

    for (const { days } of PRESETS) {
      const expectedFrom = dayjs(todayYmd, 'YYYY-MM-DD').subtract(days - 1, 'day').format('YYYY-MM-DD');
      if (fromYmd === expectedFrom) {
        return days;
      }
    }
    return null;
  })();

  const applyPreset = useCallback(
    (days: number) => {
      const today = dayjs(todayYmd, 'YYYY-MM-DD');
      const from = today.subtract(days - 1, 'day');

      setManualFrom(from.format('DD.MM.YYYY'));
      setManualTo(today.format('DD.MM.YYYY'));
      setManualError(null);
      // Do not auto-apply or close overlay; user applies via 'Қўллаш'
    },
    [todayYmd],
  );

  const handleScopeChange = (value: string | number) => {
    const scope = value as DateFilterScope;
    if (scope === 'today') {
      setIsOpen(false);
      onChange({ dateScope: 'today' });
    } else if (scope === 'yesterday') {
      setIsOpen(false);
      onChange({ dateScope: 'yesterday' });
    } else if (scope === 'custom') {
      // If already on custom, toggle overlay; otherwise open and seed defaults
      if (dateScope === 'custom') {
        setIsOpen((prev) => !prev);
      } else {
        const defaultFrom = dateFrom || dayjs(todayYmd, 'YYYY-MM-DD').subtract(6, 'day').format('YYYY-MM-DD');
        const defaultTo = dateTo || todayYmd;
        onChange({ dateScope: 'custom', dateFrom: defaultFrom, dateTo: defaultTo });
        setIsOpen(true);
      }
    }
  };

  const customLabel = (
    <span
      onClick={(e) => {
        if (disabled) return;
        if (dateScope === 'custom') {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }
      }}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: disabled ? 'not-allowed' : 'pointer' }}
    >
      <CalendarOutlined />
      {dateScope === 'custom' && dateFrom && dateTo
        ? `${dayjs(dateFrom).format('DD.MM')} – ${dayjs(dateTo).format('DD.MM')}`
        : 'Сана бўйича'}
    </span>
  );

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <ConfigProvider
        theme={{
          token: {
            controlHeight: 32,
            fontSize: 14,
            borderRadius: 6,
            borderRadiusSM: 4,
          },
          components: {
            Segmented: {
              controlHeight: 32,
              trackPadding: 2,
              trackBg: '#F1F5F9',
              itemSelectedBg: '#FFFFFF',
              itemSelectedColor: '#0F172A',
              itemColor: '#64748B',
              itemHoverColor: '#0F172A',
              borderRadius: 6,
              borderRadiusSM: 4,
            },
          },
        }}
      >
        <Segmented
          value={dateScope}
          onChange={handleScopeChange}
          disabled={disabled}
          options={[
            { label: 'Бугун', value: 'today' },
            { label: 'Кеча', value: 'yesterday' },
            { label: customLabel, value: 'custom' },
          ]}
          style={{
            fontWeight: 400,
            fontSize: 14,
            flexShrink: 0,
          }}
        />
      </ConfigProvider>

      {/* Custom date range overlay — no calendar, inputs + presets + apply */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Сана оралиғини танлаш"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 1050,
            backgroundColor: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            boxShadow: '0 6px 16px 0 rgba(0,0,0,0.08), 0 3px 6px -4px rgba(0,0,0,0.12)',
            padding: '10px 12px',
            minWidth: 420,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          {/* Row: date inputs + presets + apply */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'nowrap',
            }}
          >
            {/* Date inputs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <Input
                placeholder="КК.ОО.ЙЙЙЙ"
                value={manualFrom}
                onChange={(e) => {
                  setManualFrom(e.target.value);
                  setManualError(null);
                }}
                onPressEnter={applyManual}
                status={manualError ? 'error' : undefined}
                style={{ width: 108, height: 30, fontSize: 12, borderRadius: 4 }}
                aria-label="Бошланғич санани қўлда киритиш"
              />
              <span style={{ color: '#94A3B8', fontSize: 13, flexShrink: 0 }}>—</span>
              <Input
                placeholder="КК.ОО.ЙЙЙЙ"
                value={manualTo}
                onChange={(e) => {
                  setManualTo(e.target.value);
                  setManualError(null);
                }}
                onPressEnter={applyManual}
                status={manualError ? 'error' : undefined}
                style={{ width: 108, height: 30, fontSize: 12, borderRadius: 4 }}
                aria-label="Якуний санани қўлда киритиш"
              />
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 18, backgroundColor: '#E2E8F0', flexShrink: 0 }} />

            {/* Quick preset buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {PRESETS.map(({ label, days }) => {
                const isActive = activePresetDays === days;
                return (
                  <Button
                    key={days}
                    size="small"
                    onClick={() => applyPreset(days)}
                    style={{
                      height: 28,
                      fontSize: 12,
                      borderRadius: 4,
                      padding: '0 9px',
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? '#0284C7' : '#475569',
                      borderColor: isActive ? '#0284C7' : '#CBD5E1',
                      backgroundColor: isActive ? '#F0F9FF' : '#F8FAFC',
                    }}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>

            {/* Divider */}
            <div style={{ width: 1, height: 18, backgroundColor: '#E2E8F0', flexShrink: 0 }} />

            {/* Apply button */}
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined style={{ fontSize: 11 }} />}
              onClick={applyManual}
              style={{
                height: 28,
                fontSize: 12,
                borderRadius: 4,
                padding: '0 10px',
                fontWeight: 500,
                flexShrink: 0,
              }}
              aria-label="Киритилган саналарни қўллаш"
            >
              Қўллаш
            </Button>
          </div>

          {/* Validation error */}
          {manualError && (
            <div
              style={{
                marginTop: 6,
                padding: '4px 6px',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                fontSize: 11,
                borderRadius: 4,
                border: '1px solid #FECACA',
              }}
            >
              {manualError}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
