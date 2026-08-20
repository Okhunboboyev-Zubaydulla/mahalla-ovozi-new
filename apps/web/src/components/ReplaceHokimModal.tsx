import React from 'react';
import { Modal, Form, Input, Button, Alert, Typography } from 'antd';
import { SwapOutlined, WarningOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface ReplaceHokimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: { newUsername: string }) => Promise<void>;
  currentUsername: string;
  isLoading: boolean;
  error: Error | null;
}

export const ReplaceHokimModal: React.FC<ReplaceHokimModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  currentUsername,
  isLoading,
  error,
}) => {
  const [form] = Form.useForm();

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const handleFinish = async (values: { newUsername: string }) => {
    await onSubmit(values);
    form.resetFields();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={handleCancel}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SwapOutlined style={{ color: '#1677ff' }} />
          Ҳоким аккаунтини алмаштириш
        </span>
      }
      footer={null}
      destroyOnHidden
    >
      <div style={{ marginTop: 16 }}>
        <Alert
          message="Амалдаги аккаунт фаолсизлантирилади"
          description={
            <span>
              Ушбу амал ҳозирги <Text strong>@{currentUsername}</Text> аккаунтини фаолсизлантиради ва барча сессияларини бекор қилади. Янги фойдаланувчи номи билан янги аккаунт яратилади.
            </span>
          }
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
        />

        {error && (
          <Alert
            message={error.message || 'Аккаунтни алмаштиришда хатолик юз берди.'}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleFinish}
        >
          <Form.Item
            label="Янги фойдаланувчи номи (Логин)"
            name="newUsername"
            extra="Фақат лотин ҳарфлари, рақамлар ва тагчизиқ (3-64 белги)."
            rules={[
              { required: true, message: 'Янги фойдаланувчи номини киритинг' },
              { min: 3, message: 'Камида 3 та белги бўлиши керак' },
              { max: 64, message: '64 та белгидан ошмаслиги керак' },
              {
                pattern: /^[a-zA-Z0-9_]+$/,
                message: 'Фақат лотин ҳарфлари, рақамлар ва тагчизиқ ишлатилиши мумкин',
              },
            ]}
          >
            <Input
              placeholder="Масалан: hokim_yangi_login"
              autoComplete="off"
              style={{ height: 44 }}
            />
          </Form.Item>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <Button onClick={handleCancel} disabled={isLoading} style={{ height: 44 }}>
              Бекор қилиш
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isLoading}
              style={{ height: 44, paddingInline: 24 }}
            >
              Аккаунтни алмаштириш
            </Button>
          </div>
        </Form>
      </div>
    </Modal>
  );
};
