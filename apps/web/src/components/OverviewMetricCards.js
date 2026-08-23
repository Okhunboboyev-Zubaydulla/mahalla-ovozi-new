import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Row, Col, Card, Typography, Space, theme } from 'antd';
import { ApartmentOutlined, CheckCircleOutlined, ClockCircleOutlined, SafetyCertificateOutlined, } from '@ant-design/icons';
const { Text } = Typography;
export const OverviewMetricCards = ({ districts, loading = false, }) => {
    const { token } = theme.useToken();
    const totalDistricts = districts.length;
    const activeDistricts = districts.filter((d) => d.status === 'ACTIVE').length;
    const incompleteDistricts = districts.filter((d) => d.status === 'SETUP_INCOMPLETE').length;
    const cardItems = [
        {
            id: 'metric-total-districts',
            title: 'Жами туманлар',
            value: totalDistricts,
            subText: `${activeDistricts} та фаол • ${incompleteDistricts} та созланмоқда`,
            icon: _jsx(ApartmentOutlined, { style: { fontSize: 20, color: token.colorPrimary } }),
            iconBg: '#E0F2FE',
        },
        {
            id: 'metric-active-districts',
            title: 'Фаол туманлар',
            value: activeDistricts,
            subText: activeDistricts > 0 ? 'Сигналлар қабул қилинмоқда' : 'Ҳозирча фаол туман йўқ',
            icon: _jsx(CheckCircleOutlined, { style: { fontSize: 20, color: token.colorSuccess || '#059669' } }),
            iconBg: token.colorSuccessBg || '#D1FAE5',
        },
        {
            id: 'metric-incomplete-districts',
            title: 'Созлаш жараёнида',
            value: incompleteDistricts,
            subText: incompleteDistricts > 0 ? 'Тайёрлик босқичларида' : 'Барчаси созланган',
            icon: _jsx(ClockCircleOutlined, { style: { fontSize: 20, color: token.colorWarning } }),
            iconBg: token.colorWarningBg || '#FEF3C7',
        },
        {
            id: 'metric-system-health',
            title: 'Тизим ҳолати',
            value: 'Барқарор',
            subText: 'Хизматлар тўлиқ ишламоқда',
            icon: _jsx(SafetyCertificateOutlined, { style: { fontSize: 20, color: token.colorPrimary } }),
            iconBg: '#E0F2FE',
        },
    ];
    return (_jsx("section", { "aria-label": "\u0422\u0438\u0437\u0438\u043C\u043D\u0438\u043D\u0433 \u0430\u0441\u043E\u0441\u0438\u0439 \u043A\u045E\u0440\u0441\u0430\u0442\u043A\u0438\u0447\u043B\u0430\u0440\u0438", style: { marginBottom: 24 }, children: _jsx(Row, { gutter: [16, 16], children: cardItems.map((item) => (_jsx(Col, { xs: 24, sm: 12, lg: 6, children: _jsx(Card, { loading: loading, variant: "borderless", style: {
                        borderRadius: 12,
                        height: '100%',
                        background: token.colorBgContainer,
                        border: `1px solid ${token.colorBorderSecondary || '#E2EAE7'}`,
                    }, bodyStyle: { padding: '20px 24px' }, children: _jsxs("div", { style: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }, children: [_jsxs(Space, { direction: "vertical", size: 4, style: { flex: 1 }, children: [_jsx(Text, { type: "secondary", style: { fontSize: 13, fontWeight: 500 }, children: item.title }), _jsx("div", { style: {
                                            fontSize: typeof item.value === 'number' ? 28 : 22,
                                            fontWeight: 600,
                                            color: token.colorText,
                                            lineHeight: '34px',
                                            marginTop: 2,
                                        }, children: item.value }), _jsx(Text, { type: "secondary", style: {
                                            fontSize: 12,
                                            marginTop: 4,
                                            display: 'block',
                                            color: token.colorTextSecondary,
                                        }, children: item.subText })] }), _jsx("div", { style: {
                                    width: 44,
                                    height: 44,
                                    borderRadius: 10,
                                    background: item.iconBg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    marginLeft: 12,
                                }, "aria-hidden": "true", children: item.icon })] }) }) }, item.id))) }) }));
};
