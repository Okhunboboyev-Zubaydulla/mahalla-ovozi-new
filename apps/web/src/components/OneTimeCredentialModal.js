import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Modal, Typography, Alert, Button, Space } from 'antd';
import { KeyOutlined, CheckOutlined, CopyOutlined, WarningOutlined } from '@ant-design/icons';
import { themeColors } from '../theme/antd-theme.js';
const { Title, Text, Paragraph } = Typography;
export const OneTimeCredentialModal = ({ isOpen, onClose, username, temporaryPassword, title = 'Ҳоким аккаунти маълумотлари', }) => {
    if (!temporaryPassword) {
        return null;
    }
    return (_jsx(Modal, { open: isOpen, onCancel: onClose, maskClosable: false, keyboard: false, closable: false, centered: true, title: _jsxs(Space, { align: "center", children: [_jsx(KeyOutlined, { style: { color: themeColors.colorPrimary, fontSize: 20 } }), _jsx(Title, { level: 4, style: { margin: 0 }, children: title })] }), footer: [
            _jsx(Button, { type: "primary", onClick: onClose, style: { height: 44, paddingInline: 24, fontSize: 15 }, children: "\u0422\u0443\u0448\u0443\u043D\u0434\u0438\u043C, \u043E\u0439\u043D\u0430\u043D\u0438 \u0451\u043F\u0438\u0448" }, "close"),
        ], children: _jsxs("div", { style: { marginTop: 16, marginBottom: 16 }, children: [_jsx(Alert, { message: "\u0414\u0438\u049B\u049B\u0430\u0442! \u0411\u0438\u0440 \u043C\u0430\u0440\u0442\u0430\u043B\u0438\u043A \u0445\u0430\u0432\u0444\u0441\u0438\u0437\u043B\u0438\u043A \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u0438", description: "\u0423\u0448\u0431\u0443 \u0432\u0430\u049B\u0442\u0438\u043D\u0447\u0430\u043B\u0438\u043A \u043F\u0430\u0440\u043E\u043B \u0444\u0430\u049B\u0430\u0442 \u0431\u0438\u0440 \u043C\u0430\u0440\u0442\u0430 \u043A\u045E\u0440\u0441\u0430\u0442\u0438\u043B\u0430\u0434\u0438. \u041E\u0439\u043D\u0430 \u0451\u043F\u0438\u043B\u0433\u0430\u043D\u0434\u0430\u043D \u0441\u045E\u043D\u0433 \u0443 \u0442\u0438\u0437\u0438\u043C\u0434\u0430\u043D \u045E\u0447\u0438\u0440\u0438\u043B\u0430\u0434\u0438 \u0432\u0430 \u0443\u043D\u0438 \u049B\u0430\u0439\u0442\u0430 \u043A\u045E\u0440\u0438\u0448\u043D\u0438\u043D\u0433 \u0438\u043C\u043A\u043E\u043D\u0438 \u0431\u045E\u043B\u043C\u0430\u0439\u0434\u0438. \u0418\u043B\u0442\u0438\u043C\u043E\u0441, \u04B3\u043E\u0437\u0438\u0440\u043D\u0438\u043D\u0433 \u045E\u0437\u0438\u0434\u0430 \u043D\u0443\u0441\u0445\u0430 \u043E\u043B\u0438\u043D\u0433 \u0432\u0430 \u0442\u0443\u043C\u0430\u043D \u04B3\u043E\u043A\u0438\u043C\u0438\u0433\u0430 \u0445\u0430\u0432\u0444\u0441\u0438\u0437 \u0442\u0430\u0440\u0437\u0434\u0430 \u0435\u0442\u043A\u0430\u0437\u0438\u043D\u0433.", type: "warning", showIcon: true, icon: _jsx(WarningOutlined, {}), style: { marginBottom: 20 } }), _jsxs("div", { style: {
                        background: themeColors.colorBgSubtle,
                        border: `1px solid ${themeColors.colorBorderSecondary}`,
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 16,
                    }, children: [_jsxs("div", { style: { marginBottom: 12 }, children: [_jsx(Text, { type: "secondary", style: { display: 'block', marginBottom: 4 }, children: "\u0424\u043E\u0439\u0434\u0430\u043B\u0430\u043D\u0443\u0432\u0447\u0438 \u043D\u043E\u043C\u0438 (Login):" }), _jsx(Text, { strong: true, style: { fontSize: 16 }, children: username })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", style: { display: 'block', marginBottom: 4 }, children: "\u0412\u0430\u049B\u0442\u0438\u043D\u0447\u0430\u043B\u0438\u043A \u043F\u0430\u0440\u043E\u043B:" }), _jsxs("div", { style: {
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        background: '#ffffff',
                                        border: `1px solid ${themeColors.colorBorderInput}`,
                                        borderRadius: 6,
                                        padding: '8px 12px',
                                    }, children: [_jsx(Text, { code: true, id: "temporary-password-display", "data-testid": "temporary-password", style: {
                                                fontSize: 16,
                                                letterSpacing: 1,
                                                fontWeight: 600,
                                                color: themeColors.colorText,
                                                userSelect: 'all',
                                            }, children: temporaryPassword }), _jsx(Paragraph, { copyable: {
                                                text: temporaryPassword,
                                                tooltips: ['Нусха олиш', 'Нусха олинди!'],
                                                icon: [
                                                    _jsx(CopyOutlined, { style: { fontSize: 18, color: themeColors.colorPrimary, marginLeft: 8, cursor: 'pointer' } }, "copy"),
                                                    _jsx(CheckOutlined, { style: { fontSize: 18, color: themeColors.colorSuccess, marginLeft: 8 } }, "copied"),
                                                ],
                                            }, style: { margin: 0 } })] })] })] })] }) }));
};
