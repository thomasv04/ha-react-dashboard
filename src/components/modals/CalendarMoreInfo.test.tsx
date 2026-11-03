import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const serviceResponse = vi.fn();
let config: Record<string, unknown> = {};
let responses: Record<string, { events: Array<{ start: string; end: string; summary: string }> }> | null = null;
let firstDayOfWeek = 1;

vi.mock('@hakit/core', () => ({ useHass: (selector: (s: unknown) => unknown) => selector({ entities: {} }) }));
vi.mock('@/hooks/useServiceResponse', () => ({
  useServiceResponse: (options: unknown) => {
    serviceResponse(options);
    return { data: responses, loading: false, error: null, refresh: vi.fn() };
  },
}));
vi.mock('@/context/WidgetConfigContext', () => ({ useWidgetConfig: () => ({ getWidgetConfig: () => config }) }));
vi.mock('@/hooks/useFormats', () => ({
  useFormats: () => ({ locale: 'fr', firstDayOfWeek, formatTime: () => '08:15', formatDate: () => '' }),
}));

import CalendarMoreInfo from './CalendarMoreInfo';

const ev = (summary: string, start: string, end = start) => ({ summary, start, end });

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 26, 12));
  config = { entityIds: ['calendar.famille'] };
  responses = null;
  firstDayOfWeek = 1;
});
afterEach(() => vi.useRealTimers());

const open = () => render(<CalendarMoreInfo entityId='' widgetId='calendar-1' />);

describe('CalendarMoreInfo', () => {
  it('demande les évènements de toute la grille visible', () => {
    open();
    expect(serviceResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        entityId: ['calendar.famille'],
        serviceData: { start_date_time: '2026-09-28 00:00:00', end_date_time: '2026-11-02 00:00:00' },
      })
    );
  });

  it('commence la grille au premier jour de semaine des réglages', () => {
    firstDayOfWeek = 0;
    open();
    expect(document.querySelector('[role=gridcell]')?.getAttribute('data-day')).toBe('2026-09-27');
  });

  it('pose des points sous les jours qui ont des évènements et liste ceux du jour sélectionné', () => {
    responses = { 'calendar.famille': { events: [ev('Soccer', '2026-10-26T16:00:00'), ev('Stand-up', '2026-10-19T08:15:00')] } };
    open();

    expect(screen.getByTestId('calendar-event')).toHaveTextContent('Soccer');

    fireEvent.click(document.querySelector('[data-day="2026-10-19"]')!);
    expect(within(screen.getByTestId('calendar-day')).getByText('Stand-up')).toBeInTheDocument();
    expect(screen.queryByText('Soccer')).not.toBeInTheDocument();
  });

  it('change de mois et redemande la bonne plage', () => {
    open();
    fireEvent.click(screen.getByLabelText('widgets.calendar.moreInfo.nextMonth'));
    expect(serviceResponse).toHaveBeenLastCalledWith(
      expect.objectContaining({ serviceData: { start_date_time: '2026-10-26 00:00:00', end_date_time: '2026-12-07 00:00:00' } })
    );
  });

  it('bascule en vue journée et revient', () => {
    open();
    fireEvent.click(screen.getByText('widgets.calendar.moreInfo.changeView'));
    expect(screen.queryByTestId('calendar-month')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('widgets.calendar.moreInfo.changeView'));
    expect(screen.getByTestId('calendar-month')).toBeInTheDocument();
  });

  it('« Aujourd’hui » ramène au jour courant', () => {
    open();
    fireEvent.click(screen.getByLabelText('widgets.calendar.moreInfo.nextMonth'));
    fireEvent.click(screen.getByText('widgets.calendar.moreInfo.today'));
    expect(document.querySelector('[aria-current=date]')?.getAttribute('data-day')).toBe('2026-10-26');
  });

  it('laisse le bouton « + » désactivé', () => {
    open();
    expect(screen.getByLabelText('widgets.calendar.moreInfo.add')).toBeDisabled();
  });

  it('invite à choisir un agenda quand aucun n’est lié', () => {
    config = {};
    open();
    expect(screen.getByText('widgets.calendar.noCalendar')).toBeInTheDocument();
  });
});
