import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from 'react';
import { Card, Typography, Table, Tag, Button, Empty, Alert, } from 'antd';
import { PlusOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { districtClient } from '../district/district-client.js';
import { useDistrict } from '../district/district-context.js';
import { CreateDistrictDrawer } from '../components/CreateDistrictDrawer.js';
import { formatTashkentDate } from '../lib/formatters.js';
const { Title, Paragraph } = Typography;
export const DistrictsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const [drawerOpen, setDrawerOpen] = useState(searchParams.get('action') === 'create');
    const { activeDistrictId, switchDistrict, attemptTransition } = useDistrict();
    useEffect(() => {
        if (searchParams.get('action') === 'create') {
            setDrawerOpen(true);
        }
    }, [searchParams]);
    const handleCloseDrawer = () => {
        setDrawerOpen(false);
        if (searchParams.get('action') === 'create') {
            setSearchParams({}, { replace: true });
        }
    };
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['districts', 'list'],
        queryFn: districtClient.listDistricts,
    });
    const districts = data?.districts || [];
    const columns = useMemo(() => [
        {
            title: 'Туман номи',
            dataIndex: 'name',
            key: 'name',
            render: (name) => _jsx("strong", { children: name }),
        },
        {
            title: 'Вилоят / Ҳудуд',
            dataIndex: 'region',
            key: 'region',
            render: (region) => region || '—',
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
                    // P5-I: Use warning preset mapped to design system tokens
                    return _jsx(Tag, { color: "warning", children: "\u0421\u043E\u0437\u043B\u0430\u0448 \u0442\u0443\u0433\u0430\u043B\u043B\u0430\u043D\u043C\u0430\u0433\u0430\u043D" });
                }
                return _jsx(Tag, { color: "default", children: status });
            },
        },
        {
            title: 'Яратилган вақти',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (createdAt) => formatTashkentDate(createdAt),
        },
        {
            title: 'Амаллар',
            key: 'actions',
            render: (_, record) => {
                const isSelected = activeDistrictId === record.id;
                return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 8 }, children: [isSelected ? (_jsx(Tag, { color: "success", icon: _jsx(CheckCircleOutlined, {}), children: "\u0422\u0430\u043D\u043B\u0430\u043D\u0433\u0430\u043D" })) : (_jsx(Button, { type: "link", "aria-label": `Танлаш: ${record.name}`, onClick: () => void switchDistrict(record.id), style: { minHeight: 44, display: 'inline-flex', alignItems: 'center' }, children: "\u0422\u0430\u043D\u043B\u0430\u0448" })), _jsx(Button, { type: "link", "aria-label": record.status === 'SETUP_INCOMPLETE' ? `Созлаш: ${record.name}` : `Кўриш: ${record.name}`, onClick: () => {
                                attemptTransition(async () => {
                                    if (!isSelected) {
                                        await switchDistrict(record.id);
                                    }
                                    navigate('/');
                                });
                            }, style: { minHeight: 44, display: 'inline-flex', alignItems: 'center' }, children: record.status === 'SETUP_INCOMPLETE' ? 'Созлаш' : 'Кўриш' })] }));
            },
        },
    ], [activeDistrictId, switchDistrict, attemptTransition, navigate]);
    return (_jsxs("div", { children: [_jsx(Card, { variant: "borderless", style: { borderRadius: 12 }, title: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' }, children: [_jsxs("div", { children: [_jsx(Title, { level: 3, style: { margin: 0 }, children: "\u0422\u0443\u043C\u0430\u043D\u043B\u0430\u0440" }), _jsx(Paragraph, { type: "secondary", style: { margin: 0, fontSize: 13 }, children: "\u0422\u0438\u0437\u0438\u043C\u0434\u0430\u0433\u0438 \u0431\u0430\u0440\u0447\u0430 \u0442\u0443\u043C\u0430\u043D\u043B\u0430\u0440 \u0440\u045E\u0439\u0445\u0430\u0442\u0438 \u0432\u0430 \u044F\u043D\u0433\u0438 \u0442\u0443\u043C\u0430\u043D \u049B\u045E\u0448\u0438\u0448" })] }), districts.length > 0 && !isError && (_jsx(Button, { id: "create-district-button", type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => setDrawerOpen(true), children: "\u0422\u0443\u043C\u0430\u043D \u049B\u045E\u0448\u0438\u0448" }))] }), children: isError ? (_jsx("div", { style: { padding: '24px 0' }, children: _jsx(Alert, { type: "error", showIcon: true, message: "\u0422\u0443\u043C\u0430\u043D\u043B\u0430\u0440 \u0440\u045E\u0439\u0445\u0430\u0442\u0438\u043D\u0438 \u044E\u043A\u043B\u0430\u0431 \u0431\u045E\u043B\u043C\u0430\u0434\u0438", description: "\u0421\u0435\u0440\u0432\u0435\u0440 \u0431\u0438\u043B\u0430\u043D \u0431\u043E\u0493\u043B\u0430\u043D\u0438\u0448\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A \u044E\u0437 \u0431\u0435\u0440\u0434\u0438. \u0418\u043B\u0442\u0438\u043C\u043E\u0441, \u049B\u0430\u0439\u0442\u0430 \u0443\u0440\u0438\u043D\u0438\u0431 \u043A\u045E\u0440\u0438\u043D\u0433.", action: _jsx(Button, { type: "primary", danger: true, onClick: () => void refetch(), children: "\u049A\u0430\u0439\u0442\u0430 \u0443\u0440\u0438\u043D\u0438\u0448" }) }) })) : !isLoading && districts.length === 0 ? (
                /* AC 2: Honest Empty State for Zero Districts */
                _jsx("div", { style: { padding: '48px 0', textAlign: 'center' }, children: _jsx(Empty, { description: _jsxs("div", { children: [_jsx(Title, { level: 4, style: { marginBottom: 8 }, children: "\u04B2\u043E\u0437\u0438\u0440\u0447\u0430 \u0442\u0443\u043C\u0430\u043D\u043B\u0430\u0440 \u043C\u0430\u0432\u0436\u0443\u0434 \u044D\u043C\u0430\u0441" }), _jsx(Paragraph, { type: "secondary", children: "\u0422\u0438\u0437\u0438\u043C\u0434\u0430 \u0438\u0448\u043B\u0430\u0448 \u0443\u0447\u0443\u043D \u0431\u0438\u0440\u0438\u043D\u0447\u0438 \u0442\u0443\u043C\u0430\u043D\u043D\u0438 \u049B\u045E\u0448\u0438\u043D\u0433." })] }), children: _jsx(Button, { id: "empty-create-district-button", type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => setDrawerOpen(true), children: "\u0422\u0443\u043C\u0430\u043D \u049B\u045E\u0448\u0438\u0448" }) }) })) : (
                /* P5-F: Table with role="region", aria-label, and horizontal scroll */
                _jsx("div", { role: "region", "aria-label": "\u0422\u0443\u043C\u0430\u043D\u043B\u0430\u0440 \u0440\u045E\u0439\u0445\u0430\u0442\u0438", children: _jsx(Table, { dataSource: districts, columns: columns, rowKey: "id", loading: isLoading, pagination: districts.length > 10
                            ? {
                                defaultPageSize: 10,
                                showSizeChanger: true,
                                pageSizeOptions: ['10', '20', '50'],
                                showTotal: (total, range) => `${total} та тумандан ${range[0]}–${range[1]} кўрсатилмоқда`,
                            }
                            : false, scroll: { x: 'max-content' } }) })) }), _jsx(CreateDistrictDrawer, { open: drawerOpen, onClose: handleCloseDrawer })] }));
};
