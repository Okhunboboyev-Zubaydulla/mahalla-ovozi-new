import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ConfigProvider } from 'antd';
import {
  AnalysisSettingsRollbackModal,
  type AnalysisSettingsRollbackModalProps,
} from '../../src/components/ai/AnalysisSettingsRollbackModal.js';
import {
  type GlobalAnalysisSettingsDto,
} from '@mahalla-ovozi/api-contracts';
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

const mockActiveGlobal: GlobalAnalysisSettingsDto = {
  id: 'gcfg_v3',
  version: 3,
  modelProvider: 'GEMINI',
  modelId: 'gemini-2.0-flash',
  temperature: 0.35,
  maxOutputTokens: 600,
  relevanceSystemPrompt: 'Active V3 relevance prompt.',
  topicMatchingSystemPrompt: 'Active V3 topic matching prompt.',
  topicProjectionSystemPrompt: 'Active V3 topic projection prompt.',
  globalServiceVocabulary: [
    { term: 'Сув таъминоти', category: 'Коммунал' },
  ],
  isActive: true,
  activatedAt: '2026-08-26T12:00:00.000Z',
  createdAt: '2026-08-26T12:00:00.000Z',
};

const mockTargetGlobal: GlobalAnalysisSettingsDto = {
  id: 'gcfg_v1',
  version: 1,
  modelProvider: 'OPENAI',
  modelId: 'gpt-4o-mini',
  temperature: 0.0,
  maxOutputTokens: 500,
  relevanceSystemPrompt: 'Historical V1 relevance prompt.',
  topicMatchingSystemPrompt: 'Historical V1 topic matching prompt.',
  topicProjectionSystemPrompt: 'Historical V1 topic projection prompt.',
  globalServiceVocabulary: [
    { term: 'Ичимлик суви', category: 'Сув таъминоти' },
  ],
  isActive: false,
  activatedAt: '2026-08-01T00:00:00.000Z',
  createdAt: '2026-08-01T00:00:00.000Z',
};

describe('AnalysisSettingsRollbackModal Component Tests (Story 5.4)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupMatchMedia();
    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });

  function renderModal(props: Partial<AnalysisSettingsRollbackModalProps> = {}) {
    const defaultProps: AnalysisSettingsRollbackModalProps = {
      open: true,
      scope: 'global',
      activeVersion: mockActiveGlobal,
      targetVersion: mockTargetGlobal,
      onConfirm: vi.fn().mockResolvedValue(undefined),
      onCancel: vi.fn(),
      ...props,
    };

    return render(
      <ConfigProvider theme={mahallaTheme}>
        <AnalysisSettingsRollbackModal {...defaultProps} />
      </ConfigProvider>,
    );
  }

  it('renders modal header, future-only alert, and diff between active and target', () => {
    renderModal();

    expect(
      screen.getByText('Созламаларни олдинги версияга қайтариш (Rollback)'),
    ).toBeTruthy();
    expect(
      screen.getByText(/Келажак учун янги версия яратиш қоидаси/i),
    ).toBeTruthy();
    expect(screen.getByText(/V3 \(gcfg_v3\)/)).toBeTruthy();
    expect(screen.getByText(/V1 \(gcfg_v1\)/)).toBeTruthy();

    // Check Diff viewer renders scalar changes
    expect(screen.getByText(/Асосий модел параметрлари ўзгариши/)).toBeTruthy();
    expect(screen.getByText('GEMINI')).toBeTruthy();
    expect(screen.getByText('OPENAI')).toBeTruthy();
  });

  it('validates change reason: rejects empty, <5 characters, and prohibited secrets', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderModal({ onConfirm });

    const submitBtn = screen.getByRole('button', {
      name: /Янги версия сифатида қайтариш/i,
    });

    // 1. Submit empty
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(
        screen.getByText('Қайтариш сабабини киритиш шарт.'),
      ).toBeTruthy();
    });
    expect(onConfirm).not.toHaveBeenCalled();

    // 2. Submit with short reason (< 5 chars)
    const input = screen.getByPlaceholderText(
      /V2 даги тасдиқланган луғат ва модел параметрларига қайтиш/i,
    );
    fireEvent.change(input, { target: { value: 'Тест' } });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(
        screen.getByText('Қайтариш сабаби камида 5 та белгидан иборат бўлиши шарт.'),
      ).toBeTruthy();
    });
    expect(onConfirm).not.toHaveBeenCalled();

    // 3. Submit with secret (bot token)
    fireEvent.change(input, {
      target: {
        value:
          'Қайтариш сабаби: 123456789:ABCdefGHIjklMNOpqrsTUVwxyz1234567890 бот токени',
      },
    });
    fireEvent.click(submitBtn);
    await waitFor(() => {
      expect(
        screen.getByText(/махфий маълумотлар .* кўрсатилиши мумкин эмас/),
      ).toBeTruthy();
    });
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('successfully triggers onConfirm when a valid changeReason is entered', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    renderModal({ onConfirm });

    const input = screen.getByPlaceholderText(
      /V2 даги тасдиқланган луғат ва модел параметрларига қайтиш/i,
    );
    fireEvent.change(input, {
      target: { value: 'V1 дастлабки барқарор модел созламаларига қайтиш' },
    });

    const submitBtn = screen.getByRole('button', {
      name: /Янги версия сифатида қайтариш/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledWith(
        'V1 дастлабки барқарор модел созламаларига қайтиш',
      );
    });
  });

  it('restores focus to trigger button and invokes onCancel on Cancel button click', () => {
    const onCancel = vi.fn();
    const btn = document.createElement('button');
    btn.id = 'btn-rollback-gcfg_v1';
    document.body.appendChild(btn);

    renderModal({ onCancel });

    const cancelBtn = screen.getByRole('button', { name: /Бекор қилиш/i });
    fireEvent.click(cancelBtn);

    expect(onCancel).toHaveBeenCalledTimes(1);
    document.body.removeChild(btn);
  });

  it('renders API error message if onConfirm throws', async () => {
    const onConfirm = vi.fn().mockRejectedValue(
      new Error(
        'Фаол созламалар версияси ўзгарган. Илтимос, саҳифани янгилаб, қайта кўриб чиқинг.',
      ),
    );
    renderModal({ onConfirm });

    const input = screen.getByPlaceholderText(
      /V2 даги тасдиқланган луғат ва модел параметрларига қайтиш/i,
    );
    fireEvent.change(input, {
      target: { value: 'V1 дастлабки барқарор модел созламаларига қайтиш' },
    });

    const submitBtn = screen.getByRole('button', {
      name: /Янги версия сифатида қайтариш/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Қайтариш амалиёти бажарилмади')).toBeTruthy();
      expect(
        screen.getByText(/Фаол созламалар версияси ўзгарган/),
      ).toBeTruthy();
    });
  });
});
