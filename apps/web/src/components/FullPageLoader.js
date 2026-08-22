import { jsx as _jsx } from "react/jsx-runtime";
import { Spin } from 'antd';
/**
 * Full-page loading indicator — used while session is being verified.
 * Uses the Ant Design Spin component for theme-consistent styling.
 */
export function FullPageLoader() {
    return (_jsx("div", { style: {
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
        }, children: _jsx(Spin, { size: "large" }) }));
}
