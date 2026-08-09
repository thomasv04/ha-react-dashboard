import { render } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@hakit/core', () => ({ useHass: () => ({ entities: {} }) }));

// La card lit sa config par le contexte ; le test la rend hors provider.
vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: () => ({ getWidgetConfig: () => undefined }),
}));

import { PelletCard } from './PelletCard';

test('renders PelletCard', () => {
  const { container } = render(<PelletCard />);
  expect(container).toBeDefined();
});
