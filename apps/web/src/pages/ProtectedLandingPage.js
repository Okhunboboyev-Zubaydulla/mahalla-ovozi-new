import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useNavigate } from 'react-router-dom';
import { Layout, Typography, Button, Space, Card, Tag, theme, notification } from 'antd';
import { LogoutOutlined, UserOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/auth-context.js';
import { ApiError } from '../auth/auth-client.js';
const { Header, Content } = Layout;
const { Title, Text } = Typography;
export function ProtectedLandingPage() {
    const { actor, signOut, isSigningOut } = useAuth();
    const navigate = useNavigate();
    // F1: Consume design tokens — no hardcoded hex values.
    const { token } = theme.useToken();
    const [notificationApi, notificationContextHolder] = notification.useNotification();
    const handleSignOut = async () => {
        try {
            await signOut();
            navigate('/sign-in', { replace: true });
        }
        catch (err) {
            // F2: Sign-out failed (network error) — the server session may still be active.
            // Inform the user rather than silently pretending logout succeeded.
            const isNetworkErr = err instanceof ApiError && err.isNetworkError;
            if (isNetworkErr) {
                notificationApi.warning({
                    message: 'Чиқиш амалга ошмади',
                    description: 'Сервер билан алоқа мавжуд эмас. Тармоқни текширинг ва қайта уриниб кўринг.',
                    duration: 8,
                });
            }
            else {
                // Non-network error — local state was cleared, navigate to sign-in anyway
                navigate('/sign-in', { replace: true });
            }
        }
    };
    return (_jsxs(_Fragment, { children: [notificationContextHolder, _jsxs(Layout, { style: { minHeight: '100vh', backgroundColor: token.colorBgLayout }, children: [_jsxs(Header, { style: {
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: token.colorBgContainer,
                            padding: '0 24px',
                            borderBottom: `1px solid ${token.colorBorder}`,
                            height: 64,
                        }, children: [_jsxs(Space, { align: "center", size: "middle", children: [_jsx(SafetyCertificateOutlined, { style: { fontSize: 24, color: token.colorPrimary } }), _jsx(Title, { level: 4, style: { margin: 0, color: token.colorPrimary }, children: "Mahalla Ovozi" })] }), _jsxs(Space, { size: "middle", children: [_jsxs(Tag, { icon: _jsx(UserOutlined, {}), color: token.colorPrimary, children: [actor?.username, " (", actor?.role === 'PRODUCT_OWNER' ? 'Маҳсулот эгаси' : actor?.role, ")"] }), _jsx(Button, { type: "default", icon: _jsx(LogoutOutlined, {}), onClick: handleSignOut, loading: isSigningOut, id: "sign-out-button", style: { borderRadius: token.borderRadius }, children: "\u0427\u0438\u049B\u0438\u0448" })] })] }), _jsx(Content, { style: { padding: '32px 24px', maxWidth: 1000, margin: '0 auto', width: '100%' }, children: _jsxs(Card, { style: {
                                borderRadius: token.borderRadiusLG,
                                boxShadow: token.boxShadowTertiary,
                                border: `1px solid ${token.colorBorderSecondary}`,
                            }, children: [_jsx(Title, { level: 3, style: { color: token.colorText, marginTop: 0 }, children: "\u041C\u0430\u0441\u044A\u0443\u043B \u0445\u043E\u0434\u0438\u043C \u0431\u043E\u0448\u049B\u0430\u0440\u0443\u0432 \u043F\u0430\u043D\u0435\u043B\u0438" }), _jsx(Text, { style: { fontSize: 16, color: token.colorTextSecondary, display: 'block', marginBottom: 24 }, children: "\u0421\u0438\u0437 \u0442\u0438\u0437\u0438\u043C\u0433\u0430 \u0445\u0430\u0432\u0444\u0441\u0438\u0437 \u0442\u0430\u0440\u0437\u0434\u0430 \u043A\u0438\u0440\u0433\u0430\u043D\u0441\u0438\u0437." }), _jsxs("div", { style: {
                                        padding: 16,
                                        backgroundColor: token.colorBgLayout,
                                        borderRadius: token.borderRadius,
                                        border: `1px solid ${token.colorBorder}`,
                                    }, children: [_jsx(Text, { strong: true, style: { color: token.colorText }, children: "\u0421\u0435\u0441\u0441\u0438\u044F \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440\u0438:" }), _jsxs("ul", { style: { marginTop: 8, marginBottom: 0, color: token.colorTextSecondary, paddingLeft: 20 }, children: [_jsxs("li", { children: [_jsx("strong", { children: "\u0424\u043E\u0439\u0434\u0430\u043B\u0430\u043D\u0443\u0432\u0447\u0438 ID:" }), " ", actor?.id] }), _jsxs("li", { children: [_jsx("strong", { children: "\u0424\u043E\u0439\u0434\u0430\u043B\u0430\u043D\u0443\u0432\u0447\u0438 \u043D\u043E\u043C\u0438:" }), " ", actor?.username] }), _jsxs("li", { children: [_jsx("strong", { children: "\u0420\u043E\u043B\u044C:" }), " ", actor?.role] })] })] })] }) })] })] }));
}
