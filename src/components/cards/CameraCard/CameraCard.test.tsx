import { render, screen, fireEvent } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({ getWidgetConfig: () => undefined })),
}));

const callServiceMock = vi.fn();

vi.mock('@hakit/core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useHass: (selector?: any) => {
    const state = { entities: { 'input_select.camera_selector': { state: undefined } }, helpers: { callService: callServiceMock } };
    return typeof selector === 'function' ? selector(state) : state;
  },
}));

// Mock CameraFeed to avoid heavy internals
vi.mock('@/components/ui/CameraFeed/components/CameraFeed', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CameraFeed: ({ entityId, className }: any) => <div data-testid={`camera-${entityId}`} className={className} />,
}));

import { CameraCard } from './CameraCard';

test('renders camera card and selecting camera triggers service', () => {
  render(<CameraCard />);
  // The overlay and the control button both contain the camera name; select the control button by its text
  const cuisineBtn = screen.getByText('Cuisine');
  expect(cuisineBtn).toBeDefined();
  fireEvent.click(cuisineBtn);
  expect(callServiceMock).toHaveBeenCalled();
});
