import React from 'react';
import { Modal, Typography, Alert, Button, Space } from 'antd';
import { KeyOutlined, CheckOutlined, CopyOutlined, WarningOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

export interface OneTimeCredentialModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  temporaryPassword: string | null;
  title?: string;
}

export const OneTimeCredentialModal: React.FC<OneTimeCredentialModalProps> = ({
  isOpen,
  onClose,
  username,
  temporaryPassword,
  title = 'Ҳоким аккаунти маълумотлари',
}) => {
  if (!temporaryPassword) {
    return null;
  }

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      maskClosable={false}
      keyboard={false}
      closable={false}
      centered
      title={
        <Space align="center">
          <KeyOutlined style={{ color: '#1677ff', fontSize: 20 }} />
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
        </Space>
      }
      footer={[
        <Button
          key="close"
          type="primary"
          onClick={onClose}
          style={{ height: 44, paddingInline: 24, fontSize: 15 }}
        >
          Тушундим, ойнани ёпиш
        </Button>,
      ]}
    >
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <Alert
          message="Диққат! Бир марталик хавфсизлик маълумоти"
          description="Ушбу вақтинчалик парол фақат бир марта кўрсатилади. Ойна ёпилгандан сўнг у тизимдан ўчирилади ва уни қайта кўришнинг имкони бўлмайди. Илтимос, ҳозирнинг ўзида нусха олинг ва туман ҳокимига хавфсиз тарзда етказинг."
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 20 }}
        />

        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
              Фойдаланувчи номи (Login):
            </Text>
            <Text strong style={{ fontSize: 16 }}>
              {username}
            </Text>
          </div>

          <div>
            <Text type="secondary" style={{ display: 'block', marginBottom: 4 }}>
              Вақтинчалик парол:
            </Text>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                padding: '8px 12px',
              }}
            >
              <Text
                code
                id="temporary-password-display"
                data-testid="temporary-password"
                style={{
                  fontSize: 16,
                  letterSpacing: 1,
                  fontWeight: 600,
                  color: '#0f172a',
                  userSelect: 'all',
                }}
              >
                {temporaryPassword}
              </Text>
              <Paragraph
                copyable={{
                  text: temporaryPassword,
                  tooltips: ['Нусха олиш', 'Нусха олинди!'],
                  icon: [
                    <CopyOutlined
                      key="copy"
                      style={{ fontSize: 18, color: '#1677ff', marginLeft: 8, cursor: 'pointer' }}
                    />,
                    <CheckOutlined
                      key="copied"
                      style={{ fontSize: 18, color: '#10b981', marginLeft: 8 }}
                    />,
                  ],
                }}
                style={{ margin: 0 }}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};
