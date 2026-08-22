import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Typography, Button } from 'antd';
import { UserOutlined, UserAddOutlined } from '@ant-design/icons';
import { themeColors } from '../theme/antd-theme.js';
const { Title, Paragraph } = Typography;
export function HokimNoAccountCard({ isOffline, onCreateClick }) {
    return (_jsxs(Card, { variant: "borderless", style: {
            borderRadius: 12,
            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',
            textAlign: 'center',
            padding: '32px 16px',
        }, children: [_jsx("div", { style: {
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: themeColors.colorBgEmpty,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                }, children: _jsx(UserOutlined, { style: { fontSize: 32, color: themeColors.colorTextMuted } }) }), _jsx(Title, { level: 4, style: { marginBottom: 8 }, children: "\u04B2\u043E\u043A\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438 \u044F\u0440\u0430\u0442\u0438\u043B\u043C\u0430\u0433\u0430\u043D" }), _jsx(Paragraph, { type: "secondary", style: { maxWidth: 500, margin: '0 auto 24px auto' }, children: "\u0423\u0448\u0431\u0443 \u0442\u0443\u043C\u0430\u043D \u0443\u0447\u0443\u043D \u04B3\u0430\u043B\u0438 \u04B3\u043E\u043A\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438 \u043C\u0430\u0432\u0436\u0443\u0434 \u044D\u043C\u0430\u0441. \u0422\u0443\u043C\u0430\u043D \u04B3\u043E\u043A\u0438\u043C\u0438 \u0442\u0438\u0437\u0438\u043C\u0433\u0430 \u043A\u0438\u0440\u0438\u0448\u0438 \u0443\u0447\u0443\u043D \u044F\u043D\u0433\u0438 \u0445\u0430\u0432\u0444\u0441\u0438\u0437 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u044F\u0440\u0430\u0442\u0438\u043D\u0433." }), _jsx(Button, { type: "primary", icon: _jsx(UserAddOutlined, {}), onClick: onCreateClick, disabled: isOffline, style: { height: 44, paddingInline: 24, fontSize: 15 }, children: "\u04B2\u043E\u043A\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438\u043D\u0438 \u044F\u0440\u0430\u0442\u0438\u0448" })] }));
}
