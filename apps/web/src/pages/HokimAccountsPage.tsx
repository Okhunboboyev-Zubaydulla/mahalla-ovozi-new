import { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Button,
  Alert,
  Tag,
  Descriptions,
  Spin,
  Empty,
  Divider,
} from 'antd';
import {
  UserOutlined,
  UserAddOutlined,
  KeyOutlined,
  SwapOutlined,
  StopOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
  SafetyCertificateOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useDistrict } from '../district/district-context.js';
import { useHokimAccount } from '../district/useHokimAccount.js';
import { districtClient } from '../district/district-client.js';
import { useQuery } from '@tanstack/react-query';
import { OneTimeCredentialModal } from '../components/OneTimeCredentialModal.js';
import { CreateHokimModal } from '../components/CreateHokimModal.js';
import { ResetHokimModal } from '../components/ResetHokimModal.js';
import { ReplaceHokimModal } from '../components/ReplaceHokimModal.js';
import { DisableHokimModal } from '../components/DisableHokimModal.js';

const { Title, Text, Paragraph } = Typography;

export function HokimAccountsPage({ districtId }: { districtId?: string } = {}) {
  const { activeDistrictId: contextDistrictId } = useDistrict();
  const effectiveDistrictId = districtId ?? contextDistrictId;

  const { data: districtResponse } = useQuery({
    queryKey: ['district', effectiveDistrictId],
    queryFn: () => (effectiveDistrictId ? districtClient.getDistrict(effectiveDistrictId) : null),
    enabled: !!effectiveDistrictId,
  });
  const activeDistrict = districtResponse?.district ?? null;

  const {
    hokimState,
    account,
    isLoading,
    error,
    createHokimAccount,
    isCreating,
    createError,
    resetCreateError,
    resetPassword,
    isResetting,
    resetPasswordError,
    resetPasswordResetError,
    disableHokimAccount,
    isDisabling,
    disableError,
    resetDisableError,
    replaceHokimAccount,
    isReplacing,
    replaceError,
    resetReplaceError,
  } = useHokimAccount(effectiveDistrictId);

  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);

  // Ephemeral one-time credential state (zero persistent storage)
  const [oneTimeCredential, setOneTimeCredential] = useState<{
    username: string;
    temporaryPassword: string;
    title: string;
  } | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Handlers
  const handleOpenCreate = () => {
    resetCreateError();
    setIsCreateModalOpen(true);
  };

  const handleOpenReset = () => {
    resetPasswordResetError();
    setIsResetModalOpen(true);
  };

  const handleOpenReplace = () => {
    resetReplaceError();
    setIsReplaceModalOpen(true);
  };

  const handleOpenDisable = () => {
    resetDisableError();
    setIsDisableModalOpen(true);
  };

  const handleCreateSubmit = async (values: { username: string }) => {
    const res = await createHokimAccount(values);
    setIsCreateModalOpen(false);
    setOneTimeCredential({
      username: res.account.username,
      temporaryPassword: res.temporaryPassword,
      title: 'Ҳоким аккаунти муваффақиятли яратилди',
    });
  };

  const handleResetConfirm = async () => {
    const res = await resetPassword();
    setIsResetModalOpen(false);
    setOneTimeCredential({
      username: res.account.username,
      temporaryPassword: res.temporaryPassword,
      title: 'Парол муваффақиятли янгиланди',
    });
  };

  const handleReplaceSubmit = async (values: { newUsername: string }) => {
    const res = await replaceHokimAccount(values);
    setIsReplaceModalOpen(false);
    setOneTimeCredential({
      username: res.account.username,
      temporaryPassword: res.temporaryPassword,
      title: 'Ҳоким аккаунти муваффақиятли алмаштирилди',
    });
  };

  const handleDisableConfirm = async () => {
    await disableHokimAccount();
    setIsDisableModalOpen(false);
  };

  const handleCloseOneTimeModal = () => {
    // Immediately discard credential from memory
    setOneTimeCredential(null);
  };

  if (!effectiveDistrictId) {
    return (
      <Card variant="borderless" style={{ borderRadius: 12, padding: '24px 16px' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Text type="secondary" style={{ fontSize: 16 }}>
              Ҳоким аккаунтини бошқариш учун аввал юқоридаги менюдан туманни танланг.
            </Text>
          }
        />
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card variant="borderless" style={{ borderRadius: 12, textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <Paragraph type="secondary" style={{ marginTop: 16 }}>
          Ҳоким аккаунти маълумотлари юкланмоқда...
        </Paragraph>
      </Card>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ marginBottom: 4 }}>
          Ҳоким аккаунтини бошқариш
        </Title>
        <Text type="secondary" style={{ fontSize: 14 }}>
          {activeDistrict?.name
            ? `Танланган туман: ${activeDistrict.name}`
            : 'Туман ҳокими учун хавфсиз кириш ҳисобини яратиш ва бошқариш'}
        </Text>
      </div>

      {/* Offline Alert */}
      {isOffline && (
        <Alert
          message="Интерфейс автоном (офлайн) режимда"
          description="Интернет уланиши йўқ. Аккаунт яратиш, паролни янгилаш ёки алмаштириш амаллари интернет пайдо бўлгунча чекланади."
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 20 }}
        />
      )}

      {/* Error Alert */}
      {error && (
        <Alert
          message="Маълумотларни юклашда хатолик юз берди"
          description={error.message}
          type="error"
          showIcon
          style={{ marginBottom: 20 }}
        />
      )}

      {/* Mode 1: NO_ACCOUNT */}
      {hokimState === 'NO_ACCOUNT' && (
        <Card
          variant="borderless"
          style={{
            borderRadius: 12,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            textAlign: 'center',
            padding: '32px 16px',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#f1f5f9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto',
            }}
          >
            <UserOutlined style={{ fontSize: 32, color: '#64748b' }} />
          </div>

          <Title level={4} style={{ marginBottom: 8 }}>
            Ҳоким аккаунти яратилмаган
          </Title>
          <Paragraph type="secondary" style={{ maxWidth: 500, margin: '0 auto 24px auto' }}>
            Ушбу туман учун ҳали ҳоким аккаунти мавжуд эмас. Туман ҳокими тизимга кириши учун
            янги хавфсиз аккаунт яратинг.
          </Paragraph>

          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={handleOpenCreate}
            disabled={isOffline}
            style={{ height: 44, paddingInline: 24, fontSize: 15 }}
          >
            Ҳоким аккаунтини яратиш
          </Button>
        </Card>
      )}

      {/* Mode 2: ACTIVE */}
      {hokimState === 'ACTIVE' && account && (
        <Card
          variant="borderless"
          style={{
            borderRadius: 12,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <Space align="center" size={16}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: '#ecfdf5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <UserOutlined style={{ fontSize: 24, color: '#10b981' }} />
              </div>
              <div>
                <Space align="center" size={8}>
                  <Title level={4} style={{ margin: 0 }}>
                    @{account.username}
                  </Title>
                  <Tag color="blue" icon={<SafetyCertificateOutlined />}>
                    Туман ҳокими
                  </Tag>
                  <Tag color="success" icon={<CheckCircleOutlined />}>
                    Фаол
                  </Tag>
                </Space>
                <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 13 }}>
                  Туманга бириктирилган ягона расмий ҳоким ҳисоби
                </Text>
              </div>
            </Space>

            {/* Action Buttons */}
            <Space wrap size={12}>
              <Button
                icon={<KeyOutlined />}
                onClick={handleOpenReset}
                disabled={isOffline}
                style={{ height: 44 }}
              >
                Паролни янгилаш
              </Button>
              <Button
                icon={<SwapOutlined />}
                onClick={handleOpenReplace}
                disabled={isOffline}
                style={{ height: 44 }}
              >
                Аккаунтни алмаштириш
              </Button>
              <Button
                danger
                icon={<StopOutlined />}
                onClick={handleOpenDisable}
                disabled={isOffline}
                style={{ height: 44 }}
              >
                Фаолсизлантириш
              </Button>
            </Space>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2, md: 3 }}
            style={{ background: '#f8fafc', borderRadius: 8 }}
          >
            <Descriptions.Item label="Аккаунт ID">
              <Text copyable style={{ fontSize: 13 }}>
                {account.id}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Калит версияси (Версия)">
              <Tag>{account.credentialVersion}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Ҳолати">
              <Text strong style={{ color: '#10b981' }}>
                Фаол
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Яратилган вақти">
              {new Date(account.createdAt).toLocaleString('uz-UZ')}
            </Descriptions.Item>
            <Descriptions.Item label="Охирги янгиланиш">
              {new Date(account.updatedAt).toLocaleString('uz-UZ')}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* Mode 3: DISABLED */}
      {hokimState === 'DISABLED' && account && (
        <Card
          variant="borderless"
          style={{
            borderRadius: 12,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <Space align="center" size={16}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 8,
                  background: '#fef2f2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <StopOutlined style={{ fontSize: 24, color: '#ef4444' }} />
              </div>
              <div>
                <Space align="center" size={8}>
                  <Title level={4} style={{ margin: 0, color: '#64748b' }}>
                    @{account.username}
                  </Title>
                  <Tag color="default" icon={<SafetyCertificateOutlined />}>
                    Туман ҳокими
                  </Tag>
                  <Tag color="error" icon={<CloseCircleOutlined />}>
                    Фаолсизлантирилган
                  </Tag>
                </Space>
                <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 13 }}>
                  Ушбу аккаунт ҳозирда фаол эмас ва тизимга кириш ҳуқуқи чекланган
                </Text>
              </div>
            </Space>

            {/* Action Buttons for Disabled State */}
            <Space wrap size={12}>
              <Button
                type="primary"
                icon={<SwapOutlined />}
                onClick={handleOpenReplace}
                disabled={isOffline}
                style={{ height: 44 }}
              >
                Аккаунтни алмаштириш
              </Button>
              <Button
                icon={<UserAddOutlined />}
                onClick={handleOpenCreate}
                disabled={isOffline}
                style={{ height: 44 }}
              >
                Янги аккаунт яратиш
              </Button>
            </Space>
          </div>

          <Divider style={{ margin: '16px 0' }} />

          <Descriptions
            bordered
            size="small"
            column={{ xs: 1, sm: 2, md: 3 }}
            style={{ background: '#f8fafc', borderRadius: 8 }}
          >
            <Descriptions.Item label="Аккаунт ID">
              <Text copyable style={{ fontSize: 13 }}>
                {account.id}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Ҳолати">
              <Text strong type="danger">
                Фаолсизлантирилган
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Фаолсизлантирилган вақти">
              {new Date(account.updatedAt).toLocaleString('uz-UZ')}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {/* Security Guidance Note */}
      <div style={{ marginTop: 24 }}>
        <Alert
          message="Хавфсизлик бўйича муҳим эслатма"
          description="Ҳар бир туман учун фақат битта фаол ҳоким аккаунти бириктирилиши мумкин. Ҳоким аккаунти тизимда туман маълумотлари билан ишлаш учун қатъий чегараланган ҳуқуқларга эга бўлади. Парол очиқ ҳолда тизимда сақланмайди ва фақат яратиш/янгилаш вақтида бир марта кўрсатилади."
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      </div>

      {/* Action Modals */}
      <CreateHokimModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        isLoading={isCreating}
        error={createError}
      />

      <ResetHokimModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetConfirm}
        username={account?.username ?? ''}
        isLoading={isResetting}
        error={resetPasswordError}
      />

      <ReplaceHokimModal
        isOpen={isReplaceModalOpen}
        onClose={() => setIsReplaceModalOpen(false)}
        onSubmit={handleReplaceSubmit}
        currentUsername={account?.username ?? ''}
        isLoading={isReplacing}
        error={replaceError}
      />

      <DisableHokimModal
        isOpen={isDisableModalOpen}
        onClose={() => setIsDisableModalOpen(false)}
        onConfirm={handleDisableConfirm}
        username={account?.username ?? ''}
        isLoading={isDisabling}
        error={disableError}
      />

      {/* Dedicated One-Time Credential Modal */}
      <OneTimeCredentialModal
        isOpen={Boolean(oneTimeCredential)}
        onClose={handleCloseOneTimeModal}
        username={oneTimeCredential?.username ?? ''}
        temporaryPassword={oneTimeCredential?.temporaryPassword ?? null}
        title={oneTimeCredential?.title}
      />
    </div>
  );
}

export default HokimAccountsPage;
