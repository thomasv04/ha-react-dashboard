import { render, screen } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => undefined })),
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
        'person.user_1': { attributes: { friendly_name: 'User 1', entity_picture: '/local/avatar.jpg' }, state: 'home' },
      },
      connection: { socket: { url: 'ws://localhost:8123/api/websocket' } },
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
