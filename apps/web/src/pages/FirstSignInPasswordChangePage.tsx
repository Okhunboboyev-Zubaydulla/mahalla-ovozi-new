import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Alert, Card, Typography, Space, message, theme } from 'antd';
import { LockOutlined, KeyOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/auth-context.js';
import { ApiError } from '../auth/auth-client.js';

const { Title, Text, Paragraph } = Typography;

export const FirstSignInPasswordChangePage: React.FC = () => {
  const { actor, changeFirstLoginPassword, isChangingPassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const { token } = theme.useToken();
  const [form] = Form.useForm();

  const handleSubmit = async (values: {
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  }) => {
    setErrorMessage(null);
    setIsNetworkError(false);

    const currentPassword = values.currentPassword;
    const newPassword = values.newPassword;
    const confirmPassword = values.confirmPassword;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setErrorMessage('Барча майдонларни тўлдиринг.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Янги парол ва унинг тасдиғи мос келмади.');
      return;
    }

    if (Array.from(newPassword).length < 15) {
      setErrorMessage('Янги парол камида 15 та белгидан иборат бўлиши керак.');
      return;
    }

    if (Array.from(newPassword).length > 128) {
      setErrorMessage('Янги парол 128 белгидан ошмаслиги керак.');
      return;
    }

    try {
      await changeFirstLoginPassword({
        currentPassword,
        newPassword,
      });

      message.success('Парол муваффақиятли янгиланди!');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (err instanceof ApiError) {
        setIsNetworkError(err.isNetworkError);
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Паролни ўзгартиришда хатолик юз берди. Илтимос, қайта уриниб кўринг.');
      }
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: token.colorBgLayout,
        padding: '24px 16px',
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 520,
          boxShadow: token.boxShadowSecondary,
          borderRadius: token.borderRadiusLG,
        }}
        variant="borderless"
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ color: token.colorPrimary, marginBottom: 4 }}>
              Паролни янгилаш
            </Title>
            <Paragraph style={{ color: token.colorTextSecondary, fontSize: 14, margin: 0 }}>
              Ҳурматли <strong>{actor?.username ? `@${actor.username}` : 'фойдаланувчи'}</strong>!
              Тизим хавфсизлиги учун вақтинчалик паролни янги доимий паролга алмаштиришингиз шарт.
            </Paragraph>
          </div>

          {/* AC 11: Mandatory passive notice — zero consent checkboxes */}
          <Alert
            type="info"
            showIcon
            message="Операцион кириш ва мониторинг тўғрисида огоҳлантириш"
            description="Эслатма: Тизим шартномасига мувофиқ, Маҳсулот эгаси туман маълумотлари ва далилларни мониторинг қилиш ҳамда техник қўллаб-қувватлаш учун операцион кириш ҳуқуқига эга."
            style={{ borderRadius: token.borderRadius }}
          />

          {errorMessage && (
            <Alert
              message={errorMessage}
              type={isNetworkError ? 'warning' : 'error'}
              showIcon
              role="alert"
              aria-live="assertive"
              style={{ borderRadius: token.borderRadius }}
            />
          )}

          <Form
            form={form}
            name="firstSignInPasswordChangeForm"
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
            requiredMark={false}
          >
            <Form.Item
              label={<span style={{ fontWeight: 500, color: token.colorText }}>Жорий (вақтинчалик) парол</span>}
              name="currentPassword"
              rules={[{ required: true, message: 'Жорий паролни киритинг!' }]}
            >
              <Input.Password
                prefix={<KeyOutlined style={{ color: token.colorPrimary }} />}
                placeholder="Сизга берилган вақтинчалик парол"
                id="current-password-input"
                autoComplete="current-password"
                disabled={isChangingPassword}
                style={{ height: 44, borderRadius: token.borderRadius }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 500, color: token.colorText }}>Янги доимий парол</span>}
              name="newPassword"
              rules={[
                { required: true, message: 'Янги паролни киритинг!' },
                { min: 15, message: 'Парол камида 15 белгидан иборат бўлиши керак!' },
                { max: 128, message: 'Парол 128 белгидан ошмаслиги керак!' },
              ]}
              extra={
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Парол узунлиги камида 15 белги бўлиши керак (ҳарфлар, сонлар, белгилар).
                </Text>
              }
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: token.colorPrimary }} />}
                placeholder="Янги хавфсиз паролни киритинг"
                id="new-password-input"
                autoComplete="new-password"
                disabled={isChangingPassword}
                style={{ height: 44, borderRadius: token.borderRadius }}
              />
            </Form.Item>

            <Form.Item
              label={<span style={{ fontWeight: 500, color: token.colorText }}>Янги паролни тасдиқланг</span>}
              name="confirmPassword"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Янги паролни қайта киритинг!' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Пароллар мос келмади!'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<CheckCircleOutlined style={{ color: token.colorPrimary }} />}
                placeholder="Янги паролни такроран киритинг"
                id="confirm-password-input"
                autoComplete="new-password"
                disabled={isChangingPassword}
                style={{ height: 44, borderRadius: token.borderRadius }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 12, marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isChangingPassword}
                id="change-password-submit-button"
                style={{
                  width: '100%',
                  height: 44,
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: token.borderRadius,
                }}
              >
                Паролни сақлаш ва тизимга кириш
              </Button>
            </Form.Item>

            <div style={{ textAlign: 'center' }}>
              <Button
                type="link"
                onClick={() => void signOut()}
                style={{ fontSize: 13, color: token.colorTextSecondary }}
              >
                Тизимдан чиқиш
              </Button>
            </div>
          </Form>
        </Space>
      </Card>
    </div>
  );
};
