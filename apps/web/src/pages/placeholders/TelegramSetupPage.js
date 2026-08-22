import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Typography } from 'antd';
import { useDistrict } from '../../district/district-context.js';
const { Title, Paragraph } = Typography;
export const TelegramSetupPage = () => {
    const { activeDistrictId } = useDistrict();
    return (_jsxs(Card, { variant: "borderless", style: { borderRadius: 12 }, children: [_jsx(Title, { level: 3, style: { marginTop: 0 }, children: "\u0422\u0435\u043B\u0435\u0433\u0440\u0430\u043C \u0441\u043E\u0437\u043B\u0430\u043C\u0430\u043B\u0430\u0440\u0438" }), _jsx(Paragraph, { type: "secondary", children: activeDistrictId
                    ? `Танланган туман ID: ${activeDistrictId}`
                    : 'Туман танланмаган' })] }));
};
