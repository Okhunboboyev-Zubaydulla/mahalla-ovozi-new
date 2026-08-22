import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, Typography, Space, Form, Input, Button, Alert, Tag, Descriptions, Spin, Empty, Divider, } from 'antd';
import { RobotOutlined, SafetyCertificateOutlined, SwapOutlined, DisconnectOutlined, LockOutlined, CheckCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined, WarningOutlined, } from '@ant-design/icons';
import { useDistrict } from '../district/district-context.js';
import { useTelegramBot } from '../district/useTelegramBot.js';
import { districtClient } from '../district/district-client.js';
import { useQuery } from '@tanstack/react-query';
import { TelegramGroupTable } from '../components/TelegramGroupTable.js';
import { ReplaceBotModal } from '../components/ReplaceBotModal.js';
import { DisconnectBotModal } from '../components/DisconnectBotModal.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { themeColors } from '../theme/antd-theme.js';
const { Title, Text } = Typography;
const BOT_TOKEN_REGEX = /^\d{6,16}:[a-zA-Z0-9_-]{20,50}$/;
export function TelegramSetupPage({ districtId } = {}) {
    const { activeDistrictId: contextDistrictId } = useDistrict();
    const effectiveDistrictId = districtId ?? contextDistrictId;
    const { data: districtResponse } = useQuery({
        queryKey: ['district', effectiveDistrictId],
        queryFn: () => (effectiveDistrictId ? districtClient.getDistrict(effectiveDistrictId) : null),
        enabled: !!effectiveDistrictId,
    });
    const activeDistrict = districtResponse?.district ?? null;
    const { bot, isLoading, error, connectBot, isConnecting, connectError, resetConnectError, disconnectBot, isDisconnecting, disconnectError, resetDisconnectError, } = useTelegramBot(effectiveDistrictId);
    const isOffline = useOnlineStatus();
    const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
    const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
    const [connectForm] = Form.useForm();
    const handleOpenReplaceModal = () => {
        resetConnectError();
        setIsReplaceModalOpen(true);
    };
    const handleOpenDisconnectModal = () => {
        resetDisconnectError();
        setIsDisconnectModalOpen(true);
    };
    const handleConnectSubmit = async (values) => {
        try {
            await connectBot({ token: values.token.trim() });
            connectForm.resetFields();
        }
        catch {
            // Error handled by mutation state
        }
    };
    const handleReplaceSubmit = async (values) => {
        try {
            await connectBot({ token: values.token.trim() });
            setIsReplaceModalOpen(false);
        }
        catch {
            // Error handled by mutation state
        }
    };
    const handleDisconnectConfirm = async () => {
        try {
            await disconnectBot();
            setIsDisconnectModalOpen(false);
        }
        catch {
            // Error handled by mutation state
        }
    };
    if (!activeDistrict) {
        return (_jsxs("div", { style: { maxWidth: '800px', margin: '0 auto', padding: '24px' }, children: [_jsx(Title, { level: 2, children: "Telegram \u0431\u043E\u0442 \u0441\u043E\u0437\u043B\u0430\u043C\u0430\u043B\u0430\u0440\u0438" }), _jsx(Card, { children: _jsx(Empty, { description: _jsxs(Space, { direction: "vertical", align: "center", children: [_jsx(Text, { strong: true, children: "\u0422\u0443\u043C\u0430\u043D \u0442\u0430\u043D\u043B\u0430\u043D\u043C\u0430\u0433\u0430\u043D" }), _jsx(Text, { type: "secondary", children: "Telegram \u0431\u043E\u0442\u043D\u0438 \u0441\u043E\u0437\u043B\u0430\u0448 \u0443\u0447\u0443\u043D \u0430\u0432\u0432\u0430\u043B \u044E\u049B\u043E\u0440\u0438\u0434\u0430\u0433\u0438 \u0442\u0430\u043D\u043B\u0430\u0433\u0438\u0447\u0434\u0430\u043D \u0442\u0443\u043C\u0430\u043D\u043D\u0438 \u0442\u0430\u043D\u043B\u0430\u043D\u0433." })] }) }) })] }));
    }
    return (_jsxs("div", { style: { maxWidth: '800px', margin: '0 auto', padding: '24px' }, children: [_jsxs(Space, { direction: "vertical", size: "large", style: { width: '100%' }, children: [_jsxs("div", { children: [_jsx(Title, { level: 2, style: { marginBottom: '4px' }, children: "Telegram \u0431\u043E\u0442 \u0441\u043E\u0437\u043B\u0430\u043C\u0430\u043B\u0430\u0440\u0438" }), _jsxs(Text, { type: "secondary", children: [activeDistrict.name, " \u0442\u0443\u043C\u0430\u043D\u0438 \u0443\u0447\u0443\u043D \u0445\u0430\u0431\u0430\u0440\u043B\u0430\u0440\u043D\u0438 \u0439\u0438\u0493\u0438\u0448 \u0432\u0430 \u049B\u0430\u0439\u0442\u0430 \u0438\u0448\u043B\u0430\u0448 \u0431\u043E\u0442\u0438\u043D\u0438 \u0431\u043E\u0448\u049B\u0430\u0440\u0438\u0448."] })] }), isOffline && (_jsx(Alert, { message: "\u0422\u0430\u0440\u043C\u043E\u049B \u0430\u043B\u043E\u049B\u0430\u0441\u0438 \u0439\u045E\u049B", description: "\u041E\u0444\u043B\u0430\u0439\u043D \u04B3\u043E\u043B\u0430\u0442\u0434\u0430 \u0431\u043E\u0442 \u0441\u043E\u0437\u043B\u0430\u043C\u0430\u043B\u0430\u0440\u0438\u043D\u0438 \u045E\u0437\u0433\u0430\u0440\u0442\u0438\u0440\u0438\u0431 \u0431\u045E\u043B\u043C\u0430\u0439\u0434\u0438. \u0418\u043B\u0442\u0438\u043C\u043E\u0441, \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442 \u0430\u043B\u043E\u049B\u0430\u0441\u0438\u043D\u0438 \u0442\u0435\u043A\u0448\u0438\u0440\u0438\u043D\u0433.", type: "warning", showIcon: true, icon: _jsx(WarningOutlined, {}), style: { minHeight: '44px' } })), isLoading ? (_jsx(Card, { style: { textAlign: 'center', padding: '48px 0' }, children: _jsx(Spin, { size: "large", tip: "\u0411\u043E\u0442 \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440\u0438 \u044E\u043A\u043B\u0430\u043D\u043C\u043E\u049B\u0434\u0430..." }) })) : error ? (_jsx(Alert, { message: "\u0411\u043E\u0442 \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440\u0438\u043D\u0438 \u044E\u043A\u043B\u0430\u0448\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A", description: error.message || 'Сервер билан алоқада хатолик юз берди.', type: "error", showIcon: true })) : bot && bot.status === 'VALID' ? (_jsxs(_Fragment, { children: [_jsx(Card, { title: _jsxs(Space, { children: [_jsx(RobotOutlined, { style: { fontSize: '20px', color: themeColors.colorPrimary } }), _jsx("span", { children: "\u0411\u0438\u0440\u0438\u043A\u0442\u0438\u0440\u0438\u043B\u0433\u0430\u043D Telegram \u0431\u043E\u0442" })] }), extra: _jsx(Tag, { color: "success", icon: _jsx(CheckCircleOutlined, {}), children: "\u0424\u0410\u041E\u041B / \u0423\u041B\u0410\u041D\u0413\u0410\u041D" }), children: _jsxs(Space, { direction: "vertical", size: "middle", style: { width: '100%' }, children: [_jsxs(Descriptions, { bordered: true, column: 1, size: "middle", children: [_jsx(Descriptions.Item, { label: "\u0411\u043E\u0442 \u043D\u043E\u043C\u0438", children: _jsx(Text, { strong: true, children: bot.botFirstName }) }), _jsx(Descriptions.Item, { label: "Telegram \u044E\u0437\u0435\u0440\u043D\u0435\u0439\u043C\u0438", children: _jsx(Text, { copyable: true, strong: true, children: bot.botUsername ? `@${bot.botUsername}` : 'Юзернеймсиз' }) }), _jsx(Descriptions.Item, { label: "\u0411\u043E\u0442 ID", children: _jsx(Text, { code: true, children: bot.botId }) }), _jsx(Descriptions.Item, { label: "\u0422\u043E\u043A\u0435\u043D \u043A\u045E\u0440\u0438\u043D\u0438\u0448\u0438", children: _jsxs(Space, { children: [_jsx(Text, { code: true, children: bot.tokenMasked }), _jsx(Tag, { color: "blue", icon: _jsx(LockOutlined, {}), children: "AES-256-GCM \u0431\u0438\u043B\u0430\u043D \u04B3\u0438\u043C\u043E\u044F\u043B\u0430\u043D\u0433\u0430\u043D" })] }) }), _jsx(Descriptions.Item, { label: "\u041E\u0445\u0438\u0440\u0433\u0438 \u0442\u0435\u043A\u0448\u0438\u0440\u0438\u043B\u0433\u0430\u043D \u0432\u0430\u049B\u0442", children: _jsx(Text, { type: "secondary", children: new Date(bot.lastValidatedAt).toLocaleString('uz-UZ') }) })] }), _jsx(Alert, { message: "\u041F\u0430\u0441\u0441\u0438\u0432 \u049B\u0430\u0431\u0443\u043B \u0440\u0435\u0436\u0438\u043C\u0438", description: "\u041C\u0430\u0437\u043A\u0443\u0440 \u0431\u043E\u0442 \u0444\u0430\u049B\u0430\u0442 \u0431\u0438\u0440\u0438\u043A\u0442\u0438\u0440\u0438\u043B\u0433\u0430\u043D Telegram \u0433\u0443\u0440\u0443\u04B3\u043B\u0430\u0440\u0438\u0434\u0430\u0433\u0438 \u0445\u0430\u0431\u0430\u0440\u043B\u0430\u0440\u043D\u0438 \u049B\u0430\u0431\u0443\u043B \u049B\u0438\u043B\u0438\u0448 \u0440\u0435\u0436\u0438\u043C\u0438\u0434\u0430 \u0438\u0448\u043B\u0430\u0439\u0434\u0438. \u0423 \u0430\u04B3\u043E\u043B\u0438\u0433\u0430 \u045E\u0437 \u043D\u043E\u043C\u0438\u0434\u0430\u043D \u0431\u0435\u0432\u043E\u0441\u0438\u0442\u0430 \u0445\u0430\u0431\u0430\u0440 \u0451\u0437\u043C\u0430\u0439\u0434\u0438 \u0432\u0430 \u0442\u0430\u0440\u049B\u0430\u0442\u043C\u0430\u0439\u0434\u0438.", type: "info", showIcon: true, icon: _jsx(InfoCircleOutlined, {}) }), _jsx(Divider, { style: { margin: '12px 0' } }), _jsxs(Space, { wrap: true, size: "middle", children: [_jsx(Button, { type: "default", icon: _jsx(SwapOutlined, {}), size: "large", onClick: handleOpenReplaceModal, disabled: isOffline || isConnecting || isDisconnecting, style: { minHeight: '44px' }, children: "\u0411\u043E\u0442\u043D\u0438 \u0430\u043B\u043C\u0430\u0448\u0442\u0438\u0440\u0438\u0448" }), _jsx(Button, { danger: true, type: "default", icon: _jsx(DisconnectOutlined, {}), size: "large", onClick: handleOpenDisconnectModal, disabled: isOffline || isConnecting || isDisconnecting, loading: isDisconnecting, style: { minHeight: '44px' }, children: "\u0411\u043E\u0442\u043D\u0438 \u0443\u0437\u0438\u0448" })] })] }) }), _jsx(TelegramGroupTable, { districtId: effectiveDistrictId || bot.districtId, isOffline: isOffline })] })) : (_jsxs(_Fragment, { children: [_jsx(Card, { title: _jsxs(Space, { children: [_jsx(RobotOutlined, { style: { fontSize: '20px', color: themeColors.colorPrimary } }), _jsx("span", { children: "Telegram \u0431\u043E\u0442\u043D\u0438 \u0443\u043B\u0430\u0448" })] }), children: _jsxs(Space, { direction: "vertical", size: "middle", style: { width: '100%' }, children: [_jsx(Alert, { message: "\u0411\u043E\u0442 \u0442\u043E\u043A\u0435\u043D\u0438\u043D\u0438 \u043A\u0438\u0440\u0438\u0442\u0438\u0448 \u0431\u045E\u0439\u0438\u0447\u0430 \u043A\u045E\u0440\u0441\u0430\u0442\u043C\u0430", description: "BotFather \u043E\u0440\u049B\u0430\u043B\u0438 \u044F\u0440\u0430\u0442\u0438\u043B\u0433\u0430\u043D \u0440\u0430\u0441\u043C\u0438\u0439 Telegram \u0431\u043E\u0442 \u0442\u043E\u043A\u0435\u043D\u0438\u043D\u0438 \u043A\u0438\u0440\u0438\u0442\u0438\u043D\u0433. \u0411\u043E\u0442 \u0444\u0430\u049B\u0430\u0442 \u0431\u0438\u0440\u0438\u043A\u0442\u0438\u0440\u0438\u043B\u0433\u0430\u043D \u0442\u0443\u043C\u0430\u043D \u0433\u0443\u0440\u0443\u04B3\u043B\u0430\u0440\u0438\u0434\u0430\u0433\u0438 \u0445\u0430\u0431\u0430\u0440\u043B\u0430\u0440\u043D\u0438 \u049B\u0430\u0431\u0443\u043B \u049B\u0438\u043B\u0430\u0434\u0438 \u0432\u0430 \u04B3\u0435\u0447 \u049B\u0430\u0447\u043E\u043D \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u043A \u0445\u0430\u0431\u0430\u0440 \u044E\u0431\u043E\u0440\u043C\u0430\u0439\u0434\u0438.", type: "info", showIcon: true, icon: _jsx(InfoCircleOutlined, {}) }), connectError && (_jsx(Alert, { message: "\u0411\u043E\u0442\u043D\u0438 \u0443\u043B\u0430\u0448\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A", description: connectError.message || 'Telegram бот токени нотўғри ёки ботга уланишда хатолик юз берди.', type: "error", showIcon: true, icon: _jsx(ExclamationCircleOutlined, {}) })), _jsxs(Form, { form: connectForm, layout: "vertical", onFinish: handleConnectSubmit, requiredMark: false, children: [_jsx(Form.Item, { name: "token", label: _jsx(Text, { strong: true, children: "Telegram \u0431\u043E\u0442 \u0442\u043E\u043A\u0435\u043D\u0438" }), rules: [
                                                        { required: true, message: 'Илтимос, Telegram бот токенини киритинг.' },
                                                        {
                                                            pattern: BOT_TOKEN_REGEX,
                                                            transform: (value) => value?.trim(),
                                                            message: 'Илтимос, тўғри Telegram бот токенини киритинг (масалан: 123456789:ABCdefGHIjkl...).',
                                                        },
                                                    ], extra: "\u0422\u043E\u043A\u0435\u043D \u0444\u0430\u049B\u0430\u0442 \u0441\u0435\u0440\u0432\u0435\u0440\u0434\u0430 \u0448\u0438\u0444\u0440\u043B\u0430\u043D\u0433\u0430\u043D \u04B3\u043E\u043B\u0434\u0430 (AES-256-GCM) \u0441\u0430\u049B\u043B\u0430\u043D\u0430\u0434\u0438 \u0432\u0430 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0433\u0430 \u043E\u0447\u0438\u049B \u04B3\u043E\u043B\u0434\u0430 \u049B\u0430\u0439\u0442\u0430\u0440\u0438\u043B\u043C\u0430\u0439\u0434\u0438.", children: _jsx(Input.Password, { placeholder: "123456789:AAF...", size: "large", prefix: _jsx(LockOutlined, { style: { color: themeColors.colorIconPlaceholder } }), disabled: isOffline || isConnecting, style: { minHeight: '44px' }, autoComplete: "off" }) }), _jsx(Form.Item, { style: { marginBottom: 0 }, children: _jsx(Button, { type: "primary", htmlType: "submit", icon: _jsx(SafetyCertificateOutlined, {}), size: "large", loading: isConnecting, disabled: isOffline, style: { minHeight: '44px', width: '100%' }, children: "\u0411\u043E\u0442\u043D\u0438 \u0442\u0435\u043A\u0448\u0438\u0440\u0438\u0448 \u0432\u0430 \u0443\u043B\u0430\u0448" }) })] })] }) }), _jsx(Alert, { message: "\u041C\u0430\u04B3\u0430\u043B\u043B\u0430 \u0433\u0443\u0440\u0443\u04B3\u043B\u0430\u0440\u0438\u043D\u0438 \u0431\u0438\u0440\u0438\u043A\u0442\u0438\u0440\u0438\u0448", description: "\u041C\u0430\u04B3\u0430\u043B\u043B\u0430\u043B\u0430\u0440 \u0443\u0447\u0443\u043D Telegram \u0433\u0443\u0440\u0443\u04B3\u043B\u0430\u0440\u0438\u043D\u0438 \u049B\u045E\u0448\u0438\u0448 \u0432\u0430 \u0441\u0438\u043D\u043E\u0432\u0434\u0430\u043D \u045E\u0442\u043A\u0430\u0437\u0438\u0448 \u0443\u0447\u0443\u043D \u0430\u0432\u0432\u0430\u043B \u044E\u049B\u043E\u0440\u0438\u0434\u0430\u0433\u0438 \u0440\u0430\u0441\u043C\u0438\u0439 \u0431\u043E\u0442\u043D\u0438 \u0444\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u043D\u0433.", type: "info", showIcon: true, icon: _jsx(InfoCircleOutlined, {}) })] }))] }), _jsx(ReplaceBotModal, { isOpen: isReplaceModalOpen, isConnecting: isConnecting, connectError: connectError, onSubmit: handleReplaceSubmit, onClose: () => { setIsReplaceModalOpen(false); resetConnectError(); } }), _jsx(DisconnectBotModal, { isOpen: isDisconnectModalOpen, isDisconnecting: isDisconnecting, disconnectError: disconnectError, districtName: activeDistrict.name, onConfirm: handleDisconnectConfirm, onClose: () => { setIsDisconnectModalOpen(false); resetDisconnectError(); } })] }));
}
