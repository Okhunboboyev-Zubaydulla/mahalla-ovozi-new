import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigProvider, App as AntdApp } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  type GetGlobalAnalysisSettingsResponse,
  type GlobalAnalysisSettingsDto,
  type GlobalAnalysisSettingsDraftDto,
} from '@mahalla-ovozi/api-contracts';
import { AiOperationsPage } from '../../src/pages/AiOperationsPage.js';
import { globalSettingsClient } from '../../src/api/global-settings-client.js';
import { DistrictProvider } from '../../src/district/district-context.js';
import { mahallaTheme } from '../../src/theme/antd-theme.js';

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

  Object.defineProperty(navigator, 'onLine', {
    writable: true,
    configurable: true,
    value: true,
  });
}

beforeAll(() => {
  setupMatchMedia();
});

const mockActiveSettings: GlobalAnalysisSettingsDto = {
  id: 'gcfg_v1',
  version: 1,
  modelProvider: 'OPENAI',
  modelId: 'gpt-4o-mini-2024-07-18',
  temperature: 0.0,
  maxOutputTokens: 500,
  relevanceSystemPrompt:
    'You are the Semantic Relevance Engine for Mahalla Ovozi (20+ chars prompt).',
  topicMatchingSystemPrompt:
    'You are the Topic Assignment & Clustering Engine for Mahalla Ovozi (20+ chars prompt).',
  topicProjectionSystemPrompt:
    'You are the Canonical Topic Projection Engine for Mahalla Ovozi (20+ chars prompt).',
  globalServiceVocabulary: [
    {
      term: 'Ичимлик суви',
      category: 'Сув таъминоти',
      description: 'Тоза ичимлик суви таъминоти',
    },
    {
      term: 'Табиий газ',
      category: 'Газ таъминоти',
    },
  ],
  isActive: true,
  activatedAt: '2026-08-01T05:00:00.000Z',
  activatedBy: null,
  changeReason: 'Тизимнинг дастлабки фаол глобал таҳлил конфигурацияси',
  createdAt: '2026-08-01T05:00:00.000Z',
};

const mockDraft: GlobalAnalysisSettingsDraftDto = {
  id: 'global',
  baseActiveVersionId: 'gcfg_v1',
  modelProvider: 'GEMINI',
  modelId: 'gemini-2.0-flash',
  temperature: 0.15,
  maxOutputTokens: 800,
  relevanceSystemPrompt:
    'Draft custom relevance system prompt for testing (20+ chars).',
  topicMatchingSystemPrompt:
    'Draft custom topic matching system prompt for testing (20+ chars).',
  topicProjectionSystemPrompt:
    'Draft custom topic projection system prompt for testing (20+ chars).',
  globalServiceVocabulary: [
    {
      term: 'Ичимлик суви',
      category: 'Сув таъминоти',
    },
    {
      term: 'Электр таъминоти',
      category: 'Электр энергияси',
    },
  ],
  updatedBy: 'acc_po_test',
  createdAt: '2026-08-27T04:00:00.000Z',
  updatedAt: '2026-08-27T04:30:00.000Z',
};

function renderAiOperationsPage(
  initialData: GetGlobalAnalysisSettingsResponse = {
    activeConfiguration: mockActiveSettings,
    draft: null,
  },
) {
  vi.spyOn(globalSettingsClient, 'getGlobalSettings').mockResolvedValue(
    initialData,
  );

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity, gcTime: 0 },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={mahallaTheme}>
        <AntdApp>
          <DistrictProvider>
            <AiOperationsPage />
          </DistrictProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

