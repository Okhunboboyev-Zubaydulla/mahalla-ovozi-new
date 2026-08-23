import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { ConfigProvider } from 'antd';
import { TopicEvidenceDrawer } from '../../src/components/topics/TopicEvidenceDrawer.js';
import { hokimTopicsClient } from '../../src/topics/hokim-topics-client.js';
import { mahallaTheme } from '../../src/theme/antd-theme.js';
import {
  TopicCardItem,
  TopicEvidenceItem,
  TopicEvidenceResponse,
} from '@mahalla-ovozi/api-contracts';

function setupMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
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

// Mock useAuth
vi.mock('../../src/auth/auth-context.js', () => ({
  useAuth: () => ({
    actor: {
      id: 'acc_hokim_1',
      districtId: 'dist_test_1',
      role: 'DISTRICT_HOKIM',
    },
  }),
}));

const mockTopic1: TopicCardItem = {
  id: 'top_1',
  districtId: 'dist_test_1',
  mahallaName: 'Бобур маҳалласи',
  calendarDay: '2026-08-23',
  summary: 'Сув қувури ёрилиши сабабли кўчани сув босмоқда.',
  primaryLane: 'WATER',
  lanes: ['WATER'],
  additionalLanes: [],
  evidenceCount: 2,
  latestMeaningfulActivityTimestamp: '2026-08-23T10:00:00.000Z',
  isNew: true,
  isUpdated: false,
  createdAt: '2026-08-23T06:00:00.000Z',
  updatedAt: '2026-08-23T10:00:00.000Z',
};

const mockEvidence1: TopicEvidenceItem = {
  id: 'evi_1',
  topicId: 'top_1',
  verbatimText: '1-хабар: Сув босими пасайди.',
  contentType: 'TEXT',
  originalTimestamp: '2026-08-23T06:00:00.000Z',
  formattedTime: '23.08.2026 11:00',
  authorName: 'Anvar Qodirov',
  authorUsername: '@anvar_uz',
  isAnchor: false,
  telegramDeepLink: 'https://t.me/bobur_public/101',
};

const mockEvidence2: TopicEvidenceItem = {
  id: 'evi_2',
  topicId: 'top_1',
  verbatimText: '2-хабар: Қувур ёрилиб кўчани сув босди!',
  contentType: 'TEXT',
  originalTimestamp: '2026-08-23T07:00:00.000Z',
  formattedTime: '23.08.2026 12:00',
  authorName: 'Dilshod',
  authorUsername: null,
  isAnchor: true,
  telegramDeepLink: 'https://t.me/c/123456789/102',
};

const mockEvidenceResponse1: TopicEvidenceResponse = {
  topic: mockTopic1,
  anchorQuote: 'Қувур ёрилиб кўчани сув босди!',
  anchorEvidenceId: 'evi_2',
  evidence: [mockEvidence1, mockEvidence2],
  totalCount: 2,
  nextCursor: null,
  hasNextPage: false,
};

