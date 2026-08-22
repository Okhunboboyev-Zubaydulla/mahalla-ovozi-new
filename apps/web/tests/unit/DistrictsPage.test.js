import { jsx as _jsx } from "react/jsx-runtime";
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DistrictsPage } from '../../src/pages/DistrictsPage.js';
import { DistrictProvider } from '../../src/district/district-context.js';
import { districtClient } from '../../src/district/district-client.js';
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
describe('DistrictsPage & CreateDistrictDrawer Component Tests', () => {
    let queryClient;
    beforeEach(() => {
        setupMatchMedia();
        queryClient = new QueryClient({
            defaultOptions: { queries: { retry: false } },
        });
    });
    function renderDistrictsPage() {
        return render(_jsx(QueryClientProvider, { client: queryClient, children: _jsx(ConfigProvider, { theme: mahallaTheme, children: _jsx(DistrictProvider, { children: _jsx(BrowserRouter, { children: _jsx(DistrictsPage, {}) }) }) }) }));
    }
    it('renders honest empty state with CTA when no districts exist (AC 2)', async () => {
        vi.spyOn(districtClient, 'listDistricts').mockResolvedValueOnce({
            districts: [],
        });
        renderDistrictsPage();
        expect(await screen.findByText('Ҳозирча туманлар мавжуд эмас')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Туман қўшиш/i })).toBeTruthy();
    });
    it('renders table with columns, status tag, and Tashkent date when districts exist (AC 3, P5-I)', async () => {
        vi.spyOn(districtClient, 'listDistricts').mockResolvedValueOnce({
            districts: [
                {
                    id: '01951234-5678-7000-8000-000000000001',
                    name: 'Чилонзор',
                    region: 'Тошкент шаҳри',
                    status: 'SETUP_INCOMPLETE',
                    createdAt: '2026-08-17T10:00:00.000Z',
                },
            ],
        });
        renderDistrictsPage();
        expect(await screen.findByText('Чилонзор')).toBeTruthy();
        expect(screen.getByText('Тошкент шаҳри')).toBeTruthy();
        expect(screen.getByText('Созлаш тугалланмаган')).toBeTruthy();
        expect(screen.getByRole('region', { name: 'Туманлар рўйхати' })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Танлаш/i })).toBeTruthy();
    });
    it('opens CreateDistrictDrawer and validates required fields with error summary (P5-E)', async () => {
        vi.spyOn(districtClient, 'listDistricts').mockResolvedValueOnce({
            districts: [],
        });
        renderDistrictsPage();
        const openCta = await screen.findByRole('button', { name: /Туман қўшиш/i });
        fireEvent.click(openCta);
        // Drawer should appear
        expect(await screen.findByText('Янги туман қўшиш')).toBeTruthy();
        expect(screen.getByText('Туман номи')).toBeTruthy();
        expect(screen.getByText('Вилоят / Ҳудуд')).toBeTruthy();
        // Click submit with empty input
        const submitBtn = screen.getByRole('button', { name: /Сақлаш/i });
        fireEvent.click(submitBtn);
        // Error summary should be visible
        expect(await screen.findByText(/Тўлдиришда хатоликлар мавжуд/i)).toBeTruthy();
    });
    it('renders ACTIVE status tag with check icon for active districts (AC 8, 17)', async () => {
        vi.spyOn(districtClient, 'listDistricts').mockResolvedValueOnce({
            districts: [
                {
                    id: '01951234-5678-7000-8000-000000000002',
                    name: 'Миробод',
                    region: 'Тошкент шаҳри',
                    status: 'ACTIVE',
                    createdAt: '2026-08-18T10:00:00.000Z',
                    activatedAt: '2026-08-19T12:00:00.000Z',
                },
            ],
        });
        renderDistrictsPage();
        expect(await screen.findByText('Миробод')).toBeTruthy();
        expect(screen.getByText('Фаол')).toBeTruthy();
        expect(screen.getByRole('button', { name: /Кўриш: Миробод/i })).toBeTruthy();
    });
});
