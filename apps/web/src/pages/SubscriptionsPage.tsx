import React, { useState, useEffect } from 'react';
import { Card, Typography, Alert, Space, Spin, Button, message, theme } from 'antd';
import { ReloadOutlined, WifiOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DistrictSubscription } from '@mahalla-ovozi/api-contracts';
import { ApiError } from '../lib/api-client.js';
import { subscriptionClient } from '../api/subscription-client.js';
import { useDistrict } from '../district/district-context.js';
import { districtQueryKeys } from '../district/query-keys.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { DistrictSubscriptionTable } from '../components/subscriptions/DistrictSubscriptionTable.js';
import { DistrictSubscriptionDetailCard } from '../components/subscriptions/DistrictSubscriptionDetailCard.js';
import { EditSubscriptionDrawer } from '../components/subscriptions/EditSubscriptionDrawer.js';
import { StartGraceModal } from '../components/subscriptions/StartGraceModal.js';
import { RestoreActiveModal } from '../components/subscriptions/RestoreActiveModal.js';
import { CancelDistrictModal } from '../components/subscriptions/CancelDistrictModal.js';
import { StartRecoveryModal } from '../components/subscriptions/StartRecoveryModal.js';

const { Title, Paragraph } = Typography;

export const SubscriptionsPage: React.FC = () => {
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const isOffline = useOnlineStatus();
  const { activeDistrictId, switchDistrict, attemptTransition } = useDistrict();

  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedDistrictId, setSelectedDistrictId] = useState<string | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<DistrictSubscription | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Lifecycle Modals State
  const [startGraceTarget, setStartGraceTarget] = useState<DistrictSubscription | null>(null);
  const [restoreActiveTarget, setRestoreActiveTarget] = useState<DistrictSubscription | null>(null);
  const [cancelDistrictTarget, setCancelDistrictTarget] = useState<DistrictSubscription | null>(null);
  const [startRecoveryTarget, setStartRecoveryTarget] = useState<DistrictSubscription | null>(null);

  // Synchronize when global DistrictSelector switches district
  useEffect(() => {
    if (activeDistrictId) {
      setSelectedDistrictId(activeDistrictId);
    }
    // Close drawer and modals on district context switch
    setIsDrawerOpen(false);
    setEditingSubscription(null);
    setStartGraceTarget(null);
    setRestoreActiveTarget(null);
    setCancelDistrictTarget(null);
    setStartRecoveryTarget(null);
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

  // Find active subscription from list
  const currentSubscription = currentDistrictId
    ? subscriptions.find((s) => s.districtId === currentDistrictId) || null
    : null;

  // Cache invalidation helper
  const invalidateSubscriptionQueries = async (districtId: string) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
      queryClient.invalidateQueries({ queryKey: districtQueryKeys.list() }),
      queryClient.invalidateQueries({ queryKey: ['district-subscription', districtId] }),
      queryClient.invalidateQueries({ queryKey: districtQueryKeys.district(districtId) }),
      queryClient.invalidateQueries({ queryKey: districtQueryKeys.details(districtId) }),
      queryClient.invalidateQueries({ queryKey: districtQueryKeys.readiness(districtId) }),
      queryClient.invalidateQueries({ queryKey: districtQueryKeys.bot(districtId) }),
      queryClient.invalidateQueries({ queryKey: districtQueryKeys.groups(districtId) }),
      queryClient.invalidateQueries({ queryKey: ['audit-history'] }),
      queryClient.invalidateQueries({ queryKey: ['health'] }),
    ]);
  };

  // 2. Start Grace Mutation
  const startGraceMutation = useMutation({
    mutationFn: async ({ districtId, reason }: { districtId: string; reason?: string }) => {
      return subscriptionClient.startDistrictGrace(districtId, { reason });
    },
    onSuccess: async (_data, variables) => {
      message.success('Туман учун 7 кунлик имтиёзли давр (Grace) муваффақиятли бошланди.');
      setStartGraceTarget(null);
      await invalidateSubscriptionQueries(variables.districtId);
    },
    onError: (err: Error) => {
      message.error(err.message || 'Имтиёзли даврни бошлашда хатолик юз берди.');
    },
  });

  // 3. Restore Active Mutation
  const restoreActiveMutation = useMutation({
    mutationFn: async ({ districtId, reason }: { districtId: string; reason?: string }) => {
      return subscriptionClient.restoreDistrictActive(districtId, { reason });
    },
    onSuccess: async (_data, variables) => {
      message.success('Туман фаолияти (Active) муваффақиятли тикланди.');
      setRestoreActiveTarget(null);
      await invalidateSubscriptionQueries(variables.districtId);
    },
    onError: (err: Error) => {
      if (
        err instanceof ApiError &&
        err.code === 'DISTRICT_NOT_READY' &&
        err.blockers &&
        err.blockers.length > 0
      ) {
        const blockerNames = err.blockers.map((b) => b.label).join(', ');
        message.error(`Туманни фаоллаштириш талаблари бажарилмаган: ${blockerNames}`);
      } else {
        message.error(err.message || 'Фаол ҳолатни тиклашда хатолик юз берди.');
      }
    },
  });

  // 4. Cancel District Mutation
  const cancelDistrictMutation = useMutation({
    mutationFn: async ({
      districtId,
      reason,
      confirmationDistrictName,
    }: {
      districtId: string;
      reason: string;
      confirmationDistrictName: string;
    }) => {
      return subscriptionClient.cancelDistrict(districtId, {
        reason,
        confirmationDistrictName,
      });
    },
    onSuccess: async (_data, variables) => {
      message.success('Туман муваффақиятли бекор қилинди (Cancelled).');
      setCancelDistrictTarget(null);
      await invalidateSubscriptionQueries(variables.districtId);
    },
    onError: (err: Error) => {
      message.error(err.message || 'Туманни бекор қилишда хатолик юз берди.');
    },
  });

  // 5. Start Recovery Mutation
  const startRecoveryMutation = useMutation({
    mutationFn: async ({ districtId, reason }: { districtId: string; reason?: string }) => {
      return subscriptionClient.startDistrictRecovery(districtId, { reason });
    },
    onSuccess: async (_data, variables) => {
      message.success('Туманни қайта тиклаш жараёни бошланди (Setup Incomplete).');
      setStartRecoveryTarget(null);
      await invalidateSubscriptionQueries(variables.districtId);
    },
    onError: (err: Error) => {
      message.error(err.message || 'Туманни тиклашда хатолик юз берди.');
    },
  });

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

  const handleOpenStartGrace = (subscription: DistrictSubscription) => {
    setStartGraceTarget(subscription);
  };

  const handleOpenRestoreActive = (subscription: DistrictSubscription) => {
    setRestoreActiveTarget(subscription);
  };

  const handleOpenCancelDistrict = (subscription: DistrictSubscription) => {
    setCancelDistrictTarget(subscription);
  };

  const handleOpenStartRecovery = (subscription: DistrictSubscription) => {
    setStartRecoveryTarget(subscription);
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
            onStartGrace={() => handleOpenStartGrace(currentSubscription)}
            onRestoreActive={() => handleOpenRestoreActive(currentSubscription)}
            onCancelDistrict={() => handleOpenCancelDistrict(currentSubscription)}
            onStartRecovery={() => handleOpenStartRecovery(currentSubscription)}
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
            onStartGrace={handleOpenStartGrace}
            onRestoreActive={handleOpenRestoreActive}
            onCancelDistrict={handleOpenCancelDistrict}
            onStartRecovery={handleOpenStartRecovery}
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

      {/* Start Grace Consequence Modal */}
      {startGraceTarget && (
        <StartGraceModal
          open={Boolean(startGraceTarget)}
          districtId={startGraceTarget.districtId}
          districtName={startGraceTarget.districtName}
          isPending={startGraceMutation.isPending}
          onConfirm={async (payload) => {
            await startGraceMutation.mutateAsync({
              districtId: startGraceTarget.districtId,
              reason: payload.reason,
            });
          }}
          onClose={() => setStartGraceTarget(null)}
        />
      )}

      {/* Restore Active Consequence Modal */}
      {restoreActiveTarget && (
        <RestoreActiveModal
          open={Boolean(restoreActiveTarget)}
          districtId={restoreActiveTarget.districtId}
          districtName={restoreActiveTarget.districtName}
          currentStatus={restoreActiveTarget.status}
          isPending={restoreActiveMutation.isPending}
          onConfirm={async (payload) => {
            await restoreActiveMutation.mutateAsync({
              districtId: restoreActiveTarget.districtId,
              reason: payload.reason,
            });
          }}
          onClose={() => setRestoreActiveTarget(null)}
        />
      )}

      {/* Cancel District High-Assurance Confirmation Modal */}
      {cancelDistrictTarget && (
        <CancelDistrictModal
          open={Boolean(cancelDistrictTarget)}
          districtId={cancelDistrictTarget.districtId}
          districtName={cancelDistrictTarget.districtName}
          region={cancelDistrictTarget.region}
          isPending={cancelDistrictMutation.isPending}
          onConfirm={async (payload) => {
            await cancelDistrictMutation.mutateAsync({
              districtId: cancelDistrictTarget.districtId,
              reason: payload.reason,
              confirmationDistrictName: payload.confirmationDistrictName,
            });
          }}
          onClose={() => setCancelDistrictTarget(null)}
        />
      )}

      {/* Start Recovery Consequence Confirmation Modal */}
      {startRecoveryTarget && (
        <StartRecoveryModal
          open={Boolean(startRecoveryTarget)}
          districtId={startRecoveryTarget.districtId}
          districtName={startRecoveryTarget.districtName}
          isPending={startRecoveryMutation.isPending}
          onConfirm={async (payload) => {
            await startRecoveryMutation.mutateAsync({
              districtId: startRecoveryTarget.districtId,
              reason: payload.reason,
            });
          }}
          onClose={() => setStartRecoveryTarget(null)}
        />
      )}
    </div>
  );
};

