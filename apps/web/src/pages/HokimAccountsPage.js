import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Card, Typography, Alert, Spin, Empty, } from 'antd';
import { WarningOutlined, InfoCircleOutlined, } from '@ant-design/icons';
import { useDistrict } from '../district/district-context.js';
import { useHokimAccount } from '../district/useHokimAccount.js';
import { districtClient } from '../district/district-client.js';
import { useQuery } from '@tanstack/react-query';
import { OneTimeCredentialModal } from '../components/OneTimeCredentialModal.js';
import { CreateHokimModal } from '../components/CreateHokimModal.js';
import { ResetHokimModal } from '../components/ResetHokimModal.js';
import { ReplaceHokimModal } from '../components/ReplaceHokimModal.js';
import { DisableHokimModal } from '../components/DisableHokimModal.js';
import { HokimNoAccountCard } from '../components/HokimNoAccountCard.js';
import { HokimActiveAccountCard } from '../components/HokimActiveAccountCard.js';
import { HokimDisabledAccountCard } from '../components/HokimDisabledAccountCard.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
const { Title, Text, Paragraph } = Typography;
export function HokimAccountsPage({ districtId } = {}) {
    const { activeDistrictId: contextDistrictId } = useDistrict();
    const effectiveDistrictId = districtId ?? contextDistrictId;
    const { data: districtResponse } = useQuery({
        queryKey: ['district', effectiveDistrictId],
        queryFn: () => (effectiveDistrictId ? districtClient.getDistrict(effectiveDistrictId) : null),
        enabled: !!effectiveDistrictId,
    });
    const activeDistrict = districtResponse?.district ?? null;
    const { hokimState, account, isLoading, error, createHokimAccount, isCreating, createError, resetCreateError, resetPassword, isResetting, resetPasswordError, resetPasswordResetError, disableHokimAccount, isDisabling, disableError, resetDisableError, replaceHokimAccount, isReplacing, replaceError, resetReplaceError, } = useHokimAccount(effectiveDistrictId);
    const isOffline = useOnlineStatus();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isResetModalOpen, setIsResetModalOpen] = useState(false);
    const [isReplaceModalOpen, setIsReplaceModalOpen] = useState(false);
    const [isDisableModalOpen, setIsDisableModalOpen] = useState(false);
    // Ephemeral one-time credential state (zero persistent storage)
    const [oneTimeCredential, setOneTimeCredential] = useState(null);
    const handleOpenCreate = () => { resetCreateError(); setIsCreateModalOpen(true); };
    const handleOpenReset = () => { resetPasswordResetError(); setIsResetModalOpen(true); };
    const handleOpenReplace = () => { resetReplaceError(); setIsReplaceModalOpen(true); };
    const handleOpenDisable = () => { resetDisableError(); setIsDisableModalOpen(true); };
    const handleCreateSubmit = async (values) => {
        const res = await createHokimAccount(values);
        setIsCreateModalOpen(false);
        setOneTimeCredential({ username: res.account.username, temporaryPassword: res.temporaryPassword, title: 'Ҳоким аккаунти муваффақиятли яратилди' });
    };
    const handleResetConfirm = async () => {
        const res = await resetPassword();
        setIsResetModalOpen(false);
        setOneTimeCredential({ username: res.account.username, temporaryPassword: res.temporaryPassword, title: 'Парол муваффақиятли янгиланди' });
    };
    const handleReplaceSubmit = async (values) => {
        const res = await replaceHokimAccount(values);
        setIsReplaceModalOpen(false);
        setOneTimeCredential({ username: res.account.username, temporaryPassword: res.temporaryPassword, title: 'Ҳоким аккаунти муваффақиятли алмаштирилди' });
    };
    const handleDisableConfirm = async () => {
        await disableHokimAccount();
        setIsDisableModalOpen(false);
    };
    if (!effectiveDistrictId) {
        return (_jsx(Card, { variant: "borderless", style: { borderRadius: 12, padding: '24px 16px' }, children: _jsx(Empty, { image: Empty.PRESENTED_IMAGE_SIMPLE, description: _jsx(Text, { type: "secondary", style: { fontSize: 16 }, children: "\u04B2\u043E\u043A\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438\u043D\u0438 \u0431\u043E\u0448\u049B\u0430\u0440\u0438\u0448 \u0443\u0447\u0443\u043D \u0430\u0432\u0432\u0430\u043B \u044E\u049B\u043E\u0440\u0438\u0434\u0430\u0433\u0438 \u043C\u0435\u043D\u044E\u0434\u0430\u043D \u0442\u0443\u043C\u0430\u043D\u043D\u0438 \u0442\u0430\u043D\u043B\u0430\u043D\u0433." }) }) }));
    }
    if (isLoading) {
        return (_jsxs(Card, { variant: "borderless", style: { borderRadius: 12, textAlign: 'center', padding: 48 }, children: [_jsx(Spin, { size: "large" }), _jsx(Paragraph, { type: "secondary", style: { marginTop: 16 }, children: "\u04B2\u043E\u043A\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438 \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440\u0438 \u044E\u043A\u043B\u0430\u043D\u043C\u043E\u049B\u0434\u0430..." })] }));
    }
    return (_jsxs("div", { style: { maxWidth: 1000, margin: '0 auto' }, children: [_jsxs("div", { style: { marginBottom: 24 }, children: [_jsx(Title, { level: 3, style: { marginBottom: 4 }, children: "\u04B2\u043E\u043A\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438\u043D\u0438 \u0431\u043E\u0448\u049B\u0430\u0440\u0438\u0448" }), _jsx(Text, { type: "secondary", style: { fontSize: 14 }, children: activeDistrict?.name
                            ? `Танланган туман: ${activeDistrict.name}`
                            : 'Туман ҳокими учун хавфсиз кириш ҳисобини яратиш ва бошқариш' })] }), isOffline && (_jsx(Alert, { message: "\u0418\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441 \u0430\u0432\u0442\u043E\u043D\u043E\u043C (\u043E\u0444\u043B\u0430\u0439\u043D) \u0440\u0435\u0436\u0438\u043C\u0434\u0430", description: "\u0418\u043D\u0442\u0435\u0440\u043D\u0435\u0442 \u0443\u043B\u0430\u043D\u0438\u0448\u0438 \u0439\u045E\u049B. \u0410\u043A\u043A\u0430\u0443\u043D\u0442 \u044F\u0440\u0430\u0442\u0438\u0448, \u043F\u0430\u0440\u043E\u043B\u043D\u0438 \u044F\u043D\u0433\u0438\u043B\u0430\u0448 \u0451\u043A\u0438 \u0430\u043B\u043C\u0430\u0448\u0442\u0438\u0440\u0438\u0448 \u0430\u043C\u0430\u043B\u043B\u0430\u0440\u0438 \u0438\u043D\u0442\u0435\u0440\u043D\u0435\u0442 \u043F\u0430\u0439\u0434\u043E \u0431\u045E\u043B\u0433\u0443\u043D\u0447\u0430 \u0447\u0435\u043A\u043B\u0430\u043D\u0430\u0434\u0438.", type: "warning", showIcon: true, icon: _jsx(WarningOutlined, {}), style: { marginBottom: 20 } })), error && (_jsx(Alert, { message: "\u041C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440\u043D\u0438 \u044E\u043A\u043B\u0430\u0448\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A \u044E\u0437 \u0431\u0435\u0440\u0434\u0438", description: error.message, type: "error", showIcon: true, style: { marginBottom: 20 } })), hokimState === 'NO_ACCOUNT' && (_jsx(HokimNoAccountCard, { isOffline: isOffline, onCreateClick: handleOpenCreate })), hokimState === 'ACTIVE' && account && (_jsx(HokimActiveAccountCard, { account: account, isOffline: isOffline, onResetClick: handleOpenReset, onReplaceClick: handleOpenReplace, onDisableClick: handleOpenDisable })), hokimState === 'DISABLED' && account && (_jsx(HokimDisabledAccountCard, { account: account, isOffline: isOffline, onReplaceClick: handleOpenReplace, onCreateClick: handleOpenCreate })), _jsx("div", { style: { marginTop: 24 }, children: _jsx(Alert, { message: "\u0425\u0430\u0432\u0444\u0441\u0438\u0437\u043B\u0438\u043A \u0431\u045E\u0439\u0438\u0447\u0430 \u043C\u0443\u04B3\u0438\u043C \u044D\u0441\u043B\u0430\u0442\u043C\u0430", description: "\u04B2\u0430\u0440 \u0431\u0438\u0440 \u0442\u0443\u043C\u0430\u043D \u0443\u0447\u0443\u043D \u0444\u0430\u049B\u0430\u0442 \u0431\u0438\u0442\u0442\u0430 \u0444\u0430\u043E\u043B \u04B3\u043E\u043A\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438 \u0431\u0438\u0440\u0438\u043A\u0442\u0438\u0440\u0438\u043B\u0438\u0448\u0438 \u043C\u0443\u043C\u043A\u0438\u043D. \u04B2\u043E\u043A\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438 \u0442\u0438\u0437\u0438\u043C\u0434\u0430 \u0442\u0443\u043C\u0430\u043D \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440\u0438 \u0431\u0438\u043B\u0430\u043D \u0438\u0448\u043B\u0430\u0448 \u0443\u0447\u0443\u043D \u049B\u0430\u0442\u044A\u0438\u0439 \u0447\u0435\u0433\u0430\u0440\u0430\u043B\u0430\u043D\u0433\u0430\u043D \u04B3\u0443\u049B\u0443\u049B\u043B\u0430\u0440\u0433\u0430 \u044D\u0433\u0430 \u0431\u045E\u043B\u0430\u0434\u0438. \u041F\u0430\u0440\u043E\u043B \u043E\u0447\u0438\u049B \u04B3\u043E\u043B\u0434\u0430 \u0442\u0438\u0437\u0438\u043C\u0434\u0430 \u0441\u0430\u049B\u043B\u0430\u043D\u043C\u0430\u0439\u0434\u0438 \u0432\u0430 \u0444\u0430\u049B\u0430\u0442 \u044F\u0440\u0430\u0442\u0438\u0448/\u044F\u043D\u0433\u0438\u043B\u0430\u0448 \u0432\u0430\u049B\u0442\u0438\u0434\u0430 \u0431\u0438\u0440 \u043C\u0430\u0440\u0442\u0430 \u043A\u045E\u0440\u0441\u0430\u0442\u0438\u043B\u0430\u0434\u0438.", type: "info", showIcon: true, icon: _jsx(InfoCircleOutlined, {}) }) }), _jsx(CreateHokimModal, { isOpen: isCreateModalOpen, onClose: () => setIsCreateModalOpen(false), onSubmit: handleCreateSubmit, isLoading: isCreating, error: createError }), _jsx(ResetHokimModal, { isOpen: isResetModalOpen, onClose: () => setIsResetModalOpen(false), onConfirm: handleResetConfirm, username: account?.username ?? '', isLoading: isResetting, error: resetPasswordError }), _jsx(ReplaceHokimModal, { isOpen: isReplaceModalOpen, onClose: () => setIsReplaceModalOpen(false), onSubmit: handleReplaceSubmit, currentUsername: account?.username ?? '', isLoading: isReplacing, error: replaceError }), _jsx(DisableHokimModal, { isOpen: isDisableModalOpen, onClose: () => setIsDisableModalOpen(false), onConfirm: handleDisableConfirm, username: account?.username ?? '', isLoading: isDisabling, error: disableError }), _jsx(OneTimeCredentialModal, { isOpen: Boolean(oneTimeCredential), onClose: () => setOneTimeCredential(null), username: oneTimeCredential?.username ?? '', temporaryPassword: oneTimeCredential?.temporaryPassword ?? null, title: oneTimeCredential?.title })] }));
}
export default HokimAccountsPage;
