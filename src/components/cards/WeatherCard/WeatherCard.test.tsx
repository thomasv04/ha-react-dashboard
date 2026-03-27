import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@hakit/core', () => ({
  useWeather: () => ({
    attributes: { temperature: 21, wind_speed: 5, wind_speed_unit: 'km/h' },
    forecast: { forecast: [
      { datetime: new Date().toISOString(), temperature: 22, templow: 10, condition: 'sunny' },
      { datetime: new Date(Date.now() + 86400000).toISOString(), temperature: 23, templow: 11, condition: 'cloudy' },
      { datetime: new Date(Date.now() + 2 * 86400000).toISOString(), temperature: 24, templow: 12, condition: 'rainy' },
      { datetime: new Date(Date.now() + 3 * 86400000).toISOString(), temperature: 25, templow: 13, condition: 'snowy' }
    ] },
    state: 'sunny',
  }),
}));

import { WeatherCard } from './WeatherCard';

test('renders weather basic info and forecast', () => {
  render(<WeatherCard />);
  expect(screen.getByText('21°')).toBeDefined();
  expect(screen.getByText(/Ensoleill/i)).toBeDefined();
  expect(screen.getByText(/5 km\/h/)).toBeDefined();
  expect(screen.getByText('23°')).toBeDefined();
});
