import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { OneTimeCredentialModal } from '../../src/components/OneTimeCredentialModal.js';
import { mahallaTheme } from '../../src/theme/antd-theme.js';
function setupMatchMedia() {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
            matches: false,
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
}
beforeAll(() => {
    setupMatchMedia();
});
describe('OneTimeCredentialModal Component Tests', () => {
    it('renders modal with username, temporary password, copy button, and security warnings', () => {
        const handleClose = vi.fn();
        render(_jsx(ConfigProvider, { theme: mahallaTheme, children: _jsx(OneTimeCredentialModal, { isOpen: true, onClose: handleClose, username: "hokim_chilonzor", temporaryPassword: "SecureTempPass#2026!", title: "\u04B2\u043E\u043A\u0438\u043C \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0438 \u043C\u0443\u0432\u0430\u0444\u0444\u0430\u049B\u0438\u044F\u0442\u043B\u0438 \u044F\u0440\u0430\u0442\u0438\u043B\u0434\u0438" }) }));
        // Title
        expect(screen.getByText('Ҳоким аккаунти муваффақиятли яратилди')).toBeTruthy();
        // Security Alert
        expect(screen.getByText('Диққат! Бир марталик хавфсизлик маълумоти')).toBeTruthy();
        expect(screen.getByText(/Ушбу вақтинчалик парол фақат бир марта кўрсатилади/i)).toBeTruthy();
        // Username & Password
        expect(screen.getByText('hokim_chilonzor')).toBeTruthy();
        expect(screen.getByText('SecureTempPass#2026!')).toBeTruthy();
        // Close button
        const closeBtn = screen.getByRole('button', { name: 'Тушундим, ойнани ёпиш' });
        expect(closeBtn).toBeTruthy();
        fireEvent.click(closeBtn);
        expect(handleClose).toHaveBeenCalledTimes(1);
    });
    it('renders nothing when temporaryPassword is null', () => {
        const { container } = render(_jsx(ConfigProvider, { theme: mahallaTheme, children: _jsx(OneTimeCredentialModal, { isOpen: true, onClose: vi.fn(), username: "hokim_chilonzor", temporaryPassword: null }) }));
        expect(container.firstChild).toBeNull();
    });
});
