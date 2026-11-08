import { render, screen } from '@testing-library/react';
import { vi, test, expect, beforeEach, afterEach } from 'vitest';

const config = vi.hoisted(() => ({ value: undefined as Record<string, unknown> | undefined }));
const entities = vi.hoisted(() => ({ value: {} as Record<string, { state: string }> }));

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => config.value })),
}));

vi.mock('@hakit/core', () => ({
  useHass: (select: (s: { entities: typeof entities.value }) => unknown) => select({ entities: entities.value }),
}));

import { TempoCard, ejpPending } from './TempoCard';
import manifest from './widget';

test('renders TempoCard without error', () => {
  const { container } = render(<TempoCard />);
  expect(container).toBeDefined();
});

// Hors saison EJP par défaut : « demain » ne passe pas « en attente ».
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 6, 15, 10));
});
afterEach(() => vi.useRealTimers());

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

test('éditeur : en EJP, ni heures creuses ni jours bleus/blancs ; le jour accepte un binary_sensor', () => {
  const shown = (mode: string) => manifest.fields.filter(f => !('showIf' in f) || f.showIf({ mode })).map(f => f.key);
  expect(shown('ejp')).toEqual(['mode', 'currentColorEntity', 'nextColorEntity', 'remainingRedEntity', 'ejpMonths', 'ejpAnnounceHour']);
  expect(shown('tempo')).toHaveLength(7);
  expect(manifest.fields.find(f => f.key === 'currentColorEntity')?.domain).toContain('binary_sensor');
});

const SEASON = ['11', '12', '1', '2', '3'];
test.each([
  ['novembre, 10 h', new Date(2026, 10, 8, 10), '5', true],
  ['novembre, 14 h : annoncé', new Date(2026, 10, 8, 14), '5', false],
  ['plus de jours EJP', new Date(2026, 10, 8, 10), '0', false],
  ['compteur absent', new Date(2026, 10, 8, 10), undefined, true],
  ['31 mars : demain est en avril', new Date(2026, 2, 31, 10), '5', false],
  ['31 octobre : demain est en novembre', new Date(2026, 9, 31, 10), '5', true],
])('ejpPending — %s', (_, now, remaining, expected) => {
  expect(ejpPending(now, SEASON, 14, remaining)).toBe(expected);
});

test('mode EJP : demain non annoncé avant 14 h → « en attente », jour EJP annoncé reste affiché', () => {
  vi.setSystemTime(new Date(2026, 10, 8, 10));
  config.value = { mode: 'ejp', currentColorEntity: 'binary_sensor.a', nextColorEntity: 'binary_sensor.b', remainingRedEntity: 'sensor.n' };
  entities.value = { 'binary_sensor.a': { state: 'off' }, 'binary_sensor.b': { state: 'off' }, 'sensor.n': { state: '17' } };
  const { unmount } = render(<TempoCard />);
  expect(screen.getByText('widgets.tempo.tomorrow').nextElementSibling?.textContent).toBe('widgets.tempo.ejp.pending');
  unmount();
  entities.value = { ...entities.value, 'binary_sensor.b': { state: 'on' } };
  render(<TempoCard />);
  expect(screen.getByText('widgets.tempo.tomorrow').nextElementSibling?.textContent).toBe(EJP);
});
