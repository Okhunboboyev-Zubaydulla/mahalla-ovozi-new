import React, { useState, useEffect } from 'react';
import {
  Layout,
  Menu,
  Button,
  Tag,
  Typography,
  Alert,
  Space,
  theme,
} from 'antd';
import {
  AppstoreOutlined,
  HeartOutlined,
  ApartmentOutlined,
  SendOutlined,
  CreditCardOutlined,
  UserOutlined,
  RobotOutlined,
  HistoryOutlined,
  LogoutOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/auth-context.js';
import { useDistrict } from '../district/district-context.js';
import { DistrictSelector } from './DistrictSelector.js';
import { UnsavedChangesModal } from './UnsavedChangesModal.js';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

export const ConsoleLayout: React.FC = () => {
  const { token } = theme.useToken();
  const { actor, signOut } = useAuth();
  const { attemptTransition } = useDistrict();
  const navigate = useNavigate();
  const location = useLocation();

  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const menuItems = [
    {
      key: '/',
      icon: <AppstoreOutlined />,
      label: 'Умумий кўриниш',
    },
    {
      key: '/system-health',
      icon: <HeartOutlined />,
      label: 'Тизим ҳолати',
    },
    {
      key: '/districts',
      icon: <ApartmentOutlined />,
      label: 'Туманлар',
    },
    {
      key: '/telegram-setup',
      icon: <SendOutlined />,
      label: 'Телеграм созламалари',
    },
    {
      key: '/subscriptions',
      icon: <CreditCardOutlined />,
      label: 'Обуналар',
    },
    {
      key: '/hokim-accounts',
      icon: <UserOutlined />,
      label: 'Ҳоким ҳисоблари',
    },
    {
      key: '/ai-operations',
      icon: <RobotOutlined />,
      label: 'АИ операциялари',
    },
    {
      key: '/audit-history',
      icon: <HistoryOutlined />,
      label: 'Аудит тарихи',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key !== location.pathname) {
      attemptTransition(() => {
        navigate(key);
      });
    }
  };

  const handleSignOut = () => {
    attemptTransition(async () => {
      await signOut();
      navigate('/sign-in');
    });
  };

  // Determine current active menu key
  const selectedKey = menuItems.some((item) => item.key === location.pathname)
    ? location.pathname
    : '/';

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      {/* 1. Persistent Top Header */}
      <Header
        style={{
          background: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorder}`,
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 64,
          position: 'sticky',
          top: 0,
          zIndex: 1000,
        }}
      >
        <Space direction="horizontal" size="large" align="center">
          {/* P5-H: Uzbek Cyrillic wordmark */}
          <Text
            strong
            style={{
              fontSize: 18,
              color: token.colorPrimary,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
            }}
            onClick={() => handleMenuClick({ key: '/' })}
          >
            Маҳалла Овози
          </Text>

          {/* District context switcher in persistent header */}
          <DistrictSelector onOpenCreateDrawer={() => handleMenuClick({ key: '/districts' })} />
        </Space>

        <Space direction="horizontal" size="middle" align="center">
          {actor && (
            <Tag color="cyan" style={{ fontSize: 13, padding: '4px 10px', borderRadius: 6 }}>
              {actor.username} (Масъул ходим)
            </Tag>
          )}

          <Button
            id="sign-out-button"
            type="text"
            icon={<LogoutOutlined />}
            onClick={handleSignOut}
            style={{ color: token.colorTextSecondary }}
          >
            Чиқиш
          </Button>
        </Space>
      </Header>

      {/* P4-G: Offline notification banner */}
      {isOffline && (
        <Alert
          message="Сервер билан алоқа мавжуд эмас. Тармоқни текширинг."
          type="warning"
          banner
          showIcon
          style={{ textAlign: 'center' }}
        />
      )}

      {/* 2. Main Shell Layout */}
      <Layout>
        {/* Persistent 8-section Sidebar */}
        <Sider
          width={240}
          breakpoint="lg"
          collapsedWidth="0"
          style={{
            background: token.colorBgContainer,
            borderRight: `1px solid ${token.colorBorder}`,
          }}
        >
          <Menu
            mode="inline"
            selectedKeys={[selectedKey]}
            onClick={handleMenuClick}
            items={menuItems}
            style={{ borderRight: 0, padding: '12px 0' }}
          />
        </Sider>

        {/* Content Outlet for Nested Routes */}
        <Content style={{ padding: 24, minHeight: 'calc(100vh - 64px)' }}>
          <Outlet />
        </Content>
      </Layout>

      {/* P4-D: Single Unsaved Changes Modal */}
      <UnsavedChangesModal />
    </Layout>
  );
};
