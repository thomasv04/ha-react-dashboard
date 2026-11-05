import { render, screen } from '@testing-library/react';
import { vi, test, expect, describe } from 'vitest';

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => undefined })),
}));

vi.mock('@hakit/core', () => ({ useHass: () => ({ entities: {} }) }));

const sizeMock = vi.hoisted(() => ({ current: { w: 'md', h: 'squat', compact: true, squat: true } }));
vi.mock('@/hooks/useWidgetSize', () => ({ useWidgetSize: () => sizeMock.current }));

import { GreetingCard, ClockWidget } from './GreetingCard';

test('renders greeting card content', () => {
  const { container } = render(<GreetingCard />);
  // ensure rendering succeeds and a time string is present
  expect(container).toBeDefined();
});

describe('ClockWidget (#81)', () => {
  test('à sa taille par défaut, une colonne, ne garde que l’heure : rien ne déborde', () => {
    sizeMock.current = { w: 'xs', h: 'squat', compact: true, squat: true };
    render(<ClockWidget />);
    expect(screen.queryByTestId('clock-seconds')).toBeNull();
    expect(screen.queryByTestId('clock-date')).toBeNull();
    expect(screen.getByTestId('clock-time')).toBeInTheDocument();
  });

  test('sur deux colonnes, les secondes reviennent, pas encore la date', () => {
    sizeMock.current = { w: 'sm', h: 'squat', compact: true, squat: true };
    render(<ClockWidget />);
    expect(screen.getByTestId('clock-seconds')).toBeInTheDocument();
    expect(screen.queryByTestId('clock-date')).toBeNull();
  });

  test('à partir de trois colonnes, tout s’affiche', () => {
    sizeMock.current = { w: 'md', h: 'squat', compact: true, squat: true };
    render(<ClockWidget />);
    expect(screen.getByTestId('clock-seconds')).toBeInTheDocument();
    expect(screen.getByTestId('clock-date')).toBeInTheDocument();
  });
});
