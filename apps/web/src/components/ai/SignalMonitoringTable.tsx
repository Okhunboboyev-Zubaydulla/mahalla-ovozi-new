import React, { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Space,
  Button,
  Tag,
  Input,
  Select,
  Typography,
  theme,
  Alert,
} from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import type {
  ListSignalsQuery,
  SignalMessageListItemDto,
  QualifyingLane,
} from '@mahalla-ovozi/api-contracts';
import { districtClient } from '../../district/district-client.js';
import { useSignalMessages } from '../../hooks/useSignalMessages.js';
import { SignalInspectionDrawer } from './SignalInspectionDrawer.js';
import { CreateManualSignalModal } from './CreateManualSignalModal.js';

const { Text, Paragraph } = Typography;

const LANE_LABELS: Record<QualifyingLane, { label: string; color: string }> = {
  WATER: { label: 'Сув', color: 'blue' },
  ELECTRICITY: { label: 'Электр', color: 'gold' },
  GAS: { label: 'Газ', color: 'volcano' },
  WASTE: { label: 'Чиқинди', color: 'green' },
  HOKIM_RELATED: { label: 'Ҳокимлик', color: 'purple' },
};

const EXCLUSION_LABELS: Record<string, string> = {
  PLANNED_ANNOUNCEMENT: 'Режали эълон',
  ADVERTISEMENT_OR_SPAM: 'Реклама / Спам',
  SPECULATION_OR_RUMOR: 'Миш-миш / Тахмин',
  NEUTRAL_OR_PRAISE: 'Миннатдорчилик',
  GENERAL_CHATTER: 'Умумий суҳбат',
  UNRESOLVED_AMBIGUOUS_FRAGMENT: 'Ноаниқ қисқа матн',
};

export interface SignalMonitoringTableProps {
  initialDistrictId?: string | null;
}

