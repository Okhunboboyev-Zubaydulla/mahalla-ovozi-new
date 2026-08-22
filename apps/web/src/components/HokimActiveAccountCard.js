import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Typography, Space, Button, Tag, Descriptions, Divider } from 'antd';
import { UserOutlined, KeyOutlined, SwapOutlined, StopOutlined, CheckCircleOutlined, SafetyCertificateOutlined, } from '@ant-design/icons';
import { themeColors } from '../theme/antd-theme.js';
const { Title, Text } = Typography;
export function HokimActiveAccountCard({ account, isOffline, onResetClick, onReplaceClick, onDisableClick, }) {
    return (_jsxs(Card, { variant: "borderless", style: { borderRadius: 12, boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' }, children: [_jsxs("div", { style: {
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 16,
                    marginBottom: 24,
                }, children: [_jsxs(Space, { align: "center", size: 16, children: [_jsx("div", { style: {
                                    width: 48,
                                    height: 48,
                                    borderRadius: 8,
                                    background: themeColors.colorSuccessBg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }, children: _jsx(UserOutlined, { style: { fontSize: 24, color: themeColors.colorSuccess } }) }), _jsxs("div", { children: [_jsxs(Space, { align: "center", size: 8, children: [_jsxs(Title, { level: 4, style: { margin: 0 }, children: ["@", account.username] }), _jsx(Tag, { color: "blue", icon: _jsx(SafetyCertificateOutlined, {}), children: "\u0422\u0443\u043C\u0430\u043D \u04B3\u043E\u043A\u0438\u043C\u0438" }), _jsx(Tag, { color: "success", icon: _jsx(CheckCircleOutlined, {}), children: "\u0424\u0430\u043E\u043B" })] }), _jsx(Text, { type: "secondary", style: { display: 'block', marginTop: 4, fontSize: 13 }, children: "\u0422\u0443\u043C\u0430\u043D\u0433\u0430 \u0431\u0438\u0440\u0438\u043A\u0442\u0438\u0440\u0438\u043B\u0433\u0430\u043D \u044F\u0433\u043E\u043D\u0430 \u0440\u0430\u0441\u043C\u0438\u0439 \u04B3\u043E\u043A\u0438\u043C \u04B3\u0438\u0441\u043E\u0431\u0438" })] })] }), _jsxs(Space, { wrap: true, size: 12, children: [_jsx(Button, { icon: _jsx(KeyOutlined, {}), onClick: onResetClick, disabled: isOffline, style: { height: 44 }, children: "\u041F\u0430\u0440\u043E\u043B\u043D\u0438 \u044F\u043D\u0433\u0438\u043B\u0430\u0448" }), _jsx(Button, { icon: _jsx(SwapOutlined, {}), onClick: onReplaceClick, disabled: isOffline, style: { height: 44 }, children: "\u0410\u043A\u043A\u0430\u0443\u043D\u0442\u043D\u0438 \u0430\u043B\u043C\u0430\u0448\u0442\u0438\u0440\u0438\u0448" }), _jsx(Button, { danger: true, icon: _jsx(StopOutlined, {}), onClick: onDisableClick, disabled: isOffline, style: { height: 44 }, children: "\u0424\u0430\u043E\u043B\u0441\u0438\u0437\u043B\u0430\u043D\u0442\u0438\u0440\u0438\u0448" })] })] }), _jsx(Divider, { style: { margin: '16px 0' } }), _jsxs(Descriptions, { bordered: true, size: "small", column: { xs: 1, sm: 2, md: 3 }, style: { background: themeColors.colorBgSubtle, borderRadius: 8 }, children: [_jsx(Descriptions.Item, { label: "\u0410\u043A\u043A\u0430\u0443\u043D\u0442 ID", children: _jsx(Text, { copyable: true, style: { fontSize: 13 }, children: account.id }) }), _jsx(Descriptions.Item, { label: "\u041A\u0430\u043B\u0438\u0442 \u0432\u0435\u0440\u0441\u0438\u044F\u0441\u0438 (\u0412\u0435\u0440\u0441\u0438\u044F)", children: _jsx(Tag, { children: account.credentialVersion }) }), _jsx(Descriptions.Item, { label: "\u04B2\u043E\u043B\u0430\u0442\u0438", children: _jsx(Text, { strong: true, style: { color: themeColors.colorSuccess }, children: "\u0424\u0430\u043E\u043B" }) }), _jsx(Descriptions.Item, { label: "\u042F\u0440\u0430\u0442\u0438\u043B\u0433\u0430\u043D \u0432\u0430\u049B\u0442\u0438", children: new Date(account.createdAt).toLocaleString('uz-UZ') }), _jsx(Descriptions.Item, { label: "\u041E\u0445\u0438\u0440\u0433\u0438 \u044F\u043D\u0433\u0438\u043B\u0430\u043D\u0438\u0448", children: new Date(account.updatedAt).toLocaleString('uz-UZ') })] })] }));
}
