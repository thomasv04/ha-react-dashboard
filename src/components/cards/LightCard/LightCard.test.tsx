import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const callServiceMock = vi.fn();

const mockEntity = {
  state: 'on',
  attributes: {
    friendly_name: 'Salon',
    brightness: 178,
    supported_color_modes: ['brightness'],
  },
};

vi.mock('@hakit/core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useHass: (selector?: any) => {
    const state = { helpers: { callService: callServiceMock } };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

vi.mock('@/hooks/useSafeEntity', () => ({
  useSafeEntity: vi.fn(() => mockEntity),
}));

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({
    getWidgetConfig: () => ({
      type: 'light',
      entityId: 'light.salon',
      name: 'Salon',
    }),
  })),
}));

vi.mock('@/components/layout/DashboardGrid', () => ({
  useWidgetId: () => 'light',
}));

import { LightCard } from './LightCard';
import { useSafeEntity } from '@/hooks/useSafeEntity';

describe('LightCard', () => {
  beforeEach(() => {
    callServiceMock.mockClear();
    vi.mocked(useSafeEntity).mockReturnValue(mockEntity);
  });

  it('renders light name and brightness', () => {
    render(<LightCard />);
    expect(screen.getByText(/salon/i)).toBeDefined();
    // 178/255 ≈ 70%
    expect(screen.getByText(/70/)).toBeDefined();
  });

  it('renders fallback when entity not found', () => {
    vi.mocked(useSafeEntity).mockReturnValueOnce(null);
    render(<LightCard />);
    expect(screen.getByText(/introuvable/i)).toBeDefined();
  });

  it('toggles light on click', () => {
    render(<LightCard />);
    const toggleBtn = screen.getAllByRole('button')[0];
    fireEvent.click(toggleBtn);
    expect(callServiceMock).toHaveBeenCalledWith(expect.objectContaining({ service: 'toggle' }));
  });
});