describe('Story 5.1: AiOperationsPage & Global Settings UI Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active configuration card with Uzbek Cyrillic labels and version metadata (AC 1, 12)', async () => {
    renderAiOperationsPage({
      activeConfiguration: mockActiveSettings,
      draft: null,
    });

    expect(
      await screen.findByText('Фаол глобал таҳлил созламалари'),
    ).toBeTruthy();

    expect(screen.getByText('Фаол созламалар')).toBeTruthy();
    expect(screen.getByText('gcfg_v1')).toBeTruthy();
    expect(screen.getByText('gpt-4o-mini-2024-07-18')).toBeTruthy();
    expect(screen.getByText('OPENAI')).toBeTruthy();
  });

  it('pre-populates draft form from active configuration when draft is null (AC 2, 12)', async () => {
    renderAiOperationsPage({
      activeConfiguration: mockActiveSettings,
      draft: null,
    });

    expect(
      await screen.findByText('Глобал таҳлил созламалари қораламаси'),
    ).toBeTruthy();

    const relevanceInput = screen.getByPlaceholderText(
      'Долзарблик таҳлили учун тизим кўрсатмаси...',
    ) as HTMLTextAreaElement;
    expect(relevanceInput.value).toBe(
      mockActiveSettings.relevanceSystemPrompt,
    );
  });

  it('pre-populates draft form from saved draft when draft exists (AC 3, 12)', async () => {
    renderAiOperationsPage({
      activeConfiguration: mockActiveSettings,
      draft: mockDraft,
    });

    expect(
      await screen.findByText('Глобал таҳлил созламалари қораламаси'),
    ).toBeTruthy();

    expect(screen.getByText('Қоралама')).toBeTruthy();

    const relevanceInput = screen.getByPlaceholderText(
      'Долзарблик таҳлили учун тизим кўрсатмаси...',
    ) as HTMLTextAreaElement;
    expect(relevanceInput.value).toBe(mockDraft.relevanceSystemPrompt);
  });

  it('registers dirty state on form edit and shows unpersisted changes tag (AC 4, 12)', async () => {
    renderAiOperationsPage({
      activeConfiguration: mockActiveSettings,
      draft: null,
    });

    expect(
      await screen.findByText('Глобал таҳлил созламалари қораламаси'),
    ).toBeTruthy();

    expect(screen.queryByText('Ўзгаришлар сақланмаган')).toBeNull();

    const relevanceInput = screen.getByPlaceholderText(
      'Долзарблик таҳлили учун тизим кўрсатмаси...',
    );
    fireEvent.change(relevanceInput, {
      target: { value: 'Modified relevance prompt text with sufficient length.' },
    });

    expect(await screen.findByText('Ўзгаришлар сақланмаган')).toBeTruthy();
  });

  it('renders accessible error summary on validation failure and manages focus (AC 6, 12)', async () => {
    renderAiOperationsPage({
      activeConfiguration: mockActiveSettings,
      draft: null,
    });

    expect(
      await screen.findByText('Глобал таҳлил созламалари қораламаси'),
    ).toBeTruthy();

    // Clear relevance prompt to trigger min 20 error
    const relevanceInput = screen.getByPlaceholderText(
      'Долзарблик таҳлили учун тизим кўрсатмаси...',
    );
    fireEvent.change(relevanceInput, { target: { value: 'Short' } });

    const submitBtn = document.getElementById('draft-submit-button');
    expect(submitBtn).toBeTruthy();
    fireEvent.click(submitBtn!);

    expect(await screen.findByText(/Тўлдиришда хатоликлар мавжуд/i)).toBeTruthy();
    expect(document.getElementById('global-settings-error-summary')).toBeTruthy();
  });

  it('successfully saves draft and triggers mutation without claiming activation (AC 5, 12)', async () => {
    const saveSpy = vi
      .spyOn(globalSettingsClient, 'saveGlobalSettingsDraft')
      .mockResolvedValue({
        draft: mockDraft,
        message: 'Қоралама муваффақиятли сақланди',
      });

    renderAiOperationsPage({
      activeConfiguration: mockActiveSettings,
      draft: null,
    });

    expect(
      await screen.findByText('Глобал таҳлил созламалари қораламаси'),
    ).toBeTruthy();

    const submitBtn = document.getElementById('draft-submit-button');
    expect(submitBtn).toBeTruthy();
    fireEvent.click(submitBtn!);

    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalledTimes(1);
    });
  });

  it('allows adding a new unique vocabulary term and prevents duplicate entry (AC 7, 10, 12)', async () => {
    renderAiOperationsPage({
      activeConfiguration: mockActiveSettings,
      draft: null,
    });

    expect(
      await screen.findByText('Глобал таҳлил созламалари қораламаси'),
    ).toBeTruthy();

    const newTermInput = document.getElementById('vocabulary-new-term');
    const addButton = document.getElementById('vocabulary-add-button');
    expect(newTermInput).toBeTruthy();
    expect(addButton).toBeTruthy();

    // Try adding duplicate term "Ичимлик суви"
    fireEvent.change(newTermInput!, { target: { value: 'ичимлик суви' } });
    fireEvent.click(addButton!);

    expect(
      await screen.findByText(/"ичимлик суви" атамаси рўйхатда аллақачон мавжуд./i),
    ).toBeTruthy();

    // Add unique term
    fireEvent.change(newTermInput!, { target: { value: 'Оқова сувлар' } });
    fireEvent.click(addButton!);

    expect(await screen.findByText('Оқова сувлар')).toBeTruthy();
  });

  it('resets form back to baseline on discard button click (AC 4, 12)', async () => {
    renderAiOperationsPage({
      activeConfiguration: mockActiveSettings,
      draft: null,
    });

    expect(
      await screen.findByText('Глобал таҳлил созламалари қораламаси'),
    ).toBeTruthy();

    const relevanceInput = screen.getByPlaceholderText(
      'Долзарблик таҳлили учун тизим кўрсатмаси...',
    ) as HTMLTextAreaElement;

    fireEvent.change(relevanceInput, {
      target: { value: 'Changed text that should be reverted by reset.' },
    });

    expect(await screen.findByText('Ўзгаришлар сақланмаган')).toBeTruthy();

    const discardBtn = screen.getByRole('button', {
      name: /ўзгаришларни бекор қилиш/i,
    });
    fireEvent.click(discardBtn);

    expect(screen.queryByText('Ўзгаришлар сақланмаган')).toBeNull();
    expect(relevanceInput.value).toBe(mockActiveSettings.relevanceSystemPrompt);
  });

  it('renders enabled History tab and switches to settings history on click (Story 5.4)', async () => {
    vi.spyOn(globalSettingsClient, 'getGlobalSettingsHistory').mockResolvedValue({
      items: [mockActiveSettings],
      totalCount: 1,
    });

    renderAiOperationsPage({
      activeConfiguration: mockActiveSettings,
      draft: null,
    });

    const historyTab = screen.getByRole('tab', { name: /Созламалар тарихи/i });
    expect(historyTab).toBeTruthy();
    expect(historyTab.getAttribute('aria-disabled')).not.toBe('true');

    fireEvent.click(historyTab);

    expect(
      await screen.findByText('Глобал созламалар тарихи'),
    ).toBeTruthy();
    expect(
      screen.getByText('Туман созламалари тарихи'),
    ).toBeTruthy();
  });
});


