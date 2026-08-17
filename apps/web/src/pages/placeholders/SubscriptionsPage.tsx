import React from 'react';
import { Card, Typography } from 'antd';
import { useDistrict } from '../../district/district-context.js';

const { Title, Paragraph } = Typography;

export const SubscriptionsPage: React.FC = () => {
  const { activeDistrictId } = useDistrict();

  return (
    <Card variant="borderless" style={{ borderRadius: 12 }}>
      <Title level={3} style={{ marginTop: 0 }}>Обуналар</Title>
      <Paragraph type="secondary">
        {activeDistrictId
          ? `Танланган туман ID: ${activeDistrictId}`
          : 'Туман танланмаган'}
      </Paragraph>
    </Card>
  );
};
