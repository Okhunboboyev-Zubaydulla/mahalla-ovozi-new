import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Select, Divider, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { districtClient } from '../district/district-client.js';
import { useDistrict } from '../district/district-context.js';
import { themeColors } from '../theme/antd-theme.js';
export const DistrictSelector = ({ onOpenCreateDrawer }) => {
    const { activeDistrictId, switchDistrict, setActiveDistrictDirectly } = useDistrict();
    const { data, isLoading } = useQuery({
        queryKey: ['districts', 'list'],
        queryFn: districtClient.listDistricts,
    });
    const districts = data?.districts || [];
    const options = useMemo(() => districts.map((d) => ({
        value: d.id,
        label: d.region ? `${d.name} (${d.region})` : d.name,
    })), [districts]);
    const handleChange = (value) => {
        if (value) {
            void switchDistrict(value);
        }
        else {
            setActiveDistrictDirectly(null);
        }
    };
    const renderDropdown = (menu) => (_jsxs(_Fragment, { children: [menu, onOpenCreateDrawer && (_jsxs(_Fragment, { children: [_jsx(Divider, { style: { margin: '8px 0' } }), _jsx("div", { style: { padding: '0 8px 4px' }, children: _jsx(Button, { id: "district-selector-add-button", type: "text", icon: _jsx(PlusOutlined, {}), block: true, onClick: onOpenCreateDrawer, style: { textAlign: 'left', fontWeight: 500, color: themeColors.colorPrimary }, children: "\u0422\u0443\u043C\u0430\u043D \u049B\u045E\u0448\u0438\u0448" }) })] }))] }));
    return (_jsx(Select, { id: "district-selector", showSearch: true, allowClear: true, loading: isLoading, placeholder: "\u0422\u0443\u043C\u0430\u043D\u043D\u0438 \u0442\u0430\u043D\u043B\u0430\u043D\u0433", optionFilterProp: "label", value: activeDistrictId || undefined, onChange: handleChange, options: options, style: { width: 240 }, popupRender: renderDropdown }));
};
