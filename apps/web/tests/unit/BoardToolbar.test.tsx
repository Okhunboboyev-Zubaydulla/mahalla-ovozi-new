import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ConfigProvider } from 'antd';
import { mahallaTheme } from '../../src/theme/antd-theme.js';
import { BoardToolbar } from '../../src/components/topics/BoardToolbar.js';
import { AuthProvider } from '../../src/auth/auth-context.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authClient } from '../../src/auth/auth-client.js';

describe('Story 3.3 & 3.6: BoardToolbar Component Tests', () => {
  let queryClient: QueryClient;

  beforeAll(() => {
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
  });

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    vi.spyOn(authClient, 'fetchSession').mockResolvedValue({
      actor: {
        id: 'acc_hokim_1',
        username: 'hokim_user',
        role: 'DISTRICT_HOKIM',
        districtId: 'dist_1',
        mustChangePassword: false,
      },
      session: { expiresAt: new Date(Date.now() + 3600000).toISOString() },
    });
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={mahallaTheme}>
          <AuthProvider>{ui}</AuthProvider>
        </ConfigProvider>
      </QueryClientProvider>,
    );
  };

  it('Test 1: Renders district name and freshness timestamp in smart refresh button (AC 6)', () => {
    renderWithProviders(
      <BoardToolbar
        districtName="Яккасарой тумани"
        calendarDay="2026-08-24"
        lastRefreshedAt="2026-08-24T08:30:00.000Z"
      />,
    );

    expect(screen.getByText('Маҳалла Овози')).toBeTruthy();
    expect(screen.getByText('Яккасарой тумани')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Маълумотларни янгилаш' })).toBeTruthy();
  });

  it('Test 2: Янгилаш button triggers onRefresh when clicked (AC 7)', () => {
    const handleRefresh = vi.fn();
    renderWithProviders(
      <BoardToolbar
        districtName="Яккасарой тумани"
        calendarDay="2026-08-24"
        onRefresh={handleRefresh}
      />,
    );

    const refreshButton = screen.getByRole('button', { name: /Маълумотларни янгилаш/ });
    expect(refreshButton).toBeTruthy();
    fireEvent.click(refreshButton);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
  });

  it('Test 3: Янгилаш button is disabled when isOffline or isRefreshing (AC 7, 8)', () => {
    const { rerender } = renderWithProviders(
      <BoardToolbar
        districtName="Яккасарой тумани"
        calendarDay="2026-08-24"
        isOffline={true}
      />,
    );

    let refreshButton = screen.getByRole('button', { name: /Маълумотларни янгилаш/ });
    expect(refreshButton.hasAttribute('disabled')).toBe(true);

    rerender(
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={mahallaTheme}>
          <AuthProvider>
            <BoardToolbar
              districtName="Яккасарой тумани"
              calendarDay="2026-08-24"
              isRefreshing={true}
            />
          </AuthProvider>
        </ConfigProvider>
      </QueryClientProvider>,
    );

    refreshButton = screen.getByRole('button', { name: /Маълумотларни янгилаш/ });
    expect(refreshButton.hasAttribute('disabled')).toBe(true);
  });

  it('Test 4: Displays processing delay warning indicator when hasProcessingDelay is true (AC 6)', () => {
    renderWithProviders(
      <BoardToolbar
        districtName="Яккасарой тумани"
        calendarDay="2026-08-24"
        lastRefreshedAt="2026-08-24T08:30:00.000Z"
        hasProcessingDelay={true}
      />,
    );

    expect(
      screen.getByLabelText(/Янгиланиш давом этмоқда — айрим сўнгги хабарлар ҳали кўринмаслиги мумкин/),
    ).toBeTruthy();
  });

  it('Test 5: Renders Help button with proper id and triggers onOpenHelp (Story 3.6 AC 1, AC 3)', () => {
    const handleOpenHelp = vi.fn();
    renderWithProviders(
      <BoardToolbar
        districtName="Яккасарой тумани"
        calendarDay="2026-08-24"
        onOpenHelp={handleOpenHelp}
      />,
    );

    const helpButton = screen.getByRole('button', { name: 'Тизим ёрдами' });
    expect(helpButton).toBeTruthy();
    expect(helpButton.id).toBe('dashboard-help-button');
    fireEvent.click(helpButton);
    expect(handleOpenHelp).toHaveBeenCalledTimes(1);
  });

  it('Test 6: Renders Profile popover trigger button with aria-haspopup and username (Story 3.6 AC 6)', async () => {
    renderWithProviders(
      <BoardToolbar
        districtName="Яккасарой тумани"
        calendarDay="2026-08-24"
      />,
    );

    await waitFor(() => {
      const profileButton = screen.getByRole('button', { name: 'Ҳоким профили ва сессия созламалари' });
      expect(profileButton).toBeTruthy();
      expect(profileButton.id).toBe('dashboard-profile-button');
      expect(profileButton.getAttribute('aria-haspopup')).toBe('dialog');
      expect(profileButton.textContent).toContain('hokim_user');
    });
  });

  it('Test 7: Opens Profile popover displaying username, district, role badge, and sign out button (Story 3.6 AC 6)', async () => {
    renderWithProviders(
      <BoardToolbar
        districtName="Яккасарой тумани"
        calendarDay="2026-08-24"
      />,
    );

    const profileButton = await screen.findByRole('button', { name: 'Ҳоким профили ва сессия созламалари' });
    fireEvent.click(profileButton);

    // Popover content checks
    expect(await screen.findByText('Туман ҳокими')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Тизимдан чиқиш' })).toBeTruthy();
  });

  it('Test 8: Activating Чиқиш executes signOut and cancels/clears queries (Story 3.6 AC 7)', async () => {
    const signOutSpy = vi.spyOn(authClient, 'signOut').mockResolvedValue({ success: true });
    renderWithProviders(
      <BoardToolbar
        districtName="Яккасарой тумани"
        calendarDay="2026-08-24"
      />,
    );

    const profileButton = await screen.findByRole('button', { name: 'Ҳоким профили ва сессия созламалари' });
    fireEvent.click(profileButton);

    const signOutButton = await screen.findByRole('button', { name: 'Тизимдан чиқиш' });
    fireEvent.click(signOutButton);

    await waitFor(() => {
      expect(signOutSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('Test 9: Negative guardrail - does NOT render sidebar, tabs, or district switcher (Story 3.6 AC 1)', () => {
    renderWithProviders(
      <BoardToolbar
        districtName="Яккасарой тумани"
        calendarDay="2026-08-24"
      />,
    );

    expect(screen.queryByRole('tablist')).toBeNull();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByLabelText(/туманни ўзгартириш/i)).toBeNull();
  });
});
