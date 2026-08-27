import React, { useState } from 'react';
import {
  Tabs,
  Typography,
  Card,
  Spin,
  Alert,
  Tag,
  theme,
} from 'antd';
import {
  SettingOutlined,
  ApartmentOutlined,
  HistoryOutlined,
  DashboardOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useDistrict } from '../district/district-context.js';
import { useGlobalAnalysisSettings } from '../hooks/useGlobalAnalysisSettings.js';
import { ActiveGlobalSettingsCard } from '../components/ai/ActiveGlobalSettingsCard.js';
import { GlobalSettingsDraftForm } from '../components/ai/GlobalSettingsDraftForm.js';

const { Title, Text, Paragraph } = Typography;

export const AiOperationsPage: React.FC = () => {
  const { token } = theme.useToken();
  const { attemptTransition } = useDistrict();
  const [activeTabKey, setActiveTabKey] = useState<string>('global');

  const {
    data: settingsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useGlobalAnalysisSettings();

  const handleTabChange = (nextKey: string) => {
    if (nextKey === activeTabKey) return;
    attemptTransition(() => {
      setActiveTabKey(nextKey);
    });
  };

  const tabItems = [
    {
      key: 'global',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SettingOutlined />
          Глобал созламалар
        </span>
      ),
      children: (
        <div>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" tip="Глобал созламалар юкланмоқда..." />
            </div>
          )}

          {isError && (
            <Alert
              message="Созламаларни юклашда хатолик"
              description={
                error instanceof Error
                  ? error.message
                  : 'Маълумотларни сервердан олишнинг имкони бўлмади.'
              }
              type="error"
              showIcon
              action={
                <a onClick={() => refetch()} style={{ cursor: 'pointer' }}>
                  <ReloadOutlined /> Қайта уриниш
                </a>
              }
              style={{ marginBottom: 16 }}
            />
          )}

          {settingsData && (
            <div>
              <ActiveGlobalSettingsCard
                settings={settingsData.activeConfiguration}
              />
              <GlobalSettingsDraftForm
                activeSettings={settingsData.activeConfiguration}
                draft={settingsData.draft}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'district',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ApartmentOutlined />
          Туман созламалари
          <Tag color="default" style={{ marginInlineStart: 4, fontSize: 11 }}>
            5.2 босқичида
          </Tag>
        </span>
      ),
      disabled: true,
    },
    {
      key: 'history',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <HistoryOutlined />
          Созламалар тарихи
          <Tag color="default" style={{ marginInlineStart: 4, fontSize: 11 }}>
            5.4 босқичида
          </Tag>
        </span>
      ),
      disabled: true,
    },
    {
      key: 'monitoring',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <DashboardOutlined />
          Операциялар мониторинги
        </span>
      ),
      children: (
        <Card
          variant="borderless"
          style={{
            borderRadius: token.borderRadiusLG,
            background: token.colorBgContainer,
          }}
        >
          <Title level={4}>АИ операциялари мониторинги</Title>
          <Paragraph type="secondary">
            Кирувчи хабарларнинг долзарблиги ва мавзу бирлаштириш операцияларининг реал вақтдаги ҳолати.
          </Paragraph>
        </Card>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={3} style={{ margin: 0 }}>
          АИ операциялари ва созламалари
        </Title>
        <Text type="secondary">
          Глобал таҳлил модел параметрлари, тизим кўрсатмалари ва хизмат кўрсатиш луғатларини бошқариш.
        </Text>
      </div>

      <Tabs
        activeKey={activeTabKey}
        onChange={handleTabChange}
        items={tabItems}
        size="large"
        style={{ background: 'transparent' }}
      />
    </div>
  );
};

export default AiOperationsPage;
