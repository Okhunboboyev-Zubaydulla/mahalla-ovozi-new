import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ActiveIssuesList } from '../../src/components/issues/ActiveIssuesList.js';
import { OperationalIssue } from '@mahalla-ovozi/api-contracts';

function setupMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
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

describe('Story 4.2: ActiveIssuesList Component Tests (AC 3, AC 4, AC 16)', () => {
  const mockIssues: OperationalIssue[] = [
    {
      id: 'issue-crit-1',
      logicalKey: 'GLOBAL:global:database:DATABASE_CONNECTION_ERROR',
      scope: 'GLOBAL',
      districtId: null,
      districtName: null,
      component: 'database',
      issueCategory: 'DATABASE_CONNECTION_ERROR',
      severity: 'Critical',
      status: 'ACTIVE',
      healthStatus: 'Unavailable',
      sanitizedTitle: 'Маълумотлар базасига уланишда хатолик',
      sanitizedDescription: 'PostgreSQL сервери билан алоқа йўқолди.',
      recommendedAction: 'PostgreSQL сервери ҳолатини текширинг',
      targetRoute: null,
      startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 mins ago
      latestCheckAt: new Date().toISOString(),
      resolvedAt: null,
      metadata: null,
    },
    {
      id: 'issue-warn-1',
      logicalKey: 'DISTRICT:dist-1:telegram_bot:BOT_DISCONNECTED',
      scope: 'DISTRICT',
      districtId: 'dist-1',
      districtName: 'Чилонзор тумани',
      component: 'telegram_bot',
      issueCategory: 'BOT_DISCONNECTED',
      severity: 'Warning',
      status: 'ACTIVE',
      healthStatus: 'Degraded',
      sanitizedTitle: 'Telegram бот уланмаган ёки фаол эмас',
      sanitizedDescription: 'Чилонзор Telegram боти билан алоқа мавжуд эмас.',
      recommendedAction: 'Бот созламаларини текширинг',
      targetRoute: '/telegram-setup?districtId=dist-1',
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
      latestCheckAt: new Date().toISOString(),
      resolvedAt: null,
      metadata: null,
    },
  ];

  it('renders active operational issues with severity badges, titles, and relative duration', () => {
    const onSelectIssue = vi.fn();
    render(
      <ActiveIssuesList
        issues={mockIssues}
        onSelectIssue={onSelectIssue}
      />,
    );

    expect(screen.getByText('Фаол техник муаммолар')).toBeTruthy();
    expect(screen.getByText('Маълумотлар базасига уланишда хатолик')).toBeTruthy();
    expect(screen.getByText('Telegram бот уланмаган ёки фаол эмас')).toBeTruthy();
    expect(screen.getByText('Муҳим')).toBeTruthy();
    expect(screen.getByText('Огоҳлантириш')).toBeTruthy();
    expect(screen.getByText('10 дақиқа олдин')).toBeTruthy();
    expect(screen.getByText('3 соат олдин')).toBeTruthy();
  });

  it('renders empty state when there are zero active issues', () => {
    const onSelectIssue = vi.fn();
    render(
      <ActiveIssuesList
        issues={[]}
        onSelectIssue={onSelectIssue}
      />,
    );

    expect(screen.getByText('Фаол техник муаммолар мавжуд эмас')).toBeTruthy();
    expect(screen.getByText('Барча тизим ва туман хизматлари барқарор ишламоқда')).toBeTruthy();
  });

  it('calls onSelectIssue when "Батафсил" button is clicked', () => {
    const onSelectIssue = vi.fn();
    render(
      <ActiveIssuesList
        issues={mockIssues}
        onSelectIssue={onSelectIssue}
      />,
    );

    const buttons = screen.getAllByRole('button', { name: /батафсил/i });
    expect(buttons.length).toBe(2);

    fireEvent.click(buttons[0]!);
    expect(onSelectIssue).toHaveBeenCalledWith(mockIssues[0], expect.anything());
  });
});
