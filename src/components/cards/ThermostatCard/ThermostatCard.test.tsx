import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => undefined })),
}));

const callServiceMock = vi.fn();

vi.mock('@hakit/core', () => ({
  useHass: () => ({ helpers: { callService: callServiceMock } }),
}));

vi.mock('@/hooks/useSafeEntity', () => ({
  useSafeEntity: () => ({
    attributes: { temperature: 21, current_temperature: 20.5, hvac_action: 'heating', preset_mode: 'comfort' },
    state: 'heating',
  }),
}));

import { ThermostatCard } from './ThermostatCard';

test('renders thermostat and calls services on interactions', () => {
  render(<ThermostatCard />);
  // there should be buttons (power + 3 presets)
  const buttons = screen.getAllByRole('button');
  expect(buttons.length).toBeGreaterThanOrEqual(4);

  // click power (first button)
  fireEvent.click(buttons[0]);
  expect(callServiceMock).toHaveBeenCalled();
});
