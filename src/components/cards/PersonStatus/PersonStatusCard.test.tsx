import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/hooks/useSafeEntity', () => ({
  useSafeEntity: vi.fn((id: string) => {
    if (id === 'person.thomas') return {
      state: 'home',
      attributes: { friendly_name: 'Thomas', entity_picture: null },
    };
    if (id === 'person.marie') return {
      state: 'not_home',
      attributes: { friendly_name: 'Marie', entity_picture: null },
    };
    return null;
  }),
}));

vi.mock('@/context/DashboardLayoutContext', () => ({
  useDashboardLayout: vi.fn(() => ({
    getWidgetConfig: () => ({
      type: 'person',
      persons: [
        { entityId: 'person.thomas' },
        { entityId: 'person.marie' },
      ],
    }),
  })),
}));

import { PersonStatusCard } from './PersonStatusCard';

describe('PersonStatusCard', () => {
  it('renders person names', () => {
    render(<PersonStatusCard />);
    expect(screen.getByText('Thomas')).toBeDefined();
    expect(screen.getByText('Marie')).toBeDefined();
  });

  it('shows MAISON for home state', () => {
    render(<PersonStatusCard />);
    expect(screen.getByText('MAISON')).toBeDefined();
  });

  it('shows ABSENT for not_home', () => {
    render(<PersonStatusCard />);
    expect(screen.getByText('ABSENT')).toBeDefined();
  });

  it('renders empty state when no persons configured', async () => {
    const { useDashboardLayout } = await import('@/context/DashboardLayoutContext');
    vi.mocked(useDashboardLayout).mockReturnValueOnce({
      getWidgetConfig: () => ({ type: 'person', persons: [] }),
    } as any);
    render(<PersonStatusCard />);
    expect(screen.getByText(/aucune personne/i)).toBeDefined();
  });
});
