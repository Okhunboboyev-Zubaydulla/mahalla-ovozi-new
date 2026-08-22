import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Typography } from 'antd';
import { useDistrict } from '../../district/district-context.js';
const { Title, Paragraph } = Typography;
export const HokimAccountsPage = () => {
    const { activeDistrictId } = useDistrict();
    return (_jsxs(Card, { variant: "borderless", style: { borderRadius: 12 }, children: [_jsx(Title, { level: 3, style: { marginTop: 0 }, children: "\u04B2\u043E\u043A\u0438\u043C \u04B3\u0438\u0441\u043E\u0431\u043B\u0430\u0440\u0438" }), _jsx(Paragraph, { type: "secondary", children: activeDistrictId
                    ? `Танланган туман ID: ${activeDistrictId}`
                    : 'Туман танланмаган' })] }));
};
