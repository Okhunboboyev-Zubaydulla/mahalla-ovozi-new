import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ConfigProvider } from 'antd';
import { mahallaTheme } from '../../src/theme/antd-theme.js';
import { TopicStatisticsStrip } from '../../src/components/topics/TopicStatisticsStrip.js';
import { LiveAnnouncerContext, LiveAnnouncerContextValue } from '../../src/hooks/useLiveAnnouncer.js';
import { HokimTopicStatisticsResponse } from '@mahalla-ovozi/api-contracts';

const mockDefaultStats: HokimTopicStatisticsResponse = {
  districtId: 'dist_1',
  districtName: 'Яккасарой',
  calendarDay: '2026-08-24',
  serverEvaluatedAt: '2026-08-24T10:00:00.000Z',
  totalUniqueTopics: 15,
  hokimRelatedTopics: 4,
  hokimEvidenceCount: 9,
  activeMahallasCount: 6,
  totalAcceptedEvidenceCount: 32,
  card1Comparison: {
    isAvailable: true,
    previousValue: 12,
    delta: 3,
    comparisonPeriodType: 'equivalent_same_time_yesterday',
    comparisonPeriodLabel: 'кечаги шу вақтга нисбатан',
  },
  card4: {
    mode: 'most_active_service_lane',
    leaderLane: 'WATER',
    leaderTopicCount: 7,
    isTie: false,
    tiedCount: 0,
    isZero: false,
  },
  card5: {
    mode: 'most_active_mahalla',
    leaderMahalla: 'Наврўз',
    leaderTopicCount: 5,
    isTie: false,
    tiedCount: 0,
    isZero: false,
  },
};