export const SignalMonitoringTable: React.FC<SignalMonitoringTableProps> = ({
  initialDistrictId,
}) => {
  const { token } = theme.useToken();

  // Filters State
  const [districtId, setDistrictId] = useState<string | undefined>(
    initialDistrictId || undefined,
  );
  const [mahallaName, setMahallaName] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'true' | 'false'>('all');
  const [laneFilter, setLaneFilter] = useState<QualifyingLane | undefined>(undefined);
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>('');
  const [autoRefreshSec, setAutoRefreshSec] = useState<number | false>(15_000);

  // Pagination Cursor State & History Stack
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([]);

  // Sync with initialDistrictId changes from header
  useEffect(() => {
    setDistrictId(initialDistrictId || undefined);
    setCursor(undefined);
    setCursorHistory([]);
  }, [initialDistrictId]);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchText(searchText);
      setCursor(undefined);
      setCursorHistory([]);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Modals / Drawer State
  const [selectedSignalId, setSelectedSignalId] = useState<string | null>(null);
  const [inspectionDrawerOpen, setInspectionDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Query Districts
  const { data: districtsData } = useQuery({
    queryKey: ['districts', 'list'],
    queryFn: () => districtClient.listDistricts(),
    staleTime: 60_000,
  });

  // Query Signals
  const queryFilters: ListSignalsQuery = {
    districtId: districtId || undefined,
    mahallaName: mahallaName.trim() || undefined,
    isRelevant: statusFilter === 'all' ? undefined : (statusFilter === 'true' ? true : false),
    lane: laneFilter,
    search: debouncedSearchText.trim() || undefined,
    cursor,
    limit: 30,
    direction: 'forward',
  };

  const {
    data: signalsData,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useSignalMessages(queryFilters, {
    refetchInterval: autoRefreshSec,
  });

  const handleNextPage = () => {
    if (signalsData?.pagination?.nextCursor) {
      setCursorHistory((prev) => [...prev, cursor]);
      setCursor(signalsData.pagination.nextCursor);
    }
  };

  const handlePrevPage = () => {
    if (cursorHistory.length > 0) {
      const prev = [...cursorHistory];
      const targetCursor = prev.pop();
      setCursorHistory(prev);
      setCursor(targetCursor);
    }
  };

  const handleOpenDetail = (id: string) => {
    setSelectedSignalId(id);
    setInspectionDrawerOpen(true);
  };

  const columns = [
    {
      title: 'Вақти',
      dataIndex: 'originalTimestamp',
      key: 'originalTimestamp',
      width: 140,
      render: (ts: string) => (
        <Text style={{ fontSize: 13, color: token.colorTextSecondary }}>
          {new Date(ts).toLocaleString('uz-UZ', {
            timeZone: 'Asia/Tashkent',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      ),
    },
    {
      title: 'Ҳудуд / Маҳалла',
      key: 'location',
      width: 170,
      render: (_: unknown, record: SignalMessageListItemDto) => (
        <div>
          <Text strong style={{ display: 'block', fontSize: 13 }}>
            {record.mahallaName}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {record.districtName || record.districtId}
          </Text>
        </div>
      ),
    },
    {
      title: 'Хабар матни (Message)',
      dataIndex: 'verbatimText',
      key: 'verbatimText',
      render: (text: string, record: SignalMessageListItemDto) => (
        <div style={{ maxWidth: 360 }}>
          <Paragraph
            ellipsis={{ rows: 2, expandable: false }}
            style={{
              margin: 0,
              fontSize: 13,
              lineHeight: 1.4,
              cursor: 'pointer',
            }}
            onClick={() => handleOpenDetail(record.id)}
          >
            {text}
          </Paragraph>
        </div>
      ),
    },
    {
      title: 'AI қарори',
      key: 'decision',
      width: 150,
      render: (_: unknown, record: SignalMessageListItemDto) => {
        if (record.isRelevant) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Қабул қилинди
            </Tag>
          );
        }
        return (
          <Tag color="default" icon={<CloseCircleOutlined />}>
            Рад этилди
          </Tag>
        );
      },
    },
    {
      title: 'Соҳа / Сабаб',
      key: 'lanesOrReason',
      width: 160,
      render: (_: unknown, record: SignalMessageListItemDto) => {
        if (record.isRelevant && record.relevantLanes.length > 0) {
          return (
            <Space wrap size={[0, 4]}>
              {record.relevantLanes.map((lane) => {
                const meta = LANE_LABELS[lane] || { label: lane, color: 'default' };
                return (
                  <Tag key={lane} color={meta.color} style={{ fontSize: 11 }}>
                    {meta.label}
                  </Tag>
                );
              })}
            </Space>
          );
        }
        if (record.exclusionReason) {
          return (
            <Tag color="warning" style={{ fontSize: 11 }}>
              {EXCLUSION_LABELS[record.exclusionReason] || record.exclusionReason}
            </Tag>
          );
        }
        return <Text type="secondary">—</Text>;
      },
    },
    {
      title: 'AI изоҳи / Асос (Reasoning)',
      dataIndex: 'reasoning',
      key: 'reasoning',
      render: (reasoning: string | null) => (
        <div style={{ maxWidth: 300 }}>
          <Text
            style={{
              fontSize: 12,
              color: token.colorTextDescription,
              fontStyle: 'italic',
            }}
          >
            {reasoning || '—'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Амаллар',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      render: (_: unknown, record: SignalMessageListItemDto) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          size="small"
          onClick={() => handleOpenDetail(record.id)}
        >
          Кўриш
        </Button>
      ),
    },
  ];

  return (
    <div>
      {/* Top Filter Card */}
      <Card
        size="small"
        variant="borderless"
        style={{
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          marginBottom: 16,
        }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            <div>
              <Text strong style={{ fontSize: 16 }}>
                АИ хабар таснифи ва сигналлар мониторинги
              </Text>
              <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                Кирувчи Telegram хабарларининг қабул қилиниш/рад этилиш сабаблари ва тўлиқ AI асослари.
              </Paragraph>
            </div>

            <Space>
              <Select
                value={autoRefreshSec}
                onChange={(val) => setAutoRefreshSec(val)}
                style={{ width: 140 }}
                options={[
                  { label: 'Авто-янгилаш: 10с', value: 10_000 },
                  { label: 'Авто-янгилаш: 15с', value: 15_000 },
                  { label: 'Авто-янгилаш: 30с', value: 30_000 },
                  { label: 'Ўчирилган', value: false },
                ]}
              />

              <Button
                icon={<ReloadOutlined spin={isFetching} />}
                onClick={() => refetch()}
              >
                Янгилаш
              </Button>

              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreateModalOpen(true)}
              >
                Янги сигнал қўшиш
              </Button>
            </Space>
          </div>

          {/* Filter Bar Controls */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <Select
              allowClear
              placeholder="Барча туманлар"
              value={districtId}
              onChange={(val) => {
                setDistrictId(val);
                setCursor(undefined);
              }}
              style={{ width: 180 }}
              options={districtsData?.districts.map((d) => ({
                label: d.name,
                value: d.id,
              }))}
            />

            <Input
              allowClear
              placeholder="Маҳалла бўйича қидириш"
              value={mahallaName}
              onChange={(e) => {
                setMahallaName(e.target.value);
                setCursor(undefined);
              }}
              style={{ width: 190 }}
            />

            <Select
              value={statusFilter}
              onChange={(val) => {
                setStatusFilter(val);
                setCursor(undefined);
              }}
              style={{ width: 180 }}
              options={[
                { label: 'Барча қарорлар', value: 'all' },
                { label: 'Қабул қилинганлар', value: 'true' },
                { label: 'Рад этилганлар', value: 'false' },
              ]}
            />

            <Select
              allowClear
              placeholder="Барча соҳалар"
              value={laneFilter}
              onChange={(val) => {
                setLaneFilter(val);
                setCursor(undefined);
              }}
              style={{ width: 160 }}
              options={Object.entries(LANE_LABELS).map(([k, v]) => ({
                label: v.label,
                value: k,
              }))}
            />

            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Матн бўйича қидириш..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setCursor(undefined);
              }}
              style={{ width: 220 }}
            />
          </div>
        </Space>
      </Card>

      {/* Error Alert */}
      {isError && (
        <Alert
          type="error"
          message="Сигналларни юклашда хатолик"
          description={error instanceof Error ? error.message : 'Сервердан маълумот олишнинг имкони бўлмади.'}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Data Table */}
      <Card
        variant="borderless"
        style={{
          borderRadius: token.borderRadiusLG,
          background: token.colorBgContainer,
        }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          rowKey="id"
          columns={columns}
          dataSource={signalsData?.items || []}
          loading={isLoading}
          pagination={false}
          scroll={{ x: 1100 }}
          size="middle"
          onRow={(record) => ({
            onClick: () => handleOpenDetail(record.id),
            style: { cursor: 'pointer' },
          })}
        />

        {/* Keyset Pagination Controls */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: '16px 24px',
            borderTop: `1px solid ${token.colorBorderSecondary}`,
            gap: 8,
          }}
        >
          <Button
            disabled={cursorHistory.length === 0}
            onClick={handlePrevPage}
          >
            Олдингиси
          </Button>
          <Button
            type="primary"
            disabled={!signalsData?.pagination?.hasNextPage}
            onClick={handleNextPage}
          >
            Кейингиси
          </Button>
        </div>
      </Card>

      {/* Slide-out Drawer */}
      <SignalInspectionDrawer
        signalId={selectedSignalId}
        open={inspectionDrawerOpen}
        onClose={() => {
          setInspectionDrawerOpen(false);
          setSelectedSignalId(null);
        }}
      />

      {/* Create Manual Signal Modal */}
      <CreateManualSignalModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        defaultDistrictId={districtId}
      />
    </div>
  );
};
