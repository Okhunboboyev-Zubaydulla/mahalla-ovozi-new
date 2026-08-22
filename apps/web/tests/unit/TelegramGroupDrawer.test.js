import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import { TelegramGroupDrawer } from '../../src/components/TelegramGroupDrawer.js';
import { telegramGroupClient } from '../../src/district/telegram-group-client.js';
import { mahallaTheme } from '../../src/theme/antd-theme.js';
function setupMatchMedia() {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query) => ({
            matches: true,
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
describe('TelegramGroupDrawer Component Tests', () => {
    it('renders form fields for adding a Mahalla group mapping (AC 1, 2)', () => {
        render(_jsx(ConfigProvider, { theme: mahallaTheme, children: _jsx(TelegramGroupDrawer, { open: true, onClose: () => { }, districtId: "dist_test_1" }) }));
        expect(screen.getByText('Маҳалла Telegram гуруҳини бириктириш')).toBeDefined();
        expect(screen.getByText('Маҳалла номи')).toBeDefined();
        expect(screen.getByText('Telegram гуруҳ Chat ID')).toBeDefined();
        expect(screen.getByText('Текшириш ва кейинги босқичга ўтиш')).toBeDefined();
    });
    it('submits form, opens test session, and renders live countdown (AC 6, 7)', async () => {
        vi.spyOn(telegramGroupClient, 'createGroup').mockResolvedValue({
            group: {
                id: 'grp_new',
                districtId: 'dist_test_1',
                mahallaName: 'Янгиобод',
                telegramChatId: '-1001112223334',
                telegramChatTitle: 'Янгиобод Гуруҳи',
                telegramChatUsername: null,
                status: 'PENDING',
                botMembershipStatus: 'member',
                privacyModeDisabled: true,
                testMessageReceivedAt: null,
                lastValidatedAt: null,
                lastError: null,
                createdAt: '2026-08-18T10:00:00.000Z',
                updatedAt: '2026-08-18T10:00:00.000Z',
            },
        });
        vi.spyOn(telegramGroupClient, 'startTest').mockResolvedValue({
            session: {
                status: 'PENDING',
                expiresAt: new Date(Date.now() + 60000).toISOString(),
            },
        });
        vi.spyOn(telegramGroupClient, 'getTestStatus').mockResolvedValue({
            status: 'PENDING',
            testMessageReceivedAt: null,
            lastError: null,
        });
        render(_jsx(ConfigProvider, { theme: mahallaTheme, children: _jsx(TelegramGroupDrawer, { open: true, onClose: () => { }, districtId: "dist_test_1" }) }));
        const mahallaInput = screen.getByPlaceholderText('Масалан: Навбаҳор');
        const chatIdInput = screen.getByPlaceholderText('Масалан: -1001234567890');
        fireEvent.change(mahallaInput, { target: { value: 'Янгиобод' } });
        fireEvent.change(chatIdInput, { target: { value: '-1001112223334' } });
        fireEvent.click(screen.getByText('Текшириш ва кейинги босқичга ўтиш'));
        await waitFor(() => {
            expect(screen.getByText('Хабар синови режими (60 сония)')).toBeDefined();
            expect(screen.getByText('Тест хабарини кутиш вақти')).toBeDefined();
        });
    });
    it('handles simulated message resolution to success (AC 7, 10)', async () => {
        vi.spyOn(telegramGroupClient, 'simulateTestMessage').mockResolvedValue({
            success: true,
            accepted: true,
        });
        render(_jsx(ConfigProvider, { theme: mahallaTheme, children: _jsx(TelegramGroupDrawer, { open: true, onClose: () => { }, districtId: "dist_test_1", initialGroup: {
                    id: 'grp_test',
                    districtId: 'dist_test_1',
                    mahallaName: 'Гулистон',
                    telegramChatId: '-1005556667778',
                    telegramChatTitle: 'Гулистон Гуруҳи',
                    telegramChatUsername: null,
                    status: 'PENDING',
                    botMembershipStatus: 'member',
                    privacyModeDisabled: true,
                    testMessageReceivedAt: null,
                    lastValidatedAt: null,
                    lastError: null,
                    createdAt: '2026-08-18T10:00:00.000Z',
                    updatedAt: '2026-08-18T10:00:00.000Z',
                } }) }));
        await waitFor(() => {
            expect(screen.getByText('Синов хабарини симуляция қилиш (Тест режими)')).toBeDefined();
        });
        fireEvent.click(screen.getByText('Синов хабарини симуляция қилиш (Тест режими)'));
        await waitFor(() => {
            expect(screen.getByText('Синов муваффақиятли якунланди!')).toBeDefined();
        });
    });
});
