import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Modal, Space, Button, Alert, Typography } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { themeColors } from '../theme/antd-theme.js';
const { Paragraph, Text } = Typography;
export function DisconnectBotModal({ isOpen, isDisconnecting, disconnectError, districtName, onConfirm, onClose, }) {
    const handleClose = () => {
        if (!isDisconnecting) {
            onClose();
        }
    };
    return (_jsx(Modal, { title: _jsxs(Space, { children: [_jsx(ExclamationCircleOutlined, { style: { color: themeColors.colorError } }), _jsx("span", { children: "Telegram \u0431\u043E\u0442\u043D\u0438 \u0443\u0437\u0438\u0448\u043D\u0438 \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u043D\u0433" })] }), open: isOpen, onCancel: handleClose, footer: [
            _jsx(Button, { onClick: handleClose, disabled: isDisconnecting, size: "large", style: { minHeight: '44px' }, children: "\u0411\u0435\u043A\u043E\u0440 \u049B\u0438\u043B\u0438\u0448" }, "cancel"),
            _jsx(Button, { danger: true, type: "primary", loading: isDisconnecting, onClick: onConfirm, size: "large", style: { minHeight: '44px' }, children: "\u04B2\u0430, \u0431\u043E\u0442\u043D\u0438 \u0443\u0437\u0438\u0448" }, "disconnect"),
        ], children: _jsxs(Space, { direction: "vertical", size: "middle", style: { width: '100%', marginTop: '12px' }, children: [_jsxs(Paragraph, { children: ["\u04B2\u0430\u049B\u0438\u049B\u0430\u0442\u0430\u043D \u04B3\u0430\u043C ", _jsx(Text, { strong: true, children: districtName }), " \u0442\u0443\u043C\u0430\u043D\u0438\u0433\u0430 \u0431\u0438\u0440\u0438\u043A\u0442\u0438\u0440\u0438\u043B\u0433\u0430\u043D Telegram \u0431\u043E\u0442\u043D\u0438 \u0443\u0437\u043C\u043E\u049B\u0447\u0438\u043C\u0438\u0441\u0438\u0437?"] }), _jsx(Alert, { message: "\u041E\u0433\u043E\u04B3\u043B\u0430\u043D\u0442\u0438\u0440\u0438\u0448", description: "\u0411\u043E\u0442 \u0443\u0437\u0438\u043B\u0433\u0430\u043D\u0434\u0430\u043D \u0441\u045E\u043D\u0433, \u0443\u0448\u0431\u0443 \u0442\u0443\u043C\u0430\u043D\u0434\u0430 Telegram \u0445\u0430\u0431\u0430\u0440\u043B\u0430\u0440\u0438\u043D\u0438 \u0439\u0438\u0493\u0438\u0448 \u0442\u045E\u0445\u0442\u0430\u0442\u0438\u043B\u0430\u0434\u0438 \u0432\u0430 \u0442\u0443\u043C\u0430\u043D\u043D\u0438\u043D\u0433 \u0442\u0430\u0439\u0451\u0440\u0433\u0430\u0440\u043B\u0438\u043A \u04B3\u043E\u043B\u0430\u0442\u0438 \u0442\u045E\u043B\u0438\u049B \u044D\u043C\u0430\u0441 \u0434\u0435\u0431 \u0431\u0435\u043B\u0433\u0438\u043B\u0430\u043D\u0430\u0434\u0438.", type: "warning", showIcon: true }), disconnectError && (_jsx(Alert, { message: "\u0411\u043E\u0442\u043D\u0438 \u0443\u0437\u0438\u0448\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A", description: disconnectError.message || 'Ботни узишда кутилмаган хатолик юз берди.', type: "error", showIcon: true }))] }) }));
}
