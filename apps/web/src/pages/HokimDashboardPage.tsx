import React from 'react';
import { Button, Alert, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { BoardToolbar } from '../components/topics/BoardToolbar.js';
import { FiveLaneBoard } from '../components/topics/FiveLaneBoard.js';
import { useHokimTopicBoard } from '../topics/useHokimTopicBoard.js';
import { FullPageLoader } from '../components/FullPageLoader.js';

const { Title, Paragraph } = Typography;

export const HokimDashboardPage: React.FC = () => {
  const { board, isLoading, isError, error, refetch, lanes, loadMore } =
    useHokimTopicBoard();

  if (isLoading) {
    return <FullPageLoader />;
  }

  if (isError) {
    const errorMessage =
      error instanceof Error ? error.message : 'Мавзулар тахтасини юклаб бўлмади.';

    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: '#F4F6F8',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <BoardToolbar districtName="Маҳалла Овози" />
        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 12,
              padding: '36px 32px',
              maxWidth: 480,
              width: '100%',
              textAlign: 'center',
              boxShadow: 'none',
            }}
          >
            <Alert
              type="error"
              showIcon
              message={
                <Title level={5} style={{ margin: 0, color: '#EF4444' }}>
                  Юклашда хатолик
                </Title>
              }
              description={
                <Paragraph style={{ margin: '8px 0 16px 0', color: '#64748B' }}>
                  {errorMessage}
                </Paragraph>
              }
              style={{
                backgroundColor: '#FEE2E2',
                border: '1px solid #FECACA',
                marginBottom: 20,
                textAlign: 'left',
              }}
            />
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => refetch()}
              style={{ fontWeight: 600, height: 40, borderRadius: 8, boxShadow: 'none' }}
            >
              Қайта уриниш
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F4F6F8',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <BoardToolbar
        districtName={board?.districtName}
        calendarDay={board?.calendarDay}
      />
      <FiveLaneBoard lanes={lanes} onLoadMore={loadMore} />
    </div>
  );
};
