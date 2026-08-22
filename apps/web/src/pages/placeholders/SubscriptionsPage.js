import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Typography } from 'antd';
import { useDistrict } from '../../district/district-context.js';
const { Title, Paragraph } = Typography;
export const SubscriptionsPage = () => {
    const { activeDistrictId } = useDistrict();
    return (_jsxs(Card, { variant: "borderless", style: { borderRadius: 12 }, children: [_jsx(Title, { level: 3, style: { marginTop: 0 }, children: "\u041E\u0431\u0443\u043D\u0430\u043B\u0430\u0440" }), _jsx(Paragraph, { type: "secondary", children: activeDistrictId
                    ? `Танланган туман ID: ${activeDistrictId}`
                    : 'Туман танланмаган' })] }));
};
