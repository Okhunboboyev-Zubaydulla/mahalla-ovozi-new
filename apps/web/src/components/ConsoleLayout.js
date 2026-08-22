import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { Layout, Menu, Button, Tag, Typography, Alert, Space, theme, } from 'antd';
import { AppstoreOutlined, HeartOutlined, ApartmentOutlined, SendOutlined, CreditCardOutlined, UserOutlined, RobotOutlined, HistoryOutlined, LogoutOutlined, } from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/auth-context.js';
import { useDistrict } from '../district/district-context.js';
import { DistrictSelector } from './DistrictSelector.js';
import { UnsavedChangesModal } from './UnsavedChangesModal.js';
const { Header, Sider, Content } = Layout;
const { Text } = Typography;
export const ConsoleLayout = () => {
    const { token } = theme.useToken();
    const { actor, signOut } = useAuth();
    const { attemptTransition } = useDistrict();
    const navigate = useNavigate();
    const location = useLocation();
    const isOffline = useOnlineStatus();
    const menuItems = [
        {
            key: '/',
            icon: _jsx(AppstoreOutlined, {}),
            label: 'Умумий кўриниш',
        },
        {
            key: '/system-health',
            icon: _jsx(HeartOutlined, {}),
            label: 'Тизим ҳолати',
        },
        {
            key: '/districts',
            icon: _jsx(ApartmentOutlined, {}),
            label: 'Туманлар',
        },
        {
            key: '/telegram-setup',
            icon: _jsx(SendOutlined, {}),
            label: 'Телеграм созламалари',
        },
        {
            key: '/subscriptions',
            icon: _jsx(CreditCardOutlined, {}),
            label: 'Обуналар',
        },
        {
            key: '/hokim-accounts',
            icon: _jsx(UserOutlined, {}),
            label: 'Ҳоким ҳисоблари',
        },
        {
            key: '/ai-operations',
            icon: _jsx(RobotOutlined, {}),
            label: 'АИ операциялари',
        },
        {
            key: '/audit-history',
            icon: _jsx(HistoryOutlined, {}),
            label: 'Аудит тарихи',
        },
    ];
    const handleMenuClick = ({ key }) => {
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
    return (_jsxs(Layout, { style: { minHeight: '100vh', background: token.colorBgLayout }, children: [_jsxs(Header, { style: {
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
                }, children: [_jsxs(Space, { direction: "horizontal", size: "large", align: "center", children: [_jsx(Text, { strong: true, style: {
                                    fontSize: 18,
                                    color: token.colorPrimary,
                                    cursor: 'pointer',
                                    letterSpacing: '-0.01em',
                                }, onClick: () => handleMenuClick({ key: '/' }), children: "\u041C\u0430\u04B3\u0430\u043B\u043B\u0430 \u041E\u0432\u043E\u0437\u0438" }), _jsx(DistrictSelector, { onOpenCreateDrawer: () => {
                                    attemptTransition(() => {
                                        navigate('/districts?action=create');
                                    });
                                } })] }), _jsxs(Space, { direction: "horizontal", size: "middle", align: "center", children: [actor && (_jsxs(Tag, { color: "cyan", style: { fontSize: 13, padding: '4px 10px', borderRadius: 6 }, children: [actor.username, " (", actor.role === 'DISTRICT_HOKIM' ? 'Туман ҳокими' : 'Масъул ходим', ")"] })), _jsx(Button, { id: "sign-out-button", type: "text", icon: _jsx(LogoutOutlined, {}), onClick: handleSignOut, style: { color: token.colorTextSecondary }, children: "\u0427\u0438\u049B\u0438\u0448" })] })] }), isOffline && (_jsx(Alert, { message: "\u0421\u0435\u0440\u0432\u0435\u0440 \u0431\u0438\u043B\u0430\u043D \u0430\u043B\u043E\u049B\u0430 \u043C\u0430\u0432\u0436\u0443\u0434 \u044D\u043C\u0430\u0441. \u0422\u0430\u0440\u043C\u043E\u049B\u043D\u0438 \u0442\u0435\u043A\u0448\u0438\u0440\u0438\u043D\u0433.", type: "warning", banner: true, showIcon: true, style: { textAlign: 'center' } })), _jsxs(Layout, { children: [_jsx(Sider, { width: 240, breakpoint: "lg", collapsedWidth: "0", style: {
                            background: token.colorBgContainer,
                            borderRight: `1px solid ${token.colorBorder}`,
                        }, children: _jsx(Menu, { mode: "inline", selectedKeys: [selectedKey], onClick: handleMenuClick, items: menuItems, style: { borderRight: 0, padding: '12px 0' } }) }), _jsx(Content, { style: { padding: 24, minHeight: 'calc(100vh - 64px)' }, children: _jsx(Outlet, {}) })] }), _jsx(UnsavedChangesModal, {})] }));
};
