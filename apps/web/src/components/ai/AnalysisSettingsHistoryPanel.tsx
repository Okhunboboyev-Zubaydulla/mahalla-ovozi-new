import React, { useState, useEffect } from 'react';
import {
  Tabs,
  Card,
  Spin,
  Alert,
  Typography,
  Space,
  theme,
  message,
} from 'antd';
import {
  SettingOutlined,
  ApartmentOutlined,
  ReloadOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import {
  type GlobalAnalysisSettingsDto,
  type DistrictAnalysisSettingsDto,
} from '@mahalla-ovozi/api-contracts';
import { useDistrict } from '../../district/district-context.js';
import { DistrictSelector } from '../DistrictSelector.js';
import {
  useGlobalAnalysisSettings,
  useGlobalAnalysisSettingsHistory,
  useRollbackGlobalSettings,
} from '../../hooks/useGlobalAnalysisSettings.js';
import {
  useDistrictAnalysisSettings,
  useDistrictAnalysisSettingsHistory,
  useRollbackDistrictSettings,
} from '../../hooks/useDistrictAnalysisSettings.js';
import { AnalysisSettingsHistoryTable } from './AnalysisSettingsHistoryTable.js';
import { AnalysisSettingsRollbackModal } from './AnalysisSettingsRollbackModal.js';

const { Title, Text, Paragraph } = Typography;

export const AnalysisSettingsHistoryPanel: React.FC = () => {
  const { token } = theme.useToken();
  const { activeDistrictId, attemptTransition } = useDistrict();
  const [subTabKey, setSubTabKey] = useState<string>('global');

  // Selected version for rollback review modal
  const [selectedTargetVersion, setSelectedTargetVersion] = useState<
    GlobalAnalysisSettingsDto | DistrictAnalysisSettingsDto | null
  >(null);

  useEffect(() => {
    setSelectedTargetVersion(null);
  }, [activeDistrictId]);

  // Global Settings Data & History
  const {
    data: globalActiveData,
    refetch: refetchGlobalActive,
  } = useGlobalAnalysisSettings();

  const {
    data: globalHistoryData,
    isLoading: isGlobalHistoryLoading,
    isError: isGlobalHistoryError,
    error: globalHistoryError,
    refetch: refetchGlobalHistory,
  } = useGlobalAnalysisSettingsHistory();

  const rollbackGlobalMutation = useRollbackGlobalSettings();

  // District Settings Data & History
  const {
    data: districtActiveData,
    refetch: refetchDistrictActive,
  } = useDistrictAnalysisSettings(activeDistrictId);

  const {
    data: districtHistoryData,
    isLoading: isDistrictHistoryLoading,
    isError: isDistrictHistoryError,
    error: districtHistoryError,
    refetch: refetchDistrictHistory,
  } = useDistrictAnalysisSettingsHistory(activeDistrictId);

  const rollbackDistrictMutation = useRollbackDistrictSettings(
    activeDistrictId || '',
  );

  const handleSubTabChange = (key: string) => {
    if (key === subTabKey) return;
    attemptTransition(() => {
      setSubTabKey(key);
      setSelectedTargetVersion(null);
    });
  };

  const handleRollbackGlobalConfirm = async (changeReason: string) => {
    if (!globalActiveData?.activeConfiguration || !selectedTargetVersion) return;
    const res = await rollbackGlobalMutation.mutateAsync({
      baseActiveVersionId: globalActiveData.activeConfiguration.id,
      targetVersionId: selectedTargetVersion.id,
      changeReason,
    });
    message.success(
      res.message ||
        `Созламалар V${selectedTargetVersion.version} ҳолатига янги V${res.activeConfiguration.version} версияси сифатида муваффақиятли қайтарилди.`,
    );
    void refetchGlobalActive();
    void refetchGlobalHistory();
  };

  const handleRollbackDistrictConfirm = async (changeReason: string) => {
    if (
      !activeDistrictId ||
      !districtActiveData?.activeConfiguration ||
      !selectedTargetVersion
    )
      return;
    const res = await rollbackDistrictMutation.mutateAsync({
      baseActiveVersionId: districtActiveData.activeConfiguration.id,
      targetVersionId: selectedTargetVersion.id,
      changeReason,
    });
    message.success(
      res.message ||
        `Туман созламалари V${selectedTargetVersion.version} ҳолатига янги V${res.activeConfiguration.version} версияси сифатида муваффақиятли қайтарилди.`,
    );
    void refetchDistrictActive();
    void refetchDistrictHistory();
  };

  const subTabItems = [
    {
      key: 'global',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <SettingOutlined />
          Глобал созламалар тарихи
        </span>
      ),
      children: (
        <div style={{ marginTop: 8 }}>
          {isGlobalHistoryLoading && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Space direction="vertical" size="middle">
                <Spin size="large" />
                <Text type="secondary">Глобал созламалар тарихи юкланмоқда...</Text>
              </Space>
            </div>
          )}

          {isGlobalHistoryError && (
            <Alert
              message="Тарихни юклашда хатолик"
              description={
                globalHistoryError instanceof Error
                  ? globalHistoryError.message
                  : 'Глобал созламалар тарихини олишнинг имкони бўлмади.'
              }
              type="error"
              showIcon
              action={
                <a
                  onClick={() => refetchGlobalHistory()}
                  style={{ cursor: 'pointer' }}
                >
                  <ReloadOutlined /> Қайта уриниш
                </a>
              }
              style={{ marginBottom: 16 }}
            />
          )}

          {globalHistoryData && (
            <Card
              size="small"
              style={{
                borderRadius: token.borderRadiusLG,
                background: token.colorBgContainer,
              }}
            >
              <AnalysisSettingsHistoryTable
                scope="global"
                items={globalHistoryData.items}
                loading={isGlobalHistoryLoading}
                onRollbackClick={(target) => setSelectedTargetVersion(target)}
              />
            </Card>
          )}

          {/* Rollback Modal for Global */}
          {selectedTargetVersion &&
            subTabKey === 'global' &&
            (globalActiveData?.activeConfiguration ||
              globalHistoryData?.items?.find((v) => v.isActive)) && (
              <AnalysisSettingsRollbackModal
                open={true}
                scope="global"
                activeVersion={
                  globalActiveData?.activeConfiguration ||
                  globalHistoryData!.items.find((v) => v.isActive)!
                }
                targetVersion={
                  selectedTargetVersion as GlobalAnalysisSettingsDto
                }
                onConfirm={handleRollbackGlobalConfirm}
                onCancel={() => setSelectedTargetVersion(null)}
              />
            )}
        </div>
      ),
    },
    {
      key: 'district',
      label: (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <ApartmentOutlined />
          Туман созламалари тарихи
        </span>
      ),
      children: (
        <div style={{ marginTop: 8 }}>
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
                  Туман созламалари тарихини кўриш учун туманни танланг
                </Title>
                <Paragraph type="secondary">
                  Ҳар бир туманнинг созламалар тарихи алоҳида сақланади ва бошқарилади.
                </Paragraph>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <DistrictSelector />
                </div>
              </Space>
            </Card>
          ) : (
            <div>
              {isDistrictHistoryLoading && (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Space direction="vertical" size="middle">
                    <Spin size="large" />
                    <Text type="secondary">Туман созламалари тарихи юкланмоқда...</Text>
                  </Space>
                </div>
              )}

              {isDistrictHistoryError && (
                <Alert
                  message="Туман тарихини юклашда хатолик"
                  description={
                    districtHistoryError instanceof Error
                      ? districtHistoryError.message
                      : 'Туман созламалари тарихини олишнинг имкони бўлмади.'
                  }
                  type="error"
                  showIcon
                  action={
                    <a
                      onClick={() => refetchDistrictHistory()}
                      style={{ cursor: 'pointer' }}
                    >
                      <ReloadOutlined /> Қайта уриниш
                    </a>
                  }
                  style={{ marginBottom: 16 }}
                />
              )}

              {districtHistoryData && (
                <Card
                  size="small"
                  title={
                    <Text strong>
                      {districtHistoryData.districtName} ({districtHistoryData.districtId})
                    </Text>
                  }
                  style={{
                    borderRadius: token.borderRadiusLG,
                    background: token.colorBgContainer,
                  }}
                >
                  <AnalysisSettingsHistoryTable
                    scope="district"
                    items={districtHistoryData.items}
                    loading={isDistrictHistoryLoading}
                    onRollbackClick={(target) => setSelectedTargetVersion(target)}
                  />
                </Card>
              )}

              {/* Rollback Modal for District */}
              {selectedTargetVersion &&
                subTabKey === 'district' &&
                (districtActiveData?.activeConfiguration ||
                  districtHistoryData?.items?.find((v) => v.isActive)) && (
                  <AnalysisSettingsRollbackModal
                    open={true}
                    scope="district"
                    districtId={activeDistrictId}
                    districtName={
                      districtActiveData?.districtName ||
                      districtHistoryData?.districtName ||
                      activeDistrictId
                    }
                    activeVersion={
                      districtActiveData?.activeConfiguration ||
                      districtHistoryData!.items.find((v) => v.isActive)!
                    }
                    targetVersion={
                      selectedTargetVersion as DistrictAnalysisSettingsDto
                    }
                    onConfirm={handleRollbackDistrictConfirm}
                    onCancel={() => setSelectedTargetVersion(null)}
                  />
                )}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={subTabKey}
        onChange={handleSubTabChange}
        items={subTabItems}
        type="card"
      />
    </div>
  );
};
