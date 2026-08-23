import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useMemo } from 'react';
import { Card, Typography, Button, Segmented, Tag, Alert, Space, theme, } from 'antd';
import { CheckCircleOutlined, ApartmentOutlined, UnorderedListOutlined, CheckSquareOutlined, CloseOutlined, ReloadOutlined, } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { districtClient } from '../district/district-client.js';
import { useDistrict } from '../district/district-context.js';
import { DistrictOnboardingChecklist } from '../components/DistrictOnboardingChecklist.js';
import { OverviewMetricCards } from '../components/OverviewMetricCards.js';
import { OverviewDistrictTable } from '../components/OverviewDistrictTable.js';
import { CreateDistrictDrawer } from '../components/CreateDistrictDrawer.js';
const { Title, Text, Paragraph } = Typography;
export const OverviewPage = () => {
    const { token } = theme.useToken();
    const { activeDistrictId, switchDistrict, attemptTransition } = useDistrict();
    const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
    const [activeViewMode, setActiveViewMode] = useState('checklist');
    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['districts', 'list'],
        queryFn: districtClient.listDistricts,
    });
    const districts = useMemo(() => data?.districts || [], [data]);
    const activeDistrict = useMemo(() => districts.find((d) => d.id === activeDistrictId), [districts, activeDistrictId]);
    const handleClearActiveDistrict = () => {
        attemptTransition(async () => {
            // Clear active district to return to global overview
            await switchDistrict('');
        });
    };
    return (_jsxs("div", { style: { maxWidth: 1400, margin: '0 auto' }, children: [_jsxs("div", { style: { marginBottom: 20 }, children: [_jsx(Title, { level: 3, style: { margin: 0, fontSize: 22 }, children: "\u0423\u043C\u0443\u043C\u0438\u0439 \u043A\u045E\u0440\u0438\u043D\u0438\u0448" }), _jsx(Paragraph, { type: "secondary", style: { margin: '4px 0 0', fontSize: 14 }, children: "\u041C\u0430\u04B3\u0430\u043B\u043B\u0430 \u041E\u0432\u043E\u0437\u0438 \u0442\u0438\u0437\u0438\u043C\u0438\u043D\u0438\u043D\u0433 \u0431\u0430\u0440\u0447\u0430 \u0442\u0443\u043C\u0430\u043D\u043B\u0430\u0440\u0438 \u04B3\u043E\u043B\u0430\u0442\u0438, \u043A\u045E\u0440\u0441\u0430\u0442\u043A\u0438\u0447\u043B\u0430\u0440\u0438 \u0432\u0430 \u0441\u043E\u0437\u043B\u0430\u0448 \u0436\u0430\u0440\u0430\u0451\u043D\u043B\u0430\u0440\u0438" })] }), isError && (_jsx(Alert, { type: "error", showIcon: true, message: "\u0422\u0443\u043C\u0430\u043D\u043B\u0430\u0440 \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440\u0438\u043D\u0438 \u044E\u043A\u043B\u0430\u0431 \u0431\u045E\u043B\u043C\u0430\u0434\u0438", description: "\u0421\u0435\u0440\u0432\u0435\u0440 \u0431\u0438\u043B\u0430\u043D \u0431\u043E\u0493\u043B\u0430\u043D\u0438\u0448\u0434\u0430 \u0445\u0430\u0442\u043E\u043B\u0438\u043A \u044E\u0437 \u0431\u0435\u0440\u0434\u0438 \u0451\u043A\u0438 \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440 \u0432\u0430\u049B\u0442\u0438\u043D\u0447\u0430 \u043C\u0430\u0432\u0436\u0443\u0434 \u044D\u043C\u0430\u0441.", action: _jsx(Button, { type: "primary", size: "middle", icon: _jsx(ReloadOutlined, {}), onClick: () => void refetch(), style: { minHeight: 40 }, children: "\u049A\u0430\u0439\u0442\u0430 \u0443\u0440\u0438\u043D\u0438\u0448" }), style: { marginBottom: 24, borderRadius: 10 } })), _jsx(OverviewMetricCards, { districts: districts, loading: isLoading }), activeDistrict && (_jsx(Card, { variant: "borderless", style: {
                    marginBottom: 24,
                    borderRadius: 12,
                    background: token.colorBgContainer,
                    border: `1px solid ${token.colorPrimary}`,
                }, bodyStyle: { padding: '16px 20px' }, children: _jsxs("div", { style: {
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 16,
                    }, children: [_jsxs(Space, { direction: "horizontal", size: "middle", align: "center", children: [_jsx("div", { style: {
                                        width: 40,
                                        height: 40,
                                        borderRadius: 8,
                                        background: '#E0F2FE',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }, "aria-hidden": "true", children: _jsx(ApartmentOutlined, { style: { fontSize: 20, color: token.colorPrimary } }) }), _jsxs("div", { children: [_jsxs(Space, { direction: "horizontal", size: "small", align: "center", children: [_jsx(Text, { strong: true, style: { fontSize: 16 }, children: activeDistrict.name }), activeDistrict.status === 'ACTIVE' ? (_jsx(Tag, { color: "success", icon: _jsx(CheckCircleOutlined, {}), children: "\u0424\u0430\u043E\u043B" })) : (_jsx(Tag, { color: "warning", children: "\u0421\u043E\u0437\u043B\u0430\u0448 \u0442\u0443\u0433\u0430\u043B\u043B\u0430\u043D\u043C\u0430\u0433\u0430\u043D" }))] }), activeDistrict.region && (_jsx(Text, { type: "secondary", style: { display: 'block', fontSize: 12 }, children: activeDistrict.region }))] })] }), _jsxs(Space, { direction: "horizontal", size: "middle", wrap: true, align: "center", children: [_jsx(Segmented, { value: activeViewMode, onChange: (val) => setActiveViewMode(val), options: [
                                        {
                                            label: 'Созлаш босқичлари',
                                            value: 'checklist',
                                            icon: _jsx(CheckSquareOutlined, {}),
                                        },
                                        {
                                            label: 'Барча туманлар жадвали',
                                            value: 'portfolio',
                                            icon: _jsx(UnorderedListOutlined, {}),
                                        },
                                    ], style: { minHeight: 38 } }), _jsx(Button, { type: "text", icon: _jsx(CloseOutlined, {}), onClick: handleClearActiveDistrict, style: { color: token.colorTextSecondary, minHeight: 38 }, children: "\u0422\u0430\u043D\u043B\u043E\u0432\u043D\u0438 \u0451\u043F\u0438\u0448" })] })] }) })), activeDistrict && activeViewMode === 'checklist' ? (_jsx(DistrictOnboardingChecklist, { districtId: activeDistrict.id })) : (_jsx(OverviewDistrictTable, { districts: districts, loading: isLoading, onOpenCreateDrawer: () => setCreateDrawerOpen(true), onSelectDistrictForFocus: () => setActiveViewMode('checklist') })), _jsx(CreateDistrictDrawer, { open: createDrawerOpen, onClose: () => setCreateDrawerOpen(false) })] }));
};
