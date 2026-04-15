import { render } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => undefined })),
}));

vi.mock('@hakit/core', () => ({ useHass: () => ({ entities: {} }) }));

import { RoomsGrid } from './RoomsGrid';

test('renders rooms grid without crashing', () => {
  const { container } = render(<RoomsGrid />);
  expect(container).toBeDefined();
});
