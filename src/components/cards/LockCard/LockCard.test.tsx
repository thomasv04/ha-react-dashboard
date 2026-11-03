import { render, screen, fireEvent } from '@testing-library/react';
import { vi, test, expect, beforeEach } from 'vitest';

const sizeMock = vi.hoisted(() => ({ current: { w: 'lg', h: 'tall', compact: false, squat: false } }));
vi.mock('@/hooks/useWidgetSize', () => ({ useWidgetSize: () => sizeMock.current }));

const lockState = vi.hoisted(() => ({ current: 'locked' }));
const callServiceMock = vi.hoisted(() => vi.fn());

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: () => ({ getWidgetConfig: () => ({ entityId: 'lock.front_door', confirmUnlock: false }) }),
}));
vi.mock('@/components/layout/DashboardGrid', () => ({ useWidgetId: () => 'lock' }));
vi.mock('@/hooks/useSoundFeedback', () => ({ useSoundFeedback: () => vi.fn() }));
vi.mock('@/hooks/useSafeEntity', () => ({
  useSafeEntity: () => ({ state: lockState.current, attributes: { friendly_name: "Porte d'entrée" } }),
}));
vi.mock('@hakit/core', () => ({
  useHass: (selector: (s: { helpers: { callService: typeof callServiceMock } }) => unknown) =>
    selector({ helpers: { callService: callServiceMock } }),
}));

import { LockCard } from './LockCard';

beforeEach(() => {
  callServiceMock.mockClear();
  lockState.current = 'locked';
  sizeMock.current = { w: 'lg', h: 'tall', compact: false, squat: false };
});

test('en grande case, le bouton rond déverrouille une serrure verrouillée', () => {
  render(<LockCard />);
  fireEvent.click(screen.getByRole('button', { name: 'widgets.lock.tapToUnlock' }));
  expect(callServiceMock).toHaveBeenCalledWith({ domain: 'lock', service: 'unlock', target: { entity_id: 'lock.front_door' } });
});

test('en grande case, le bouton rond verrouille une serrure déverrouillée', () => {
  lockState.current = 'unlocked';
  render(<LockCard />);
  fireEvent.click(screen.getByRole('button', { name: 'widgets.lock.tapToLock' }));
  expect(callServiceMock).toHaveBeenCalledWith({ domain: 'lock', service: 'lock', target: { entity_id: 'lock.front_door' } });
});

test('une serrure bloquée n’invite pas à toucher : le bouton porte l’état', () => {
  lockState.current = 'jammed';
  render(<LockCard />);
  expect(screen.getByRole('button', { name: 'widgets.lock.jammed' })).toBeDefined();
  expect(screen.queryByText('widgets.lock.tapToUnlock')).toBeNull();
});

test('en case basse, la tuile compacte garde son appui et n’a pas de bouton rond', () => {
  sizeMock.current = { w: 'lg', h: 'short', compact: false, squat: false };
  render(<LockCard />);
  expect(screen.queryByText('widgets.lock.tapToUnlock')).toBeNull();
  fireEvent.click(screen.getByRole('button', { pressed: true }));
  expect(callServiceMock).toHaveBeenCalledWith({ domain: 'lock', service: 'unlock', target: { entity_id: 'lock.front_door' } });
});
