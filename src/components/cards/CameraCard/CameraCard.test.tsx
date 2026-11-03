import { render, screen, fireEvent } from '@testing-library/react';
import { vi, test, expect } from 'vitest';

// Plus de caméras par défaut : la liste vient entièrement de la config.
vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: vi.fn(() => ({
    getWidgetConfig: () => ({
      cameras: [
        { entityId: 'camera.front_door', name: 'Entrée' },
        { entityId: 'camera.kitchen', name: 'Cuisine' },
      ],
      selectorEntity: 'input_select.camera_selector',
    }),
  })),
}));

const callServiceMock = vi.fn();
const threeMinutesAgo = new Date(Date.now() - 3 * 60_000).toISOString();

vi.mock('@hakit/core', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useHass: (selector?: any) => {
    const state = {
      entities: {
        'input_select.camera_selector': { state: undefined },
        'binary_sensor.motion': { state: 'off', last_changed: threeMinutesAgo },
      },
      helpers: { callService: callServiceMock },
    };
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

test('shows an empty state instead of crashing when no camera is configured', async () => {
  const { useWidgetConfig } = await import('@/context/WidgetConfigContext');
  vi.mocked(useWidgetConfig).mockReturnValueOnce({
    getWidgetConfig: () => undefined,
  } as unknown as ReturnType<typeof useWidgetConfig>);

  render(<CameraCard />);
  expect(screen.getByText('widgets.camera.empty')).toBeDefined();
});

test('affiche « il y a X min » quand la caméra a une entité d’événement', async () => {
  const { useWidgetConfig } = await import('@/context/WidgetConfigContext');
  vi.mocked(useWidgetConfig).mockReturnValueOnce({
    getWidgetConfig: () => ({ cameras: [{ entityId: 'camera.driveway', name: 'Allée', eventEntity: 'binary_sensor.motion' }] }),
  } as unknown as ReturnType<typeof useWidgetConfig>);

  render(<CameraCard />);
  expect(screen.getByText('widgets.sensor.updatedAgo')).toBeDefined();
});

test('n’affiche aucune ancienneté sans entité d’événement', () => {
  render(<CameraCard />);
  expect(screen.queryByText('widgets.sensor.updatedAgo')).toBeNull();
});