function renderWithProviders(ui: React.ReactElement, queryClient?: QueryClient) {
  const qc =
    queryClient ||
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

  return render(
    <QueryClientProvider client={qc}>
      <ConfigProvider theme={mahallaTheme}>{ui}</ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('TopicEvidenceDrawer Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders topic metadata, anchor quote callout, and evidence list (AC 2, 6, 7, 9)', async () => {
    vi.spyOn(hokimTopicsClient, 'getTopicEvidence').mockResolvedValueOnce(mockEvidenceResponse1);

    const onClose = vi.fn();
    renderWithProviders(<TopicEvidenceDrawer topicId="top_1" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Бобур маҳалласи')).toBeTruthy();
    });

    // Verify non-modal complementary landmark role (AC 7)
    expect(screen.getByRole('region', { name: 'Мавзу далиллари' })).toBeTruthy();

    // Verify summary and anchor quote callout
    expect(screen.getByText('Сув қувури ёрилиши сабабли кўчани сув босмоқда.')).toBeTruthy();
    expect(screen.getByText('«Қувур ёрилиб кўчани сув босди!»')).toBeTruthy();
    expect(screen.getByText('Асосий далил иқтибоси:')).toBeTruthy();

    // Verify evidence items
    expect(screen.getByText('1-хабар: Сув босими пасайди.')).toBeTruthy();
    expect(screen.getByText('2-хабар: Қувур ёрилиб кўчани сув босди!')).toBeTruthy();

    // Verify in-situ anchor badge
    expect(screen.getByText('Асосий далил')).toBeTruthy();

    // Verify Telegram link buttons
    const telegramLinks = screen.getAllByRole('link', { name: /Telegramда очиш/i });
    expect(telegramLinks.length).toBe(2);
    expect(telegramLinks[0]?.getAttribute('href')).toBe('https://t.me/bobur_public/101');
    expect(telegramLinks[1]?.getAttribute('href')).toBe('https://t.me/c/123456789/102');
  });

  it('calls onClose when close icon button is clicked (AC 7)', async () => {
    vi.spyOn(hokimTopicsClient, 'getTopicEvidence').mockResolvedValueOnce(mockEvidenceResponse1);

    const onClose = vi.fn();
    renderWithProviders(<TopicEvidenceDrawer topicId="top_1" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Бобур маҳалласи')).toBeTruthy();
    });

    const closeBtn = screen.getByRole('button', { name: /close|ёпиш/i });
    fireEvent.click(closeBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed (AC 7)', async () => {
    vi.spyOn(hokimTopicsClient, 'getTopicEvidence').mockResolvedValueOnce(mockEvidenceResponse1);

    const onClose = vi.fn();
    renderWithProviders(<TopicEvidenceDrawer topicId="top_1" onClose={onClose} />);

    await waitFor(() => {
      expect(screen.getByText('Бобур маҳалласи')).toBeTruthy();
    });

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('switches topic in-place from Topic 1 to Topic 2 without bleeding data (AC 7)', async () => {
    const mockTopic2: TopicCardItem = {
      ...mockTopic1,
      id: 'top_2',
      mahallaName: 'Чилонзор-9',
      summary: 'Электр таъминоти узилган.',
      primaryLane: 'ELECTRICITY',
      lanes: ['ELECTRICITY'],
    };

    const mockEvidenceResponse2: TopicEvidenceResponse = {
      topic: mockTopic2,
      anchorQuote: 'Сим узилиб тушган.',
      anchorEvidenceId: 'evi_elec_1',
      evidence: [
        {
          id: 'evi_elec_1',
          topicId: 'top_2',
          verbatimText: 'Сим узилиб тушган.',
          contentType: 'TEXT',
          originalTimestamp: '2026-08-23T08:00:00.000Z',
          formattedTime: '23.08.2026 13:00',
          authorName: 'Сардор',
          authorUsername: null,
          isAnchor: true,
          telegramDeepLink: null,
        },
      ],
      totalCount: 1,
      nextCursor: null,
      hasNextPage: false,
    };

    vi.spyOn(hokimTopicsClient, 'getTopicEvidence')
      .mockResolvedValueOnce(mockEvidenceResponse1)
      .mockResolvedValueOnce(mockEvidenceResponse2);

    const qc = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    const onClose = vi.fn();
    const { rerender } = render(
      <QueryClientProvider client={qc}>
        <ConfigProvider theme={mahallaTheme}>
          <TopicEvidenceDrawer topicId="top_1" onClose={onClose} />
        </ConfigProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Бобур маҳалласи')).toBeTruthy();
    });

    // Re-render with Topic 2
    rerender(
      <QueryClientProvider client={qc}>
        <ConfigProvider theme={mahallaTheme}>
          <TopicEvidenceDrawer topicId="top_2" onClose={onClose} />
        </ConfigProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Чилонзор-9')).toBeTruthy();
    });

    expect(screen.getByText('Электр таъминоти узилган.')).toBeTruthy();
    expect(screen.getByText('«Сим узилиб тушган.»')).toBeTruthy();
  });
});
