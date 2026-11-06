import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const callService = vi.fn();
let config: Record<string, unknown> = {};
const now = vi.hoisted(() => ({ current: new Date('2026-11-05T09:00:00') }));

vi.mock('@hakit/core', () => ({
  useUser: () => ({ name: 'Thomas Vigneron' }),
  useHass: (selector: (s: unknown) => unknown) =>
    selector({ helpers: { callService }, entities: { 'script.cinema': { attributes: { friendly_name: 'Soirée cinéma' } } } }),
}));
vi.mock('@/context/WidgetConfigContext', () => ({ useWidgetConfig: () => ({ getWidgetConfig: () => config }) }));
vi.mock('@/components/layout/DashboardGrid', () => ({ useWidgetId: () => 'welcome-1' }));
vi.mock('@/hooks/useNow', () => ({ useNow: () => now.current }));

import { WelcomeCard } from './WelcomeCard';

beforeEach(() => {
  callService.mockClear();
  config = {};
  now.current = new Date('2026-11-05T09:00:00');
});

describe('WelcomeCard', () => {
  it('salue au prénom, avec le souhait du moment', () => {
    render(<WelcomeCard />);
    const title = screen.getByRole('heading');
    expect(title).toHaveTextContent('widgets.greeting.goodMorning Thomas.');
    expect(title).toHaveTextContent('widgets.welcome.wish.morning');
  });

  it('change de salutation le soir', () => {
    now.current = new Date('2026-11-05T19:30:00');
    render(<WelcomeCard />);
    expect(screen.getByRole('heading')).toHaveTextContent('widgets.greeting.goodEvening Thomas.');
  });

  it('lance une routine d’un geste', () => {
    config = { routines: ['script.cinema'] };
    render(<WelcomeCard />);
    expect(screen.getByText('Soirée cinéma')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'widgets.welcome.start' }));
    expect(callService).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'script', service: 'turn_on', target: { entity_id: 'script.cinema' } })
    );
  });
});
