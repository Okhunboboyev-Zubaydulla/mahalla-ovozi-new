import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from 'react';
import { Drawer, Form, Input, Button, Space, Alert, Typography, Statistic, Progress, Steps, Grid, } from 'antd';
import { PlusOutlined, CheckCircleOutlined, ExclamationCircleOutlined, ClockCircleOutlined, SyncOutlined, InfoCircleOutlined, SendOutlined, ArrowLeftOutlined, } from '@ant-design/icons';
import { telegramGroupClient } from '../district/telegram-group-client.js';
import { themeColors } from '../theme/antd-theme.js';
const { Text, Paragraph } = Typography;
const { Countdown } = Statistic;
const { useBreakpoint } = Grid;
export function TelegramGroupDrawer({ open, onClose, districtId, onGroupSaved, initialGroup, initialStep, }) {
    const screens = useBreakpoint();
    const [form] = Form.useForm();
    const [currentStep, setCurrentStep] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState(null);
    // Active testing state
    const [activeGroup, setActiveGroup] = useState(null);
    const [countdownDeadline, setCountdownDeadline] = useState(0);
    const [testStatus, setTestStatus] = useState('PENDING');
    const [testError, setTestError] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);
    const pollIntervalRef = useRef(null);
    const stopPolling = useCallback(() => {
        if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
        }
    }, []);
    const startLiveTest = useCallback(async (group) => {
        stopPolling();
        setTestStatus('PENDING');
        setTestError(null);
        setCountdownDeadline(Date.now() + 60 * 1000);
        try {
            await telegramGroupClient.startTest(districtId, group.id);
        }
        catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'СинОВ сессиясини очиб бўлмади.';
            setTestError(errorMsg);
        }
        // Poll every 2 seconds for test result
        pollIntervalRef.current = setInterval(async () => {
            try {
                const res = await telegramGroupClient.getTestStatus(districtId, group.id);
                if (res.status === 'SUCCESS') {
                    setTestStatus('SUCCESS');
                    stopPolling();
                    onGroupSaved?.();
                }
                else if (res.status === 'TIMEOUT') {
                    setTestStatus('TIMEOUT');
                    setTestError(res.lastError || 'СинОВ вақти тугади. Ҳақиқий одам томонидан хабар юборилмади.');
                    stopPolling();
                    onGroupSaved?.();
                }
                else if (res.status === 'FAILED') {
                    setTestStatus('FAILED');
                    setTestError(res.lastError || 'СинОВ хатолик билан якунланди.');
                    stopPolling();
                    onGroupSaved?.();
                }
                // PENDING: keep polling
            }
            catch (err) {
                // Transient network error — keep polling. Unrecoverable errors
                // (e.g. session expired) will surface when the session check fails
                // elsewhere; suppressing here avoids a single blip killing the test.
                console.warn('[TelegramGroupDrawer] poll error (keeping alive):', err);
            }
        }, 2000);
    }, [districtId, onGroupSaved, stopPolling]);
    // Initialize or reset drawer state when opened/closed
    useEffect(() => {
        if (open) {
            form.resetFields();
            setSubmitError(null);
            setTestError(null);
            if (initialGroup) {
                setActiveGroup(initialGroup);
                form.setFieldsValue({
                    mahallaName: initialGroup.mahallaName,
                    telegramChatId: initialGroup.telegramChatId,
                });
                if (initialStep === 0) {
                    setCurrentStep(0);
                }
                else if (['PENDING', 'TESTING', 'FAILED'].includes(initialGroup.status)) {
                    setCurrentStep(1);
                    startLiveTest(initialGroup);
                }
                else {
                    setCurrentStep(0);
                }
            }
            else {
                setActiveGroup(null);
                setCurrentStep(0);
            }
        }
        else {
            stopPolling();
        }
        return () => stopPolling();
    }, [open, initialGroup, initialStep, startLiveTest, stopPolling]);
    const handleFormSubmit = async (values) => {
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            if (initialGroup) {
                const res = await telegramGroupClient.updateGroup(districtId, initialGroup.id, {
                    mahallaName: values.mahallaName.trim(),
                    telegramChatId: values.telegramChatId.trim(),
                });
                setActiveGroup(res.group);
                setCurrentStep(1);
                onGroupSaved?.();
                await startLiveTest(res.group);
            }
            else {
                const res = await telegramGroupClient.createGroup(districtId, {
                    mahallaName: values.mahallaName.trim(),
                    telegramChatId: values.telegramChatId.trim(),
                });
                setActiveGroup(res.group);
                setCurrentStep(1);
                onGroupSaved?.();
                await startLiveTest(res.group);
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Гуруҳни бириктиришда хатолик юз берди.';
            setSubmitError(msg);
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleTimeout = async () => {
        if (testStatus === 'PENDING') {
            setTestStatus('TIMEOUT');
            setTestError('60 сониялик синов вақти тугади. Бот гуруҳдан инсон хабарини қабул қила олмади.');
            stopPolling();
            if (activeGroup) {
                try {
                    const res = await telegramGroupClient.getTestStatus(districtId, activeGroup.id);
                    if (res.lastError)
                        setTestError(res.lastError);
                }
                catch (err) {
                    // Best-effort: enrich the local timeout message with server detail.
                    // If this fetch also fails, the already-set local error message stands.
                    console.warn('[TelegramGroupDrawer] failed to fetch final test status on timeout:', err);
                }
                onGroupSaved?.();
            }
        }
    };
    const handleSimulateMessage = async () => {
        if (!activeGroup)
            return;
        setIsSimulating(true);
        try {
            const res = await telegramGroupClient.simulateTestMessage(districtId, activeGroup.id, {
                message: {
                    message_id: Math.floor(Math.random() * 100000),
                    date: Math.floor(Date.now() / 1000),
                    chat: { id: activeGroup.telegramChatId, type: 'supergroup', title: activeGroup.telegramChatTitle },
                    from: { id: 12345678, is_bot: false, first_name: 'Синовчи Одам' },
                    text: 'Маҳалла каналидан тест хабари.',
                },
            });
            if (res.accepted) {
                setTestStatus('SUCCESS');
                stopPolling();
                onGroupSaved?.();
            }
            else {
                setTestError(`Симуляция хабари қабул қилинмади: ${res.reason}`);
            }
        }
        catch (err) {
            setTestError(err instanceof Error ? err.message : 'Симуляция хабарини юборишда хатолик.');
        }
        finally {
            setIsSimulating(false);
        }
    };
    return (_jsx(Drawer, { title: _jsxs(Space, { children: [_jsx(PlusOutlined, { style: { color: themeColors.colorPrimary } }), _jsx("span", { children: "\u041C\u0430\u04B3\u0430\u043B\u043B\u0430 Telegram \u0433\u0443\u0440\u0443\u04B3\u0438\u043D\u0438 \u0431\u0438\u0440\u0438\u043A\u0442\u0438\u0440\u0438\u0448" })] }), placement: "right", width: screens.xs ? '100%' : 540, onClose: () => {
            stopPolling();
            onClose();
        }, open: open, destroyOnHidden: true, children: _jsxs(Space, { direction: "vertical", size: "large", style: { width: '100%' }, children: [_jsx(Steps, { current: currentStep, size: "small", items: [
                        { title: 'Гуруҳ маълумотлари' },
                        { title: 'Хабар синови' },
                    ] }), currentStep === 0 ? (
                /* Step 0: Group Form */
                _jsxs(Form, { form: form, layout: "vertical", onFinish: handleFormSubmit, requiredMark: false, children: [_jsx(Alert, { message: "\u0413\u0443\u0440\u0443\u04B3 Chat ID \u0442\u043E\u043F\u0438\u0448 \u0431\u045E\u0439\u0438\u0447\u0430 \u043A\u045E\u0440\u0441\u0430\u0442\u043C\u0430", description: "Telegram \u0433\u0443\u0440\u0443\u04B3\u0438\u043D\u0433\u0438\u0437\u0434\u0430\u0433\u0438 \u0438\u0441\u0442\u0430\u043B\u0433\u0430\u043D \u0445\u0430\u0431\u0430\u0440\u043D\u0438 @userinfobot \u0451\u043A\u0438 @raw_data_bot \u0433\u0430 \u0444\u043E\u0440\u0432\u0430\u0440\u0434 \u049B\u0438\u043B\u0438\u043D\u0433. \u0413\u0443\u0440\u0443\u04B3 Chat ID \u0440\u0430\u049B\u0430\u043C\u0438 \u043E\u0434\u0430\u0442\u0434\u0430 -100 \u0431\u0438\u043B\u0430\u043D \u0431\u043E\u0448\u043B\u0430\u043D\u0430\u0434\u0438 (\u043C\u0430\u0441\u0430\u043B\u0430\u043D: -1001234567890).", type: "info", showIcon: true, icon: _jsx(InfoCircleOutlined, {}), style: { marginBottom: '16px' } }), submitError && (_jsx(Alert, { message: "\u0411\u0438\u0440\u0438\u043A\u0442\u0438\u0440\u0438\u0448\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A", description: submitError, type: "error", showIcon: true, icon: _jsx(ExclamationCircleOutlined, {}), style: { marginBottom: '16px' } })), _jsx(Form.Item, { name: "mahallaName", label: _jsx(Text, { strong: true, children: "\u041C\u0430\u04B3\u0430\u043B\u043B\u0430 \u043D\u043E\u043C\u0438" }), rules: [
                                { required: true, message: 'Илтимос, маҳалла номини киритинг.' },
                                { max: 100, message: 'Маҳалла номи 100 та белгидан ошмаслиги керак.' },
                            ], children: _jsx(Input, { placeholder: "\u041C\u0430\u0441\u0430\u043B\u0430\u043D: \u041D\u0430\u0432\u0431\u0430\u04B3\u043E\u0440", size: "large", style: { minHeight: '44px' }, disabled: isSubmitting }) }), _jsx(Form.Item, { name: "telegramChatId", label: _jsx(Text, { strong: true, children: "Telegram \u0433\u0443\u0440\u0443\u04B3 Chat ID" }), rules: [
                                { required: true, message: 'Илтимос, Telegram Chat ID рақамини киритинг.' },
                                { max: 50, message: 'Chat ID 50 та белгидан ошмаслиги керак.' },
                            ], extra: "\u0411\u043E\u0442 \u0443\u0448\u0431\u0443 \u0433\u0443\u0440\u0443\u04B3\u0433\u0430 \u043E\u043B\u0434\u0438\u043D\u0434\u0430\u043D \u043E\u0434\u0434\u0438\u0439 \u0430\u044A\u0437\u043E \u0441\u0438\u0444\u0430\u0442\u0438\u0434\u0430 \u049B\u045E\u0448\u0438\u043B\u0433\u0430\u043D \u0431\u045E\u043B\u0438\u0448\u0438 \u0448\u0430\u0440\u0442.", children: _jsx(Input, { placeholder: "\u041C\u0430\u0441\u0430\u043B\u0430\u043D: -1001234567890", size: "large", style: { minHeight: '44px' }, disabled: isSubmitting }) }), _jsx(Form.Item, { style: { marginTop: '24px' }, children: _jsx(Button, { type: "primary", htmlType: "submit", loading: isSubmitting, size: "large", style: { minHeight: '44px', width: '100%' }, children: "\u0422\u0435\u043A\u0448\u0438\u0440\u0438\u0448 \u0432\u0430 \u043A\u0435\u0439\u0438\u043D\u0433\u0438 \u0431\u043E\u0441\u049B\u0438\u0447\u0433\u0430 \u045E\u0442\u0438\u0448" }) })] })) : (
                /* Step 1: Live Test-Message Flow */
                _jsxs(Space, { direction: "vertical", size: "middle", style: { width: '100%' }, children: [_jsx(Alert, { message: "\u0425\u0430\u0431\u0430\u0440 \u0441\u0438\u043D\u043E\u0432\u0438 \u0440\u0435\u0436\u0438\u043C\u0438 (60 \u0441\u043E\u043D\u0438\u044F)", description: _jsxs("span", { children: ["\u0418\u043B\u0442\u0438\u043C\u043E\u0441, ", _jsx(Text, { strong: true, children: activeGroup?.telegramChatTitle || activeGroup?.mahallaName }), " \u0433\u0443\u0440\u0443\u04B3\u0438\u0433\u0430 \u0431\u0438\u0440\u043E\u043D\u0442\u0430 \u043E\u0434\u0430\u0442\u0438\u0439 \u0438\u043D\u0441\u043E\u043D \u043C\u0430\u0442\u043D \u0445\u0430\u0431\u0430\u0440\u0438 \u044E\u0431\u043E\u0440\u0438\u043D\u0433. \u0411\u043E\u0442 \u0443\u0448\u0431\u0443 \u0445\u0430\u0431\u0430\u0440\u043D\u0438 \u049B\u0430\u0431\u0443\u043B \u049B\u0438\u043B\u0433\u0430\u043D\u0434\u0430 \u0441\u0438\u043D\u043E\u0432 \u0430\u0432\u0442\u043E\u043C\u0430\u0442 \u043C\u0443\u0432\u0430\u0444\u0444\u0430\u049B\u0438\u044F\u0442\u043B\u0438 \u044F\u043A\u0443\u043D\u043B\u0430\u043D\u0430\u0434\u0438."] }), type: "info", showIcon: true, icon: _jsx(InfoCircleOutlined, {}) }), testStatus === 'PENDING' && countdownDeadline > 0 && (_jsxs("div", { style: {
                                textAlign: 'center',
                                padding: '24px',
                                background: themeColors.colorBgSubtle,
                                borderRadius: '8px',
                            }, children: [_jsx(Countdown, { title: "\u0422\u0435\u0441\u0442 \u0445\u0430\u0431\u0430\u0440\u0438\u043D\u0438 \u043A\u0443\u0442\u0438\u0448 \u0432\u0430\u049B\u0442\u0438", value: countdownDeadline, format: "ss", suffix: "\u0441\u043E\u043D\u0438\u044F", prefix: _jsx(ClockCircleOutlined, {}), onFinish: handleTimeout, valueStyle: { color: themeColors.colorPrimary, fontSize: '28px', fontWeight: 600 } }), _jsx(Progress, { percent: 70, status: "active", showInfo: false, style: { marginTop: '16px' } }), _jsxs(Paragraph, { type: "secondary", style: { marginTop: '8px' }, children: [_jsx(SyncOutlined, { spin: true, style: { marginRight: '6px' } }), "\u0413\u0443\u0440\u0443\u04B3\u0434\u0430\u043D \u044F\u043D\u0433\u0438 \u0445\u0430\u0431\u0430\u0440 \u043A\u0443\u0442\u0438\u043B\u043C\u043E\u049B\u0434\u0430..."] })] })), testStatus === 'SUCCESS' && (_jsx(Alert, { message: "\u0421\u0438\u043D\u043E\u0432 \u043C\u0443\u0432\u0430\u0444\u0444\u0430\u049B\u0438\u044F\u0442\u043B\u0438 \u044F\u043A\u0443\u043D\u043B\u0430\u043D\u0434\u0438!", description: "Telegram \u0431\u043E\u0442 \u0443\u0448\u0431\u0443 \u0433\u0443\u0440\u0443\u04B3\u0434\u0430\u0433\u0438 \u0445\u0430\u0431\u0430\u0440\u043B\u0430\u0440\u043D\u0438 \u043C\u0443\u0432\u0430\u0444\u0444\u0430\u049B\u0438\u044F\u0442\u043B\u0438 \u049B\u0430\u0431\u0443\u043B \u049B\u0438\u043B\u0430 \u043E\u043B\u0438\u0448\u0438 \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u043D\u0434\u0438. \u041C\u0430\u04B3\u0430\u043B\u043B\u0430 \u0433\u0443\u0440\u0443\u04B3\u0438 \u0444\u0430\u043E\u043B\u043B\u0430\u0448\u0442\u0438\u0440\u0438\u043B\u0434\u0438.", type: "success", showIcon: true, icon: _jsx(CheckCircleOutlined, {}) })), (testStatus === 'TIMEOUT' || testStatus === 'FAILED' || testError) && testStatus !== 'SUCCESS' && (_jsxs(Space, { direction: "vertical", size: "small", style: { width: '100%' }, children: [_jsx(Alert, { message: "\u0421\u0438\u043D\u043E\u0432 \u0432\u0430\u049B\u0442\u0438\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A", description: testError || 'СинОВ вақти тугади. Ҳақиқий одам томонидан хабар юборилмади.', type: "error", showIcon: true, icon: _jsx(ExclamationCircleOutlined, {}) }), _jsx(Alert, { message: "\u041C\u0443\u0430\u043C\u043C\u043E\u043D\u0438 \u0431\u0430\u0440\u0442\u0430\u0440\u0430\u0444 \u044D\u0442\u0438\u0448 \u0431\u045E\u0439\u0438\u0447\u0430 \u043A\u045E\u0440\u0441\u0430\u0442\u043C\u0430", description: _jsxs("ul", { style: { paddingLeft: '20px', margin: 0 }, children: [_jsx("li", { children: "\u0411\u043E\u0442 \u0433\u0443\u0440\u0443\u04B3\u0433\u0430 \u049B\u045E\u0448\u0438\u043B\u0433\u0430\u043D\u0438\u043D\u0438 \u0432\u0430 \u0447\u0438\u049B\u0430\u0440\u0438\u0431 \u044E\u0431\u043E\u0440\u0438\u043B\u043C\u0430\u0433\u0430\u043D\u0438\u043D\u0438 \u0442\u0435\u043A\u0448\u0438\u0440\u0438\u043D\u0433." }), _jsxs("li", { children: ["@BotFather \u0434\u0430 \u0431\u043E\u0442\u043D\u0438\u043D\u0433 \u043C\u0430\u0445\u0444\u0438\u0439\u043B\u0438\u043A \u0440\u0435\u0436\u0438\u043C\u0438\u043D\u0438 \u045E\u0447\u0438\u0440\u0438\u043D\u0433 (", _jsx(Text, { code: true, children: "/setprivacy \u2192 Disable" }), ")."] }), _jsx("li", { children: "\u0413\u0443\u0440\u0443\u04B3\u0433\u0430 \u043E\u0434\u0434\u0438\u0439 \u043C\u0430\u0442\u043D \u0445\u0430\u0431\u0430\u0440\u0438 (\u0431\u043E\u0442 \u0431\u0443\u0439\u0440\u0443\u0493\u0438 \u0431\u045E\u043B\u043C\u0430\u0433\u0430\u043D) \u044E\u0431\u043E\u0440\u0438\u043B\u0433\u0430\u043D\u0438\u0433\u0430 \u0438\u0448\u043E\u043D\u0447 \u04B3\u043E\u0441\u0438\u043B \u049B\u0438\u043B\u0438\u043D\u0433." })] }), type: "warning", showIcon: true })] })), testStatus === 'PENDING' && (_jsx(Button, { type: "dashed", icon: _jsx(SendOutlined, {}), onClick: handleSimulateMessage, loading: isSimulating, style: { width: '100%', minHeight: '40px' }, children: "\u0421\u0438\u043D\u043E\u0432 \u0445\u0430\u0431\u0430\u0440\u0438\u043D\u0438 \u0441\u0438\u043C\u0443\u043B\u044F\u0446\u0438\u044F \u049B\u0438\u043B\u0438\u0448 (\u0422\u0435\u0441\u0442 \u0440\u0435\u0436\u0438\u043C\u0438)" })), _jsxs(Space, { style: { width: '100%', justifyContent: 'space-between', marginTop: '16px' }, children: [_jsx("div", { children: testStatus !== 'SUCCESS' && (_jsx(Button, { type: "default", icon: _jsx(ArrowLeftOutlined, {}), onClick: () => {
                                            stopPolling();
                                            setCurrentStep(0);
                                        }, style: { minHeight: '44px' }, children: "\u041E\u0440\u049B\u0430\u0433\u0430" })) }), _jsxs(Space, { children: [(testStatus === 'TIMEOUT' || testStatus === 'FAILED') && activeGroup && (_jsx(Button, { type: "default", onClick: () => startLiveTest(activeGroup), style: { minHeight: '44px' }, children: "\u049A\u0430\u0439\u0442\u0430 \u0441\u0438\u043D\u0430\u0431 \u043A\u045E\u0440\u0438\u0448" })), _jsx(Button, { type: "primary", onClick: () => {
                                                stopPolling();
                                                onClose();
                                            }, style: { minHeight: '44px' }, children: testStatus === 'SUCCESS' ? 'Якунлаш' : 'Ёпиш' })] })] })] }))] }) }));
}
