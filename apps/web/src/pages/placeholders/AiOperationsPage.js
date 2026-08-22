import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Typography } from 'antd';
import { useDistrict } from '../../district/district-context.js';
const { Title, Paragraph } = Typography;
export const AiOperationsPage = () => {
    const { activeDistrictId } = useDistrict();
    return (_jsxs(Card, { variant: "borderless", style: { borderRadius: 12 }, children: [_jsx(Title, { level: 3, style: { marginTop: 0 }, children: "\u0410\u0418 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u044F\u043B\u0430\u0440\u0438" }), _jsx(Paragraph, { type: "secondary", children: activeDistrictId
                    ? `Танланган туман ID: ${activeDistrictId}`
                    : 'Туман танланмаган' })] }));
};
