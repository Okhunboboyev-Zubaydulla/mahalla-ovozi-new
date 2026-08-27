import React from 'react';
import { Card, Typography, Descriptions, Alert, Button, Space, theme } from 'antd';
import { EditOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { DistrictSubscription } from '@mahalla-ovozi/api-contracts';
import { SubscriptionStatusBadge } from './SubscriptionStatusBadge.js';
import { formatTashkentDate } from '../../lib/formatters.js';

const { Title, Text, Paragraph } = Typography;

export interface DistrictSubscriptionDetailCardProps {
  subscription: DistrictSubscription;
  onEdit: () => void;
  onBack?: () => void;
  isOffline?: boolean;
}

export const DistrictSubscriptionDetailCard: React.FC<DistrictSubscriptionDetailCardProps> = ({
  subscription,
  onEdit,
  onBack,
  isOffline = false,
}) => {
  const { token } = theme.useToken();

  return (
    <Card
      variant="borderless"
      style={{
        backgroundColor: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Space align="center">
            {onBack && (
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={onBack}
                aria-label="Барча туманларга қайтиш"
              >
                Барча туманлар
              </Button>
            )}
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {subscription.districtName}
              </Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {subscription.region ? `${subscription.region} • ` : ''}ID: {subscription.districtId}
              </Text>
            </div>
          </Space>

          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={onEdit}
            disabled={isOffline}
          >
            Обуна маълумотларини таҳрирлаш
          </Button>
        </div>
      }
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="Тўловлар бўйича муҳим эслатма"
          description="Тўловлар тизимдан ташқарида (қўлда) бошқарилади. Маҳалла Овози тўловларни қабул қилмайди ва карта маълумотларини сақламайди."
          style={{ borderRadius: token.borderRadius }}
        />

        <Descriptions
          bordered
          column={{ xs: 1, sm: 1, md: 2, lg: 2, xl: 2 }}
          size="middle"
        >
          <Descriptions.Item label="Обуна ҳолати">
            <SubscriptionStatusBadge status={subscription.status} />
          </Descriptions.Item>

          <Descriptions.Item label="Ҳолат бошланган вақт">
            <Text style={{ wordBreak: 'break-word' }}>
              {formatTashkentDate(subscription.statusStartedAt)}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="Кейинги режали ўзгариш">
            <Text style={{ wordBreak: 'break-word' }}>
              {subscription.scheduledTransitionAt
                ? `${formatTashkentDate(subscription.scheduledTransitionAt)} ${
                    subscription.scheduledTransitionType
                      ? `(${subscription.scheduledTransitionType})`
                      : ''
                  }`
                : subscription.scheduledTransitionType
                ? `(${subscription.scheduledTransitionType})`
                : '—'}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="Ташқи тўлов маълумотномаси">
            <Text style={{ wordBreak: 'break-word' }}>
              {subscription.externalPaymentReference || '—'}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="Ички қайд" span={2}>
            <Paragraph style={{ margin: 0, wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
              {subscription.internalNote || '—'}
            </Paragraph>
          </Descriptions.Item>

          <Descriptions.Item label="Яратилган вақт">
            <Text style={{ wordBreak: 'break-word' }}>
              {formatTashkentDate(subscription.createdAt)}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="Сўнгги таҳрир">
            <Text style={{ wordBreak: 'break-word' }}>
              {formatTashkentDate(subscription.updatedAt)}
            </Text>
          </Descriptions.Item>

          <Descriptions.Item label="Сўнгги таҳрир қилган фойдаланувчи ID" span={2}>
            <Text style={{ wordBreak: 'break-word' }}>
              {subscription.updatedById || '—'}
            </Text>
          </Descriptions.Item>
        </Descriptions>
      </Space>
    </Card>
  );
};
