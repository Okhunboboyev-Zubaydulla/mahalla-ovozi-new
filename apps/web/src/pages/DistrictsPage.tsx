import React, { useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Tag,
  Button,
  Empty,
} from 'antd';
import { PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { districtClient } from '../district/district-client.js';
import { useDistrict } from '../district/district-context.js';
import { CreateDistrictDrawer } from '../components/CreateDistrictDrawer.js';
import { District } from '@mahalla-ovozi/api-contracts';

const { Title, Paragraph } = Typography;

function formatTashkentDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return isoString;
  }
}

export const DistrictsPage: React.FC = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { activeDistrictId, switchDistrict } = useDistrict();

  const { data, isLoading } = useQuery({
    queryKey: ['districts', 'list'],
    queryFn: districtClient.listDistricts,
  });

  const districts = data?.districts || [];

  const columns = [
    {
      title: 'Туман номи',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <strong>{name}</strong>,
    },
    {
      title: 'Вилоят / Ҳудуд',
      dataIndex: 'region',
      key: 'region',
      render: (region?: string) => region || '—',
    },
    {
      title: 'Ҳолати',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        if (status === 'SETUP_INCOMPLETE') {
          // P5-I: Use warning preset mapped to design system tokens
          return <Tag color="warning">Созлаш тугалланмаган</Tag>;
        }
        return <Tag color="default">{status}</Tag>;
      },
    },
    {
      title: 'Яратилган вақти',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => formatTashkentDate(createdAt),
    },
    {
      title: 'Амаллар',
      key: 'actions',
      render: (_: unknown, record: District) => {
        const isSelected = activeDistrictId === record.id;
        if (isSelected) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              Танланган
            </Tag>
          );
        }
        return (
          <Button
            type="link"
            onClick={() => void switchDistrict(record.id)}
            style={{ padding: 0 }}
          >
            Танлаш
          </Button>
        );
      },
    },
  ];

  return (
    <div>
      <Card
        variant="borderless"
        style={{ borderRadius: 12 }}
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Title level={3} style={{ margin: 0 }}>Туманлар</Title>
              <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
                Тизимдаги барча туманлар рўйхати ва янги туман қўшиш
              </Paragraph>
            </div>
            {districts.length > 0 && (
              <Button
                id="create-district-button"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setDrawerOpen(true)}
              >
                Туман қўшиш
              </Button>
            )}
          </div>
        }
      >
        {/* AC 2: Honest Empty State for Zero Districts */}
        {!isLoading && districts.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <Empty
              description={
                <div>
                  <Title level={4} style={{ marginBottom: 8 }}>Ҳозирча туманлар мавжуд эмас</Title>
                  <Paragraph type="secondary">
                    Тизимда ишлаш учун биринчи туманни қўшинг.
                  </Paragraph>
                </div>
              }
            >
              <Button
                id="empty-create-district-button"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setDrawerOpen(true)}
              >
                Туман қўшиш
              </Button>
            </Empty>
          </div>
        ) : (
          /* P5-F: Table with role="region", aria-label, and horizontal scroll */
          <div role="region" aria-label="Туманлар рўйхати">
            <Table
              dataSource={districts}
              columns={columns}
              rowKey="id"
              loading={isLoading}
              pagination={false}
              scroll={{ x: 'max-content' }}
            />
          </div>
        )}
      </Card>

      {/* P5-D: Create District Drawer */}
      <CreateDistrictDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />
    </div>
  );
};
