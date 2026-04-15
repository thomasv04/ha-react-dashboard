import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@/hooks/useSafeEntity', () => ({
  useSafeEntity: vi.fn((id: string) => {
    if (id === 'person.user_1')
      return {
        state: 'home',
        attributes: { friendly_name: 'User 1', entity_picture: null },
      };
    if (id === 'person.user_2')
      return {
        state: 'not_home',
        attributes: { friendly_name: 'User 2', entity_picture: null },
      };
    return null;
  }),
}));

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({
    getWidgetConfig: () => ({
      type: 'person',
      persons: [{ entityId: 'person.user_1' }, { entityId: 'person.user_2' }],
    }),
  })),
}));

import { PersonStatusCard } from './PersonStatusCard';

describe('PersonStatusCard', () => {
  it('renders person names', () => {
    render(<PersonStatusCard />);
    expect(screen.getByText('User 1')).toBeDefined();
    expect(screen.getByText('User 2')).toBeDefined();
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
    const { useWidgetConfig } = await import('@/context/WidgetConfigContext');
    vi.mocked(useWidgetConfig).mockReturnValueOnce({
      getWidgetConfig: () => ({ type: 'person', persons: [] }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    render(<PersonStatusCard />);
    expect(screen.getByText(/aucune personne/i)).toBeDefined();
  });
});
