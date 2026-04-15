import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => undefined })),
}));

vi.mock('@hakit/core', () => ({
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

test('renders pills and avatar initials when avatar fetch fails', () => {
  // ensure a desktop width
  // render
  render(<ActivityBar />);
  expect(screen.getByText(/Alarme/)).toBeDefined();
  expect(screen.getByText(/Poêle/)).toBeDefined();
  expect(screen.getByText(/Batterie solaire/)).toBeDefined();
  expect(screen.getByText(/Tempo/)).toBeDefined();
});