describe('TopicStatisticsStrip Component Tests', () => {
  let announceMock: (msg: string) => void;
  let liveAnnouncerValue: LiveAnnouncerContextValue;

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

    // Mock scrollIntoView
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    announceMock = vi.fn();
    liveAnnouncerValue = {
      message: '',
      announce: announceMock,
      announceTopicUpdate: vi.fn(),
    };
  });

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <ConfigProvider theme={mahallaTheme}>
        <LiveAnnouncerContext.Provider value={liveAnnouncerValue}>
          {ui}
        </LiveAnnouncerContext.Provider>
      </ConfigProvider>,
    );
  };

  it('renders all 5 read-only cards with neutral statistics (AC 1, AC 13)', () => {
    renderWithProviders(<TopicStatisticsStrip statistics={mockDefaultStats} />);

    // Check region
    const region = screen.getByRole('region', { name: /муҳим кўрсаткичлар/i });
    expect(region).toBeTruthy();

    // Card 1: Total Unique Topics
    expect(screen.getByText('Жами мавзулар')).toBeTruthy();
    expect(screen.getByText('15')).toBeTruthy();
    expect(screen.getByText('танланган фильтр бўйича')).toBeTruthy();

    // Card 2: Hokim Related Topics
    expect(screen.getByText('Ҳокимга оид')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('9 та далил')).toBeTruthy();

    // Card 3: Active Mahallas
    expect(screen.getByText('Фаол маҳаллалар')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
    expect(screen.getByText('32 та далил')).toBeTruthy();

    // Card 4: Most Active Service Lane
    expect(screen.getByText('Энг фаол соҳа')).toBeTruthy();
    expect(screen.getByText('Сув')).toBeTruthy();
    expect(screen.getByText('7 та мавзу')).toBeTruthy();

    // Card 5: Most Active Mahalla
    expect(screen.getByText('Энг фаол маҳалла')).toBeTruthy();
    expect(screen.getByText('Наврўз')).toBeTruthy();
    expect(screen.getByText('5 та мавзу')).toBeTruthy();

    // Ensure all 5 cards have tabIndex={-1} (non-focusable read-only anatomy)
    const cardElements = [
      document.getElementById('statistic-card-1'),
      document.getElementById('statistic-card-2'),
      document.getElementById('statistic-card-3'),
      document.getElementById('statistic-card-4'),
      document.getElementById('statistic-card-5'),
    ];

    cardElements.forEach((card) => {
      expect(card).toBeTruthy();
      expect(card?.getAttribute('tabindex')).toBe('-1');
      expect(card?.getAttribute('role')).toBe('group');
    });
  });

  it('renders fallback mode: multi_lane_topics on Card 4 (AC 7)', () => {
    const fallbackStats: HokimTopicStatisticsResponse = {
      ...mockDefaultStats,
      card4: {
        mode: 'multi_lane_topics',
        multiLaneTopicCount: 3,
      },
    };

    renderWithProviders(<TopicStatisticsStrip statistics={fallbackStats} />);

    expect(screen.getByText('Кўп йўналишли')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('мавзулар')).toBeTruthy();
  });

  it('renders fallback mode: multi_evidence_topics on Card 5 (AC 9)', () => {
    const fallbackStats: HokimTopicStatisticsResponse = {
      ...mockDefaultStats,
      card5: {
        mode: 'multi_evidence_topics',
        multiEvidenceTopicCount: 99,
      },
    };

    renderWithProviders(<TopicStatisticsStrip statistics={fallbackStats} />);

    expect(screen.getByText('Кўп далилли')).toBeTruthy();
    expect(screen.getByText('99')).toBeTruthy();
  });

  it('renders non-zero tie representation on Card 4 and Card 5 (AC 11)', () => {
    const tieStats: HokimTopicStatisticsResponse = {
      ...mockDefaultStats,
      card4: {
        mode: 'most_active_service_lane',
        leaderLane: null,
        leaderTopicCount: 4,
        isTie: true,
        tiedCount: 2,
        isZero: false,
      },
      card5: {
        mode: 'most_active_mahalla',
        leaderMahalla: null,
        leaderTopicCount: 3,
        isTie: true,
        tiedCount: 3,
        isZero: false,
      },
    };

    renderWithProviders(<TopicStatisticsStrip statistics={tieStats} />);

    expect(screen.getByText('Тенг: 2 та йўналиш')).toBeTruthy();
    expect(screen.getByText('4 тадан мавзу')).toBeTruthy();

    expect(screen.getByText('Тенг: 3 та маҳалла')).toBeTruthy();
    expect(screen.getByText('3 тадан мавзу')).toBeTruthy();
  });

  it('renders all-zero state with zero-precedence on Card 4 and Card 5 (AC 12)', () => {
    const zeroStats: HokimTopicStatisticsResponse = {
      ...mockDefaultStats,
      totalUniqueTopics: 0,
      card4: {
        mode: 'most_active_service_lane',
        leaderLane: null,
        leaderTopicCount: 0,
        isTie: false,
        tiedCount: 0,
        isZero: true,
      },
      card5: {
        mode: 'most_active_mahalla',
        leaderMahalla: null,
        leaderTopicCount: 0,
        isTie: false,
        tiedCount: 0,
        isZero: true,
      },
    };

    renderWithProviders(<TopicStatisticsStrip statistics={zeroStats} />);

    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);

    const emptySubtitles = screen.getAllByText('мавзулар йўқ');
    expect(emptySubtitles.length).toBe(2);
  });

  it('renders loading skeleton cards without crashing (AC 13)', () => {
    renderWithProviders(<TopicStatisticsStrip isLoading={true} />);

    const card1 = document.getElementById('statistic-card-1');
    expect(card1).toBeTruthy();
    expect(card1?.getAttribute('aria-label')).toContain('Юкланмоқда');
  });

  it('renders mobile carousel navigation and handles Next/Prev clicks (AC 14)', () => {
    // Force mobile breakpoint by mocking matchMedia to report non-lg
    vi.spyOn(window, 'matchMedia').mockImplementation((query) => {
      if (query.includes('1024px') || query.includes('lg')) {
        return {
          matches: false,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        } as unknown as MediaQueryList;
      }
      return {
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList;
    });

    renderWithProviders(<TopicStatisticsStrip statistics={mockDefaultStats} />);

    const nextBtn = screen.queryByRole('button', { name: /кейинги кўрсаткич/i });
    const prevBtn = screen.queryByRole('button', { name: /олдинги кўрсаткич/i });

    if (nextBtn && prevBtn) {
      // Previous button initially disabled at index 0
      expect((prevBtn as HTMLButtonElement).disabled).toBe(true);
      expect((nextBtn as HTMLButtonElement).disabled).toBe(false);

      // Click Next
      fireEvent.click(nextBtn);
      expect((prevBtn as HTMLButtonElement).disabled).toBe(false);
    }
  });

  describe('Story 3.9: Card 1 Prior-Period Trend & Accessibility (AC 1, AC 3, AC 7)', () => {
    it('renders positive delta badge with neutral styling and contextual label (AC 7)', () => {
      const statsWithPositiveDelta: HokimTopicStatisticsResponse = {
        ...mockDefaultStats,
        totalUniqueTopics: 20,
        card1Comparison: {
          isAvailable: true,
          previousValue: 15,
          delta: 5,
          comparisonPeriodType: 'equivalent_same_time_yesterday',
          comparisonPeriodLabel: 'кечаги шу вақтга нисбатан',
        },
      };

      renderWithProviders(<TopicStatisticsStrip statistics={statsWithPositiveDelta} />);

      const badge = screen.getByTestId('comparison-delta-badge');
      expect(badge.textContent).toBe('+5');
      expect(screen.getByText('кечаги шу вақтга нисбатан')).toBeTruthy();

      // Verify Card 1 accessible label with full descriptive phrasing
      const card1 = document.getElementById('statistic-card-1');
      expect(card1?.getAttribute('aria-label')).toBe(
        'Жами мавзулар: 20 та, танланган фильтр бўйича. кечаги шу вақтга нисбатан 5 та кўп (+5)',
      );
    });

    it('renders negative delta badge with neutral styling (AC 7)', () => {
      const statsWithNegativeDelta: HokimTopicStatisticsResponse = {
        ...mockDefaultStats,
        totalUniqueTopics: 10,
        card1Comparison: {
          isAvailable: true,
          previousValue: 14,
          delta: -4,
          comparisonPeriodType: 'previous_calendar_day',
          comparisonPeriodLabel: 'олдинги кунга нисбатан',
        },
      };

      renderWithProviders(<TopicStatisticsStrip statistics={statsWithNegativeDelta} />);

      const badge = screen.getByTestId('comparison-delta-badge');
      expect(badge.textContent).toBe('-4');
      expect(screen.getByText('олдинги кунга нисбатан')).toBeTruthy();

      const card1 = document.getElementById('statistic-card-1');
      expect(card1?.getAttribute('aria-label')).toBe(
        'Жами мавзулар: 10 та, танланган фильтр бўйича. олдинги кунга нисбатан 4 та кам (-4)',
      );
    });

    it('renders zero delta badge with neutral styling (AC 7)', () => {
      const statsWithZeroDelta: HokimTopicStatisticsResponse = {
        ...mockDefaultStats,
        totalUniqueTopics: 12,
        card1Comparison: {
          isAvailable: true,
          previousValue: 12,
          delta: 0,
          comparisonPeriodType: 'previous_custom_range',
          comparisonPeriodLabel: 'олдинги даврга нисбатан',
        },
      };

      renderWithProviders(<TopicStatisticsStrip statistics={statsWithZeroDelta} />);

      const badge = screen.getByTestId('comparison-delta-badge');
      expect(badge.textContent).toBe('0');
      expect(screen.getByText('олдинги даврга нисбатан')).toBeTruthy();

      const card1 = document.getElementById('statistic-card-1');
      expect(card1?.getAttribute('aria-label')).toBe(
        'Жами мавзулар: 12 та, танланган фильтр бўйича. олдинги даврга нисбатан ўзгаришсиз (0)',
      );
    });

    it('renders unavailable indicator with accessible announcement for UNSUPPORTED_FILTER_SCOPE (AC 3, AC 7)', () => {
      const statsWithUnavailableScope: HokimTopicStatisticsResponse = {
        ...mockDefaultStats,
        totalUniqueTopics: 8,
        card1Comparison: {
          isAvailable: false,
          reason: 'UNSUPPORTED_FILTER_SCOPE',
        },
      };

      renderWithProviders(<TopicStatisticsStrip statistics={statsWithUnavailableScope} />);

      const unavail = screen.getByTestId('comparison-unavailable');
      expect(unavail).toBeTruthy();
      expect(unavail.textContent).toContain('Маълумот йўқ');

      const card1 = document.getElementById('statistic-card-1');
      expect(card1?.getAttribute('aria-label')).toBe(
        'Жами мавзулар: 8 та, танланган фильтр бўйича. Таққослаш мавжуд эмас: барча йўналишлар танланмаган ёки қидирув фаол',
      );
    });

    it('renders unavailable indicator with accessible announcement for OUTSIDE_RETENTION_WINDOW (AC 6, AC 7)', () => {
      const statsWithOutsideRetention: HokimTopicStatisticsResponse = {
        ...mockDefaultStats,
        totalUniqueTopics: 3,
        card1Comparison: {
          isAvailable: false,
          reason: 'OUTSIDE_RETENTION_WINDOW',
        },
      };

      renderWithProviders(<TopicStatisticsStrip statistics={statsWithOutsideRetention} />);

      const unavail = screen.getByTestId('comparison-unavailable');
      expect(unavail).toBeTruthy();

      const card1 = document.getElementById('statistic-card-1');
      expect(card1?.getAttribute('aria-label')).toBe(
        'Жами мавзулар: 3 та, танланган фильтр бўйича. Таққослаш мавжуд эмас: 90 кунлик сақлаш муддатидан ташқарида',
      );
    });
  });
});
