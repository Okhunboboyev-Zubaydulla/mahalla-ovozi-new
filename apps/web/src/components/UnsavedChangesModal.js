import { jsx as _jsx } from "react/jsx-runtime";
import { Modal, Button } from 'antd';
import { useDistrict } from '../district/district-context.js';
import { themeColors } from '../theme/antd-theme.js';
export const UnsavedChangesModal = () => {
    const { pendingTransition, confirmDiscard, cancelTransition } = useDistrict();
    const isOpen = pendingTransition !== null;
    return (_jsx(Modal, { title: "\u0421\u0430\u049B\u043B\u0430\u043D\u043C\u0430\u0433\u0430\u043D \u045E\u0437\u0433\u0430\u0440\u0438\u0448\u043B\u0430\u0440 \u043C\u0430\u0432\u0436\u0443\u0434", open: isOpen, onCancel: cancelTransition, maskClosable: true, keyboard: true, destroyOnHidden: true, centered: true, footer: [
            _jsx(Button, { danger: true, onClick: confirmDiscard, children: "\u040E\u0437\u0433\u0430\u0440\u0438\u0448\u043B\u0430\u0440\u043D\u0438 \u0431\u0435\u043A\u043E\u0440 \u049B\u0438\u043B\u0438\u0448" }, "discard"),
            _jsx(Button, { type: "primary", autoFocus: true, onClick: cancelTransition, children: "\u0422\u0430\u04B3\u0440\u0438\u0440\u043B\u0430\u0448\u043D\u0438 \u0434\u0430\u0432\u043E\u043C \u044D\u0442\u0442\u0438\u0440\u0438\u0448" }, "continue"),
        ], children: _jsx("p", { style: { margin: '16px 0 8px 0', fontSize: 14, color: themeColors.colorText }, children: "\u041A\u0438\u0440\u0438\u0442\u0438\u043B\u0433\u0430\u043D \u043C\u0430\u044A\u043B\u0443\u043C\u043E\u0442\u043B\u0430\u0440 \u0441\u0430\u049B\u043B\u0430\u043D\u043C\u0430\u0433\u0430\u043D. \u0421\u0430\u04B3\u0438\u0444\u0430\u043D\u0438 \u0442\u0430\u0440\u043A \u044D\u0442\u0441\u0430\u043D\u0433\u0438\u0437, \u045E\u0437\u0433\u0430\u0440\u0438\u0448\u043B\u0430\u0440 \u0439\u045E\u049B\u043E\u043B\u0430\u0434\u0438." }) }));
};
