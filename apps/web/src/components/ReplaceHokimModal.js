import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Modal, Form, Input, Button, Alert, Typography } from 'antd';
import { SwapOutlined, WarningOutlined } from '@ant-design/icons';
import { themeColors } from '../theme/antd-theme.js';
const { Text } = Typography;
export const ReplaceHokimModal = ({ isOpen, onClose, onSubmit, currentUsername, isLoading, error, }) => {
    const [form] = Form.useForm();
    const handleCancel = () => {
        form.resetFields();
        onClose();
    };
    const handleFinish = async (values) => {
        await onSubmit(values);
        form.resetFields();
    };
    return (_jsx(Modal, { open: isOpen, onCancel: handleCancel, title: _jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(SwapOutlined, { style: { color: themeColors.colorPrimary } }), "\u04B2\u043E\u043A\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438\u043D\u0438 \u0430\u043B\u043C\u0430\u0448\u0442\u0438\u0440\u0438\u0448"] }), footer: null, destroyOnHidden: true, children: _jsxs("div", { style: { marginTop: 16 }, children: [_jsx(Alert, { message: "\u0410\u043C\u0430\u043B\u0434\u0430\u0433\u0438 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u0444\u0430\u043E\u043B\u0441\u0438\u0437\u043B\u0430\u043D\u0442\u0438\u0440\u0438\u043B\u0430\u0434\u0438", description: _jsxs("span", { children: ["\u0423\u0448\u0431\u0443 \u0430\u043C\u0430\u043B \u04B3\u043E\u0437\u0438\u0440\u0433\u0438 ", _jsxs(Text, { strong: true, children: ["@", currentUsername] }), " \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438\u043D\u0438 \u0444\u0430\u043E\u043B\u0441\u0438\u0437\u043B\u0430\u043D\u0442\u0438\u0440\u0430\u0434\u0438 \u0432\u0430 \u0431\u0430\u0440\u0447\u0430 \u0441\u0435\u0441\u0441\u0438\u044F\u043B\u0430\u0440\u0438\u043D\u0438 \u0431\u0435\u043A\u043E\u0440 \u049B\u0438\u043B\u0430\u0434\u0438. \u042F\u043D\u0433\u0438 \u0444\u043E\u0439\u0434\u0430\u043B\u0430\u043D\u0443\u0432\u0447\u0438 \u043D\u043E\u043C\u0438 \u0431\u0438\u043B\u0430\u043D \u044F\u043D\u0433\u0438 \u0430\u043A\u043A\u0430\u0443\u043D\u0442 \u044F\u0440\u0430\u0442\u0438\u043B\u0430\u0434\u0438."] }), type: "warning", showIcon: true, icon: _jsx(WarningOutlined, {}), style: { marginBottom: 16 } }), error && (_jsx(Alert, { message: error.message || 'Аккаунтни алмаштиришда хатолик юз берди.', type: "error", showIcon: true, style: { marginBottom: 16 } })), _jsxs(Form, { form: form, layout: "vertical", onFinish: handleFinish, children: [_jsx(Form.Item, { label: "\u042F\u043D\u0433\u0438 \u0444\u043E\u0439\u0434\u0430\u043B\u0430\u043D\u0443\u0432\u0447\u0438 \u043D\u043E\u043C\u0438 (\u041B\u043E\u0433\u0438\u043D)", name: "newUsername", extra: "\u0424\u0430\u049B\u0430\u0442 \u043B\u043E\u0442\u0438\u043D \u04B3\u0430\u0440\u0444\u043B\u0430\u0440\u0438, \u0440\u0430\u049B\u0430\u043C\u043B\u0430\u0440 \u0432\u0430 \u0442\u0430\u0433\u0447\u0438\u0437\u0438\u049B (3-64 \u0431\u0435\u043B\u0433\u0438).", rules: [
                                { required: true, message: 'Янги фойдаланувчи номини киритинг' },
                                { min: 3, message: 'Камида 3 та белги бўлиши керак' },
                                { max: 64, message: '64 та белгидан ошмаслиги керак' },
                                {
                                    pattern: /^[a-zA-Z0-9_]+$/,
                                    message: 'Фақат лотин ҳарфлари, рақамлар ва тагчизиқ ишлатилиши мумкин',
                                },
                            ], children: _jsx(Input, { placeholder: "\u041C\u0430\u0441\u0430\u043B\u0430\u043D: hokim_yangi_login", autoComplete: "off", style: { height: 44 } }) }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }, children: [_jsx(Button, { onClick: handleCancel, disabled: isLoading, style: { height: 44 }, children: "\u0411\u0435\u043A\u043E\u0440 \u049B\u0438\u043B\u0438\u0448" }), _jsx(Button, { type: "primary", htmlType: "submit", loading: isLoading, style: { height: 44, paddingInline: 24 }, children: "\u0410\u043A\u043A\u0430\u0443\u043D\u0442\u043D\u0438 \u0430\u043B\u043C\u0430\u0448\u0442\u0438\u0440\u0438\u0448" })] })] })] }) }));
};
