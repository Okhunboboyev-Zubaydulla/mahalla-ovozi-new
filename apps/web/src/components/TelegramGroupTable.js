import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { Table, Card, Input, Button, Tag, Space, Typography, Modal, Empty, Grid, Divider, } from 'antd';
import { SearchOutlined, PlusOutlined, PlayCircleOutlined, DeleteOutlined, EditOutlined, CheckCircleOutlined, ClockCircleOutlined, SyncOutlined, CloseCircleOutlined, TeamOutlined, SafetyOutlined, } from '@ant-design/icons';
import { TelegramGroupDrawer } from './TelegramGroupDrawer.js';
import { useTelegramGroups } from '../district/useTelegramGroups.js';
import { themeColors } from '../theme/antd-theme.js';
const { Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;
export function TelegramGroupTable({ districtId, isOffline = false }) {
    const screens = useBreakpoint();
    const isDesktop = screens.md ?? true;
    const { groups, isLoading, error, deleteGroup, isDeleting, refetch } = useTelegramGroups(districtId);
    const [searchText, setSearchText] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerStep, setDrawerStep] = useState(0);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const filteredGroups = useMemo(() => {
        if (!searchText.trim())
            return groups;
        const lower = searchText.toLowerCase();
        return groups.filter((g) => g.mahallaName.toLowerCase().includes(lower) ||
            g.telegramChatTitle.toLowerCase().includes(lower) ||
            g.telegramChatId.includes(lower));
    }, [groups, searchText]);
    const handleOpenAddDrawer = () => {
        setSelectedGroup(null);
        setDrawerStep(0);
        setIsDrawerOpen(true);
    };
    const handleOpenEditDrawer = (group) => {
        setSelectedGroup(group);
        setDrawerStep(0);
        setIsDrawerOpen(true);
    };
    const handleOpenTestDrawer = (group) => {
        setSelectedGroup(group);
        setDrawerStep(1);
        setIsDrawerOpen(true);
    };
    const handleDeleteConfirm = async () => {
        if (!groupToDelete)
            return;
        try {
            await deleteGroup({ groupId: groupToDelete.id });
            setGroupToDelete(null);
        }
        catch {
            // Error handled by mutation
        }
    };
    const renderStatusTag = (status) => {
        switch (status) {
            case 'VALID':
                return (_jsx(Tag, { color: "success", icon: _jsx(CheckCircleOutlined, { "aria-hidden": "true" }), children: "\u0422\u0410\u0421\u0414\u0418\u049A\u041B\u0410\u041D\u0413\u0410\u041D" }));
            case 'TESTING':
                return (_jsx(Tag, { color: "processing", icon: _jsx(SyncOutlined, { spin: true, "aria-hidden": "true" }), children: "\u0421\u0418\u041D\u041E\u0412\u0414\u0410" }));
            case 'FAILED':
                return (_jsx(Tag, { color: "error", icon: _jsx(CloseCircleOutlined, { "aria-hidden": "true" }), children: "\u0425\u0410\u0422\u041E\u041B\u0418\u041A" }));
            case 'PENDING':
            default:
                return (_jsx(Tag, { color: "warning", icon: _jsx(ClockCircleOutlined, { "aria-hidden": "true" }), children: "\u041A\u0423\u0422\u0418\u041B\u041C\u041E\u049A\u0414\u0410" }));
        }
    };
    const desktopColumns = [
        {
            title: 'Маҳалла номи',
            dataIndex: 'mahallaName',
            key: 'mahallaName',
            render: (name) => _jsx(Text, { strong: true, children: name }),
        },
        {
            title: 'Telegram гуруҳ номи',
            dataIndex: 'telegramChatTitle',
            key: 'telegramChatTitle',
            render: (title, record) => (_jsxs(Space, { direction: "vertical", size: 2, children: [_jsx(Text, { children: title }), _jsxs(Text, { code: true, type: "secondary", children: ["ID: ", record.telegramChatId] })] })),
        },
        {
            title: 'Махфийлик режими',
            dataIndex: 'privacyModeDisabled',
            key: 'privacyModeDisabled',
            render: (disabled) => disabled ? (_jsx(Tag, { color: "green", icon: _jsx(SafetyOutlined, {}), children: "\u040E\u0447\u0438\u0440\u0438\u043B\u0433\u0430\u043D (\u0422\u045E\u043B\u0438\u049B \u049B\u0430\u0431\u0443\u043B)" })) : (_jsx(Tag, { color: "volcano", icon: _jsx(SafetyOutlined, {}), children: "\u0424\u0430\u043E\u043B (\u0427\u0435\u043A\u043B\u0430\u043D\u0433\u0430\u043D)" })),
        },
        {
            title: 'Ҳолати',
            dataIndex: 'status',
            key: 'status',
            render: (status) => renderStatusTag(status),
        },
        {
            title: 'Амаллар',
            key: 'actions',
            render: (_, record) => (_jsxs(Space, { size: "small", children: [_jsx(Button, { type: "default", size: "small", icon: _jsx(EditOutlined, {}), onClick: () => handleOpenEditDrawer(record), disabled: isOffline, style: { minHeight: '36px' }, children: "\u0422\u0430\u04B3\u0440\u0438\u0440\u043B\u0430\u0448" }), record.status !== 'VALID' && (_jsx(Button, { type: "primary", size: "small", icon: _jsx(PlayCircleOutlined, {}), onClick: () => handleOpenTestDrawer(record), disabled: isOffline, style: { minHeight: '36px' }, children: "\u0421\u0438\u043D\u043E\u0432\u0434\u0430\u043D \u045E\u0442\u043A\u0430\u0437\u0438\u0448" })), _jsx(Button, { danger: true, type: "text", size: "small", icon: _jsx(DeleteOutlined, {}), onClick: () => setGroupToDelete(record), disabled: isOffline, style: { minHeight: '36px' }, children: "\u040E\u0447\u0438\u0440\u0438\u0448" })] })),
        },
    ];
    return (_jsxs(Card, { title: _jsxs(Space, { children: [_jsx(TeamOutlined, { style: { fontSize: '20px', color: themeColors.colorPrimary } }), _jsx("span", { children: "\u041C\u0430\u04B3\u0430\u043B\u043B\u0430\u043B\u0430\u0440 \u0432\u0430 Telegram \u0433\u0443\u0440\u0443\u04B3\u043B\u0430\u0440\u0438 \u0445\u0430\u0440\u0438\u0442\u0430\u0441\u0438" })] }), extra: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: handleOpenAddDrawer, disabled: isOffline, style: { minHeight: '40px' }, children: "\u042F\u043D\u0433\u0438 \u0433\u0443\u0440\u0443\u04B3 \u049B\u045E\u0448\u0438\u0448" }), style: { marginTop: '24px' }, children: [_jsxs(Space, { direction: "vertical", size: "middle", style: { width: '100%' }, children: [_jsx(Input, { placeholder: "\u041C\u0430\u04B3\u0430\u043B\u043B\u0430 \u043D\u043E\u043C\u0438 \u0451\u043A\u0438 Chat ID \u0431\u045E\u0439\u0438\u0447\u0430 \u049B\u0438\u0434\u0438\u0440\u0438\u0448...", prefix: _jsx(SearchOutlined, { style: { color: themeColors.colorIconPlaceholder } }), value: searchText, onChange: (e) => setSearchText(e.target.value), allowClear: true, size: "large", style: { minHeight: '44px' } }), isLoading ? (_jsxs("div", { style: { textAlign: 'center', padding: '32px 0' }, children: [_jsx(SyncOutlined, { spin: true, style: { fontSize: '24px', color: themeColors.colorPrimary } }), _jsx(Paragraph, { style: { marginTop: '8px' }, children: "\u0413\u0443\u0440\u0443\u04B3\u043B\u0430\u0440 \u0440\u045E\u0439\u0445\u0430\u0442\u0438 \u044E\u043A\u043B\u0430\u043D\u043C\u043E\u049B\u0434\u0430..." })] })) : error ? (_jsx(Empty, { description: "\u0413\u0443\u0440\u0443\u04B3\u043B\u0430\u0440\u043D\u0438 \u044E\u043A\u043B\u0430\u0448\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A \u044E\u0437 \u0431\u0435\u0440\u0434\u0438." })) : filteredGroups.length === 0 ? (_jsx(Empty, { description: searchText ? ('Қидирув бўйича ҳеч қандай маҳалла топилмади.') : (_jsxs(Space, { direction: "vertical", align: "center", children: [_jsx(Text, { strong: true, children: "\u04B2\u0430\u043B\u0438 \u0431\u0438\u0440\u043E\u043D\u0442\u0430 \u043C\u0430\u04B3\u0430\u043B\u043B\u0430 \u0433\u0443\u0440\u0443\u04B3\u0438 \u0431\u0438\u0440\u0438\u043A\u0442\u0438\u0440\u0438\u043B\u043C\u0430\u0433\u0430\u043D" }), _jsx(Text, { type: "secondary", children: "\u0422\u0443\u043C\u0430\u043D \u043C\u0430\u04B3\u0430\u043B\u043B\u0430\u043B\u0430\u0440\u0438 \u0443\u0447\u0443\u043D Telegram \u0433\u0443\u0440\u0443\u04B3\u043B\u0430\u0440\u0438\u043D\u0438 \u049B\u045E\u0448\u0438\u043D\u0433 \u0432\u0430 \u0441\u0438\u043D\u043E\u0432\u0434\u0430\u043D \u045E\u0442\u043A\u0430\u0437\u0438\u043D\u0433." })] })) })) : isDesktop ? (
                    /* Desktop Table View */
                    _jsx(Table, { dataSource: filteredGroups, columns: desktopColumns, rowKey: "id", pagination: { pageSize: 10, showSizeChanger: false } })) : (
                    /* Mobile Card List View (<768px) with WCAG >=44px touch targets */
                    _jsx(Space, { direction: "vertical", size: "middle", style: { width: '100%' }, children: filteredGroups.map((group) => (_jsx(Card, { size: "small", style: { borderRadius: '8px' }, children: _jsxs(Space, { direction: "vertical", style: { width: '100%' }, size: "small", children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsx(Text, { strong: true, style: { fontSize: '16px' }, children: group.mahallaName }), renderStatusTag(group.status)] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", children: "\u0413\u0443\u0440\u0443\u04B3: " }), _jsx(Text, { children: group.telegramChatTitle })] }), _jsxs("div", { children: [_jsx(Text, { type: "secondary", children: "Chat ID: " }), _jsx(Text, { code: true, children: group.telegramChatId })] }), _jsx(Divider, { style: { margin: '8px 0' } }), _jsxs("div", { style: { display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: '8px' }, children: [_jsx(Button, { type: "default", size: "large", icon: _jsx(EditOutlined, {}), onClick: () => handleOpenEditDrawer(group), disabled: isOffline, style: { minHeight: '44px' }, children: "\u0422\u0430\u04B3\u0440\u0438\u0440\u043B\u0430\u0448" }), group.status !== 'VALID' && (_jsx(Button, { type: "primary", size: "large", icon: _jsx(PlayCircleOutlined, {}), onClick: () => handleOpenTestDrawer(group), disabled: isOffline, style: { minHeight: '44px' }, children: "\u0421\u0438\u043D\u043E\u0432" })), _jsx(Button, { danger: true, type: "default", size: "large", icon: _jsx(DeleteOutlined, {}), onClick: () => setGroupToDelete(group), disabled: isOffline, style: { minHeight: '44px' }, children: "\u040E\u0447\u0438\u0440\u0438\u0448" })] })] }) }, group.id))) }))] }), _jsx(TelegramGroupDrawer, { open: isDrawerOpen, onClose: () => {
                    setIsDrawerOpen(false);
                    setSelectedGroup(null);
                }, districtId: districtId, onGroupSaved: () => {
                    refetch();
                }, initialGroup: selectedGroup, initialStep: drawerStep }), _jsx(Modal, { title: "\u041C\u0430\u04B3\u0430\u043B\u043B\u0430 \u0433\u0443\u0440\u0443\u04B3\u0438\u043D\u0438 \u045E\u0447\u0438\u0440\u0438\u0448\u043D\u0438 \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u043D\u0433", open: !!groupToDelete, onCancel: () => setGroupToDelete(null), footer: [
                    _jsx(Button, { onClick: () => setGroupToDelete(null), size: "large", style: { minHeight: '44px' }, children: "\u0411\u0435\u043A\u043E\u0440 \u049B\u0438\u043B\u0438\u0448" }, "cancel"),
                    _jsx(Button, { danger: true, type: "primary", loading: isDeleting, onClick: handleDeleteConfirm, size: "large", style: { minHeight: '44px' }, children: "\u040E\u0447\u0438\u0440\u0438\u0448\u043D\u0438 \u0442\u0430\u0441\u0434\u0438\u049B\u043B\u0430\u0448" }, "delete"),
                ], children: _jsxs(Space, { direction: "vertical", style: { width: '100%', marginTop: '12px' }, children: [_jsxs(Paragraph, { children: ["\u04B2\u0430\u049B\u0438\u049B\u0430\u0442\u0430\u043D \u04B3\u0430\u043C ", _jsx(Text, { strong: true, children: groupToDelete?.mahallaName }), " \u043C\u0430\u04B3\u0430\u043B\u043B\u0430\u0441\u0438\u0433\u0430 \u0431\u0438\u0440\u0438\u043A\u0442\u0438\u0440\u0438\u043B\u0433\u0430\u043D Telegram \u0433\u0443\u0440\u0443\u04B3\u0438\u043D\u0438 \u045E\u0447\u0438\u0440\u043C\u043E\u049B\u0447\u0438\u043C\u0438\u0441\u0438\u0437?"] }), _jsx(Paragraph, { type: "secondary", children: "\u040E\u0447\u0438\u0440\u0438\u043B\u0433\u0430\u043D\u0434\u0430\u043D \u0441\u045E\u043D\u0433, \u0443\u0448\u0431\u0443 \u0433\u0443\u0440\u0443\u04B3\u0434\u0430\u043D \u044F\u043D\u0433\u0438 \u0445\u0430\u0431\u0430\u0440\u043B\u0430\u0440 \u049B\u0430\u0431\u0443\u043B \u049B\u0438\u043B\u0438\u043D\u043C\u0430\u0439\u0434\u0438. \u0410\u0432\u0432\u0430\u043B \u049B\u0430\u0431\u0443\u043B \u049B\u0438\u043B\u0438\u043D\u0433\u0430\u043D \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440 \u0441\u0430\u049B\u043B\u0430\u043D\u0438\u0431 \u049B\u043E\u043B\u0430\u0434\u0438." })] }) })] }));
}
