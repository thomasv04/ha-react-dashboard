import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const callService = vi.fn();
const sendMessagePromise = vi.fn();
const openMoreInfo = vi.fn();
const runAction = vi.fn();
let entity: { state: string; attributes: Record<string, unknown> } | null;
let config: Record<string, unknown>;

vi.mock('@hakit/core', () => ({
  useHass: (selector?: (s: unknown) => unknown) => {
    const state = {
      helpers: { callService },
      // Comme le vrai formateur pour un nombre : valeur et unité.
      formatter: { stateValue: (e: typeof entity) => `${e!.state} ${e!.attributes.unit_of_measurement ?? ''}`.trim() },
      connection: { sendMessagePromise },
    };
    return selector ? selector(state) : state;
  },
}));
vi.mock('@/hooks/useSafeEntity', () => ({ useSafeEntity: () => entity }));
vi.mock('@/context/WidgetConfigContext', () => ({ useWidgetConfig: () => ({ getWidgetConfig: () => config }) }));
vi.mock('@/components/layout/DashboardGrid', () => ({ useWidgetId: () => 'chip-1' }));
vi.mock('@/context/MoreInfoContext', () => ({ useMoreInfoOptional: () => ({ openMoreInfo }) }));
vi.mock('@/hooks/useCardActions', () => ({ useCardActions: () => runAction }));

import { ChipCard } from './ChipCard';

describe('ChipCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runAction.mockReturnValue(false);
    sendMessagePromise.mockResolvedValue({ resources: {} });
  });

  it("shows Home Assistant's own label for the device class", async () => {
    sendMessagePromise.mockResolvedValueOnce({
      resources: { 'component.binary_sensor.entity_component.motion.state.on': 'Detected' },
    });
    config = { type: 'chip', entityId: 'binary_sensor.hallway' };
    entity = { state: 'on', attributes: { device_class: 'motion' } };

    render(<ChipCard />);

    expect(await screen.findByText('Detected')).toBeInTheDocument();
    expect(sendMessagePromise).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'frontend/get_translations', category: 'entity_component', integration: ['binary_sensor'] })
    );
  });

  it('formats a numeric sensor with its unit', () => {
    config = { type: 'chip', entityId: 'sensor.living_temperature' };
    entity = { state: '21.5', attributes: { device_class: 'temperature', unit_of_measurement: '°C' } };

    render(<ChipCard />);

    expect(screen.getByText('21.5 °C')).toBeInTheDocument();
  });

  it('toggles a light on tap', () => {
    config = { type: 'chip', entityId: 'light.living' };
    entity = { state: 'on', attributes: { rgb_color: [255, 120, 0] } };

    render(<ChipCard />);
    fireEvent.click(screen.getByRole('button'));

    expect(callService).toHaveBeenCalledWith(
      expect.objectContaining({ domain: 'homeassistant', service: 'toggle', target: { entity_id: 'light.living' } })
    );
    expect(openMoreInfo).not.toHaveBeenCalled();
  });

  it('opens the details of a sensor on tap, instead of toggling it', () => {
    config = { type: 'chip', entityId: 'binary_sensor.front_door' };
    entity = { state: 'off', attributes: { device_class: 'door' } };

    render(<ChipCard />);
    fireEvent.click(screen.getByRole('button'));

    expect(openMoreInfo).toHaveBeenCalledWith('binary_sensor.front_door', 'sensor', 'binary_sensor.front_door', expect.anything());
    expect(callService).not.toHaveBeenCalled();
  });

  it('runs a configured tap action instead of the default', () => {
    const tapAction = { action: 'navigate', target: 'home' };
    runAction.mockReturnValue(true);
    config = { type: 'chip', entityId: 'light.living', tapAction };
    entity = { state: 'off', attributes: {} };

    render(<ChipCard />);
    fireEvent.click(screen.getByRole('button'));

    expect(runAction).toHaveBeenCalledWith(tapAction, 'light.living');
    expect(callService).not.toHaveBeenCalled();
  });

  it('opens the details when the tap action says so, even on a light', () => {
    config = { type: 'chip', entityId: 'light.living', tapAction: { action: 'more-info' } };
    entity = { state: 'off', attributes: {} };

    render(<ChipCard />);
    fireEvent.click(screen.getByRole('button'));

    expect(openMoreInfo).toHaveBeenCalled();
    expect(callService).not.toHaveBeenCalled();
  });
});
