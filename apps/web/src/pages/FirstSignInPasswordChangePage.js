import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Alert, Card, Typography, Space, message, theme } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useAuth } from '../auth/auth-context.js';
import { ApiError } from '../auth/auth-client.js';
const { Title, Text } = Typography;
export const FirstSignInPasswordChangePage = () => {
    const { changeFirstLoginPassword, isChangingPassword, signOut } = useAuth();
    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState(null);
    const [isNetworkError, setIsNetworkError] = useState(false);
    const { token } = theme.useToken();
    const [form] = Form.useForm();
    const handleSubmit = async (values) => {
        setErrorMessage(null);
        setIsNetworkError(false);
        const currentPassword = values.currentPassword;
        const newPassword = values.newPassword;
        const confirmPassword = values.confirmPassword;
        if (!currentPassword || !newPassword || !confirmPassword) {
            setErrorMessage('Барча майдонларни тўлдиринг.');
            return;
        }
        if (newPassword !== confirmPassword) {
            setErrorMessage('Янги парол ва унинг тасдиғи мос келмади.');
            return;
        }
        if (currentPassword === newPassword) {
            setErrorMessage('Янги парол вақтинчалик парол билан бир хил бўлиши мумкин эмас.');
            return;
        }
        if (Array.from(newPassword).length < 15) {
            setErrorMessage('Янги парол камида 15 та белгидан иборат бўлиши керак.');
            return;
        }
        if (Array.from(newPassword).length > 128) {
            setErrorMessage('Янги парол 128 белгидан ошмаслиги керак.');
            return;
        }
        try {
            await changeFirstLoginPassword({
                currentPassword,
                newPassword,
            });
            message.success('Парол муваффақиятли янгиланди!');
            navigate('/', { replace: true });
        }
        catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                return;
            }
            if (err instanceof ApiError) {
                setIsNetworkError(err.isNetworkError);
                setErrorMessage(err.message);
            }
            else {
                setErrorMessage('Паролни ўзгартиришда хатолик юз берди. Илтимос, қайта уриниб кўринг.');
            }
        }
    };
    return (_jsx("div", { style: {
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: token.colorBgLayout,
            padding: '24px 16px',
        }, children: _jsx(Card, { style: {
                width: '100%',
                maxWidth: 480,
                boxShadow: token.boxShadowSecondary,
                borderRadius: token.borderRadiusLG,
            }, variant: "borderless", children: _jsxs(Space, { direction: "vertical", size: "large", style: { width: '100%' }, children: [_jsxs("div", { style: { textAlign: 'center' }, children: [_jsx(Title, { level: 2, style: { color: token.colorPrimary, marginBottom: 4 }, children: "\u041F\u0430\u0440\u043E\u043B\u043D\u0438 \u044F\u043D\u0433\u0438\u043B\u0430\u0448" }), _jsx(Text, { type: "secondary", style: { fontSize: 14 }, children: "\u04B2\u0438\u0441\u043E\u0431 \u0445\u0430\u0432\u0444\u0441\u0438\u0437\u043B\u0438\u0433\u0438: \u042F\u043D\u0433\u0438 \u0434\u043E\u0438\u043C\u0438\u0439 \u043F\u0430\u0440\u043E\u043B \u045E\u0440\u043D\u0430\u0442\u0438\u0448" })] }), _jsx(Alert, { type: "info", showIcon: true, message: "\u041E\u043F\u0435\u0440\u0430\u0446\u0438\u043E\u043D \u043A\u0438\u0440\u0438\u0448 \u043E\u0447\u0438\u049B\u043B\u0438\u0433\u0438", description: "\u042D\u0441\u043B\u0430\u0442\u043C\u0430: \u0422\u0438\u0437\u0438\u043C \u0448\u0430\u0440\u0442\u043D\u043E\u043C\u0430\u0441\u0438\u0433\u0430 \u043C\u0443\u0432\u043E\u0444\u0438\u049B, \u041C\u0430\u04B3\u0441\u0443\u043B\u043E\u0442 \u044D\u0433\u0430\u0441\u0438 \u0442\u0443\u043C\u0430\u043D \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440\u0438 \u0432\u0430 \u0434\u0430\u043B\u0438\u043B\u043B\u0430\u0440\u043D\u0438 \u043C\u043E\u043D\u0438\u0442\u043E\u0440\u0438\u043D\u0433 \u049B\u0438\u043B\u0438\u0448 \u04B3\u0430\u043C\u0434\u0430 \u0442\u0435\u0445\u043D\u0438\u043A \u049B\u045E\u043B\u043B\u0430\u0431-\u049B\u0443\u0432\u0432\u0430\u0442\u043B\u0430\u0448 \u0443\u0447\u0443\u043D \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u043E\u043D \u043A\u0438\u0440\u0438\u0448 \u04B3\u0443\u049B\u0443\u049B\u0438\u0433\u0430 \u044D\u0433\u0430.", style: { borderRadius: token.borderRadius } }), errorMessage && (_jsx(Alert, { type: isNetworkError ? 'warning' : 'error', showIcon: true, message: errorMessage, style: { borderRadius: token.borderRadius } })), _jsxs(Form, { form: form, layout: "vertical", onFinish: handleSubmit, autoComplete: "off", requiredMark: false, children: [_jsx(Form.Item, { label: _jsx("span", { style: { fontWeight: 500, color: token.colorText }, children: "\u0416\u043E\u0440\u0438\u0439 (\u0432\u0430\u049B\u0442\u0438\u043D\u0447\u0430\u043B\u0438\u043A) \u043F\u0430\u0440\u043E\u043B" }), name: "currentPassword", rules: [{ required: true, message: 'Вақтинчалик паролни киритинг!' }], children: _jsx(Input.Password, { prefix: _jsx(LockOutlined, { style: { color: token.colorPrimary } }), placeholder: "\u0421\u0438\u0437\u0433\u0430 \u0431\u0435\u0440\u0438\u043B\u0433\u0430\u043D \u0432\u0430\u049B\u0442\u0438\u043D\u0447\u0430\u043B\u0438\u043A \u043F\u0430\u0440\u043E\u043B", id: "current-password-input", autoComplete: "current-password", disabled: isChangingPassword, style: { height: 44, borderRadius: token.borderRadius } }) }), _jsx(Form.Item, { label: _jsx("span", { style: { fontWeight: 500, color: token.colorText }, children: "\u042F\u043D\u0433\u0438 \u0434\u043E\u0438\u043C\u0438\u0439 \u043F\u0430\u0440\u043E\u043B" }), name: "newPassword", rules: [
                                    { required: true, message: 'Янги паролни киритинг!' },
                                    {
                                        validator(_, value) {
                                            if (!value)
                                                return Promise.resolve();
                                            const codePoints = Array.from(value).length;
                                            if (codePoints < 15) {
                                                return Promise.reject(new Error('Парол камида 15 белгидан иборат бўлиши керак!'));
                                            }
                                            if (codePoints > 128) {
                                                return Promise.reject(new Error('Парол 128 белгидан ошмаслиги керак!'));
                                            }
                                            return Promise.resolve();
                                        },
                                    },
                                ], extra: _jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: "\u041F\u0430\u0440\u043E\u043B \u0443\u0437\u0443\u043D\u043B\u0438\u0433\u0438 \u043A\u0430\u043C\u0438\u0434\u0430 15 \u0431\u0435\u043B\u0433\u0438 \u0431\u045E\u043B\u0438\u0448\u0438 \u043A\u0435\u0440\u0430\u043A (\u04B3\u0430\u0440\u0444\u043B\u0430\u0440, \u0441\u043E\u043D\u043B\u0430\u0440, \u0431\u0435\u043B\u0433\u0438\u043B\u0430\u0440)." }), children: _jsx(Input.Password, { prefix: _jsx(LockOutlined, { style: { color: token.colorPrimary } }), placeholder: "\u042F\u043D\u0433\u0438 \u0445\u0430\u0432\u0444\u0441\u0438\u0437 \u043F\u0430\u0440\u043E\u043B\u043D\u0438 \u043A\u0438\u0440\u0438\u0442\u0438\u043D\u0433", id: "new-password-input", autoComplete: "new-password", disabled: isChangingPassword, style: { height: 44, borderRadius: token.borderRadius } }) }), _jsx(Form.Item, { label: _jsx("span", { style: { fontWeight: 500, color: token.colorText }, children: "\u042F\u043D\u0433\u0438 \u043F\u0430\u0440\u043E\u043B\u043D\u0438 \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u043D\u0433" }), name: "confirmPassword", dependencies: ['newPassword'], rules: [
                                    { required: true, message: 'Янги паролни қайта киритинг!' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('newPassword') === value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(new Error('Пароллар мос келмади!'));
                                        },
                                    }),
                                ], children: _jsx(Input.Password, { prefix: _jsx(LockOutlined, { style: { color: token.colorPrimary } }), placeholder: "\u042F\u043D\u0433\u0438 \u043F\u0430\u0440\u043E\u043B\u043D\u0438 \u049B\u0430\u0439\u0442\u0430 \u043A\u0438\u0440\u0438\u0442\u0438\u043D\u0433", id: "confirm-password-input", autoComplete: "new-password", disabled: isChangingPassword, style: { height: 44, borderRadius: token.borderRadius } }) }), _jsx(Form.Item, { style: { marginTop: 24, marginBottom: 12 }, children: _jsx(Button, { type: "primary", htmlType: "submit", loading: isChangingPassword, id: "change-password-submit-button", style: {
                                        width: '100%',
                                        height: 44,
                                        fontSize: 16,
                                        fontWeight: 600,
                                        borderRadius: token.borderRadius,
                                    }, children: "\u041F\u0430\u0440\u043E\u043B\u043D\u0438 \u0441\u0430\u049B\u043B\u0430\u0448 \u0432\u0430 \u0442\u0438\u0437\u0438\u043C\u0433\u0430 \u043A\u0438\u0440\u0438\u0448" }) }), _jsx("div", { style: { textAlign: 'center' }, children: _jsx(Button, { type: "link", onClick: () => void signOut(), style: { fontSize: 13, color: token.colorTextSecondary }, children: "\u0422\u0438\u0437\u0438\u043C\u0434\u0430\u043D \u0447\u0438\u049B\u0438\u0448" }) })] })] }) }) }));
};
