import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IssueDetailDrawer } from '../../src/components/issues/IssueDetailDrawer.js';
import { OperationalIssue } from '@mahalla-ovozi/api-contracts';
import { issuesClient } from '../../src/issues/issues-client.js';

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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Story 4.2: IssueDetailDrawer Component Tests (AC 5, AC 16)', () => {
  let queryClient: QueryClient;

  const mockIssue: OperationalIssue = {
    id: 'issue-test-1',
    logicalKey: 'DISTRICT:dist-1:telegram_bot:BOT_TOKEN_INVALID',
    scope: 'DISTRICT',
    districtId: 'dist-1',
    districtName: 'Чилонзор тумани',
    component: 'telegram_bot',
    issueCategory: 'BOT_TOKEN_INVALID',
    severity: 'Critical',
    status: 'ACTIVE',
    healthStatus: 'Unavailable',
    sanitizedTitle: 'Telegram бот токени нотўғри',
    sanitizedDescription: 'Чилонзор тумани учун киритилган Telegram бот токени яроқсиз ёки хато.',
    recommendedAction: 'Бот созламаларини текширинг ва токенни қайта киритинг',
    targetRoute: '/telegram-setup?districtId=dist-1',
    startedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    latestCheckAt: new Date().toISOString(),
    resolvedAt: null,
    metadata: null,
  };

  beforeEach(() => {
    setupMatchMedia();
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(issuesClient, 'getOperationalIssueDetail').mockResolvedValue({
      issue: mockIssue,
      auditEvents: [
        {
          id: 'audit-1',
          action: 'OPERATIONAL_ISSUE_DETECTED',
          actorId: 'system:health-monitor',
          actorRole: 'SYSTEM',
          createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
          metadata: { issueId: 'issue-test-1' },
        },
      ],
    });
  });

  function renderDrawer(open = true, onClose = vi.fn()) {
    const openerEl = document.createElement('button');
    document.body.appendChild(openerEl);
    const openerRef = { current: openerEl };

    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <IssueDetailDrawer
            issue={mockIssue}
            open={open}
            onClose={onClose}
            openerRef={openerRef}
          />
        </BrowserRouter>
      </QueryClientProvider>,
    );
  }

  it('renders issue detail metadata, diagnostic attributes, and audit timeline', async () => {
    renderDrawer(true);

    expect(screen.getByText('Муаммо тафсилотлари')).toBeTruthy();
    expect(screen.getByText('Telegram бот токени нотўғри')).toBeTruthy();
    expect(screen.getByText('Чилонзор тумани')).toBeTruthy();
    expect(screen.getByText('telegram_bot')).toBeTruthy();
    expect(screen.getByText('BOT_TOKEN_INVALID')).toBeTruthy();
    expect(screen.getByText('Тавсия этилган ҳаракат')).toBeTruthy();
    expect(screen.getByText('Бот созламаларига ўтиш')).toBeTruthy();
  });

  it('navigates to target management route when action button is clicked', () => {
    const onClose = vi.fn();
    renderDrawer(true, onClose);

    const actionBtn = screen.getByRole('button', { name: /бот созламаларига ўтиш/i });
    fireEvent.click(actionBtn);

    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/telegram-setup?districtId=dist-1');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderDrawer(true, onClose);

    const closeBtn = screen.getByRole('button', {
      name: /муаммо тафсилотлари панелидан чиқиш/i,
    });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalled();
  });
});
