import React from 'react';
import { Row, Col, Card, Typography, Space, theme } from 'antd';
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { District } from '@mahalla-ovozi/api-contracts';

const { Text } = Typography;

interface OverviewMetricCardsProps {
  districts: District[];
  loading?: boolean;
}

export const OverviewMetricCards: React.FC<OverviewMetricCardsProps> = ({
  districts,
  loading = false,
}) => {
  const { token } = theme.useToken();

  const totalDistricts = districts.length;
  const activeDistricts = districts.filter((d) => d.status === 'ACTIVE').length;
  const incompleteDistricts = districts.filter((d) => d.status === 'SETUP_INCOMPLETE').length;

  const cardItems = [
    {
      id: 'metric-total-districts',
      title: 'Жами туманлар',
      value: totalDistricts,
      subText: `${activeDistricts} та фаол • ${incompleteDistricts} та созланмоқда`,
      icon: <ApartmentOutlined style={{ fontSize: 20, color: token.colorPrimary }} />,
      iconBg: '#E0F2FE',
    },
    {
      id: 'metric-active-districts',
      title: 'Фаол туманлар',
      value: activeDistricts,
      subText: activeDistricts > 0 ? 'Сигналлар қабул қилинмоқда' : 'Ҳозирча фаол туман йўқ',
      icon: <CheckCircleOutlined style={{ fontSize: 20, color: token.colorSuccess || '#059669' }} />,
      iconBg: token.colorSuccessBg || '#D1FAE5',
    },
    {
      id: 'metric-incomplete-districts',
      title: 'Созлаш жараёнида',
      value: incompleteDistricts,
      subText: incompleteDistricts > 0 ? 'Тайёрлик босқичларида' : 'Барчаси созланган',
      icon: <ClockCircleOutlined style={{ fontSize: 20, color: token.colorWarning }} />,
      iconBg: token.colorWarningBg || '#FEF3C7',
    },
    {
      id: 'metric-system-health',
      title: 'Тизим ҳолати',
      value: 'Барқарор',
      subText: 'Хизматлар тўлиқ ишламоқда',
      icon: <SafetyCertificateOutlined style={{ fontSize: 20, color: token.colorPrimary }} />,
      iconBg: '#E0F2FE',
    },
  ];

  return (
    <section aria-label="Тизимнинг асосий кўрсаткичлари" style={{ marginBottom: 24 }}>
      <Row gutter={[16, 16]}>
        {cardItems.map((item) => (
          <Col xs={24} sm={12} lg={6} key={item.id}>
            <Card
              loading={loading}
              variant="borderless"
              style={{
                borderRadius: 12,
                height: '100%',
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorderSecondary || '#E2EAE7'}`,
              }}
              bodyStyle={{ padding: '20px 24px' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <Space direction="vertical" size={4} style={{ flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: 13, fontWeight: 500 }}>
                    {item.title}
                  </Text>
                  <div
                    style={{
                      fontSize: typeof item.value === 'number' ? 28 : 22,
                      fontWeight: 600,
                      color: token.colorText,
                      lineHeight: '34px',
                      marginTop: 2,
                    }}
                  >
                    {item.value}
                  </div>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: 12,
                      marginTop: 4,
                      display: 'block',
                      color: token.colorTextSecondary,
                    }}
                  >
                    {item.subText}
                  </Text>
                </Space>

                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: item.iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginLeft: 12,
                  }}
                  aria-hidden="true"
                >
                  {item.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </section>
  );
};
