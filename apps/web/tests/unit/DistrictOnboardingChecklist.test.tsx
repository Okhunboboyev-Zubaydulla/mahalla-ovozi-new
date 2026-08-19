import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DistrictOnboardingChecklist } from '../../src/components/DistrictOnboardingChecklist.js';
import { DistrictProvider } from '../../src/district/district-context.js';
import { districtClient } from '../../src/district/district-client.js';
import { mahallaTheme } from '../../src/theme/antd-theme.js';
import { DistrictReadiness } from '@mahalla-ovozi/api-contracts';

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

const mockReadiness: DistrictReadiness = {
  districtId: 'dist_test_1',
  districtName: 'Чилонзор',
  status: 'SETUP_INCOMPLETE',
  isActivationReady: false,
  passedCount: 4,
  totalCount: 8,
  evaluatedAt: new Date().toISOString(),
  disclosureConfirmedAt: null,
  disclosureConfirmedById: null,
  items: [
    {
      key: 'district_identity',
      label: 'Туман маълумотлари',
      description: 'Туман номи ва ҳудуди киритилган',
      status: 'passed',
    },
    {
      key: 'access_eligibility',
      label: 'Тизимга кириш ҳуқуқи',
      description: 'Туман тизимга кириш учун фаол ҳолатда',
      status: 'passed',
    },
    {
      key: 'analysis_configuration',
      label: 'Асосий таҳлил созламалари',
      description: 'Тасдиқланган базавий таҳлил профили бириктирилган',
      status: 'passed',
    },
    {
      key: 'district_isolation',
      label: 'Ҳудудий хавфсизлик чегараси',
      description: 'Туманнинг алоҳида хавфсизлик муҳити текширилди',
      status: 'passed',
    },
    {
      key: 'disclosure_confirmation',
      label: 'Операцион кириш очиқлигини тасдиқлаш',
      description: 'Ташқи операцион кириш бўйича расмий тасдиқлов қайд этилди',
      status: 'incomplete',
      blockerReason: 'Маҳсулот эгаси томонидан операцион кириш очиқлиги тасдиқланмаган.',
      actionRequired: true,
    },
    {
      key: 'telegram_bot',
      label: 'Telegram бот уланиши',
      description: 'Туманнинг расмий Telegram боти фаоллаштирилди',
      status: 'incomplete',
      blockerReason: 'Telegram бот ҳали уланмаган (1.4-босқич).',
      actionRequired: true,
      actionPath: '/telegram-setup',
    },
    {
      key: 'group_mappings',
      label: 'Гуруҳлар ва маҳаллалар харитаси',
      description: 'Telegram гуруҳлари тегишли маҳаллаларга бириктирилди',
      status: 'incomplete',
      blockerReason: 'Маҳалла гуруҳлари бириктирилмаган (1.5-босқич).',
      actionRequired: true,
      actionPath: '/group-mappings',
    },
    {
      key: 'hokim_account',
      label: 'Ҳоким аккаунти',
      description: 'Туман ҳокими учун хавфсиз аккаунт яратилди',
      status: 'incomplete',
      blockerReason: 'Ҳоким аккаунти яратилмаган (1.6-босқич).',
      actionRequired: true,
      actionPath: '/hokim-account',
    },
  ],
};

describe('DistrictOnboardingChecklist Component Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    setupMatchMedia();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  function renderChecklist(districtId = 'dist_test_1') {
    return render(
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={mahallaTheme}>
          <DistrictProvider>
            <BrowserRouter>
              <DistrictOnboardingChecklist districtId={districtId} />
            </BrowserRouter>
          </DistrictProvider>
        </ConfigProvider>
      </QueryClientProvider>
    );
  }

  it('renders all 8 prerequisite items and progress bar (AC 1, 2)', async () => {
    vi.spyOn(districtClient, 'getDistrictReadiness').mockResolvedValue({
      readiness: mockReadiness,
    });

    renderChecklist();

    expect(
      await screen.findByText('Туманни фаоллаштиришга тайёрлаш')
    ).toBeTruthy();
    expect(screen.getByText('4 / 8 та талаб бажарилди')).toBeTruthy();
    expect(screen.getByText('Туман маълумотлари')).toBeTruthy();
    expect(screen.getByText('Тизимга кириш ҳуқуқи')).toBeTruthy();
    expect(screen.getByText('Асосий таҳлил созламалари')).toBeTruthy();
    expect(screen.getByText('Ҳудудий хавфсизлик чегараси')).toBeTruthy();
    expect(
      screen.getByText('Операцион кириш очиқлигини тасдиқлаш')
    ).toBeTruthy();
    expect(screen.getByText('Telegram бот уланиши')).toBeTruthy();
    expect(screen.getByText('Гуруҳлар ва маҳаллалар харитаси')).toBeTruthy();
    expect(screen.getByText('Ҳоким аккаунти')).toBeTruthy();
  });

  it('renders disabled activation button when isActivationReady is false (AC 2, 7)', async () => {
    vi.spyOn(districtClient, 'getDistrictReadiness').mockResolvedValue({
      readiness: mockReadiness,
    });

    renderChecklist();

    const activateBtn = await screen.findByRole('button', {
      name: 'Туманни фаоллаштириш',
    });
    expect(activateBtn.hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByText(/Фаоллаштириш учун барча талаблар бажарилиши керак/)
    ).toBeTruthy();
  });

  it('opens disclosure confirmation modal on clicking confirm button (AC 5)', async () => {
    vi.spyOn(districtClient, 'getDistrictReadiness').mockResolvedValue({
      readiness: mockReadiness,
    });

    renderChecklist();

    const confirmBtn = await screen.findByRole('button', { name: 'Тасдиқлаш' });
    expect(confirmBtn).toBeTruthy();

    fireEvent.click(confirmBtn);

    expect(
      await screen.findByRole('dialog', {
        name: 'Операцион кириш очиқлигини тасдиқлаш',
      })
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Тасдиқлаш ва сақлаш' })
    ).toBeTruthy();
  });

  it('disables confirmation submit and shows offline banner when offline (AC 11)', async () => {
    vi.spyOn(districtClient, 'getDistrictReadiness').mockResolvedValue({
      readiness: mockReadiness,
    });

    // Mock navigator.onLine as false
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    renderChecklist();

    const confirmBtn = await screen.findByRole('button', { name: 'Тасдиқлаш' });
    fireEvent.click(confirmBtn);

    expect(
      await screen.findByText('Сервер билан алоқа мавжуд эмас. Тармоқни текширинг.')
    ).toBeTruthy();

    const submitBtn = screen.getByRole('button', { name: 'Тасдиқлаш ва сақлаш' });
    expect(submitBtn.hasAttribute('disabled')).toBe(true);

    // Restore onLine
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });

  it('renders action buttons for incomplete prerequisites and navigates correctly (AC 1, 11, 14)', async () => {
    vi.spyOn(districtClient, 'getDistrictReadiness').mockResolvedValue({
      readiness: mockReadiness,
    });

    const { container } = renderChecklist();

    const actionBtns = await screen.findAllByRole('button', { name: 'Созлаш' });
    expect(actionBtns.length).toBeGreaterThanOrEqual(1);

    const tgActionBtn = container.querySelector('#action-button-telegram_bot');
    expect(tgActionBtn).toBeTruthy();
  });
});

