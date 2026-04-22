import { render, screen } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => {
      const map: Record<string, string> = { 'widgets.weather.conditions.sunny': 'Ensoleillé' };
      return map[k] ?? k;
    },
    tArray: () => [],
  }),
}));

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => undefined })),
}));

vi.mock('@/components/layout/DashboardGrid', () => ({
  useWidgetId: () => 'weather',
}));

vi.mock('@/components/ui/AnimatedNumber', () => ({
  AnimatedNumber: ({ value, decimals = 0, suffix = '' }: { value: number; decimals?: number; suffix?: string }) => {
    const display = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
    return (
      <span>
        {display}
        {suffix}
      </span>
    );
  },
}));

vi.mock('@hakit/core', () => ({
  useWeather: () => ({
    attributes: { temperature: 21, wind_speed: 5, wind_speed_unit: 'km/h' },
    forecast: {
      forecast: [
        { datetime: new Date().toISOString(), temperature: 22, templow: 10, condition: 'sunny' },
        { datetime: new Date(Date.now() + 86400000).toISOString(), temperature: 23, templow: 11, condition: 'cloudy' },
        { datetime: new Date(Date.now() + 2 * 86400000).toISOString(), temperature: 24, templow: 12, condition: 'rainy' },
        { datetime: new Date(Date.now() + 3 * 86400000).toISOString(), temperature: 25, templow: 13, condition: 'snowy' },
      ],
    },
    state: 'sunny',
  }),
}));

import { WeatherCard } from './WeatherCard';

test('renders weather basic info and forecast', () => {
  render(<WeatherCard />);
  expect(screen.getByText(/21.*°/)).toBeDefined();
  expect(screen.getByText(/Ensoleill/i)).toBeDefined();
  expect(screen.getByText(/5.*km\/h/)).toBeDefined();
});
