import React from 'react';
import { Modal, Form, Input, Button, Alert } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';

export interface CreateHokimModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: { username: string }) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

export const CreateHokimModal: React.FC<CreateHokimModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  error,
}) => {
  const [form] = Form.useForm();

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  const handleFinish = async (values: { username: string }) => {
    await onSubmit(values);
    form.resetFields();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={handleCancel}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserAddOutlined style={{ color: '#1677ff' }} />
          Ҳоким аккаунтини яратиш
        </span>
      }
      footer={null}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        style={{ marginTop: 16 }}
      >
        {error && (
          <Alert
            message={error.message || 'Аккаунт яратишда хатолик юз берди.'}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item
          label="Фойдаланувчи номи (Логин)"
          name="username"
          extra="Фақат лотин ҳарфлари, рақамлар ва тагчизиқ (3-64 белги)."
          rules={[
            { required: true, message: 'Фойдаланувчи номини киритинг' },
            { min: 3, message: 'Камида 3 та белги бўлиши керак' },
            { max: 64, message: '64 та белгидан ошмаслиги керак' },
            {
              pattern: /^[a-zA-Z0-9_]+$/,
              message: 'Фақат лотин ҳарфлари, рақамлар ва тагчизиқ ишлатилиши мумкин',
            },
          ]}
        >
          <Input
            placeholder="Масалан: hokim_chilonzor"
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
            Аккаунт яратиш
          </Button>
        </div>
      </Form>
    </Modal>
  );
};
