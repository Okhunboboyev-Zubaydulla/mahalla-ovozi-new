import React from 'react';
import {
  Card,
  Descriptions,
  Badge,
  Tag,
  Typography,
  Collapse,
  theme,
  Alert,
} from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import type { GlobalAnalysisSettingsDto } from '@mahalla-ovozi/api-contracts';

const { Text } = Typography;

interface ActiveGlobalSettingsCardProps {
  settings: GlobalAnalysisSettingsDto;
}

export function formatTashkentTime(isoString: string | null): string {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('uz-UZ', {
      timeZone: 'Asia/Tashkent',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return isoString;
  }
}

export const ActiveGlobalSettingsCard: React.FC<
  ActiveGlobalSettingsCardProps
> = ({ settings }) => {
  const { token } = theme.useToken();

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Text strong style={{ fontSize: 16 }}>
            Фаол глобал таҳлил созламалари
          </Text>
          <Badge
            count="Фаол созламалар"
            style={{
              backgroundColor: token.colorSuccess,
              color: '#fff',
              fontWeight: 500,
            }}
          />
        </div>
      }
      variant="outlined"
      style={{
        borderRadius: token.borderRadiusLG,
        marginBottom: 24,
        background: token.colorBgContainer,
      }}
    >
      <Alert
        message="Ҳозирги ишлаб чиқариш конфигурацияси"
        description="Ушбу созламалар барча кирувчи хабарларнинг долзарблиги ва мавзуларга ажратилиши учун фаол қўлланилмоқда. Қоралама сақланганда ушбу фаол созламалар ўзгармайди."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 16, borderRadius: token.borderRadius }}
      />

      <Descriptions
        bordered
        size="small"
        column={{ xs: 1, sm: 2, md: 3, lg: 4 }}
        style={{ marginBottom: 16 }}
      >
        <Descriptions.Item label="Версия">
          <Tag color="blue">{settings.id}</Tag> (v{settings.version})
        </Descriptions.Item>
        <Descriptions.Item label="Фаоллаштирилган вақти">
          {formatTashkentTime(settings.activatedAt)}
        </Descriptions.Item>
        <Descriptions.Item label="Провайдер">
          <Tag color="cyan">{settings.modelProvider}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="Модель">
          <Text code>{settings.modelId}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Ҳарорат (Temperature)">
          {settings.temperature}
        </Descriptions.Item>
        <Descriptions.Item label="Максимал токенлар">
          {settings.maxOutputTokens}
        </Descriptions.Item>
        <Descriptions.Item label="Ҳолати" span={2}>
          <Badge status="success" text="Фаол (Production)" />
        </Descriptions.Item>
      </Descriptions>

      <Collapse
        ghost
        size="small"
        items={[
          {
            key: 'prompts',
            label: <Text strong>Тизим кўрсатмалари (System Prompts)</Text>,
            children: (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <Text type="secondary" strong>
                    1. Долзарблик таҳлили (Semantic Relevance):
                  </Text>
                  <pre
                    style={{
                      background: token.colorFillAlter,
                      padding: 10,
                      borderRadius: token.borderRadius,
                      fontFamily: token.fontFamilyCode,
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                      maxHeight: 150,
                      overflowY: 'auto',
                      border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                  >
                    {settings.relevanceSystemPrompt}
                  </pre>
                </div>
                <div>
                  <Text type="secondary" strong>
                    2. Мавзу бирлаштириш (Topic Matching):
                  </Text>
                  <pre
                    style={{
                      background: token.colorFillAlter,
                      padding: 10,
                      borderRadius: token.borderRadius,
                      fontFamily: token.fontFamilyCode,
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                      maxHeight: 150,
                      overflowY: 'auto',
                      border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                  >
                    {settings.topicMatchingSystemPrompt}
                  </pre>
                </div>
                <div>
                  <Text type="secondary" strong>
                    3. Мавзу проекцияси (Topic Projection):
                  </Text>
                  <pre
                    style={{
                      background: token.colorFillAlter,
                      padding: 10,
                      borderRadius: token.borderRadius,
                      fontFamily: token.fontFamilyCode,
                      fontSize: 12,
                      whiteSpace: 'pre-wrap',
                      maxHeight: 150,
                      overflowY: 'auto',
                      border: `1px solid ${token.colorBorderSecondary}`,
                    }}
                  >
                    {settings.topicProjectionSystemPrompt}
                  </pre>
                </div>
              </div>
            ),
          },
          {
            key: 'vocabulary',
            label: (
              <Text strong>
                Умумий хизмат луғати ({settings.globalServiceVocabulary.length} та атама)
              </Text>
            ),
            children: (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {settings.globalServiceVocabulary.map((item, i) => (
                  <Tag key={`${item.term}-${i}`} color="geekblue">
                    {item.term} <Text type="secondary">({item.category})</Text>
                  </Tag>
                ))}
              </div>
            ),
          },
        ]}
      />
    </Card>
  );
};
