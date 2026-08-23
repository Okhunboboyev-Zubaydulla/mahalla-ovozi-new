import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { Card, Table, Typography, Tag, Button, Segmented, Empty, Space, theme, } from 'antd';
import { PlusOutlined, CheckCircleOutlined, SettingOutlined, EyeOutlined, } from '@ant-design/icons';
import { useDistrict } from '../district/district-context.js';
import { formatTashkentDate } from '../lib/formatters.js';
const { Title, Text } = Typography;
export const OverviewDistrictTable = ({ districts, loading = false, onOpenCreateDrawer, onSelectDistrictForFocus, }) => {
    const { token } = theme.useToken();
    const { activeDistrictId, switchDistrict, attemptTransition } = useDistrict();
    const [filterStatus, setFilterStatus] = useState('ALL');
    const activeCount = useMemo(() => districts.filter((d) => d.status === 'ACTIVE').length, [districts]);
    const incompleteCount = useMemo(() => districts.filter((d) => d.status === 'SETUP_INCOMPLETE').length, [districts]);
    const filteredDistricts = useMemo(() => {
        if (filterStatus === 'ACTIVE') {
            return districts.filter((d) => d.status === 'ACTIVE');
        }
        if (filterStatus === 'SETUP_INCOMPLETE') {
            return districts.filter((d) => d.status === 'SETUP_INCOMPLETE');
        }
        return districts;
    }, [districts, filterStatus]);
    const handleSwitchAndFocus = (districtId) => {
        attemptTransition(async () => {
            if (activeDistrictId !== districtId) {
                await switchDistrict(districtId);
            }
            if (onSelectDistrictForFocus) {
                onSelectDistrictForFocus(districtId);
            }
        });
    };
    const columns = useMemo(() => [
        {
            title: 'Туман номи',
            dataIndex: 'name',
            key: 'name',
            render: (name, record) => (_jsxs(Space, { direction: "vertical", size: 2, children: [_jsx(Text, { strong: true, style: { fontSize: 14 }, children: name }), record.region && (_jsx(Text, { type: "secondary", style: { fontSize: 12 }, children: record.region }))] })),
        },
        {
            title: 'Ҳолати',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                if (status === 'ACTIVE') {
                    return (_jsx(Tag, { color: "success", icon: _jsx(CheckCircleOutlined, {}), children: "\u0424\u0430\u043E\u043B" }));
                }
                if (status === 'SETUP_INCOMPLETE') {
                    return _jsx(Tag, { color: "warning", children: "\u0421\u043E\u0437\u043B\u0430\u0448 \u0442\u0443\u0433\u0430\u043B\u043B\u0430\u043D\u043C\u0430\u0433\u0430\u043D" });
                }
                if (status === 'SUSPENDED') {
                    return _jsx(Tag, { color: "error", children: "\u0422\u045E\u0445\u0442\u0430\u0442\u0438\u043B\u0433\u0430\u043D" });
                }
                return _jsx(Tag, { color: "default", children: status });
            },
        },
        {
            title: 'Яратилган вақти',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (createdAt) => (_jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: formatTashkentDate(createdAt) })),
        },
        {
            title: 'Амаллар',
            key: 'actions',
            render: (_, record) => {
                const isSelected = activeDistrictId === record.id;
                return (_jsxs(Space, { direction: "horizontal", size: "middle", align: "center", children: [isSelected ? (_jsx(Tag, { color: "cyan", icon: _jsx(CheckCircleOutlined, {}), children: "\u0422\u0430\u043D\u043B\u0430\u043D\u0433\u0430\u043D" })) : (_jsx(Button, { type: "link", "aria-label": `Танлаш: ${record.name}`, onClick: () => handleSwitchAndFocus(record.id), style: { minHeight: 44, padding: '0 8px', display: 'inline-flex', alignItems: 'center' }, children: "\u0422\u0430\u043D\u043B\u0430\u0448" })), _jsx(Button, { type: "link", icon: record.status === 'SETUP_INCOMPLETE' ? _jsx(SettingOutlined, {}) : _jsx(EyeOutlined, {}), "aria-label": record.status === 'SETUP_INCOMPLETE' ? `Созлаш: ${record.name}` : `Кўриш: ${record.name}`, onClick: () => handleSwitchAndFocus(record.id), style: { minHeight: 44, padding: '0 8px', display: 'inline-flex', alignItems: 'center' }, children: record.status === 'SETUP_INCOMPLETE' ? 'Созлаш' : 'Кўриш' })] }));
            },
        },
    ], [activeDistrictId, handleSwitchAndFocus]);
    return (_jsx(Card, { variant: "borderless", style: {
            borderRadius: 12,
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorderSecondary || '#E2EAE7'}`,
        }, title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '8px 0' }, children: [_jsxs("div", { children: [_jsx(Title, { level: 4, style: { margin: 0, fontSize: 16 }, children: "\u0422\u0443\u043C\u0430\u043D\u043B\u0430\u0440 \u0440\u045E\u0439\u0445\u0430\u0442\u0438" }), _jsx(Text, { type: "secondary", style: { fontSize: 13 }, children: "\u0422\u0438\u0437\u0438\u043C\u0434\u0430\u0433\u0438 \u0431\u0430\u0440\u0447\u0430 \u0442\u0443\u043C\u0430\u043D\u043B\u0430\u0440 \u0432\u0430 \u0441\u043E\u0437\u043B\u0430\u0448 \u04B3\u043E\u043B\u0430\u0442\u043B\u0430\u0440\u0438" })] }), _jsxs(Space, { direction: "horizontal", size: "middle", wrap: true, children: [_jsx(Segmented, { value: filterStatus, onChange: (val) => setFilterStatus(val), options: [
                                { label: `Барчаси (${districts.length})`, value: 'ALL' },
                                { label: `Фаол (${activeCount})`, value: 'ACTIVE' },
                                { label: `Созланмоқда (${incompleteCount})`, value: 'SETUP_INCOMPLETE' },
                            ], style: { minHeight: 36 } }), _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: onOpenCreateDrawer, style: { minHeight: 40 }, children: "\u042F\u043D\u0433\u0438 \u0442\u0443\u043C\u0430\u043D \u049B\u045E\u0448\u0438\u0448" })] })] }), children: filteredDistricts.length === 0 && !loading ? (_jsx("div", { style: { padding: '32px 0', textAlign: 'center' }, children: _jsx(Empty, { description: filterStatus === 'ALL'
                    ? 'Ҳозирча тизимда туманлар мавжуд эмас.'
                    : 'Танланган филтр бўйича туманлар топилмади.', children: filterStatus === 'ALL' ? (_jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: onOpenCreateDrawer, style: { minHeight: 44 }, children: "\u0411\u0438\u0440\u0438\u043D\u0447\u0438 \u0442\u0443\u043C\u0430\u043D\u043D\u0438 \u049B\u045E\u0448\u0438\u0448" })) : (_jsx(Button, { onClick: () => setFilterStatus('ALL'), style: { minHeight: 44 }, children: "\u0424\u0438\u043B\u0442\u0440\u043D\u0438 \u0442\u043E\u0437\u0430\u043B\u0430\u0448" })) }) })) : (_jsx(Table, { rowKey: "id", columns: columns, dataSource: filteredDistricts, loading: loading, pagination: filteredDistricts.length > 10 ? { pageSize: 10, showSizeChanger: false } : false, style: { overflowX: 'auto' } })) }));
};
