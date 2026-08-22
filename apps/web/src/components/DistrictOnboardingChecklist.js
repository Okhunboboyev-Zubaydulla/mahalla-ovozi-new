import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Typography, Progress, List, Tag, Button, Alert, Tooltip, Space, Spin, theme, } from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, } from '@ant-design/icons';
import { useDistrictReadiness } from '../district/useDistrictReadiness.js';
import { DisclosureConfirmationModal } from './DisclosureConfirmationModal.js';
import { DistrictActivationModal } from './DistrictActivationModal.js';
import { formatTashkentDate } from '../lib/formatters.js';
const { Title, Paragraph, Text } = Typography;
export const DistrictOnboardingChecklist = ({ districtId, }) => {
    const navigate = useNavigate();
    const { token } = theme.useToken();
    const { readiness, isLoading, isError, refetch } = useDistrictReadiness(districtId);
    const [disclosureModalOpen, setDisclosureModalOpen] = useState(false);
    const [activationModalOpen, setActivationModalOpen] = useState(false);
    if (isLoading) {
        return (_jsxs(Card, { variant: "borderless", style: { borderRadius: 12, textAlign: 'center', padding: 48 }, children: [_jsx(Spin, { size: "large" }), _jsx(Paragraph, { type: "secondary", style: { marginTop: 16 }, children: "\u0422\u0443\u043C\u0430\u043D \u0442\u0430\u0439\u0451\u0440\u043B\u0438\u043A \u04B3\u043E\u043B\u0430\u0442\u0438 \u044E\u043A\u043B\u0430\u043D\u043C\u043E\u049B\u0434\u0430..." })] }));
    }
    if (isError || !readiness) {
        return (_jsx(Card, { variant: "borderless", style: { borderRadius: 12 }, children: _jsx(Alert, { type: "error", showIcon: true, message: "\u0422\u0430\u0439\u0451\u0440\u043B\u0438\u043A \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440\u0438\u043D\u0438 \u044E\u043A\u043B\u0430\u0431 \u0431\u045E\u043B\u043C\u0430\u0434\u0438", description: "\u0421\u0435\u0440\u0432\u0435\u0440 \u0431\u0438\u043B\u0430\u043D \u0431\u043E\u0493\u043B\u0430\u043D\u0438\u0448\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A \u044E\u0437 \u0431\u0435\u0440\u0434\u0438. \u0418\u043B\u0442\u0438\u043C\u043E\u0441, \u049B\u0430\u0439\u0442\u0430 \u0443\u0440\u0438\u043D\u0438\u0431 \u043A\u045E\u0440\u0438\u043D\u0433.", action: _jsx(Button, { type: "primary", danger: true, onClick: () => void refetch(), style: { minHeight: 44 }, children: "\u049A\u0430\u0439\u0442\u0430 \u0443\u0440\u0438\u043D\u0438\u0448" }) }) }));
    }
    const isAlreadyActive = readiness.status === 'ACTIVE';
    const progressPercent = Math.round((readiness.passedCount / readiness.totalCount) * 100);
    const renderStatusTag = (item) => {
        switch (item.status) {
            case 'passed':
                return (_jsx(Tag, { color: "success", icon: _jsx(CheckCircleOutlined, {}), children: "\u0411\u0430\u0436\u0430\u0440\u0438\u043B\u0434\u0438" }));
            case 'failed':
                return (_jsx(Tag, { color: "error", icon: _jsx(CloseCircleOutlined, {}), children: "\u0425\u0430\u0442\u043E\u043B\u0438\u043A" }));
            case 'incomplete':
            default:
                return (_jsx(Tag, { color: "warning", icon: _jsx(ClockCircleOutlined, {}), children: "\u0422\u0443\u0433\u0430\u043B\u043B\u0430\u043D\u043C\u0430\u0433\u0430\u043D" }));
        }
    };
    const renderItemAction = (item) => {
        if (isAlreadyActive) {
            if (item.completedAt) {
                return (_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: formatTashkentDate(item.completedAt) }));
            }
            return null;
        }
        if (item.key === 'disclosure_confirmation' && item.status !== 'passed') {
            return (_jsx(Button, { id: "open-disclosure-modal-button", type: "primary", onClick: () => setDisclosureModalOpen(true), style: { minHeight: 44 }, children: "\u0422\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u0448" }));
        }
        if (item.actionRequired && item.actionPath && item.status !== 'passed') {
            return (_jsx(Button, { id: `action-button-${item.key}`, type: "primary", onClick: () => navigate(item.actionPath), style: { minHeight: 44 }, children: "\u0421\u043E\u0437\u043B\u0430\u0448" }));
        }
        if (item.completedAt) {
            return (_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: formatTashkentDate(item.completedAt) }));
        }
        return null;
    };
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 24 }, children: [_jsxs(Card, { variant: "borderless", style: { borderRadius: 12 }, children: [_jsxs("div", { style: { marginBottom: 20 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Title, { level: 3, style: { margin: 0 }, children: "\u0422\u0443\u043C\u0430\u043D\u043D\u0438 \u0444\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u0448\u0433\u0430 \u0442\u0430\u0439\u0451\u0440\u043B\u0430\u0448" }), isAlreadyActive && (_jsx(Tag, { color: "success", icon: _jsx(CheckCircleOutlined, {}), style: { fontSize: 14, padding: '4px 12px' }, children: "\u0424\u0430\u043E\u043B \u0442\u0443\u043C\u0430\u043D" }))] }), _jsx(Paragraph, { type: "secondary", style: { marginTop: 4, marginBottom: 0 }, children: isAlreadyActive
                                    ? 'Ушбу туман муваффақиятли фаоллаштирилган ва тизимда тўлиқ ишламоқда.'
                                    : `Туманни тизимга тўлиқ улаш учун қуйидаги барча ${readiness.totalCount} та талаб бажарилиши шарт.` })] }), isAlreadyActive && (_jsx(Alert, { type: "success", showIcon: true, icon: _jsx(CheckCircleOutlined, {}), message: "\u0422\u0443\u043C\u0430\u043D \u0440\u0430\u0441\u043C\u0430\u043D \u0444\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u043B\u0433\u0430\u043D", description: "\u0411\u0430\u0440\u0447\u0430 \u0441\u043E\u0437\u043B\u0430\u043C\u0430\u043B\u0430\u0440 \u0432\u0430 \u0445\u0430\u0432\u0444\u0441\u0438\u0437\u043B\u0438\u043A \u0442\u0430\u043B\u0430\u0431\u043B\u0430\u0440\u0438 \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u043D\u0433\u0430\u043D. \u04B2\u043E\u043A\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438 \u0432\u0430 \u0442\u0430\u04B3\u043B\u0438\u043B \u0442\u0438\u0437\u0438\u043C\u0438 \u0444\u0430\u043E\u043B \u04B3\u043E\u043B\u0430\u0442\u0434\u0430.", style: { marginBottom: 24 } })), _jsxs("div", { style: {
                            background: token.colorFillAlter,
                            borderRadius: 8,
                            padding: 16,
                            marginBottom: 24,
                        }, children: [_jsxs("div", { style: {
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: 8,
                                }, children: [_jsx(Text, { strong: true, children: "\u0423\u043C\u0443\u043C\u0438\u0439 \u0442\u0430\u0439\u0451\u0440\u043B\u0438\u043A \u04B3\u043E\u043B\u0430\u0442\u0438" }), _jsxs(Tag, { color: isAlreadyActive || readiness.isActivationReady ? 'success' : 'processing', children: [readiness.passedCount, " / ", readiness.totalCount, " \u0442\u0430 \u0442\u0430\u043B\u0430\u0431 \u0431\u0430\u0436\u0430\u0440\u0438\u043B\u0434\u0438"] })] }), _jsx(Progress, { percent: progressPercent, status: isAlreadyActive || readiness.isActivationReady ? 'success' : 'active', strokeColor: token.colorPrimary })] }), _jsx(List, { itemLayout: "horizontal", dataSource: readiness.items, renderItem: (item) => (_jsx(List.Item, { actions: [renderItemAction(item)].filter(Boolean), style: {
                                padding: '16px 12px',
                                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                            }, children: _jsx(List.Item.Meta, { title: _jsxs(Space, { direction: "horizontal", size: "small", wrap: true, children: [_jsx(Text, { strong: true, children: item.label }), renderStatusTag(item)] }), description: _jsxs("div", { style: { marginTop: 4 }, children: [_jsx("div", { children: item.description }), item.blockerReason && item.status !== 'passed' && (_jsxs(Text, { type: "secondary", style: { color: token.colorError, fontSize: 13 }, children: ["\u26A0\uFE0F ", item.blockerReason] }))] }) }) }, item.key)) }), _jsxs("div", { style: {
                            marginTop: 32,
                            paddingTop: 24,
                            borderTop: `1px solid ${token.colorBorderSecondary}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 16,
                        }, children: [_jsx("div", { children: isAlreadyActive ? (_jsx(Text, { strong: true, style: { color: token.colorSuccess }, children: "\u2713 \u0422\u0443\u043C\u0430\u043D \u0430\u043B\u043B\u0430\u049B\u0430\u0447\u043E\u043D \u0444\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u043B\u0433\u0430\u043D" })) : !readiness.isActivationReady ? (_jsxs(Text, { type: "secondary", style: { fontSize: 13 }, children: ["\u0424\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u0448 \u0443\u0447\u0443\u043D \u0431\u0430\u0440\u0447\u0430 \u0442\u0430\u043B\u0430\u0431\u043B\u0430\u0440 \u0431\u0430\u0436\u0430\u0440\u0438\u043B\u0438\u0448\u0438 \u043A\u0435\u0440\u0430\u043A (", readiness.passedCount, "/", readiness.totalCount, ")"] })) : (_jsx(Text, { strong: true, style: { color: token.colorPrimary }, children: "\u0411\u0430\u0440\u0447\u0430 \u0442\u0430\u043B\u0430\u0431\u043B\u0430\u0440 \u0431\u0430\u0436\u0430\u0440\u0438\u043B\u0434\u0438! \u0422\u0443\u043C\u0430\u043D\u043D\u0438 \u0444\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u0448 \u043C\u0443\u043C\u043A\u0438\u043D." })) }), !isAlreadyActive && (_jsx(Tooltip, { title: !readiness.isActivationReady
                                    ? 'Фаоллаштириш учун барча талаблар бажарилиши керак'
                                    : undefined, children: _jsx("span", { children: _jsx(Button, { id: "activate-district-button", type: "primary", size: "large", disabled: !readiness.isActivationReady, onClick: () => setActivationModalOpen(true), style: { minHeight: 44, minWidth: 200 }, children: "\u0422\u0443\u043C\u0430\u043D\u043D\u0438 \u0444\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u0448" }) }) }))] })] }), _jsx(DisclosureConfirmationModal, { open: disclosureModalOpen, onClose: () => setDisclosureModalOpen(false), districtId: districtId, districtName: readiness.districtName }), _jsx(DistrictActivationModal, { open: activationModalOpen, onClose: () => setActivationModalOpen(false), districtId: districtId, districtName: readiness.districtName })] }));
};
