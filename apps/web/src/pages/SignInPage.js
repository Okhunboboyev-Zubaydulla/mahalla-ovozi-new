import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Alert, Card, Typography, Space, theme } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/auth-context.js';
import { ApiError } from '../auth/auth-client.js';
import { FullPageLoader } from '../components/FullPageLoader.js';
const { Title, Text } = Typography;
export function SignInPage() {
    const { isAuthenticated, isLoading, signIn, isSigningIn } = useAuth();
    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState(null);
    const [isNetworkError, setIsNetworkError] = useState(false);
    // F1: Consume design tokens from ConfigProvider — no hardcoded hex values.
    const { token } = theme.useToken();
    if (isLoading) {
        return _jsx(FullPageLoader, {});
    }
    if (isAuthenticated) {
        return _jsx(Navigate, { to: "/", replace: true });
    }
    const handleSubmit = async (values) => {
        setErrorMessage(null);
        setIsNetworkError(false);
        const username = values.username?.trim();
        const password = values.password;
        if (!username || !password) {
            setErrorMessage('Фойдаланувчи номи ва паролни киритинг.');
            return;
        }
        try {
            await signIn({ username, password });
            navigate('/', { replace: true });
        }
        catch (err) {
            // F5: Distinguish AbortError (programmatic cancellation) from genuine network failure.
            if (err instanceof DOMException && err.name === 'AbortError') {
                // Request was cancelled — do not show a misleading "network down" message
                return;
            }
            if (err instanceof ApiError) {
                setIsNetworkError(err.isNetworkError);
                setErrorMessage(err.message);
            }
            else {
                setErrorMessage('Нотўғри фойдаланувчи номи ёки парол.');
            }
        }
    };
    return (_jsx("div", { style: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            backgroundColor: token.colorBgLayout,
            padding: 16,
        }, children: _jsx(Card, { style: {
                width: '100%',
                maxWidth: 420,
                boxShadow: token.boxShadowSecondary,
                borderRadius: token.borderRadiusLG,
            }, variant: "borderless", children: _jsxs(Space, { direction: "vertical", size: "large", style: { width: '100%' }, children: [_jsxs("div", { style: { textAlign: 'center' }, children: [_jsx(Title, { level: 2, style: { color: token.colorPrimary, marginBottom: 4 }, children: "\u0422\u0438\u0437\u0438\u043C\u0433\u0430 \u043A\u0438\u0440\u0438\u0448" }), _jsx(Text, { style: { color: token.colorTextSecondary, fontSize: 14 }, children: "Mahalla Ovozi \u2014 \u041C\u0430\u04B3\u0430\u043B\u043B\u0438\u0439 \u043C\u0443\u0430\u043C\u043C\u043E\u043B\u0430\u0440\u043D\u0438 \u0442\u0435\u0437\u043A\u043E\u0440 \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u049B\u0438\u043B\u0438\u0448 \u0442\u0438\u0437\u0438\u043C\u0438" })] }), errorMessage && (_jsx(Alert, { message: errorMessage, type: isNetworkError ? 'warning' : 'error', showIcon: true, role: "alert", "aria-live": "assertive", style: { borderRadius: token.borderRadius } })), _jsxs(Form, { name: "signInForm", layout: "vertical", onFinish: handleSubmit, autoComplete: "off", requiredMark: false, children: [_jsx(Form.Item, { label: _jsx("span", { style: { fontWeight: 500, color: token.colorText }, children: "\u0424\u043E\u0439\u0434\u0430\u043B\u0430\u043D\u0443\u0432\u0447\u0438 \u043D\u043E\u043C\u0438" }), name: "username", rules: [{ required: true, message: 'Фойдаланувчи номини киритинг!' }], children: _jsx(Input, { prefix: _jsx(UserOutlined, { style: { color: token.colorPrimary } }), placeholder: "\u0424\u043E\u0439\u0434\u0430\u043B\u0430\u043D\u0443\u0432\u0447\u0438 \u043D\u043E\u043C\u0438\u043D\u0438 \u043A\u0438\u0440\u0438\u0442\u0438\u043D\u0433", id: "username-input", autoComplete: "username", disabled: isSigningIn, maxLength: 64, style: { height: 44, borderRadius: token.borderRadius } }) }), _jsx(Form.Item, { label: _jsx("span", { style: { fontWeight: 500, color: token.colorText }, children: "\u041F\u0430\u0440\u043E\u043B" }), name: "password", rules: [{ required: true, message: 'Паролингизни киритинг!' }], children: _jsx(Input.Password, { prefix: _jsx(LockOutlined, { style: { color: token.colorPrimary } }), placeholder: "\u041F\u0430\u0440\u043E\u043B\u0438\u043D\u0433\u0438\u0437\u043D\u0438 \u043A\u0438\u0440\u0438\u0442\u0438\u043D\u0433", id: "password-input", autoComplete: "current-password", disabled: isSigningIn, style: { height: 44, borderRadius: token.borderRadius } }) }), _jsx(Form.Item, { style: { marginBottom: 0, marginTop: 8 }, children: _jsx(Button, { type: "primary", htmlType: "submit", loading: isSigningIn, id: "submit-button", style: {
                                        width: '100%',
                                        height: 44,
                                        fontSize: 16,
                                        fontWeight: 600,
                                        borderRadius: token.borderRadius,
                                    }, children: "\u041A\u0438\u0440\u0438\u0448" }) })] })] }) }) }));
}
