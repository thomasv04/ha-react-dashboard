import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const callService = vi.fn();
let entity: { state: string; attributes: Record<string, unknown> } | null;

// Les vrais libellés anglais : le `t()` du setup renvoie la clé, et le bug est
// justement un libellé manquant.
vi.mock('@/i18n', async () => {
  const dict = {
    widgets: (await import('@/i18n/locales/en/widgets.json')).default,
    common: (await import('@/i18n/locales/en/common.json')).default,
  };
  const t = (key: string) => {
    const value = key.split('.').reduce<unknown>((node, k) => (node as Record<string, unknown> | undefined)?.[k], dict);
    return typeof value === 'string' ? value : key;
  };
  return { useI18n: () => ({ t, tArray: () => [], language: 'en', setLanguage: vi.fn() }) };
});

vi.mock('@hakit/core', () => ({
  useHass: (selector?: (s: unknown) => unknown) => {
    const state = { helpers: { callService } };
    return selector ? selector(state) : state;
  },
}));
vi.mock('@/hooks/useSafeEntity', () => ({ useSafeEntity: () => entity }));
vi.mock('@/context/WidgetConfigContext', () => ({ useWidgetConfig: () => ({ getWidgetConfig: () => undefined }) }));
vi.mock('@/hooks/useSoundFeedback', () => ({ useSoundFeedback: () => vi.fn() }));

import ThermostatMoreInfo from './ThermostatMoreInfo';

beforeEach(() => {
  callService.mockClear();
  // Le thermostat `climate.hvac` de l'intégration `demo` de Home Assistant.
  entity = {
    state: 'cool',
    attributes: {
      friendly_name: 'Hvac',
      hvac_modes: ['off', 'heat', 'cool', 'auto', 'dry', 'fan_only'],
      hvac_action: 'cooling',
      current_temperature: 22,
      temperature: 21,
      fan_modes: ['on_low', 'auto', 'off'],
      fan_mode: 'auto',
      swing_modes: ['off', 'both'],
      swing_mode: 'off',
      preset_modes: ['none', 'away', 'comfort', 'sleep', 'manuel'],
      preset_mode: 'comfort',
    },
  };
});

describe('ThermostatMoreInfo (#84)', () => {
  it('affiche le mode et les modes HVAC traduits, pas les valeurs de Home Assistant', () => {
    render(<ThermostatMoreInfo entityId='climate.hvac' widgetId='w1' />);

    expect(screen.queryByText('COOL')).toBeNull();
    for (const raw of ['fan_only', 'heat', 'dry']) expect(screen.queryByRole('button', { name: raw })).toBeNull();
    expect(screen.getByRole('button', { name: 'Fan' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cool' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Cooling')).toBeInTheDocument();
  });

  it('traduit les modes de ventilation connus, et garde tels quels ceux qu’elle ne connaît pas', () => {
    render(<ThermostatMoreInfo entityId='climate.hvac' widgetId='w1' />);

    expect(screen.getByRole('button', { name: 'Both' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'on_low' })).toBeInTheDocument();
  });

  it('envoie toujours la valeur de Home Assistant', () => {
    render(<ThermostatMoreInfo entityId='climate.hvac' widgetId='w1' />);

    fireEvent.click(screen.getByRole('button', { name: 'Fan' }));
    expect(callService).toHaveBeenLastCalledWith(
      expect.objectContaining({ service: 'set_hvac_mode', serviceData: { hvac_mode: 'fan_only' } })
    );
  });

  it('propose les préréglages, traduits, et applique celui qu’on touche', () => {
    render(<ThermostatMoreInfo entityId='climate.hvac' widgetId='w1' />);

    expect(screen.getByText('Preset')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Comfort' })).toHaveAttribute('aria-pressed', 'true');
    // Un préréglage propre à une intégration s'affiche tel quel.
    expect(screen.getByRole('button', { name: 'manuel' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sleep' }));
    expect(callService).toHaveBeenLastCalledWith(
      expect.objectContaining({ service: 'set_preset_mode', serviceData: { preset_mode: 'sleep' } })
    );
  });
});
