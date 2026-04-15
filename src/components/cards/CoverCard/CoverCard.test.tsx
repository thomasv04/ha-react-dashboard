import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const callServiceMock = vi.fn();

const mockEntity = {
  state: 'open',
  attributes: {
    friendly_name: 'Volet Salon',
    current_position: 75,
  },
};

vi.mock('@hakit/core', () => ({
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
      type: 'cover',
      entityId: 'cover.living_room',
      name: 'Volet Salon',
    }),
  })),
}));

vi.mock('@/components/layout/DashboardGrid', () => ({
  useWidgetId: () => 'cover',
}));

import { CoverCard } from './CoverCard';
import { useSafeEntity } from '@/hooks/useSafeEntity';

describe('CoverCard', () => {
  beforeEach(() => {
    callServiceMock.mockClear();
    vi.mocked(useSafeEntity).mockReturnValue(mockEntity);
  });

  it('renders cover name and position', () => {
    render(<CoverCard />);
    expect(screen.getByText(/volet salon/i)).toBeDefined();
    expect(screen.getByText(/75/)).toBeDefined();
  });

  it('renders fallback when entity not found', () => {
    vi.mocked(useSafeEntity).mockReturnValueOnce(null);
    render(<CoverCard />);
    expect(screen.getByText(/introuvable/i)).toBeDefined();
  });

  it('calls open_cover service on open button click', () => {
    render(<CoverCard />);
    const buttons = screen.getAllByRole('button');
    // Find the open button (ChevronUp)
    const openBtn = buttons.find(b => b.getAttribute('title')?.toLowerCase().includes('ouvrir')) ?? buttons[0];
    fireEvent.click(openBtn);
    expect(callServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({ service: 'open_cover' }),
    );
  });
});
