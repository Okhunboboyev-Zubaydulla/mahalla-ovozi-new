import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Typography, Button, Empty } from 'antd';
import { useNavigate } from 'react-router-dom';
import { PlusOutlined } from '@ant-design/icons';
import { useDistrict } from '../district/district-context.js';
import { DistrictOnboardingChecklist } from '../components/DistrictOnboardingChecklist.js';
const { Title, Paragraph } = Typography;
export const OverviewPage = () => {
    const { activeDistrictId } = useDistrict();
    const navigate = useNavigate();
    if (activeDistrictId) {
        return _jsx(DistrictOnboardingChecklist, { districtId: activeDistrictId });
    }
    return (_jsx(Card, { variant: "borderless", style: { borderRadius: 12 }, children: _jsx("div", { style: { padding: '48px 0', textAlign: 'center' }, children: _jsx(Empty, { description: _jsxs("div", { children: [_jsx(Title, { level: 4, style: { marginBottom: 8 }, children: "\u0422\u0443\u043C\u0430\u043D \u0442\u0430\u043D\u043B\u0430\u043D\u043C\u0430\u0433\u0430\u043D" }), _jsx(Paragraph, { type: "secondary", children: "\u041C\u0430\u0441\u044A\u0443\u043B \u0445\u043E\u0434\u0438\u043C \u0431\u043E\u0448\u049B\u0430\u0440\u0443\u0432 \u043F\u0430\u043D\u0435\u043B\u0438. \u0418\u0448\u043D\u0438 \u0431\u043E\u0448\u043B\u0430\u0448 \u0432\u0430 \u0441\u043E\u0437\u043B\u0430\u0448\u043B\u0430\u0440\u043D\u0438 \u0434\u0430\u0432\u043E\u043C \u044D\u0442\u0442\u0438\u0440\u0438\u0448 \u0443\u0447\u0443\u043D \u0442\u0443\u043C\u0430\u043D\u043D\u0438 \u0442\u0430\u043D\u043B\u0430\u043D\u0433 \u0451\u043A\u0438 \u044F\u043D\u0433\u0438 \u0442\u0443\u043C\u0430\u043D \u049B\u045E\u0448\u0438\u043D\u0433." })] }), children: _jsx(Button, { type: "primary", icon: _jsx(PlusOutlined, {}), onClick: () => navigate('/districts?action=create'), style: { minHeight: 44 }, children: "\u0422\u0443\u043C\u0430\u043D \u0442\u0430\u043D\u043B\u0430\u0448 / \u049B\u045E\u0448\u0438\u0448" }) }) }) }));
};
