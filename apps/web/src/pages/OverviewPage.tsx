import React from 'react';
import { Card, Typography } from 'antd';
import { useDistrict } from '../district/district-context.js';

const { Title, Paragraph } = Typography;

export const OverviewPage: React.FC = () => {
  const { activeDistrictId } = useDistrict();

  return (
    <Card variant="borderless" style={{ borderRadius: 12 }}>
      <Title level={2} style={{ marginTop: 0 }}>Умумий кўриниш</Title>
      <Paragraph type="secondary">
        {activeDistrictId
          ? `Танланган туман бўйича бошқарув панели (ID: ${activeDistrictId})`
          : 'Масъул ходим бошқарув панели. Ишни бошлаш учун туманни танланг ёки янги туман қўшинг.'}
      </Paragraph>
    </Card>
  );
};
