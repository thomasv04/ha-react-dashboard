import { render } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => undefined })),
}));

vi.mock('@hakit/core', () => ({ useHass: () => ({ entities: {} }) }));

import { TempoCard } from './TempoCard';

test('renders TempoCard without error', () => {
  const { container } = render(<TempoCard />);
  expect(container).toBeDefined();
});
