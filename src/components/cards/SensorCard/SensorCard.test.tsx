import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/i18n', () => ({
  useI18n: () => ({ t: (k: string) => k, tArray: () => [] }),
}));

const mockEntity = {
  state: '22.5',
  attributes: {
    friendly_name: 'Température Chambre',
    unit_of_measurement: '°C',
  },
};

vi.mock('@hakit/core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useHass: (selector?: any) => {
    const state = { helpers: { callService: vi.fn() } };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

vi.mock('@/hooks/useSafeEntity', () => ({
  useSafeEntity: vi.fn(() => mockEntity),
}));

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({
    getWidgetConfig: () => ({
      type: 'sensor',
      entityId: 'sensor.bedroom_temperature',
      name: 'Chambre',
    }),
  })),
}));

vi.mock('@/components/layout/DashboardGrid', () => ({
  useWidgetId: () => 'sensor',
}));

vi.mock('@/hooks/useSensorHistory', () => ({
  useSensorHistory: () => ({ data: [], loading: false }),
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

import { SensorCard } from './SensorCard';

describe('SensorCard', () => {
  it('renders numeric sensor value', () => {
    render(<SensorCard />);
    expect(screen.getByText(/22\.5/)).toBeDefined();
    expect(screen.getByText(/chambre/i)).toBeDefined();
  });

  it('renders fallback when entity not found', async () => {
    const { useSafeEntity } = await import('@/hooks/useSafeEntity');
    vi.mocked(useSafeEntity).mockReturnValueOnce(null);
    render(<SensorCard />);
    expect(screen.getByText(/introuvable/i)).toBeDefined();
  });
});
