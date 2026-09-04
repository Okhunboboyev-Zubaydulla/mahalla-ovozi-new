import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DateScopeSelect } from '../../src/components/topics/DateScopeSelect.js';

describe('DateScopeSelect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-03T12:00:00+05:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  it('renders Бугун / Кеча / Сана бўйича tabs', () => {
    render(
      <DateScopeSelect
        dateScope="today"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByText('Бугун')).toBeTruthy();
    expect(screen.getByText('Кеча')).toBeTruthy();
    expect(screen.getByText('Сана бўйича')).toBeTruthy();
  });

  it('opens overlay when custom tab is selected from a non-custom scope', () => {
    const handleChange = vi.fn();
    render(
      <DateScopeSelect
        dateScope="today"
        onChange={handleChange}
      />,
    );

    // Clicking the Segmented option for 'custom' triggers handleScopeChange
    // Since dateScope is 'today', it should call onChange and open the overlay
    fireEvent.click(screen.getByText('Сана бўйича'));
    expect(handleChange).toHaveBeenCalledWith(
      expect.objectContaining({ dateScope: 'custom' }),
    );
  });

  it('shows overlay with manual inputs and preset buttons when open', () => {
    const handleChange = vi.fn();
    render(
      <DateScopeSelect
        dateScope="custom"
        dateFrom="2026-08-27"
        dateTo="2026-09-03"
        onChange={handleChange}
      />,
    );

    // Toggle open by clicking the custom label
    fireEvent.click(screen.getByText(/27\.08/));

    expect(screen.getByLabelText('Бошланғич санани қўлда киритиш')).toBeTruthy();
    expect(screen.getByLabelText('Якуний санани қўлда киритиш')).toBeTruthy();
    expect(screen.getByText('7 кун')).toBeTruthy();
    expect(screen.getByText('14 кун')).toBeTruthy();
    expect(screen.getByText('30 кун')).toBeTruthy();
    expect(screen.getByLabelText('Киритилган саналарни қўллаш')).toBeTruthy();
  });

  it('applies manual date input and calls onChange with YYYY-MM-DD format', () => {
    const handleChange = vi.fn();
    render(
      <DateScopeSelect
        dateScope="custom"
        dateFrom="2026-08-27"
        dateTo="2026-09-03"
        onChange={handleChange}
      />,
    );

    // Open overlay
    fireEvent.click(screen.getByText(/27\.08/));

    const fromInput = screen.getByLabelText('Бошланғич санани қўлда киритиш');
    const toInput = screen.getByLabelText('Якуний санани қўлда киритиш');
    const applyBtn = screen.getByLabelText('Киритилган саналарни қўллаш');

    fireEvent.change(fromInput, { target: { value: '10.08.2026' } });
    fireEvent.change(toInput, { target: { value: '20.08.2026' } });
    fireEvent.click(applyBtn);

    expect(handleChange).toHaveBeenCalledWith({
      dateScope: 'custom',
      dateFrom: '2026-08-10',
      dateTo: '2026-08-20',
    });
  });

  it('shows validation error when from date is after to date', () => {
    const handleChange = vi.fn();
    render(
      <DateScopeSelect
        dateScope="custom"
        dateFrom="2026-08-10"
        dateTo="2026-08-20"
        onChange={handleChange}
      />,
    );

    fireEvent.click(screen.getByText(/10\.08/));

    const fromInput = screen.getByLabelText('Бошланғич санани қўлда киритиш');
    const toInput = screen.getByLabelText('Якуний санани қўлда киритиш');
    const applyBtn = screen.getByLabelText('Киритилган саналарни қўллаш');

    fireEvent.change(fromInput, { target: { value: '25.08.2026' } });
    fireEvent.change(toInput, { target: { value: '10.08.2026' } });
    fireEvent.click(applyBtn);

    expect(handleChange).not.toHaveBeenCalled();
    expect(screen.getByText('Бошланғич сана якуний санадан кейин бўлиши мумкин эмас')).toBeTruthy();
  });

  it('preset buttons update inputs and highlight without closing overlay, and apply only when Қўллаш is clicked', () => {
    const handleChange = vi.fn();
    render(
      <DateScopeSelect
        dateScope="custom"
        dateFrom="2026-08-27"
        dateTo="2026-09-03"
        onChange={handleChange}
      />,
    );

    fireEvent.click(screen.getByText(/27\.08/));
    handleChange.mockClear();

    const preset14 = screen.getByText('14 кун');
    fireEvent.click(preset14);

    // Preset does NOT auto-apply or close overlay
    expect(handleChange).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Сана оралиғини танлаш' })).toBeTruthy();

    // Inputs are updated to 14 days
    const fromInput = screen.getByLabelText('Бошланғич санани қўлда киритиш') as HTMLInputElement;
    const toInput = screen.getByLabelText('Якуний санани қўлда киритиш') as HTMLInputElement;
    expect(fromInput.value).toBe('21.08.2026');
    expect(toInput.value).toBe('03.09.2026');

    // Only when Қўллаш is clicked does it apply and close
    const applyBtn = screen.getByLabelText('Киритилган саналарни қўллаш');
    fireEvent.click(applyBtn);

    expect(handleChange).toHaveBeenCalledWith({
      dateScope: 'custom',
      dateFrom: '2026-08-21',
      dateTo: '2026-09-03',
    });
    expect(screen.queryByRole('dialog', { name: 'Сана оралиғини танлаш' })).toBeNull();
  });

  it('does not show overlay initially when dateScope is not custom', () => {
    render(
      <DateScopeSelect
        dateScope="today"
        onChange={vi.fn()}
      />,
    );

    expect(screen.queryByRole('dialog', { name: 'Сана оралиғини танлаш' })).toBeNull();
  });
});
