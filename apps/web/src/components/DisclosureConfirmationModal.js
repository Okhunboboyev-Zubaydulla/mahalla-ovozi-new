import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Modal, Button, Typography, Alert, Space } from 'antd';
import { useDistrictReadiness } from '../district/useDistrictReadiness.js';
import { useDistrict } from '../district/district-context.js';
import { ApiError } from '../lib/api-client.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
const { Paragraph, Text } = Typography;
export const DisclosureConfirmationModal = ({ open, onClose, districtId, districtName, onSuccess, }) => {
    const { confirmDisclosure, isConfirming } = useDistrictReadiness(districtId);
    const { clearDirty } = useDistrict();
    const [serverError, setServerError] = useState(null);
    const isOffline = useOnlineStatus();
    useEffect(() => {
        if (open) {
            setServerError(null);
        }
    }, [open]);
    const handleClose = () => {
        clearDirty('disclosure-confirmation-modal');
        setServerError(null);
        onClose();
    };
    const handleConfirm = async () => {
        if (isOffline) {
            setServerError('Сервер билан алоқа мавжуд эмас. Тармоқни текширинг.');
            return;
        }
        setServerError(null);
        try {
            await confirmDisclosure();
            clearDirty('disclosure-confirmation-modal');
            if (onSuccess) {
                onSuccess();
            }
            onClose();
        }
        catch (err) {
            if (err instanceof ApiError) {
                setServerError(err.message);
            }
            else {
                setServerError('Сервер билан боғланишда хатолик юз берди. Илтимос, қайта уриниб кўринг.');
            }
        }
    };
    return (_jsx(Modal, { title: "\u041E\u043F\u0435\u0440\u0430\u0446\u0438\u043E\u043D \u043A\u0438\u0440\u0438\u0448 \u043E\u0447\u0438\u049B\u043B\u0438\u0433\u0438\u043D\u0438 \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u0448", open: open, onCancel: handleClose, destroyOnClose: true, centered: true, footer: _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 12 }, children: [_jsx(Button, { id: "confirm-disclosure-cancel", onClick: handleClose, disabled: isConfirming, style: { minHeight: 44 }, children: "\u0411\u0435\u043A\u043E\u0440 \u049B\u0438\u043B\u0438\u0448" }), _jsx(Button, { id: "confirm-disclosure-submit", type: "primary", onClick: handleConfirm, loading: isConfirming, disabled: isConfirming || isOffline, style: { minHeight: 44 }, children: "\u0422\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u0448 \u0432\u0430 \u0441\u0430\u049B\u043B\u0430\u0448" })] }), children: _jsxs(Space, { direction: "vertical", size: "middle", style: { width: '100%', padding: '12px 0' }, children: [isOffline && (_jsx(Alert, { type: "warning", showIcon: true, message: "\u0421\u0435\u0440\u0432\u0435\u0440 \u0431\u0438\u043B\u0430\u043D \u0430\u043B\u043E\u049B\u0430 \u043C\u0430\u0432\u0436\u0443\u0434 \u044D\u043C\u0430\u0441. \u0422\u0430\u0440\u043C\u043E\u049B\u043D\u0438 \u0442\u0435\u043A\u0448\u0438\u0440\u0438\u043D\u0433." })), serverError && !isOffline && (_jsx(Alert, { type: "error", showIcon: true, message: "\u0422\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u0448\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A", description: serverError })), _jsx(Paragraph, { children: districtName ? (_jsxs(_Fragment, { children: [_jsx("strong", { children: districtName }), " \u0431\u045E\u0439\u0438\u0447\u0430 \u0442\u0438\u0437\u0438\u043C \u0441\u043E\u0437\u043B\u0430\u043C\u0430\u043B\u0430\u0440\u0438 \u0432\u0430 \u0442\u0430\u0448\u049B\u0438 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u043E\u043D \u043A\u0438\u0440\u0438\u0448 \u043E\u0447\u0438\u049B\u043B\u0438\u0433\u0438\u043D\u0438 \u0440\u0430\u0441\u043C\u0430\u043D \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u0439\u0441\u0438\u0437\u043C\u0438?"] })) : ('Мазкур туман бўйича тизим созламалари ва ташқи операцион кириш очиқлигини расман тасдиқлайсизми?') }), _jsx(Alert, { type: "info", showIcon: true, message: "\u0425\u0430\u0432\u0444\u0441\u0438\u0437\u043B\u0438\u043A \u0432\u0430 \u0430\u0443\u0434\u0438\u0442 \u0442\u0430\u043B\u0430\u0431\u0438", description: "\u0423\u0448\u0431\u0443 \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u043E\u0432 \u049B\u0430\u0439\u0434 \u044D\u0442\u0438\u043B\u0433\u0430\u043D\u0434\u0430\u043D \u0441\u045E\u043D\u0433, \u0442\u0438\u0437\u0438\u043C \u0430\u0443\u0434\u0438\u0442 \u0436\u0443\u0440\u043D\u0430\u043B\u0438\u0434\u0430 \u043C\u0430\u0441\u044A\u0443\u043B \u0445\u043E\u0434\u0438\u043C \u0438\u0434\u0435\u043D\u0442\u0438\u0444\u0438\u043A\u0430\u0442\u043E\u0440\u0438 \u0432\u0430 \u0432\u0430\u049B\u0442\u0438 \u049B\u0430\u0439\u0434 \u044D\u0442\u0438\u043B\u0430\u0434\u0438. \u0422\u0430\u0441\u0434\u0438\u049B\u043B\u043E\u0432 \u0444\u0430\u049B\u0430\u0442 \u043C\u0430\u0441\u044A\u0443\u043B \u0448\u0430\u0445\u0441 \u0442\u043E\u043C\u043E\u043D\u0438\u0434\u0430\u043D \u0430\u043C\u0430\u043B\u0433\u0430 \u043E\u0448\u0438\u0440\u0438\u043B\u0438\u0448\u0438 \u0448\u0430\u0440\u0442." }), _jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: "\u0422\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u0448 \u0443\u0447\u0443\u043D \u00AB\u0422\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u0448 \u0432\u0430 \u0441\u0430\u049B\u043B\u0430\u0448\u00BB \u0442\u0443\u0433\u043C\u0430\u0441\u0438\u043D\u0438 \u0431\u043E\u0441\u0438\u043D\u0433." })] }) }));
};
