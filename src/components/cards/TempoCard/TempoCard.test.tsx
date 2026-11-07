import { render, screen } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

const config = vi.hoisted(() => ({ value: undefined as Record<string, unknown> | undefined }));
const entities = vi.hoisted(() => ({ value: {} as Record<string, { state: string }> }));

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => config.value })),
}));

vi.mock('@hakit/core', () => ({
  useHass: (select: (s: { entities: typeof entities.value }) => unknown) => select({ entities: entities.value }),
}));

import { TempoCard } from './TempoCard';

test('renders TempoCard without error', () => {
  const { container } = render(<TempoCard />);
  expect(container).toBeDefined();
});

// `t` renvoie la clé (test/setup.ts).
const EJP = 'widgets.tempo.ejp.ejp';
const NORMAL = 'widgets.tempo.ejp.normal';

test.each([
  ['EJP', 'Normal', EJP, NORMAL],
  ['on', 'off', EJP, NORMAL],
  ['Jour EJP', 'Non EJP', EJP, NORMAL],
  ['Oui', 'Pas d’EJP', EJP, NORMAL],
  ['unavailable', 'Normal', 'unavailable', NORMAL],
])('mode EJP : « %s » / « %s » → %s / %s', (today, tomorrow, shownToday, shownTomorrow) => {
  config.value = { mode: 'ejp', currentColorEntity: 'sensor.a', nextColorEntity: 'sensor.b', remainingRedEntity: 'sensor.n' };
  entities.value = { 'sensor.a': { state: today }, 'sensor.b': { state: tomorrow }, 'sensor.n': { state: '17' } };
  render(<TempoCard />);
  const tiles = screen.getAllByText(/^widgets\.tempo\.(today|tomorrow)$/).map(el => el.nextElementSibling?.textContent);
  expect(tiles).toEqual([shownToday, shownTomorrow]);
  expect(screen.getByText('widgets.tempo.ejp.remaining')).toBeDefined();
});
