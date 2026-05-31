/**
 * Defines sound actions per widget type with their default presets.
 * Each widget type maps to an array of { action, defaultSound } entries.
 * 'none' means no sound by default.
 */
import type { SoundPreset } from '@/lib/sounds';

export interface WidgetSoundAction {
  /** Action key stored in soundOverrides */
  action: string;
  /** Default sound preset for this action */
  defaultSound: SoundPreset;
}

/**
 * Sound actions per widget type.
 * Only widgets with interactive actions are listed.
 */
export const WIDGET_SOUND_ACTIONS: Record<string, WidgetSoundAction[]> = {
  light: [
    { action: 'toggle_on', defaultSound: 'toggle_on' },
    { action: 'toggle_off', defaultSound: 'toggle_off' },
    { action: 'brightness_change', defaultSound: 'slider_tick' },
  ],
  cover: [
    { action: 'open', defaultSound: 'door_open' },
    { action: 'close', defaultSound: 'door_close' },
    { action: 'stop', defaultSound: 'warning' },
  ],
  automation: [
    { action: 'toggle_on', defaultSound: 'toggle_on' },
    { action: 'toggle_off', defaultSound: 'toggle_off' },
  ],
  media_player: [
    { action: 'play', defaultSound: 'media_play' },
    { action: 'pause', defaultSound: 'media_pause' },
    { action: 'next', defaultSound: 'media_next' },
  ],
  thermostat: [
    { action: 'temperature_up', defaultSound: 'temperature_up' },
    { action: 'temperature_down', defaultSound: 'temperature_down' },
    { action: 'preset', defaultSound: 'click' },
    { action: 'toggle', defaultSound: 'toggle_on' },
  ],
  sensor: [
    { action: 'toggle_on', defaultSound: 'toggle_on' },
    { action: 'toggle_off', defaultSound: 'toggle_off' },
    { action: 'action', defaultSound: 'click' },
  ],
  camera: [
    { action: 'select', defaultSound: 'click' },
  ],
  rooms: [
    { action: 'room_tap', defaultSound: 'click' },
    { action: 'light_on', defaultSound: 'toggle_on' },
    { action: 'light_off', defaultSound: 'toggle_off' },
  ],
  alarm: [
    { action: 'arm', defaultSound: 'arm' },
    { action: 'disarm', defaultSound: 'disarm' },
  ],
  button: [
    { action: 'press', defaultSound: 'click' },
  ],
  vacuum: [
    { action: 'start', defaultSound: 'vacuum_start' },
    { action: 'pause', defaultSound: 'media_pause' },
    { action: 'stop', defaultSound: 'warning' },
    { action: 'dock', defaultSound: 'vacuum_dock' },
    { action: 'locate', defaultSound: 'alert' },
  ],
  pellet: [
    { action: 'toggle_on', defaultSound: 'toggle_on' },
    { action: 'toggle_off', defaultSound: 'toggle_off' },
    { action: 'temperature_up', defaultSound: 'temperature_up' },
    { action: 'temperature_down', defaultSound: 'temperature_down' },
  ],
};

/** Get the resolved sound for a widget action, respecting overrides */
export function resolveSound(
  widgetType: string,
  action: string,
  overrides?: Record<string, SoundPreset>,
): SoundPreset {
  if (overrides?.[action]) return overrides[action];
  const actions = WIDGET_SOUND_ACTIONS[widgetType];
  if (!actions) return 'none';
  const entry = actions.find(a => a.action === action);
  return entry?.defaultSound ?? 'none';
}
