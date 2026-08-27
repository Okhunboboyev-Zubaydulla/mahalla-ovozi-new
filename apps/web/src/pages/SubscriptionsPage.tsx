import React, { useState, useEffect } from 'react';
import { Card, Typography, Alert, Space, Spin, Button, theme } from 'antd';
import { ReloadOutlined, WifiOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { DistrictSubscription } from '@mahalla-ovozi/api-contracts';
import { subscriptionClient } from '../api/subscription-client.js';
import { useDistrict } from '../district/district-context.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { DistrictSubscriptionTable } from '../components/subscriptions/DistrictSubscriptionTable.js';
import { DistrictSubscriptionDetailCard } from '../components/subscriptions/DistrictSubscriptionDetailCard.js';
import { EditSubscriptionDrawer } from '../components/subscriptions/EditSubscriptionDrawer.js';

const { Title, Paragraph } = Typography;

export const SubscriptionsPage: React.FC = () => {
  const { token } = theme.useToken();
  const isOffline = useOnlineStatus();
  const { activeDistrictId, switchDistrict, attemptTransition } = useDistrict();

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<DistrictSubscription | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Synchronize when global DistrictSelector switches district
  useEffect(() => {
    if (activeDistrictId) {
      setSelectedDistrictId(activeDistrictId);
    }
    // Close drawer and reset in-flight editing on district context switch
    setIsDrawerOpen(false);
    setEditingSubscription(null);
  }, [activeDistrictId]);

  // Effective district ID for detail view
  const currentDistrictId = selectedDistrictId || activeDistrictId;

  // 1. Fetch all district subscriptions
  const {
    data: listData,
    isLoading: isListLoading,
    isError: isListError,
    error: listError,
    refetch: refetchList,
  } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: subscriptionClient.listDistrictSubscriptions,
  });

  const subscriptions = listData?.subscriptions || [];

  // Find active subscription from list or single query
  const currentSubscription = currentDistrictId
    ? subscriptions.find((s) => s.districtId === currentDistrictId) || null
    : null;

  const handleSelectDistrict = (districtId: string) => {
    attemptTransition(() => {
      setSelectedDistrictId(districtId);
      setViewMode('detail');
      switchDistrict(districtId);
    });
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedDistrictId(null);
  };

  const handleOpenEdit = (subscription: DistrictSubscription) => {
    setEditingSubscription(subscription);
    setIsDrawerOpen(true);
  };

  const handleCloseEdit = () => {
    setIsDrawerOpen(false);
    setEditingSubscription(null);
  };

  const handleEditSuccess = (updated: DistrictSubscription) => {
    setEditingSubscription(updated);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 32 }}>
      {/* Offline Notice Banner */}
      {isOffline && (
        <Alert
          type="warning"
          showIcon
          icon={<WifiOutlined />}
          message="Интернет алоқаси мавжуд эмас"
          description="Интернет алоқаси мавжуд эмас. Маълумотлар фақат ўқиш режимида."
          style={{ marginBottom: 16, borderRadius: token.borderRadius }}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Обуналар ва тўлов маълумотлари
          </Title>
          <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
            Туманлар бўйича қўлда бошқариладиган обуна ҳолатлари ва тўлов маълумотномаларини кўриш ва юритиш
          </Paragraph>
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetchList()}
          loading={isListLoading}
          disabled={isOffline}
        >
          Янгилаш
        </Button>
      </div>

      {isListError && (
        <Alert
          type="error"
          showIcon
          message="Маълумотларни юклашда хатолик"
          description={(listError as Error)?.message || 'Обуна маълумотларини олиш имконсиз бўлди.'}
          style={{ marginBottom: 24, borderRadius: token.borderRadius }}
        />
      )}

      {isListLoading && subscriptions.length === 0 ? (
        <Card style={{ textAlign: 'center', padding: '48px 0', borderRadius: token.borderRadiusLG }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Typography.Text type="secondary">Обуна маълумотлари юкланмоқда...</Typography.Text>
          </div>
        </Card>
      ) : viewMode === 'detail' && currentSubscription ? (
        /* Single District Detail View */
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <DistrictSubscriptionDetailCard
            subscription={currentSubscription}
            onEdit={() => handleOpenEdit(currentSubscription)}
            onBack={handleBackToList}
            isOffline={isOffline}
          />
        </Space>
      ) : (
        /* All Districts Summary Table */
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="Тўловлар тизими ҳақида муҳим эслатма"
            description="Тўловлар тизимдан ташқарида (қўлда) бошқарилади. Маҳалла Овози тўловларни қабул қилмайди ва карта маълумотларини сақламайди."
            style={{ borderRadius: token.borderRadius }}
          />

          <DistrictSubscriptionTable
            subscriptions={subscriptions}
            loading={isListLoading}
            onSelectDistrict={handleSelectDistrict}
            onEditSubscription={handleOpenEdit}
            isOffline={isOffline}
          />
        </Space>
      )}

      {/* Edit Subscription Metadata Drawer */}
      <EditSubscriptionDrawer
        open={isDrawerOpen}
        subscription={editingSubscription}
        onClose={handleCloseEdit}
        onSuccess={handleEditSuccess}
        isOffline={isOffline}
      />
    </div>
  );
};
