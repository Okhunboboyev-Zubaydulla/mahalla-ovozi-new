import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Typography } from 'antd';
import { useDistrict } from '../../district/district-context.js';
const { Title, Paragraph } = Typography;
export const AuditHistoryPage = () => {
    const { activeDistrictId } = useDistrict();
    return (_jsxs(Card, { variant: "borderless", style: { borderRadius: 12 }, children: [_jsx(Title, { level: 3, style: { marginTop: 0 }, children: "\u0410\u0443\u0434\u0438\u0442 \u0442\u0430\u0440\u0438\u0445\u0438" }), _jsx(Paragraph, { type: "secondary", children: activeDistrictId
                    ? `Танланган туман ID: ${activeDistrictId}`
                    : 'Туман танланмаган (Глобал аудит тарихи)' })] }));
};
