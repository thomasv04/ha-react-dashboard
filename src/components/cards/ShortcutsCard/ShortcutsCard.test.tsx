import { render } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => undefined })),
}));

vi.mock('@hakit/core', () => ({ useHass: () => ({ entities: {} }) }));

// Mock panel context to provide openPanel
vi.mock('@/context/PanelContext', () => ({ usePanel: () => ({ openPanel: vi.fn() }) }));

import { ShortcutsCard } from './ShortcutsCard';

test('renders ShortcutsCard basic', () => {
  const { container } = render(<ShortcutsCard />);
  expect(container).toBeDefined();
});
