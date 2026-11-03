import { render, screen } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

const configMock = vi.hoisted(() => ({ current: undefined as { name?: string } | undefined }));
const sizeMock = vi.hoisted(() => ({ current: { w: 'lg', h: 'normal', compact: false, squat: false } }));
vi.mock('@/hooks/useWidgetSize', () => ({ useWidgetSize: () => sizeMock.current }));

vi.mock('@/i18n', () => ({
  useI18n: () => ({
    t: (k: string) => {
      const map: Record<string, string> = { 'widgets.weather.conditions.sunny': 'Ensoleillé' };
      return map[k] ?? k;
    },
    tArray: () => ['D', 'L', 'M', 'M', 'J', 'V', 'S'],
  }),
}));

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => configMock.current })),
}));

vi.mock('@/components/layout/DashboardGrid', () => ({
  useWidgetId: () => 'weather',
}));

vi.mock('@hakit/core', () => ({
  useHass: (selector: (s: { entities: Record<string, unknown> }) => unknown) => selector({ entities: { 'weather.home': {} } }),
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

test('en case large, les quatre jours de prévisions sont affichés', () => {
  sizeMock.current = { w: 'lg', h: 'normal', compact: false, squat: false };
  const { container } = render(<WeatherCard />);
  expect(container.querySelector('.grid-cols-4')).not.toBeNull();
});

test('en case étroite, les prévisions sont repliées et la température réduite', () => {
  sizeMock.current = { w: 'sm', h: 'tall', compact: true, squat: false };
  const { container } = render(<WeatherCard />);
  expect(container.querySelector('.grid-cols-4')).toBeNull();
  const temp = screen.getByText(/21.*°/);
  expect(temp.className).toContain('text-3xl');
  expect(temp.className).not.toContain('72px');
});

test('en deux rangées : la ville, la température, la condition et les extrêmes du jour', () => {
  sizeMock.current = { w: 'lg', h: 'short', compact: false, squat: false };
  configMock.current = { name: 'Seattle, WA' };
  const { container } = render(<WeatherCard />);
  expect(screen.getByText('Seattle, WA')).toBeDefined();
  expect(screen.getByText(/21.*°/)).toBeDefined();
  expect(screen.getByText(/Ensoleill/i)).toBeDefined();
  expect(screen.getByText('widgets.weather.range')).toBeDefined();
  // Pas de prévisions ni de chips : la disposition est celle de la tuile Echo.
  expect(container.querySelector('.grid-cols-4')).toBeNull();
  configMock.current = undefined;
});
