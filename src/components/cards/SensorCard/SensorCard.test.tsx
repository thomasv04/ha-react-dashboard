import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

const mockEntity = {
  state: '22.5',
  attributes: {
    friendly_name: 'Température Chambre',
    unit_of_measurement: '°C',
  },
};

vi.mock('@hakit/core', () => ({
  useHass: (selector?: any) => {
    const state = { helpers: { callService: vi.fn() } };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

vi.mock('@/hooks/useSafeEntity', () => ({
  useSafeEntity: vi.fn(() => mockEntity),
}));

vi.mock('@/context/DashboardLayoutContext', () => ({
  useDashboardLayout: vi.fn(() => ({
    getWidgetConfig: () => ({
      type: 'sensor',
      entityId: 'sensor.temperature_chambre_temperature',
      name: 'Chambre',
    }),
  })),
}));

import { SensorCard } from './SensorCard';

describe('SensorCard', () => {
  it('renders numeric sensor value', () => {
    render(<SensorCard />);
    expect(screen.getByText('22.5')).toBeDefined();
    expect(screen.getByText(/chambre/i)).toBeDefined();
  });

  it('renders fallback when entity not found', async () => {
    const { useSafeEntity } = await import('@/hooks/useSafeEntity');
    vi.mocked(useSafeEntity).mockReturnValueOnce(null);
    render(<SensorCard />);
    expect(screen.getByText(/introuvable/i)).toBeDefined();
  });
});
