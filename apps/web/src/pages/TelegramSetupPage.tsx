import { useState, useEffect } from 'react';
import {
  Card,
  Typography,
  Space,
  Form,
  Input,
  Button,
  Alert,
  Modal,
  Tag,
  Descriptions,
  Spin,
  Empty,
  Divider,
} from 'antd';
import {
  RobotOutlined,
  SafetyCertificateOutlined,
  SwapOutlined,
  DisconnectOutlined,
  LockOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useDistrict } from '../district/district-context.js';
import { useTelegramBot } from '../district/useTelegramBot.js';
import { districtClient } from '../district/district-client.js';
import { useQuery } from '@tanstack/react-query';

const { Title, Text, Paragraph } = Typography;

const BOT_TOKEN_REGEX = /^\d{6,16}:[a-zA-Z0-9_-]{20,50}$/;

export function TelegramSetupPage({ districtId }: { districtId?: string } = {}) {
  const { activeDistrictId: contextDistrictId } = useDistrict();
  const effectiveDistrictId = districtId ?? contextDistrictId;

  const { data: districtResponse } = useQuery({
    queryKey: ['district', effectiveDistrictId],
    queryFn: () => (effectiveDistrictId ? districtClient.getDistrict(effectiveDistrictId) : null),
    enabled: !!effectiveDistrictId,
  });
  const activeDistrict = districtResponse?.district ?? null;

  const {
    bot,
    isLoading,
    error,
    connectBot,
    isConnecting,
    connectError,
    resetConnectError,
    disconnectBot,
    isDisconnecting,
    disconnectError,
    resetDisconnectError,
  } = useTelegramBot(effectiveDistrictId);

  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);

  const [connectForm] = Form.useForm();
  const [replaceForm] = Form.useForm();

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

  const handleOpenReplaceModal = () => {
    resetConnectError();
    replaceForm.resetFields();
    setIsReplaceModalOpen(true);
  };

  const handleOpenDisconnectModal = () => {
    resetDisconnectError();
    setIsDisconnectModalOpen(true);
  };

  const handleConnectSubmit = async (values: { token: string }) => {
    try {
      await connectBot({ token: values.token.trim() });
      connectForm.resetFields();
    } catch {
      // Error handled by mutation state
    }
  };

  const handleReplaceSubmit = async (values: { token: string }) => {
    try {
      await connectBot({ token: values.token.trim() });
      replaceForm.resetFields();
      setIsReplaceModalOpen(false);
    } catch {
      // Error handled by mutation state
    }
  };

  const handleDisconnectConfirm = async () => {
    try {
      await disconnectBot();
      setIsDisconnectModalOpen(false);
    } catch {
      // Error handled by mutation state
    }
  };

  if (!activeDistrict) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
        <Title level={2}>Telegram бот созламалари</Title>
        <Card>
          <Empty
            description={
              <Space direction="vertical" align="center">
                <Text strong>Туман танланмаган</Text>
                <Text type="secondary">
                  Telegram ботни созлаш учун аввал юқоридаги танлагичдан туманни танланг.
                </Text>
              </Space>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2} style={{ marginBottom: '4px' }}>
            Telegram бот созламалари
          </Title>
          <Text type="secondary">
            {activeDistrict.name} тумани учун хабарларни йиғиш ва қайта ишлаш ботини бошқариш.
          </Text>
        </div>

        {isOffline && (
          <Alert
            message="Тармоқ алоқаси йўқ"
            description="Офлайн ҳолатда бот созламаларини ўзгартириб бўлмайди. Илтимос, интернет алоқасини текширинг."
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            style={{ minHeight: '44px' }}
          />
        )}

        {isLoading ? (
          <Card style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin size="large" tip="Бот маълумотлари юкланмоқда..." />
          </Card>
        ) : error ? (
          <Alert
            message="Бот маълумотларини юклашда хатолик"
            description={error.message || 'Сервер билан алоқада хатолик юз берди.'}
            type="error"
            showIcon
          />
        ) : bot && bot.status === 'VALID' ? (
          /* Connected / Valid State */
          <Card
            title={
              <Space>
                <RobotOutlined style={{ fontSize: '20px', color: '#1677ff' }} />
                <span>Бириктирилган Telegram бот</span>
              </Space>
            }
            extra={<Tag color="success" icon={<CheckCircleOutlined />}>ФАОЛ / УЛАНГАН</Tag>}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Descriptions bordered column={1} size="middle">
                <Descriptions.Item label="Бот номи">
                  <Text strong>{bot.botFirstName}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Telegram юзернейми">
                  <Text copyable strong>
                    {bot.botUsername ? `@${bot.botUsername}` : 'Юзернеймсиз'}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Бот ID">
                  <Text code>{bot.botId}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Токен кўриниши">
                  <Space>
                    <Text code>{bot.tokenMasked}</Text>
                    <Tag color="blue" icon={<LockOutlined />}>
                      AES-256-GCM билан ҳимояланган
                    </Tag>
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Охирги текширилган вақт">
                  <Text type="secondary">
                    {new Date(bot.lastValidatedAt).toLocaleString('uz-UZ')}
                  </Text>
                </Descriptions.Item>
              </Descriptions>

              <Alert
                message="Пассив қабул режими"
                description="Мазкур бот фақат бириктирилган Telegram гуруҳларидаги хабарларни қабул қилиш режимида ишлайди. У аҳолига ўз номидан бевосита хабар ёзмайди ва тарқатмайди."
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
              />

              <Divider style={{ margin: '12px 0' }} />

              <Space wrap size="middle">
                <Button
                  type="default"
                  icon={<SwapOutlined />}
                  size="large"
                  onClick={handleOpenReplaceModal}
                  disabled={isOffline || isConnecting || isDisconnecting}
                  style={{ minHeight: '44px' }}
                >
                  Ботни алмаштириш
                </Button>
                <Button
                  danger
                  type="default"
                  icon={<DisconnectOutlined />}
                  size="large"
                  onClick={handleOpenDisconnectModal}
                  disabled={isOffline || isConnecting || isDisconnecting}
                  loading={isDisconnecting}
                  style={{ minHeight: '44px' }}
                >
                  Ботни узиш
                </Button>
              </Space>
            </Space>
          </Card>
        ) : (
          /* Not Configured State */
          <Card
            title={
              <Space>
                <RobotOutlined style={{ fontSize: '20px', color: '#1677ff' }} />
                <span>Telegram ботни улаш</span>
              </Space>
            }
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Alert
                message="Бот токенини киритиш бўйича кўрсатма"
                description="BotFather орқали яратилган расмий Telegram бот токенини киритинг. Бот фақат бириктирилган туман гуруҳларидаги хабарларни қабул қилади ва ҳеч қачон автоматик хабар юбормайди."
                type="info"
                showIcon
                icon={<InfoCircleOutlined />}
              />

              {connectError && (
                <Alert
                  message="Ботни улашда хатолик"
                  description={
                    connectError.message ||
                    'Telegram бот токени нотўғри ёки ботга уланишда хатолик юз берди.'
                  }
                  type="error"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                />
              )}

              <Form
                form={connectForm}
                layout="vertical"
                onFinish={handleConnectSubmit}
                requiredMark={false}
              >
                <Form.Item
                  name="token"
                  label={<Text strong>Telegram бот токени</Text>}
                  rules={[
                    { required: true, message: 'Илтимос, Telegram бот токенини киритинг.' },
                    {
                      pattern: BOT_TOKEN_REGEX,
                      transform: (value: string) => value?.trim(),
                      message:
                        'Илтимос, тўғри Telegram бот токенини киритинг (масалан: 123456789:ABCdefGHIjkl...).',
                    },
                  ]}
                  extra="Токен фақат серверда шифрланган ҳолда (AES-256-GCM) сақланади ва браузерга очиқ ҳолда қайтарилмайди."
                >
                  <Input.Password
                    placeholder="123456789:AAF..."
                    size="large"
                    prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                    disabled={isOffline || isConnecting}
                    style={{ minHeight: '44px' }}
                    autoComplete="off"
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    icon={<SafetyCertificateOutlined />}
                    size="large"
                    loading={isConnecting}
                    disabled={isOffline}
                    style={{ minHeight: '44px', width: '100%' }}
                  >
                    Ботни текшириш ва улаш
                  </Button>
                </Form.Item>
              </Form>
            </Space>
          </Card>
        )}
      </Space>

      {/* Replace Bot Modal */}
      <Modal
        title={
          <Space>
            <SwapOutlined style={{ color: '#1677ff' }} />
            <span>Telegram ботни алмаштириш</span>
          </Space>
        }
        open={isReplaceModalOpen}
        onCancel={() => {
          if (!isConnecting) {
            setIsReplaceModalOpen(false);
            replaceForm.resetFields();
            resetConnectError();
          }
        }}
        footer={null}
        destroyOnHidden
      >
        <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: '12px' }}>
          <Paragraph type="secondary">
            Янги бот токенини киритинг. Эски бот маълумотлари ўчирилади ва янги бот текширилиб
            фаоллаштирилади.
          </Paragraph>

          {connectError && isReplaceModalOpen && (
            <Alert
              message="Алмаштиришда хатолик"
              description={connectError.message || 'Янги бот токенини текширишда хатолик юз берди.'}
              type="error"
              showIcon
            />
          )}

          <Form form={replaceForm} layout="vertical" onFinish={handleReplaceSubmit} requiredMark={false}>
            <Form.Item
              name="token"
              label={<Text strong>Янги Telegram бот токени</Text>}
              rules={[
                { required: true, message: 'Илтимос, янги Telegram бот токенини киритинг.' },
                {
                  pattern: BOT_TOKEN_REGEX,
                  transform: (value: string) => value?.trim(),
                  message:
                    'Илтимос, тўғри Telegram бот токенини киритинг (масалан: 123456789:ABCdefGHIjkl...).',
                },
              ]}
            >
              <Input.Password
                placeholder="123456789:AAF..."
                size="large"
                prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
                disabled={isConnecting}
                style={{ minHeight: '44px' }}
                autoComplete="off"
              />
            </Form.Item>

            <Space style={{ width: '100%', justifyContent: 'flex-end', display: 'flex' }}>
              <Button
                onClick={() => {
                  setIsReplaceModalOpen(false);
                  replaceForm.resetFields();
                  resetConnectError();
                }}
                disabled={isConnecting}
                size="large"
                style={{ minHeight: '44px' }}
              >
                Бекор қилиш
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={isConnecting}
                size="large"
                style={{ minHeight: '44px' }}
              >
                Алмаштиришни тасдиқлаш
              </Button>
            </Space>
          </Form>
        </Space>
      </Modal>

      {/* Disconnect Bot Confirmation Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
            <span>Telegram ботни узишни тасдиқланг</span>
          </Space>
        }
        open={isDisconnectModalOpen}
        onCancel={() => {
          if (!isDisconnecting) {
            setIsDisconnectModalOpen(false);
            resetDisconnectError();
          }
        }}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setIsDisconnectModalOpen(false);
              resetDisconnectError();
            }}
            disabled={isDisconnecting}
            size="large"
            style={{ minHeight: '44px' }}
          >
            Бекор қилиш
          </Button>,
          <Button
            key="disconnect"
            danger
            type="primary"
            loading={isDisconnecting}
            onClick={handleDisconnectConfirm}
            size="large"
            style={{ minHeight: '44px' }}
          >
            Ҳа, ботни узиш
          </Button>,
        ]}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: '12px' }}>
          <Paragraph>
            Ҳақиқатан ҳам <Text strong>{activeDistrict.name}</Text> туманига бириктирилган Telegram
            ботни узмоқчимисиз?
          </Paragraph>
          <Alert
            message="Огоҳлантириш"
            description="Бот узилгандан сўнг, ушбу туманда Telegram хабарларини йиғиш тўхтатилади ва туманнинг тайёргарлик ҳолати тўлиқ эмас деб белгиланади."
            type="warning"
            showIcon
          />
          {disconnectError && (
            <Alert
              message="Ботни узишда хатолик"
              description={disconnectError.message || 'Ботни узишда кутилмаган хатолик юз берди.'}
              type="error"
              showIcon
            />
          )}
        </Space>
      </Modal>
    </div>
  );
}
