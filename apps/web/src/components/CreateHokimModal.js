import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Modal, Form, Input, Button, Alert } from 'antd';
import { UserAddOutlined } from '@ant-design/icons';
import { themeColors } from '../theme/antd-theme.js';
export const CreateHokimModal = ({ isOpen, onClose, onSubmit, isLoading, error, }) => {
    const [form] = Form.useForm();
    const handleCancel = () => {
        form.resetFields();
        onClose();
    };
    const handleFinish = async (values) => {
        await onSubmit(values);
        form.resetFields();
    };
    return (_jsx(Modal, { open: isOpen, onCancel: handleCancel, title: _jsxs("span", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [_jsx(UserAddOutlined, { style: { color: themeColors.colorPrimary } }), "\u04B2\u043E\u043A\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438\u043D\u0438 \u044F\u0440\u0430\u0442\u0438\u0448"] }), footer: null, destroyOnHidden: true, children: _jsxs(Form, { form: form, layout: "vertical", onFinish: handleFinish, style: { marginTop: 16 }, children: [error && (_jsx(Alert, { message: error.message || 'Аккаунт яратишда хатолик юз берди.', type: "error", showIcon: true, style: { marginBottom: 16 } })), _jsx(Form.Item, { label: "\u0424\u043E\u0439\u0434\u0430\u043B\u0430\u043D\u0443\u0432\u0447\u0438 \u043D\u043E\u043C\u0438 (\u041B\u043E\u0433\u0438\u043D)", name: "username", extra: "\u0424\u0430\u049B\u0430\u0442 \u043B\u043E\u0442\u0438\u043D \u04B3\u0430\u0440\u0444\u043B\u0430\u0440\u0438, \u0440\u0430\u049B\u0430\u043C\u043B\u0430\u0440 \u0432\u0430 \u0442\u0430\u0433\u0447\u0438\u0437\u0438\u049B (3-64 \u0431\u0435\u043B\u0433\u0438).", rules: [
                        { required: true, message: 'Фойдаланувчи номини киритинг' },
                        { min: 3, message: 'Камида 3 та белги бўлиши керак' },
                        { max: 64, message: '64 та белгидан ошмаслиги керак' },
                        {
                            pattern: /^[a-zA-Z0-9_]+$/,
                            message: 'Фақат лотин ҳарфлари, рақамлар ва тагчизиқ ишлатилиши мумкин',
                        },
                    ], children: _jsx(Input, { placeholder: "\u041C\u0430\u0441\u0430\u043B\u0430\u043D: hokim_chilonzor", autoComplete: "off", style: { height: 44 } }) }), _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }, children: [_jsx(Button, { onClick: handleCancel, disabled: isLoading, style: { height: 44 }, children: "\u0411\u0435\u043A\u043E\u0440 \u049B\u0438\u043B\u0438\u0448" }), _jsx(Button, { type: "primary", htmlType: "submit", loading: isLoading, style: { height: 44, paddingInline: 24 }, children: "\u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u044F\u0440\u0430\u0442\u0438\u0448" })] })] }) }));
};
