import React, { useState, useRef } from 'react';
import { Typography, Alert, Button, Skeleton, Space } from 'antd';
import { RedoOutlined } from '@ant-design/icons';
import {
  OverallSystemHealthResponse,
  DistrictHealthResponse,
  OperationalIssue,
} from '@mahalla-ovozi/api-contracts';
import { useDistrict } from '../district/district-context.js';
import { useSystemHealth } from '../health/useSystemHealth.js';
import { useOperationalIssues } from '../issues/useOperationalIssues.js';
import { OverallHealthCard } from '../components/health/OverallHealthCard.js';
import { ActiveIssuesList } from '../components/issues/ActiveIssuesList.js';
import { IssueDetailDrawer } from '../components/issues/IssueDetailDrawer.js';
import { GlobalComponentsTable } from '../components/health/GlobalComponentsTable.js';
import { DistrictHealthMatrix } from '../components/health/DistrictHealthMatrix.js';

const { Title, Paragraph } = Typography;

export const SystemHealthPage: React.FC = () => {
  const { activeDistrictId } = useDistrict();
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useSystemHealth();

  const {
    data: issuesData,
    isFetching: isIssuesFetching,
  } = useOperationalIssues();

  const [selectedIssue, setSelectedIssue] = useState<OperationalIssue | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const isSystemData = (
    d: OverallSystemHealthResponse | DistrictHealthResponse | undefined,
  ): d is OverallSystemHealthResponse => {
    return Boolean(d && 'globalComponents' in d);
  };

  const systemData = isSystemData(data) ? data : undefined;

  const handleSelectIssue = (issue: OperationalIssue, triggerEl: HTMLElement | null) => {
    setSelectedIssue(issue);
    openerRef.current = triggerEl;
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', minHeight: 600 }}>
      {/* Page Header */}
      <div style={{ marginBottom: 24 }}>
        <Title level={3} style={{ margin: 0, fontWeight: 600 }}>
          Тизим ва туманлар ҳолати
        </Title>
        <Paragraph type="secondary" style={{ marginTop: 4, marginBottom: 0 }}>
          Барча тизим компонентлари, навбатлар ва туман ботларининг ҳақиқий техник ҳолати
        </Paragraph>
      </div>

      {/* Error Alert */}
      {isError && (
        <Alert
          message="Тизим ҳолати маълумотларини юклашда хатолик юз берди"
          description={
            error instanceof Error
              ? error.message
              : 'Сервер билан боғланишда муаммо мавжуд. Илтимос, тармоқни текшириб қайта уриниб кўринг.'
          }
          type="error"
          showIcon
          action={
            <Button
              size="small"
              danger
              icon={<RedoOutlined />}
              onClick={() => refetch()}
            >
              Қайта уриниш
            </Button>
          }
          style={{ marginBottom: 24, borderRadius: 8 }}
        />
      )}

      {/* Initial Loading Skeletons */}
      {isLoading && !data && (
        <Space direction="vertical" size={24} style={{ width: '100%' }}>
          <Skeleton
            active
            paragraph={{ rows: 3 }}
            style={{
              padding: 24,
              background: '#fff',
              borderRadius: 12,
              minHeight: 180,
            }}
          />
          <Skeleton
            active
            paragraph={{ rows: 5 }}
            style={{
              padding: 24,
              background: '#fff',
              borderRadius: 12,
              minHeight: 280,
            }}
          />
          <Skeleton
            active
            paragraph={{ rows: 4 }}
            style={{
              padding: 24,
              background: '#fff',
              borderRadius: 12,
              minHeight: 240,
            }}
          />
        </Space>
      )}

      {/* Live Content */}
      {systemData && (
        <>
          <OverallHealthCard
            data={systemData}
            isFetching={isFetching}
            onRefresh={() => refetch()}
          />

          <ActiveIssuesList
            issues={issuesData?.issues || []}
            loading={isIssuesFetching}
            onSelectIssue={handleSelectIssue}
          />

          <GlobalComponentsTable
            components={systemData.globalComponents}
            loading={isFetching}
          />

          <DistrictHealthMatrix
            districts={systemData.districts}
            loading={isFetching}
            activeDistrictId={activeDistrictId}
          />

          <IssueDetailDrawer
            issue={selectedIssue}
            open={isDrawerOpen}
            onClose={handleCloseDrawer}
            openerRef={openerRef}
          />
        </>
      )}
    </div>
  );
};

export default SystemHealthPage;
