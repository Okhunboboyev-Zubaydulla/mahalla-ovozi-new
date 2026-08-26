import React, { useMemo } from 'react';
import {
  Drawer,
  Descriptions,
  type DescriptionsProps,
  Tag,
  Typography,
  Table,
  Card,
  Space,
  Grid,
  theme,
  Empty,
  Skeleton,
} from 'antd';
import {
  SafetyCertificateOutlined,
  GlobalOutlined,
  UserOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { AuditEvent, AuditActorRole } from '@mahalla-ovozi/api-contracts';
import { formatTashkentDate, getActionDisplayNameUz } from '../../lib/formatters.js';

const { Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;

interface AuditEventDetailDrawerProps {
  open: boolean;
  event: AuditEvent | null;
  loading?: boolean;
  onClose: () => void;
}

interface ValueDiffRow {
  key: string;
  field: string;
  previousValue: string;
  newValue: string;
  changeType: 'modified' | 'added' | 'removed' | 'unchanged';
}

function formatValueForDisplay(val: unknown): string {
  if (val === undefined || val === null) {
    return '—';
  }
  if (typeof val === 'object') {
    return JSON.stringify(val);
  }
  return String(val);
}

export const AuditEventDetailDrawer: React.FC<AuditEventDetailDrawerProps> = ({
  open,
  event,
  loading = false,
  onClose,
}) => {
  const screens = useBreakpoint();
  const { token } = theme.useToken();

  const getActorRoleTag = (role: AuditActorRole | null | undefined) => {
    switch (role) {
      case 'PRODUCT_OWNER':
        return (
          <Tag color="blue" icon={<SafetyCertificateOutlined />}>
            Маҳсулот эгаси
          </Tag>
        );
      case 'DISTRICT_HOKIM':
        return (
          <Tag color="green" icon={<UserOutlined />}>
            Туман ҳокими
          </Tag>
        );
      case 'SYSTEM':
        return (
          <Tag color="purple" icon={<GlobalOutlined />}>
            Тизим
          </Tag>
        );
      default:
        return <Tag color="default">{role || 'Номаълум'}</Tag>;
    }
  };

  const getCategoryTag = (category: string) => {
    switch (category) {
      case 'AUTH_SECURITY':
        return <Tag color="orange">Хавфсизлик ва авторизация</Tag>;
      case 'DISTRICT_ADMINISTRATION':
        return <Tag color="cyan">Туман бошқаруви</Tag>;
      case 'HOKIM_MANAGEMENT':
        return <Tag color="geekblue">Ҳоким ҳисоблари</Tag>;
      case 'TELEGRAM_INTEGRATION':
        return <Tag color="blue">Телеграм интеграцияси</Tag>;
      case 'OPERATIONAL_LIFECYCLE':
        return <Tag color="purple">Операцион жараёнлар</Tag>;
      default:
        return <Tag>{category}</Tag>;
    }
  };

  const diffData = useMemo<ValueDiffRow[]>(() => {
    if (!event) return [];
    const prev = event.previousValues || {};
    const curr = event.newValues || {};

    const allKeys = Array.from(
      new Set([...Object.keys(prev), ...Object.keys(curr)]),
    );

    return allKeys.map((key) => {
      const prevVal = prev[key];
      const currVal = curr[key];

      let changeType: ValueDiffRow['changeType'] = 'unchanged';
      if (prevVal === undefined && currVal !== undefined) {
        changeType = 'added';
      } else if (prevVal !== undefined && currVal === undefined) {
        changeType = 'removed';
      } else if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
        changeType = 'modified';
      }

      return {
        key,
        field: key,
        previousValue: formatValueForDisplay(prevVal),
        newValue: formatValueForDisplay(currVal),
        changeType,
      };
    });
  }, [event]);

  const customMetadataKeys = useMemo(() => {
    if (!event || !event.metadata) return {};
    const meta = { ...event.metadata };
    delete meta.reason;
    delete meta.previousState;
    delete meta.previousValues;
    delete meta.newState;
    delete meta.newValues;
    return meta;
  }, [event]);

  const descriptionItems = useMemo<DescriptionsProps['items']>(() => {
    if (!event) return [];
    return [
      {
        key: 'createdAt',
        label: 'Сана ва вақт (Тошкент)',
        children: formatTashkentDate(event.createdAt),
      },
      {
        key: 'actor',
        label: 'Бажарувчи (Актор)',
        children: (
          <Space wrap size="small">
            {getActorRoleTag(event.actorRole)}
            {event.actorId && (
              <Text code style={{ fontSize: 12 }}>
                {event.actorId}
              </Text>
            )}
          </Space>
        ),
      },
      {
        key: 'district',
        label: 'Туман / Ҳудуд',
        children: event.districtName ? (
          <Text strong>{event.districtName}</Text>
        ) : event.districtId ? (
          <Text code>{event.districtId}</Text>
        ) : (
          <Tag color="purple">Глобал (Платформа)</Tag>
        ),
      },
      {
        key: 'action',
        label: 'Ҳаракат номи',
        children: (
          <Space direction="vertical" size={0}>
            <Text strong>{getActionDisplayNameUz(event.action)}</Text>
            <Text type="secondary" code style={{ fontSize: 11 }}>
              {event.action}
            </Text>
          </Space>
        ),
      },
      {
        key: 'category',
        label: 'Ҳаракат тоифаси',
        children: getCategoryTag(event.category),
      },
      {
        key: 'outcome',
        label: 'Натижа',
        children:
          event.outcome === 'SUCCESS' ? (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Муваффақиятли
            </Tag>
          ) : (
            <Tag color="error" icon={<CloseCircleOutlined />}>
              Хатолик
            </Tag>
          ),
      },
      {
        key: 'ipAddress',
        label: 'IP манзил',
        children: event.ipAddress ? <Text code>{event.ipAddress}</Text> : '—',
      },
      {
        key: 'userAgent',
        label: 'User Agent',
        children: event.userAgent ? (
          <Text
            style={{
              fontSize: 11,
              color: token.colorTextSecondary,
              wordBreak: 'break-all',
            }}
          >
            {event.userAgent}
          </Text>
        ) : (
          '—'
        ),
      },
    ];
  }, [event, token]);

  return (
    <Drawer
      title={
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Text strong style={{ fontSize: 16 }}>
            Аудит ёзуви тафсилоти
          </Text>
          {event && (
            <Paragraph
              copyable={{ text: event.id }}
              type="secondary"
              style={{ margin: 0, fontSize: 12, fontFamily: 'monospace' }}
            >
              ID: {event.id}
            </Paragraph>
          )}
        </Space>
      }
      placement="right"
      width={screens.md ? 640 : '100%'}
      onClose={onClose}
      open={open}
      destroyOnClose={true}
      aria-label="Аудит ёзуви тафсилоти панели"
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : !event ? (
        <Empty description="Маълумот топилмади" />
      ) : (
        <Space direction="vertical" size="large" style={{ width: '100%', display: 'flex' }}>
          <Descriptions
            bordered
            size="small"
            column={1}
            items={descriptionItems}
            styles={{ label: { width: '35%', fontWeight: 600 } }}
          />

          {event.reason && (
            <Card
              size="small"
              title={<Text strong>Кўрсатилган сабаб / изоҳ</Text>}
              style={{
                background: token.colorFillAlter,
                borderColor: token.colorBorderSecondary,
              }}
            >
              <Paragraph style={{ margin: 0 }}>{event.reason}</Paragraph>
            </Card>
          )}

          {diffData.length > 0 && (
            <Card
              size="small"
              title={<Text strong>Ҳолат ва қийматлар ўзгариши</Text>}
              style={{ borderColor: token.colorBorderSecondary }}
            >
              <Table
                dataSource={diffData}
                pagination={false}
                size="small"
                columns={[
                  {
                    title: 'Параметр',
                    dataIndex: 'field',
                    key: 'field',
                    render: (f: string) => <Text code>{f}</Text>,
                  },
                  {
                    title: 'Олдинги қиймат',
                    dataIndex: 'previousValue',
                    key: 'previousValue',
                    render: (v: string) => (
                      <Text type="secondary" style={{ wordBreak: 'break-all' }}>
                        {v}
                      </Text>
                    ),
                  },
                  {
                    title: 'Янги қиймат',
                    dataIndex: 'newValue',
                    key: 'newValue',
                    render: (v: string) => (
                      <Text strong style={{ wordBreak: 'break-all' }}>
                        {v}
                      </Text>
                    ),
                  },
                  {
                    title: 'Ҳолат',
                    dataIndex: 'changeType',
                    key: 'changeType',
                    width: 110,
                    render: (type: ValueDiffRow['changeType']) => {
                      switch (type) {
                        case 'added':
                          return <Tag color="green">Қўшилди</Tag>;
                        case 'removed':
                          return <Tag color="red">Ўчирилди</Tag>;
                        case 'modified':
                          return <Tag color="blue">Ўзгарди</Tag>;
                        default:
                          return <Tag color="default">Бир хил</Tag>;
                      }
                    },
                  },
                ]}
              />
            </Card>
          )}

          {Object.keys(customMetadataKeys).length > 0 && (
            <Card
              size="small"
              title={<Text strong>Қўшимча метамаълумотлар</Text>}
              style={{ borderColor: token.colorBorderSecondary }}
            >
              <pre
                style={{
                  margin: 0,
                  padding: token.paddingSM,
                  background: token.colorFillQuaternary,
                  borderRadius: token.borderRadiusSM,
                  fontSize: 12,
                  maxHeight: 250,
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                }}
              >
                {JSON.stringify(customMetadataKeys, null, 2)}
              </pre>
            </Card>
          )}
        </Space>
      )}
    </Drawer>
  );
};
