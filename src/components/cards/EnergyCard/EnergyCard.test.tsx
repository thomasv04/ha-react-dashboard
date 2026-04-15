import React from 'react';
import { render } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => undefined })),
}));

vi.mock('@hakit/core', () => ({ useHass: () => ({ entities: {} }) }));

import { EnergyCard } from './EnergyCard';

test('renders EnergyCard', () => {
  const { container } = render(<EnergyCard />);
  expect(container).toBeDefined();
});
