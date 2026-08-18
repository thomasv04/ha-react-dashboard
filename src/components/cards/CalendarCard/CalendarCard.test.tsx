import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const serviceResponse = vi.fn();
let config: Record<string, unknown> = {};

vi.mock('@hakit/core', () => ({ useHass: (selector: (s: unknown) => unknown) => selector({ entities: {} }) }));
vi.mock('@/hooks/useServiceResponse', () => ({
  useServiceResponse: (options: unknown) => {
    serviceResponse(options);
    return { data: responses, loading: false, error: null, refresh: vi.fn() };
  },
}));
vi.mock('@/context/WidgetConfigContext', () => ({ useWidgetConfig: () => ({ getWidgetConfig: () => config }) }));
vi.mock('@/components/layout/DashboardGrid', () => ({ useWidgetId: () => 'calendar-1' }));
vi.mock('@/hooks/useFormats', () => ({
  useFormats: () => ({ formatDate: (d: Date) => d.toISOString().slice(0, 10), formatTime: () => '10:00' }),
}));

let responses: Record<string, { events: Array<{ start: string; end: string; summary: string }> }> | null = null;

const event = (summary: string, start: string) => ({ summary, start, end: start });

import { CalendarCard } from './CalendarCard';

beforeEach(() => {
  vi.clearAllMocks();
  config = {};
  responses = null;
});

describe('CalendarCard', () => {
  it('invite à choisir un agenda quand aucun n’est lié', () => {
    render(<CalendarCard />);

    expect(screen.getByText('widgets.calendar.noCalendar')).toBeInTheDocument();
  });

  it("lit l'agenda unique posé par l'ajout de widget", () => {
    // Le cas réel qui laissait la card vide : l'entité choisie à l'ajout
    // atterrissait dans `entityId`, la card ne lisait que `entityIds`.
    config = { entityId: 'calendar.ms365' };
    responses = { 'calendar.ms365': { events: [event('Dentiste', '2026-08-19T10:00:00')] } };

    render(<CalendarCard />);

    expect(serviceResponse).toHaveBeenCalledWith(expect.objectContaining({ entityId: ['calendar.ms365'] }));
    expect(screen.getByText('Dentiste')).toBeInTheDocument();
  });

  it('fusionne plusieurs agendas dans l’ordre chronologique', () => {
    config = { entityIds: ['calendar.perso', 'calendar.boulot'] };
    responses = {
      'calendar.perso': { events: [event('Cinéma', '2026-08-21T20:00:00')] },
      'calendar.boulot': { events: [event('Réunion', '2026-08-19T09:00:00')] },
    };

    render(<CalendarCard />);

    expect(serviceResponse).toHaveBeenCalledWith(expect.objectContaining({ entityId: ['calendar.perso', 'calendar.boulot'] }));
    const titles = screen.getAllByText(/Cinéma|Réunion/).map(n => n.textContent);
    expect(titles).toEqual(['Réunion', 'Cinéma']);
  });

  it('préfère la liste au champ unique quand les deux sont remplis', () => {
    config = { entityIds: ['calendar.perso'], entityId: 'calendar.ms365' };
    responses = { 'calendar.perso': { events: [] } };

    render(<CalendarCard />);

    expect(serviceResponse).toHaveBeenCalledWith(expect.objectContaining({ entityId: ['calendar.perso'] }));
  });
});
