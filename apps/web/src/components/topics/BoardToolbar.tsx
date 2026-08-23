import React from 'react';
import { Button, Space, Typography } from 'antd';
import { LogoutOutlined, CalendarOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { useAuth } from '../../auth/auth-context.js';
import { formatTashkentCalendarDate } from '../../lib/formatters.js';

const { Text, Title } = Typography;

export interface BoardToolbarProps {
  districtName?: string;
  calendarDay?: string;
}

export const BoardToolbar: React.FC<BoardToolbarProps> = ({
  districtName = 'Туман',
  calendarDay,
}) => {
  const { signOut, isSigningOut } = useAuth();
  const formattedDate = calendarDay
    ? formatTashkentCalendarDate(calendarDay)
    : formatTashkentCalendarDate(new Date().toISOString());

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Title
          level={4}
          id="dashboard-main-heading"
          tabIndex={-1}
          style={{
            margin: 0,
            color: '#0284C7',
            fontWeight: 700,
            fontSize: 18,
            outline: 'none',
          }}
        >
          Маҳалла Овози
        </Title>
        <div style={{ width: 1, height: 20, backgroundColor: '#E2E8F0' }} />
        <Space size={12}>
          <Text
            strong
            style={{
              fontSize: 15,
              color: '#0F172A',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <EnvironmentOutlined style={{ color: '#0284C7' }} />
            {districtName}
          </Text>
          <Text
            type="secondary"
            style={{
              fontSize: 14,
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: '#F1F5F9',
              padding: '4px 10px',
              borderRadius: 6,
            }}
          >
            <CalendarOutlined style={{ color: '#64748B' }} />
            {formattedDate}
          </Text>
        </Space>
      </div>

      <div>
        <Button
          type="text"
          icon={<LogoutOutlined />}
          loading={isSigningOut}
          onClick={() => signOut()}
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#64748B',
            boxShadow: 'none',
          }}
          aria-label="Тизимдан чиқиш"
        >
          Чиқиш
        </Button>
      </div>
    </header>
  );
};
