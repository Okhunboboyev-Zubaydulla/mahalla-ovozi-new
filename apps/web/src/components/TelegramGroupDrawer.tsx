import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Drawer,
  Form,
  Input,
  Button,
  Space,
  Alert,
  Typography,
  Statistic,
  Progress,
  Steps,
  Grid,
} from 'antd';
import {
  PlusOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  InfoCircleOutlined,
  SendOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { TelegramGroupMapping } from '@mahalla-ovozi/api-contracts';
import { telegramGroupClient } from '../district/telegram-group-client.js';

const { Text, Paragraph } = Typography;
const { Countdown } = Statistic;
const { useBreakpoint } = Grid;

interface TelegramGroupDrawerProps {
  open: boolean;
  onClose: () => void;
  districtId: string;
  onGroupSaved?: () => void;
  initialGroup?: TelegramGroupMapping | null;
  initialStep?: number;
}

export function TelegramGroupDrawer({
  open,
  onClose,
  districtId,
  onGroupSaved,
  initialGroup,
  initialStep,
}: TelegramGroupDrawerProps) {
  const screens = useBreakpoint();
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Active testing state
  const [activeGroup, setActiveGroup] = useState<TelegramGroupMapping | null>(null);
  const [countdownDeadline, setCountdownDeadline] = useState<number>(0);
  const [testStatus, setTestStatus] = useState<'PENDING' | 'SUCCESS' | 'TIMEOUT' | 'FAILED'>('PENDING');
  const [testError, setTestError] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or reset drawer state when opened/closed
  useEffect(() => {
    if (open) {
      form.resetFields();
      setSubmitError(null);
      setTestError(null);

      if (initialGroup) {
        setActiveGroup(initialGroup);
        form.setFieldsValue({
          mahallaName: initialGroup.mahallaName,
          telegramChatId: initialGroup.telegramChatId,
        });
        if (initialStep === 0) {
          setCurrentStep(0);
        } else if (['PENDING', 'TESTING', 'FAILED'].includes(initialGroup.status)) {
          setCurrentStep(1);
          startLiveTest(initialGroup);
        } else {
          setCurrentStep(0);
        }
      } else {
        setActiveGroup(null);
        setCurrentStep(0);
      }
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [open, initialGroup]);

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const startLiveTest = useCallback(
    async (group: TelegramGroupMapping) => {
      stopPolling();
      setTestStatus('PENDING');
      setTestError(null);
      setCountdownDeadline(Date.now() + 60 * 1000);

      try {
        await telegramGroupClient.startTest(districtId, group.id);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'СинОВ сессиясини очиб бўлмади.';
        setTestError(errorMsg);
      }

      // Poll every 2 seconds
      pollIntervalRef.current = setInterval(async () => {
        try {
          const res = await telegramGroupClient.getTestStatus(districtId, group.id);
          if (res.status === 'SUCCESS') {
            setTestStatus('SUCCESS');
            stopPolling();
            onGroupSaved?.();
          } else if (res.status === 'TIMEOUT') {
            setTestStatus('TIMEOUT');
            setTestError(res.lastError || 'СинОВ вақти тугади. Ҳақиқий одам томонидан хабар юборилмади.');
            stopPolling();
            onGroupSaved?.();
          } else if (res.status === 'FAILED') {
            setTestStatus('FAILED');
            setTestError(res.lastError || 'СинОВ хатолик билан якунланди.');
            stopPolling();
            onGroupSaved?.();
          }
        } catch {
          // Keep polling on network blip
        }
      }, 2000);
    },
    [districtId, onGroupSaved],
  );

  const handleFormSubmit = async (values: { mahallaName: string; telegramChatId: string }) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      if (initialGroup) {
        const res = await telegramGroupClient.updateGroup(districtId, initialGroup.id, {
          mahallaName: values.mahallaName.trim(),
          telegramChatId: values.telegramChatId.trim(),
        });
        setActiveGroup(res.group);
        setCurrentStep(1);
        onGroupSaved?.();
        await startLiveTest(res.group);
      } else {
        const res = await telegramGroupClient.createGroup(districtId, {
          mahallaName: values.mahallaName.trim(),
          telegramChatId: values.telegramChatId.trim(),
        });
        setActiveGroup(res.group);
        setCurrentStep(1);
        onGroupSaved?.();
        await startLiveTest(res.group);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Гуруҳни бириктиришда хатолик юз берди.';
      setSubmitError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimeout = async () => {
    if (testStatus === 'PENDING') {
      setTestStatus('TIMEOUT');
      setTestError('60 сониялик синов вақти тугади. Бот гуруҳдан инсон хабарини қабул қила олмади.');
      stopPolling();
      if (activeGroup) {
        try {
          const res = await telegramGroupClient.getTestStatus(districtId, activeGroup.id);
          if (res.lastError) setTestError(res.lastError);
        } catch {
          // Keep local state on network error
        }
        onGroupSaved?.();
      }
    }
  };

  const handleSimulateMessage = async () => {
    if (!activeGroup) return;
    setIsSimulating(true);
    try {
      const res = await telegramGroupClient.simulateTestMessage(districtId, activeGroup.id, {
        message: {
          message_id: Math.floor(Math.random() * 100000),
          date: Math.floor(Date.now() / 1000),
          chat: { id: activeGroup.telegramChatId, type: 'supergroup', title: activeGroup.telegramChatTitle },
          from: { id: 12345678, is_bot: false, first_name: 'Синовчи Одам' },
          text: 'Маҳалла каналидан тест хабари.',
        },
      });

      if (res.accepted) {
        setTestStatus('SUCCESS');
        stopPolling();
        onGroupSaved?.();
      } else {
        setTestError(`Симуляция хабари қабул қилинмади: ${res.reason}`);
      }
    } catch (err: unknown) {
      setTestError(err instanceof Error ? err.message : 'Симуляция хабарини юборишда хатолик.');
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <Drawer
      title={
        <Space>
          <PlusOutlined style={{ color: '#1677ff' }} />
          <span>Маҳалла Telegram гуруҳини бириктириш</span>
        </Space>
      }
      placement="right"
      width={screens.xs ? '100%' : 540}
      onClose={() => {
        stopPolling();
        onClose();
      }}
      open={open}
      destroyOnHidden
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Steps
          current={currentStep}
          size="small"
          items={[
            { title: 'Гуруҳ маълумотлари' },
            { title: 'Хабар синови' },
          ]}
        />

        {currentStep === 0 ? (
          /* Step 0: Group Form */
          <Form form={form} layout="vertical" onFinish={handleFormSubmit} requiredMark={false}>
            <Alert
              message="Гуруҳ Chat ID топиш бўйича кўрсатма"
              description="Telegram гуруҳингиздаги исталган хабарни @userinfobot ёки @raw_data_bot га форвард қилинг. Гуруҳ Chat ID рақами одатда -100 билан бошланади (масалан: -1001234567890)."
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
              style={{ marginBottom: '16px' }}
            />

            {submitError && (
              <Alert
                message="Бириктиришда хатолик"
                description={submitError}
                type="error"
                showIcon
                icon={<ExclamationCircleOutlined />}
                style={{ marginBottom: '16px' }}
              />
            )}

            <Form.Item
              name="mahallaName"
              label={<Text strong>Маҳалла номи</Text>}
              rules={[
                { required: true, message: 'Илтимос, маҳалла номини киритинг.' },
                { max: 100, message: 'Маҳалла номи 100 та белгидан ошмаслиги керак.' },
              ]}
            >
              <Input
                placeholder="Масалан: Навбаҳор"
                size="large"
                style={{ minHeight: '44px' }}
                disabled={isSubmitting}
              />
            </Form.Item>

            <Form.Item
              name="telegramChatId"
              label={<Text strong>Telegram гуруҳ Chat ID</Text>}
              rules={[
                { required: true, message: 'Илтимос, Telegram Chat ID рақамини киритинг.' },
                { max: 50, message: 'Chat ID 50 та белгидан ошмаслиги керак.' },
              ]}
              extra="Бот ушбу гуруҳга олдиндан оддий аъзо сифатида қўшилган бўлиши шарт."
            >
              <Input
                placeholder="Масалан: -1001234567890"
                size="large"
                style={{ minHeight: '44px' }}
                disabled={isSubmitting}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: '24px' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isSubmitting}
                size="large"
                style={{ minHeight: '44px', width: '100%' }}
              >
                Текшириш ва кейинги босқичга ўтиш
              </Button>
            </Form.Item>
          </Form>
        ) : (
          /* Step 1: Live Test-Message Flow */
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message="Хабар синови режими (60 сония)"
              description={
                <span>
                  Илтимос, <Text strong>{activeGroup?.telegramChatTitle || activeGroup?.mahallaName}</Text> гуруҳига
                  биронта одатий инсон матн хабари юборинг. Бот ушбу хабарни қабул қилганда синов автомат муваффақиятли якунланади.
                </span>
              }
              type="info"
              showIcon
              icon={<InfoCircleOutlined />}
            />

            {testStatus === 'PENDING' && countdownDeadline > 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px',
                  background: '#f5f5f5',
                  borderRadius: '8px',
                }}
              >
                <Countdown
                  title="Тест хабарини кутиш вақти"
                  value={countdownDeadline}
                  format="ss"
                  suffix="сония"
                  prefix={<ClockCircleOutlined />}
                  onFinish={handleTimeout}
                  valueStyle={{ color: '#1677ff', fontSize: '28px', fontWeight: 600 }}
                />
                <Progress percent={70} status="active" showInfo={false} style={{ marginTop: '16px' }} />
                <Paragraph type="secondary" style={{ marginTop: '8px' }}>
                  <SyncOutlined spin style={{ marginRight: '6px' }} />
                  Гуруҳдан янги хабар кутилмоқда...
                </Paragraph>
              </div>
            )}

            {testStatus === 'SUCCESS' && (
              <Alert
                message="Синов муваффақиятли якунланди!"
                description="Telegram бот ушбу гуруҳдаги хабарларни муваффақиятли қабул қила олиши тасдиқланди. Маҳалла гуруҳи фаоллаштирилди."
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
              />
            )}

            {(testStatus === 'TIMEOUT' || testStatus === 'FAILED' || testError) && testStatus !== 'SUCCESS' && (
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <Alert
                  message="Синов вақтида хатолик"
                  description={testError || 'СинОВ вақти тугади. Ҳақиқий одам томонидан хабар юборилмади.'}
                  type="error"
                  showIcon
                  icon={<ExclamationCircleOutlined />}
                />
                <Alert
                  message="Муаммони бартараф этиш бўйича кўрсатма"
                  description={
                    <ul style={{ paddingLeft: '20px', margin: 0 }}>
                      <li>Бот гуруҳга қўшилганини ва чиқариб юборилмаганини текширинг.</li>
                      <li>
                        @BotFather да ботнинг махфийлик режимини ўчиринг (<Text code>/setprivacy → Disable</Text>).
                      </li>
                      <li>Гуруҳга оддий матн хабари (бот буйруғи бўлмаган) юборилганига ишонч ҳосил қилинг.</li>
                    </ul>
                  }
                  type="warning"
                  showIcon
                />
              </Space>
            )}

            {/* Test Simulation Button for testing environments */}
            {testStatus === 'PENDING' && (
              <Button
                type="dashed"
                icon={<SendOutlined />}
                onClick={handleSimulateMessage}
                loading={isSimulating}
                style={{ width: '100%', minHeight: '40px' }}
              >
                Синов хабарини симуляция қилиш (Тест режими)
              </Button>
            )}

            <Space style={{ width: '100%', justifyContent: 'space-between', marginTop: '16px' }}>
              <div>
                {testStatus !== 'SUCCESS' && (
                  <Button
                    type="default"
                    icon={<ArrowLeftOutlined />}
                    onClick={() => {
                      stopPolling();
                      setCurrentStep(0);
                    }}
                    style={{ minHeight: '44px' }}
                  >
                    Орқага
                  </Button>
                )}
              </div>
              <Space>
                {(testStatus === 'TIMEOUT' || testStatus === 'FAILED') && activeGroup && (
                  <Button
                    type="default"
                    onClick={() => startLiveTest(activeGroup)}
                    style={{ minHeight: '44px' }}
                  >
                    Қайта синаб кўриш
                  </Button>
                )}
                <Button
                  type="primary"
                  onClick={() => {
                    stopPolling();
                    onClose();
                  }}
                  style={{ minHeight: '44px' }}
                >
                  {testStatus === 'SUCCESS' ? 'Якунлаш' : 'Ёпиш'}
                </Button>
              </Space>
            </Space>
          </Space>
        )}
      </Space>
    </Drawer>
  );
}
