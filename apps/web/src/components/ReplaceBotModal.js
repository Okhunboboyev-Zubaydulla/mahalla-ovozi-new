import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Modal, Space, Form, Input, Button, Alert, Typography } from 'antd';
import { SwapOutlined, LockOutlined } from '@ant-design/icons';
import { themeColors } from '../theme/antd-theme.js';
const { Paragraph, Text } = Typography;
const BOT_TOKEN_REGEX = /^\d{6,16}:[a-zA-Z0-9_-]{20,50}$/;
export function ReplaceBotModal({ isOpen, isConnecting, connectError, onSubmit, onClose, }) {
    const [form] = Form.useForm();
    const handleClose = () => {
        if (!isConnecting) {
            form.resetFields();
            onClose();
        }
    };
    const handleFinish = async (values) => {
        await onSubmit(values);
        form.resetFields();
    };
    return (_jsx(Modal, { title: _jsxs(Space, { children: [_jsx(SwapOutlined, { style: { color: themeColors.colorPrimary } }), _jsx("span", { children: "Telegram \u0431\u043E\u0442\u043D\u0438 \u0430\u043B\u043C\u0430\u0448\u0442\u0438\u0440\u0438\u0448" })] }), open: isOpen, onCancel: handleClose, footer: null, destroyOnHidden: true, children: _jsxs(Space, { direction: "vertical", size: "middle", style: { width: '100%', marginTop: '12px' }, children: [_jsx(Paragraph, { type: "secondary", children: "\u042F\u043D\u0433\u0438 \u0431\u043E\u0442 \u0442\u043E\u043A\u0435\u043D\u0438\u043D\u0438 \u043A\u0438\u0440\u0438\u0442\u0438\u043D\u0433. \u042D\u0441\u043A\u0438 \u0431\u043E\u0442 \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440\u0438 \u045E\u0447\u0438\u0440\u0438\u043B\u0430\u0434\u0438 \u0432\u0430 \u044F\u043D\u0433\u0438 \u0431\u043E\u0442 \u0442\u0435\u043A\u0448\u0438\u0440\u0438\u043B\u0438\u0431 \u0444\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u043B\u0430\u0434\u0438." }), connectError && isOpen && (_jsx(Alert, { message: "\u0410\u043B\u043C\u0430\u0448\u0442\u0438\u0440\u0438\u0448\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A", description: connectError.message || 'Янги бот токенини текширишда хатолик юз берди.', type: "error", showIcon: true })), _jsxs(Form, { form: form, layout: "vertical", onFinish: handleFinish, requiredMark: false, children: [_jsx(Form.Item, { name: "token", label: _jsx(Text, { strong: true, children: "\u042F\u043D\u0433\u0438 Telegram \u0431\u043E\u0442 \u0442\u043E\u043A\u0435\u043D\u0438" }), rules: [
                                { required: true, message: 'Илтимос, янги Telegram бот токенини киритинг.' },
                                {
                                    pattern: BOT_TOKEN_REGEX,
                                    transform: (value) => value?.trim(),
                                    message: 'Илтимос, тўғри Telegram бот токенини киритинг (масалан: 123456789:ABCdefGHIjkl...).',
                                },
                            ], children: _jsx(Input.Password, { placeholder: "123456789:AAF...", size: "large", prefix: _jsx(LockOutlined, { style: { color: themeColors.colorIconPlaceholder } }), disabled: isConnecting, style: { minHeight: '44px' }, autoComplete: "off" }) }), _jsxs(Space, { style: { width: '100%', justifyContent: 'flex-end', display: 'flex' }, children: [_jsx(Button, { onClick: handleClose, disabled: isConnecting, size: "large", style: { minHeight: '44px' }, children: "\u0411\u0435\u043A\u043E\u0440 \u049B\u0438\u043B\u0438\u0448" }), _jsx(Button, { type: "primary", htmlType: "submit", loading: isConnecting, size: "large", style: { minHeight: '44px' }, children: "\u0410\u043B\u043C\u0430\u0448\u0442\u0438\u0440\u0438\u0448\u043D\u0438 \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u0448" })] })] })] }) }));
}
