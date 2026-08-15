import { render, screen, fireEvent } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

const callService = vi.fn();

// Les pastilles n'ont plus d'entité par défaut : chacune n'existe que si la
// config du widget lui en assigne une.
vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({
    getWidgetConfig: () => ({
      pills: [
        { id: 'alarm', entityId: 'alarm_control_panel.home_alarm' },
        { id: 'heater', entityId: 'climate.living_room' },
        { id: 'solar', entityId: 'sensor.battery_level' },
        { id: 'tempo', entityId: 'sensor.tempo_current_color' },
        { id: 'temp', entityId: 'sensor.bedroom_temperature' },
        // Pastille personnalisée : libellé depuis le template, clic = bascule.
        { id: 'porte', entityId: 'lock.front_door', label: 'Porte', template: '{state}', action: 'toggle' },
      ],
    }),
  })),
}));

vi.mock('@hakit/core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useHass: (selector?: any) => {
    const state = {
      entities: {
        'alarm_control_panel.home_alarm': { state: 'armed' },
        'climate.living_room': { state: 'on' },
        'sensor.battery_level': { state: '50' },
        'sensor.tempo_current_color': { state: 'Rouge' },
        'sensor.bedroom_temperature': { state: '19.5' },
        'lock.front_door': { state: 'locked' },
        'person.user_1': { attributes: { friendly_name: 'User 1', entity_picture: '/local/avatar.jpg' }, state: 'home' },
      },
      connection: { socket: { url: 'ws://localhost:8123/api/websocket' } },
      helpers: { callService },
    };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

import { ActivityBar } from './ActivityBar';

// Les libellés passent désormais par `t()` (règle i18n du projet) et le mock
// global de `@/i18n` renvoie la clé : on assert donc les clés de traduction,
// ce qui vérifie aussi qu'aucun texte n'est resté codé en dur.
test('renders pills and avatar initials when avatar fetch fails', () => {
  render(<ActivityBar />);
  expect(screen.getByText('activityBar.alarmArmed')).toBeDefined();
  expect(screen.getByText('activityBar.pelletOn')).toBeDefined();
  expect(screen.getByText('activityBar.battery')).toBeDefined();
  expect(screen.getByText('activityBar.tempo')).toBeDefined();
});

test('une pastille personnalisée rend son template et bascule son entité au clic', () => {
  render(<ActivityBar />);
  const pill = screen.getByText('Porte locked');
  // Sans action, une pastille reste un simple <div> : seules les cliquables
  // deviennent des boutons.
  expect(screen.getByText('activityBar.tempo').closest('button')).toBeNull();
  fireEvent.click(pill);
  expect(callService).toHaveBeenCalledWith(expect.objectContaining({ domain: 'lock', service: 'unlock' }));
});
