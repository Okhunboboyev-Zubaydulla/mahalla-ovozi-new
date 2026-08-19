import { useState, useMemo } from 'react';
import {
  Table,
  Card,
  Input,
  Button,
  Tag,
  Space,
  Typography,
  Modal,
  Empty,
  Grid,
  Divider,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  CloseCircleOutlined,
  TeamOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import { TelegramGroupMapping } from '@mahalla-ovozi/api-contracts';
import { TelegramGroupDrawer } from './TelegramGroupDrawer.js';
import { useTelegramGroups } from '../district/useTelegramGroups.js';

const { Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

interface TelegramGroupTableProps {
  districtId: string;
  isOffline?: boolean;
}

export function TelegramGroupTable({ districtId, isOffline = false }: TelegramGroupTableProps) {
  const screens = useBreakpoint();
  const isDesktop = screens.md ?? true;

  const { groups, isLoading, error, deleteGroup, isDeleting, refetch } = useTelegramGroups(districtId);

  const [searchText, setSearchText] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerStep, setDrawerStep] = useState<number>(0);
  const [selectedGroup, setSelectedGroup] = useState<TelegramGroupMapping | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<TelegramGroupMapping | null>(null);

  const filteredGroups = useMemo(() => {
    if (!searchText.trim()) return groups;
    const lower = searchText.toLowerCase();
    return groups.filter(
      (g) =>
        g.mahallaName.toLowerCase().includes(lower) ||
        g.telegramChatTitle.toLowerCase().includes(lower) ||
        g.telegramChatId.includes(lower),
    );
  }, [groups, searchText]);

  const handleOpenAddDrawer = () => {
    setSelectedGroup(null);
    setDrawerStep(0);
    setIsDrawerOpen(true);
  };

  const handleOpenEditDrawer = (group: TelegramGroupMapping) => {
    setSelectedGroup(group);
    setDrawerStep(0);
    setIsDrawerOpen(true);
  };

  const handleOpenTestDrawer = (group: TelegramGroupMapping) => {
    setSelectedGroup(group);
    setDrawerStep(1);
    setIsDrawerOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;
    try {
      await deleteGroup({ groupId: groupToDelete.id });
      setGroupToDelete(null);
    } catch {
      // Error handled by mutation
    }
  };

  const renderStatusTag = (status: TelegramGroupMapping['status']) => {
    switch (status) {
      case 'VALID':
        return (
          <Tag color="success" icon={<CheckCircleOutlined aria-hidden="true" />}>
            ТАСДИҚЛАНГАН
          </Tag>
        );
      case 'TESTING':
        return (
          <Tag color="processing" icon={<SyncOutlined spin aria-hidden="true" />}>
            СИНОВДА
          </Tag>
        );
      case 'FAILED':
        return (
          <Tag color="error" icon={<CloseCircleOutlined aria-hidden="true" />}>
            ХАТОЛИК
          </Tag>
        );
      case 'PENDING':
      default:
        return (
          <Tag color="warning" icon={<ClockCircleOutlined aria-hidden="true" />}>
            КУТИЛМОҚДА
          </Tag>
        );
    }
  };

  const desktopColumns = [
    {
      title: 'Маҳалла номи',
      dataIndex: 'mahallaName',
      key: 'mahallaName',
      render: (name: string) => <Text strong>{name}</Text>,
    },
    {
      title: 'Telegram гуруҳ номи',
      dataIndex: 'telegramChatTitle',
      key: 'telegramChatTitle',
      render: (title: string, record: TelegramGroupMapping) => (
        <Space direction="vertical" size={2}>
          <Text>{title}</Text>
          <Text code type="secondary">
            ID: {record.telegramChatId}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Махфийлик режими',
      dataIndex: 'privacyModeDisabled',
      key: 'privacyModeDisabled',
      render: (disabled: boolean) =>
        disabled ? (
          <Tag color="green" icon={<SafetyOutlined />}>
            Ўчирилган (Тўлиқ қабул)
          </Tag>
        ) : (
          <Tag color="volcano" icon={<SafetyOutlined />}>
            Фаол (Чекланган)
          </Tag>
        ),
    },
    {
      title: 'Ҳолати',
      dataIndex: 'status',
      key: 'status',
      render: (status: TelegramGroupMapping['status']) => renderStatusTag(status),
    },
    {
      title: 'Амаллар',
      key: 'actions',
      render: (_: unknown, record: TelegramGroupMapping) => (
        <Space size="small">
          <Button
            type="default"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenEditDrawer(record)}
            disabled={isOffline}
            style={{ minHeight: '36px' }}
          >
            Таҳрирлаш
          </Button>
          {record.status !== 'VALID' && (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleOpenTestDrawer(record)}
              disabled={isOffline}
              style={{ minHeight: '36px' }}
            >
              Синовдан ўтказиш
            </Button>
          )}
          <Button
            danger
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => setGroupToDelete(record)}
            disabled={isOffline}
            style={{ minHeight: '36px' }}
          >
            Ўчириш
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <TeamOutlined style={{ fontSize: '20px', color: '#1677ff' }} />
          <span>Маҳаллалар ва Telegram гуруҳлари харитаси</span>
        </Space>
      }
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleOpenAddDrawer}
          disabled={isOffline}
          style={{ minHeight: '40px' }}
        >
          Янги гуруҳ қўшиш
        </Button>
      }
      style={{ marginTop: '24px' }}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Search filter input */}
        <Input
          placeholder="Маҳалла номи ёки Chat ID бўйича қидириш..."
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="large"
          style={{ minHeight: '44px' }}
        />

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <SyncOutlined spin style={{ fontSize: '24px', color: '#1677ff' }} />
            <Paragraph style={{ marginTop: '8px' }}>Гуруҳлар рўйхати юкланмоқда...</Paragraph>
          </div>
        ) : error ? (
          <Empty description="Гуруҳларни юклашда хатолик юз берди." />
        ) : filteredGroups.length === 0 ? (
          <Empty
            description={
              searchText ? (
                'Қидирув бўйича ҳеч қандай маҳалла топилмади.'
              ) : (
                <Space direction="vertical" align="center">
                  <Text strong>Ҳали биронта маҳалла гуруҳи бириктирилмаган</Text>
                  <Text type="secondary">
                    Туман маҳаллалари учун Telegram гуруҳларини қўшинг ва синовдан ўтказинг.
                  </Text>
                </Space>
              )
            }
          />
        ) : isDesktop ? (
          /* Desktop Table View */
          <Table
            dataSource={filteredGroups}
            columns={desktopColumns}
            rowKey="id"
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        ) : (
          /* Mobile Card List View (<768px) with WCAG >=44px touch targets */
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            {filteredGroups.map((group) => (
              <Card key={group.id} size="small" style={{ borderRadius: '8px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: '16px' }}>
                      {group.mahallaName}
                    </Text>
                    {renderStatusTag(group.status)}
                  </div>
                  <div>
                    <Text type="secondary">Гуруҳ: </Text>
                    <Text>{group.telegramChatTitle}</Text>
                  </div>
                  <div>
                    <Text type="secondary">Chat ID: </Text>
                    <Text code>{group.telegramChatId}</Text>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '8px' }}>
                    <Button
                      type="default"
                      size="large"
                      icon={<EditOutlined />}
                      onClick={() => handleOpenEditDrawer(group)}
                      disabled={isOffline}
                      style={{ minHeight: '44px' }}
                    >
                      Таҳрирлаш
                    </Button>
                    {group.status !== 'VALID' && (
                      <Button
                        type="primary"
                        size="large"
                        icon={<PlayCircleOutlined />}
                        onClick={() => handleOpenTestDrawer(group)}
                        disabled={isOffline}
                        style={{ minHeight: '44px' }}
                      >
                        Синов
                      </Button>
                    )}
                    <Button
                      danger
                      type="default"
                      size="large"
                      icon={<DeleteOutlined />}
                      onClick={() => setGroupToDelete(group)}
                      disabled={isOffline}
                      style={{ minHeight: '44px' }}
                    >
                      Ўчириш
                    </Button>
                  </div>
                </Space>
              </Card>
            ))}
          </Space>
        )}
      </Space>

      {/* Group Create/Edit/Test Drawer */}
      <TelegramGroupDrawer
        open={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedGroup(null);
        }}
        districtId={districtId}
        onGroupSaved={() => {
          refetch();
        }}
        initialGroup={selectedGroup}
        initialStep={drawerStep}
      />

      {/* Delete Group Confirmation Modal */}
      <Modal
        title="Маҳалла гуруҳини ўчиришни тасдиқланг"
        open={!!groupToDelete}
        onCancel={() => setGroupToDelete(null)}
        footer={[
          <Button
            key="cancel"
            onClick={() => setGroupToDelete(null)}
            size="large"
            style={{ minHeight: '44px' }}
          >
            Бекор қилиш
          </Button>,
          <Button
            key="delete"
            danger
            type="primary"
            loading={isDeleting}
            onClick={handleDeleteConfirm}
            size="large"
            style={{ minHeight: '44px' }}
          >
            Ўчиришни тасдиқлаш
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%', marginTop: '12px' }}>
          <Paragraph>
            Ҳақиқатан ҳам <Text strong>{groupToDelete?.mahallaName}</Text> маҳалласига бириктирилган
            Telegram гуруҳини ўчирмоқчимисиз?
          </Paragraph>
          <Paragraph type="secondary">
            Ўчирилгандан сўнг, ушбу гуруҳдан янги хабарлар қабул қилинмайди. Аввал қабул қилинган
            маълумотлар сақланиб қолади.
          </Paragraph>
        </Space>
      </Modal>
    </Card>
  );
}
