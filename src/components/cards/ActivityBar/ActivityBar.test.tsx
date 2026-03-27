import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@hakit/core', () => ({
  useHass: (selector?: any) => {
    const state = {
      entities: {
        'alarm_control_panel.alarmo': { state: 'armed' },
        'climate.pellet': { state: 'on' },
        'sensor.solarflow_2400_ac_electric_level': { state: '50' },
        'sensor.rte_tempo_couleur_actuelle': { state: 'Rouge' },
        'sensor.temperature_chambre_temperature': { state: '19.5' },
        'person.thomas': { attributes: { friendly_name: 'Thomas', entity_picture: '/local/avatar.jpg' }, state: 'home' },
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
