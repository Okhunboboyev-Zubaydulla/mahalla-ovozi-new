import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ConfigProvider } from 'antd';
import { mahallaTheme } from '../../src/theme/antd-theme.js';
import { BoardToolbar } from '../../src/components/topics/BoardToolbar.js';
import { AuthProvider } from '../../src/auth/auth-context.js';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { authClient } from '../../src/auth/auth-client.js';

describe('Story 3.3: BoardToolbar Component Tests', () => {
  let queryClient: QueryClient;

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

  it('Test 1: Renders district name, calendar date, and freshness timestamp (AC 6)', () => {
    renderWithProviders(
      <BoardToolbar
        districtName="Яккасарой тумани"
        calendarDay="2026-08-24"
        lastRefreshedAt="2026-08-24T08:30:00.000Z"
      />,
    );

    expect(screen.getByText('Маҳалла Овози')).toBeTruthy();
    expect(screen.getByText('Яккасарой тумани')).toBeTruthy();
    expect(screen.getByText('24.08.2026')).toBeTruthy();
    expect(screen.getByText(/Охирги янгиланиш:/)).toBeTruthy();
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

    const refreshButton = screen.getByRole('button', { name: 'Маълумотларни янгилаш' });
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

    let refreshButton = screen.getByRole('button', { name: 'Маълумотларни янгилаш' });
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

    refreshButton = screen.getByRole('button', { name: 'Маълумотларни янгилаш' });
    expect(refreshButton.hasAttribute('disabled')).toBe(true);
  });

  it('Test 4: Displays processing delay warning banner when hasProcessingDelay is true (AC 6)', () => {
    renderWithProviders(
      <BoardToolbar
        districtName="Яккасарой тумани"
        calendarDay="2026-08-24"
        lastRefreshedAt="2026-08-24T08:30:00.000Z"
        hasProcessingDelay={true}
      />,
    );

    expect(
      screen.getByText(/Янгиланиш давом этмоқда — айрим сўнгги хабарлар ҳали кўринмаслиги мумкин/),
    ).toBeTruthy();
  });
});
