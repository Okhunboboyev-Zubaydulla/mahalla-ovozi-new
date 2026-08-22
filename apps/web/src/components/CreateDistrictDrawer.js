import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState, useRef } from 'react';
import { Drawer, Form, Input, Button, theme, } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { districtClient } from '../district/district-client.js';
import { useDistrict } from '../district/district-context.js';
import { useDirtyState } from '../district/useDirtyState.js';
import { CreateDistrictRequestSchema } from '@mahalla-ovozi/api-contracts';
import { ApiError } from '../lib/api-client.js';
export const CreateDistrictDrawer = ({ open, onClose }) => {
    const { token } = theme.useToken();
    const queryClient = useQueryClient();
    const { clearDirty, setActiveDistrictDirectly, attemptTransition } = useDistrict();
    const [form] = Form.useForm();
    const [formValues, setFormValues] = useState({
        name: '',
        region: '',
    });
    const [fieldErrors, setFieldErrors] = useState({});
    const nameInputRef = useRef(null);
    const regionInputRef = useRef(null);
    const errorSummaryRef = useRef(null);
    // Form dirty state management (FR-20)
    const isDirty = formValues.name.trim() !== '' || formValues.region.trim() !== '';
    useDirtyState('create-district-drawer', isDirty);
    const mutation = useMutation({
        mutationFn: (data) => districtClient.createDistrict(data),
        onSuccess: (data) => {
            // Invalidate districts list
            queryClient.invalidateQueries({ queryKey: ['districts'] });
            // Clear form and dirty state
            form.resetFields();
            setFormValues({ name: '', region: '' });
            setFieldErrors({});
            clearDirty('create-district-drawer');
            // Set active district to the newly created one
            setActiveDistrictDirectly(data.district.id);
            onClose();
        },
        onError: (error) => {
            if (error instanceof ApiError) {
                setFieldErrors((prev) => ({
                    ...prev,
                    server: error.message,
                }));
            }
            else {
                setFieldErrors((prev) => ({
                    ...prev,
                    server: 'Туман яратишда хатолик юз берди. Илтимос, қайта уриниб кўринг.',
                }));
            }
            setTimeout(() => errorSummaryRef.current?.focus(), 0);
        },
    });
    const handleClose = () => {
        attemptTransition(() => {
            form.resetFields();
            setFormValues({ name: '', region: '' });
            setFieldErrors({});
            clearDirty('create-district-drawer');
            onClose();
        });
    };
    const handleValuesChange = (_, allValues) => {
        setFormValues({
            name: allValues.name || '',
            region: allValues.region || '',
        });
        // Clear field-specific error on change
        if (fieldErrors.name && allValues.name) {
            setFieldErrors((prev) => ({ ...prev, name: undefined }));
        }
        if (fieldErrors.region && allValues.region) {
            setFieldErrors((prev) => ({ ...prev, region: undefined }));
        }
    };
    const handleSubmit = () => {
        if (mutation.isPending)
            return;
        const values = form.getFieldsValue();
        const rawValues = {
            name: values.name || '',
            region: values.region || '',
        };
        // Client-side Zod validation
        const parsed = CreateDistrictRequestSchema.safeParse(rawValues);
        if (!parsed.success) {
            const errors = {};
            for (const issue of parsed.error.errors) {
                if (issue.path[0] === 'name' && !errors.name) {
                    errors.name = issue.message;
                }
                else if (issue.path[0] === 'region' && !errors.region) {
                    errors.region = issue.message;
                }
            }
            setFieldErrors(errors);
            setTimeout(() => {
                errorSummaryRef.current?.focus();
            }, 0);
            return;
        }
        setFieldErrors({});
        mutation.mutate(parsed.data);
    };
    const errorCount = Object.values(fieldErrors).filter(Boolean).length;
    return (_jsxs(Drawer, { title: "\u042F\u043D\u0433\u0438 \u0442\u0443\u043C\u0430\u043D \u049B\u045E\u0448\u0438\u0448", width: 480, open: open, onClose: handleClose, destroyOnClose: true, footer: _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 12 }, children: [_jsx(Button, { onClick: handleClose, disabled: mutation.isPending, children: "\u0411\u0435\u043A\u043E\u0440 \u049B\u0438\u043B\u0438\u0448" }), _jsx(Button, { id: "create-district-submit", type: "primary", onClick: handleSubmit, loading: mutation.isPending, children: "\u0421\u0430\u049B\u043B\u0430\u0448" })] }), children: [errorCount > 0 && (_jsxs("div", { ref: errorSummaryRef, tabIndex: -1, id: "create-district-error-summary", style: {
                    background: token.colorWarningBg,
                    border: `1px solid ${token.colorWarningBorder}`,
                    borderRadius: token.borderRadius,
                    padding: 16,
                    marginBottom: 24,
                    outline: 'none',
                }, children: [_jsxs("div", { style: { fontWeight: 600, color: token.colorWarningText, marginBottom: 8 }, children: ["\u0422\u045E\u043B\u0434\u0438\u0440\u0438\u0448\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A\u043B\u0430\u0440 \u043C\u0430\u0432\u0436\u0443\u0434 (", errorCount, " \u0442\u0430):"] }), _jsxs("ul", { style: { margin: 0, paddingLeft: 20 }, children: [fieldErrors.name && (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => nameInputRef.current?.focus(), style: {
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        color: token.colorPrimary,
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                    }, children: ["\u0422\u0443\u043C\u0430\u043D \u043D\u043E\u043C\u0438: ", fieldErrors.name] }) })), fieldErrors.region && (_jsx("li", { children: _jsxs("button", { type: "button", onClick: () => regionInputRef.current?.focus(), style: {
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                        color: token.colorPrimary,
                                        textDecoration: 'underline',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                    }, children: ["\u0412\u0438\u043B\u043E\u044F\u0442 / \u04B2\u0443\u0434\u0443\u0434: ", fieldErrors.region] }) })), fieldErrors.server && (_jsx("li", { style: { color: token.colorError, fontSize: 14 }, children: fieldErrors.server }))] })] })), _jsxs(Form, { form: form, layout: "vertical", onValuesChange: handleValuesChange, requiredMark: "optional", children: [_jsx(Form.Item, { name: "name", label: "\u0422\u0443\u043C\u0430\u043D \u043D\u043E\u043C\u0438", required: true, validateStatus: fieldErrors.name ? 'error' : undefined, help: fieldErrors.name, children: _jsx(Input, { ref: nameInputRef, id: "district-name-input", placeholder: "\u041C\u0430\u0441\u0430\u043B\u0430\u043D: \u042E\u043D\u0443\u0441\u043E\u0431\u043E\u0434", maxLength: 100, disabled: mutation.isPending }) }), _jsx(Form.Item, { name: "region", label: "\u0412\u0438\u043B\u043E\u044F\u0442 / \u04B2\u0443\u0434\u0443\u0434", validateStatus: fieldErrors.region ? 'error' : undefined, help: fieldErrors.region, children: _jsx(Input, { ref: regionInputRef, id: "district-region-input", placeholder: "\u041C\u0430\u0441\u0430\u043B\u0430\u043D: \u0422\u043E\u0448\u043A\u0435\u043D\u0442 \u0448\u0430\u04B3\u0440\u0438 (\u0438\u0445\u0442\u0438\u0451\u0440\u0438\u0439)", maxLength: 100, disabled: mutation.isPending }) })] })] }));
};
