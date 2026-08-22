import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Modal, Button, Typography, Alert, Space, List, message } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDistrictActivation } from '../district/useDistrictActivation.js';
import { useDistrict } from '../district/district-context.js';
import { ApiError } from '../lib/api-client.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
const { Paragraph, Text } = Typography;
export const DistrictActivationModal = ({ open, onClose, districtId, districtName, onSuccess, }) => {
    const navigate = useNavigate();
    const { activateDistrict, isActivating, reset } = useDistrictActivation(districtId);
    const { clearDirty } = useDistrict();
    const [errorMessage, setErrorMessage] = useState(null);
    const [errorBlockers, setErrorBlockers] = useState(null);
    const isOffline = useOnlineStatus();
    useEffect(() => {
        if (open) {
            setErrorMessage(null);
            setErrorBlockers(null);
            reset();
        }
    }, [open, reset]);
    const handleClose = () => {
        if (isActivating)
            return;
        clearDirty('district-activation-modal');
        setErrorMessage(null);
        setErrorBlockers(null);
        reset();
        onClose();
    };
    const handleActivate = async () => {
        if (isOffline) {
            setErrorMessage('Сервер билан алоқа мавжуд эмас. Тармоқни текширинг.');
            setErrorBlockers(null);
            return;
        }
        if (isActivating)
            return;
        setErrorMessage(null);
        setErrorBlockers(null);
        try {
            await activateDistrict();
            clearDirty('district-activation-modal');
            message.success('Туман муваффақиятли фаоллаштирилди!');
            if (onSuccess) {
                onSuccess();
            }
            onClose();
        }
        catch (err) {
            if (err instanceof ApiError) {
                setErrorMessage(err.message);
                if (err.blockers && err.blockers.length > 0) {
                    setErrorBlockers(err.blockers);
                }
            }
            else {
                setErrorMessage('Туманни фаоллаштиришда хатолик юз берди. Илтимос, қайта уриниб кўринг.');
            }
        }
    };
    return (_jsx(Modal, { title: "\u0422\u0443\u043C\u0430\u043D\u043D\u0438 \u0444\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u0448\u043D\u0438 \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u0448", open: open, onCancel: handleClose, destroyOnClose: true, centered: true, closable: !isActivating, maskClosable: !isActivating, footer: _jsxs("div", { style: { display: 'flex', justifyContent: 'flex-end', gap: 12 }, children: [_jsx(Button, { id: "activate-district-cancel", onClick: handleClose, disabled: isActivating, style: { minHeight: 44 }, children: "\u0411\u0435\u043A\u043E\u0440 \u049B\u0438\u043B\u0438\u0448" }), _jsx(Button, { id: "activate-district-submit", type: "primary", onClick: handleActivate, loading: isActivating, disabled: isActivating || isOffline, style: { minHeight: 44 }, children: "\u0424\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u0448\u043D\u0438 \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u0448" })] }), children: _jsxs(Space, { direction: "vertical", size: "middle", style: { width: '100%', padding: '12px 0' }, children: [isOffline && (_jsx(Alert, { type: "warning", showIcon: true, message: "\u0421\u0435\u0440\u0432\u0435\u0440 \u0431\u0438\u043B\u0430\u043D \u0430\u043B\u043E\u049B\u0430 \u043C\u0430\u0432\u0436\u0443\u0434 \u044D\u043C\u0430\u0441. \u0422\u0430\u0440\u043C\u043E\u049B\u043D\u0438 \u0442\u0435\u043A\u0448\u0438\u0440\u0438\u043D\u0433." })), errorMessage && !isOffline && (_jsx(Alert, { type: "error", showIcon: true, message: "\u0424\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u0448\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A", description: _jsxs("div", { children: [_jsx("div", { children: errorMessage }), errorBlockers && errorBlockers.length > 0 && (_jsxs("div", { style: { marginTop: 12 }, children: [_jsx(Text, { strong: true, style: { fontSize: 13 }, children: "\u049A\u0443\u0439\u0438\u0434\u0430\u0433\u0438 \u0442\u0430\u043B\u0430\u0431\u043B\u0430\u0440 \u0442\u045E\u043B\u0438\u049B \u0431\u0430\u0436\u0430\u0440\u0438\u043B\u043C\u0430\u0433\u0430\u043D:" }), _jsx(List, { size: "small", dataSource: errorBlockers, style: { marginTop: 8 }, renderItem: (blocker) => (_jsx(List.Item, { extra: blocker.actionPath ? (_jsx(Button, { size: "small", type: "link", onClick: () => {
                                                    handleClose();
                                                    navigate(blocker.actionPath);
                                                }, children: "\u0421\u043E\u0437\u043B\u0430\u0448" })) : null, children: _jsx(List.Item.Meta, { title: blocker.label, description: blocker.blockerReason || blocker.description }) }, blocker.key)) })] }))] }) })), _jsx(Paragraph, { children: districtName ? (_jsxs(_Fragment, { children: [_jsx("strong", { children: districtName }), " \u0442\u0443\u043C\u0430\u043D\u0438\u043D\u0438 \u0442\u0438\u0437\u0438\u043C\u0434\u0430 \u0440\u0430\u0441\u043C\u0430\u043D \u0444\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u0448\u043D\u0438 \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u0439\u0441\u0438\u0437\u043C\u0438?"] })) : ('Мазкур туманни тизимда расман фаоллаштиришни тасдиқлайсизми?') }), _jsx(Alert, { type: "success", showIcon: true, icon: _jsx(CheckCircleOutlined, {}), message: "\u0422\u0430\u0439\u0451\u0440\u043B\u0438\u043A \u0442\u0430\u043B\u0430\u0431\u043B\u0430\u0440\u0438 \u0442\u0435\u043A\u0448\u0438\u0440\u0438\u043B\u0434\u0438", description: "\u0411\u0430\u0440\u0447\u0430 8 \u0442\u0430 \u0434\u0430\u0441\u0442\u043B\u0430\u0431\u043A\u0438 \u0442\u0430\u043B\u0430\u0431\u043B\u0430\u0440 \u043C\u0443\u0432\u0430\u0444\u0444\u0430\u049B\u0438\u044F\u0442\u043B\u0438 \u0431\u0430\u0436\u0430\u0440\u0438\u043B\u0434\u0438 \u0432\u0430 \u0442\u0438\u0437\u0438\u043C \u0445\u0430\u0432\u0444\u0441\u0438\u0437\u043B\u0438\u043A \u0442\u0430\u043B\u0430\u0431\u043B\u0430\u0440\u0438\u0433\u0430 \u043C\u043E\u0441 \u043A\u0435\u043B\u0430\u0434\u0438." }), _jsx(Alert, { type: "warning", showIcon: true, icon: _jsx(ExclamationCircleOutlined, {}), message: "\u041C\u0443\u04B3\u0438\u043C \u043E\u0433\u043E\u04B3\u043B\u0430\u043D\u0442\u0438\u0440\u0438\u0448", description: "\u0422\u0443\u043C\u0430\u043D \u0444\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u043B\u0433\u0430\u043D\u0434\u0430\u043D \u0441\u045E\u043D\u0433, \u0442\u0443\u043C\u0430\u043D \u04B3\u043E\u043A\u0438\u043C\u0438 \u0442\u0438\u0437\u0438\u043C\u0433\u0430 \u043A\u0438\u0440\u0438\u0448 \u0438\u043C\u043A\u043E\u043D\u0438\u044F\u0442\u0438\u0433\u0430 \u044D\u0433\u0430 \u0431\u045E\u043B\u0430\u0434\u0438 \u0432\u0430 \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440 \u0439\u0438\u0493\u0438\u0448 \u0436\u0430\u0440\u0430\u0451\u043D\u0438 \u0431\u043E\u0448\u043B\u0430\u043D\u0430\u0434\u0438. \u0424\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u043B\u0433\u0430\u043D \u0442\u0443\u043C\u0430\u043D\u043D\u0438 \u049B\u0430\u0439\u0442\u0430 \u0441\u043E\u0437\u043B\u0430\u0448 \u04B3\u043E\u043B\u0430\u0442\u0438\u0433\u0430 \u049B\u0430\u0439\u0442\u0430\u0440\u0438\u0431 \u0431\u045E\u043B\u043C\u0430\u0439\u0434\u0438." }), _jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: "\u0424\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u0448\u043D\u0438 \u044F\u043A\u0443\u043D\u043B\u0430\u0448 \u0443\u0447\u0443\u043D \u00AB\u0424\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u0448\u043D\u0438 \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u0448\u00BB \u0442\u0443\u0433\u043C\u0430\u0441\u0438\u043D\u0438 \u0431\u043E\u0441\u0438\u043D\u0433." })] }) }));
};
