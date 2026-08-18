import React from 'react';
import { Card, Typography, Button, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';
import { useDistrict } from '../district/district-context.js';
import { DistrictOnboardingChecklist } from '../components/DistrictOnboardingChecklist.js';

const { Title, Paragraph } = Typography;

export const OverviewPage: React.FC = () => {
  const { activeDistrictId } = useDistrict();
  const navigate = useNavigate();

  if (activeDistrictId) {
    return <DistrictOnboardingChecklist districtId={activeDistrictId} />;
  }

  return (
    <Card variant="borderless" style={{ borderRadius: 12 }}>
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <Empty
          description={
            <div>
              <Title level={4} style={{ marginBottom: 8 }}>
                Туман танланмаган
              </Title>
              <Paragraph type="secondary">
                Масъул ходим бошқарув панели. Ишни бошлаш ва созлашларни давом эттириш учун туманни танланг ёки янги туман қўшинг.
              </Paragraph>
            </div>
          }
        >
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/districts?action=create')}
            style={{ minHeight: 44 }}
          >
            Туман танлаш / қўшиш
          </Button>
        </Empty>
      </div>
    </Card>
  );
};

