import React, { useState } from 'react';
import {
  Tabs,
  Typography,
  Card,
  Spin,
  Alert,
  Tag,
  theme,
  Space,
} from 'antd';
import {
  SettingOutlined,
  ApartmentOutlined,
  HistoryOutlined,
  DashboardOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { useDistrict } from '../district/district-context.js';
import { DistrictSelector } from '../components/DistrictSelector.js';
import { useGlobalAnalysisSettings } from '../hooks/useGlobalAnalysisSettings.js';
import { useDistrictAnalysisSettings } from '../hooks/useDistrictAnalysisSettings.js';
import { ActiveGlobalSettingsCard } from '../components/ai/ActiveGlobalSettingsCard.js';
import { GlobalSettingsDraftForm } from '../components/ai/GlobalSettingsDraftForm.js';
import { ActiveDistrictSettingsCard } from '../components/ai/ActiveDistrictSettingsCard.js';
import { DistrictSettingsDraftForm } from '../components/ai/DistrictSettingsDraftForm.js';

const { Title, Text, Paragraph } = Typography;

export const AiOperationsPage: React.FC = () => {
  const { token } = theme.useToken();
  const { activeDistrictId, attemptTransition } = useDistrict();
  const [activeTabKey, setActiveTabKey] = useState<string>('global');

  const {
    data: globalSettingsData,
    isLoading: isGlobalLoading,
    isError: isGlobalError,
    error: globalError,
    refetch: refetchGlobal,
  } = useGlobalAnalysisSettings();

  const {
    data: districtSettingsData,
    isLoading: isDistrictLoading,
    isError: isDistrictError,
    error: districtError,
    refetch: refetchDistrict,
  } = useDistrictAnalysisSettings(activeDistrictId);

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
          {isGlobalLoading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" tip="Глобал созламалар юкланмоқда..." />
            </div>
          )}

          {isGlobalError && (
            <Alert
              message="Созламаларни юклашда хатолик"
              description={
                globalError instanceof Error
                  ? globalError.message
                  : 'Маълумотларни сервердан олишнинг имкони бўлмади.'
              }
              type="error"
              showIcon
              action={
                <a onClick={() => refetchGlobal()} style={{ cursor: 'pointer' }}>
                  <ReloadOutlined /> Қайта уриниш
                </a>
              }
              style={{ marginBottom: 16 }}
            />
          )}

          {globalSettingsData && (
            <div>
              <ActiveGlobalSettingsCard
                settings={globalSettingsData.activeConfiguration}
              />
              <GlobalSettingsDraftForm
                activeSettings={globalSettingsData.activeConfiguration}
                draft={globalSettingsData.draft}
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
        </span>
      ),
      children: (
        <div>
          {!activeDistrictId ? (
            <Card
              variant="outlined"
              style={{
                borderRadius: token.borderRadiusLG,
                background: token.colorBgContainer,
                textAlign: 'center',
                padding: '32px 16px',
              }}
            >
              <Space direction="vertical" size="middle" style={{ maxWidth: 500 }}>
                <EnvironmentOutlined
                  style={{ fontSize: 48, color: token.colorPrimary }}
                />
                <Title level={4} style={{ margin: 0 }}>
                  Туман созламаларини кўриш ва таҳрирлаш учун аввал туманни танланг
                </Title>
                <Paragraph type="secondary">
                  Ҳокимни таниш атамалари ва маҳаллий луғат ҳар бир туман учун алоҳида сақланади ва бошқарилади.
                </Paragraph>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <DistrictSelector />
                </div>
              </Space>
            </Card>
          ) : (
            <div>
              {isDistrictLoading && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Spin size="large" tip="Туман созламалари юкланмоқда..." />
                </div>
              )}

              {isDistrictError && (
                <Alert
                  message="Туман созламаларини юклашда хатолик"
                  description={
                    districtError instanceof Error
                      ? districtError.message
                      : 'Маълумотларни сервердан олишнинг имкони бўлмади.'
                  }
                  type="error"
                  showIcon
                  action={
                    <a
                      onClick={() => refetchDistrict()}
                      style={{ cursor: 'pointer' }}
                    >
                      <ReloadOutlined /> Қайта уриниш
                    </a>
                  }
                  style={{ marginBottom: 16 }}
                />
              )}

              {districtSettingsData && (
                <div>
                  <ActiveDistrictSettingsCard
                    districtName={districtSettingsData.districtName}
                    settings={districtSettingsData.activeConfiguration}
                  />
                  <DistrictSettingsDraftForm
                    districtId={activeDistrictId}
                    districtName={districtSettingsData.districtName}
                    activeSettings={districtSettingsData.activeConfiguration}
                    draft={districtSettingsData.draft}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ),
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
          Глобал таҳлил модел параметрлари, тизим кўрсатмалари ва туманларга хос атамаларни бошқариш.
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

