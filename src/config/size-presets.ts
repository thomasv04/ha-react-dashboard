import type { SizePreset, SizePresetName, WidgetSizePresets } from '@/context/DashboardLayoutContext';

export type { SizePreset, SizePresetName, WidgetSizePresets };

export const LEGACY_SIZE_PRESETS: WidgetSizePresets = {
  camera: {
    lg: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 6, h: 3 },
      { name: 'Large', w: 8, h: 4 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 8, h: 3 },
      { name: 'Large', w: 8, h: 4 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },
  weather: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 3, h: 3 },
      { name: 'Large', w: 4, h: 3 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 8, h: 2 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },
  thermostat: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 3, h: 3 },
      { name: 'Large', w: 4, h: 3 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 8, h: 3 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },
  shortcuts: {
    lg: [
      { name: 'Compact', w: 3, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 6, h: 4 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 8, h: 3 },
      { name: 'Large', w: 8, h: 4 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
  },
  tempo: {
    lg: [
      { name: 'Compact', w: 3, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 6, h: 3 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 8, h: 2 },
      { name: 'Large', w: 8, h: 3 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },
  energy: {
    lg: [
      { name: 'Compact', w: 3, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 6, h: 3 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 8, h: 2 },
      { name: 'Large', w: 8, h: 3 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },
  activity: {
    lg: [
      { name: 'Compact', w: 8, h: 1 },
      { name: 'Normal', w: 11, h: 1 },
      { name: 'Large', w: 12, h: 2 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 7, h: 1 },
      { name: 'Large', w: 8, h: 2 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 3, h: 1 },
      { name: 'Large', w: 4, h: 2 },
    ],
  },
  greeting: {
    lg: [
      { name: 'Compact', w: 3, h: 1 },
      { name: 'Normal', w: 5, h: 1 },
      { name: 'Large', w: 8, h: 2 },
    ],
    md: [
      { name: 'Compact', w: 3, h: 1 },
      { name: 'Normal', w: 5, h: 1 },
      { name: 'Large', w: 8, h: 2 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 3, h: 1 },
      { name: 'Large', w: 4, h: 2 },
    ],
  },
  sensor: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 3, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },
  light: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 3, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },
  person: {
    lg: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 6, h: 1 },
      { name: 'Large', w: 8, h: 1 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 8, h: 1 },
      { name: 'Large', w: 8, h: 1 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 1 },
      { name: 'Large', w: 4, h: 1 },
    ],
  },
  cover: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 2, h: 3 },
      { name: 'Large', w: 3, h: 4 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 2, h: 3 },
      { name: 'Large', w: 4, h: 3 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 2, h: 3 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },
  template: {
    lg: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 3, h: 1 },
      { name: 'Large', w: 4, h: 2 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 4, h: 1 },
      { name: 'Large', w: 4, h: 2 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 4, h: 1 },
      { name: 'Large', w: 4, h: 2 },
    ],
  },
  automation: {
    lg: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 3, h: 1 },
      { name: 'Large', w: 4, h: 1 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 4, h: 1 },
      { name: 'Large', w: 6, h: 1 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 4, h: 1 },
      { name: 'Large', w: 4, h: 1 },
    ],
  },
  group: {
    lg: [
      { name: 'Compact', w: 3, h: 3 },
      { name: 'Normal', w: 4, h: 4 },
      { name: 'Large', w: 6, h: 5 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 3 },
      { name: 'Normal', w: 6, h: 4 },
      { name: 'Large', w: 8, h: 5 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 3 },
      { name: 'Normal', w: 4, h: 4 },
      { name: 'Large', w: 4, h: 6 },
    ],
  },
  room: {
    lg: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 2, h: 2 },
      { name: 'Large', w: 3, h: 2 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 3, h: 2 },
      { name: 'Large', w: 4, h: 2 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },
  button: {
    lg: [
      { name: 'Compact', w: 1, h: 1 },
      { name: 'Normal', w: 2, h: 2 },
      { name: 'Large', w: 3, h: 2 },
    ],
    md: [
      { name: 'Compact', w: 1, h: 1 },
      { name: 'Normal', w: 2, h: 2 },
      { name: 'Large', w: 3, h: 2 },
    ],
    sm: [
      { name: 'Compact', w: 1, h: 1 },
      { name: 'Normal', w: 2, h: 2 },
      { name: 'Large', w: 4, h: 2 },
    ],
  },
  media_player: {
    lg: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 3, h: 4 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
  },
  alarm: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 3, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
  },
  vacuum: {
    lg: [
      { name: 'Compact', w: 2, h: 3 },
      { name: 'Normal', w: 3, h: 4 },
      { name: 'Large', w: 4, h: 5 },
    ],
    md: [
      { name: 'Compact', w: 3, h: 3 },
      { name: 'Normal', w: 4, h: 4 },
      { name: 'Large', w: 4, h: 5 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 3 },
      { name: 'Normal', w: 4, h: 4 },
      { name: 'Large', w: 4, h: 5 },
    ],
  },
  pellet: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 2, h: 3 },
      { name: 'Large', w: 3, h: 3 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 3, h: 3 },
      { name: 'Large', w: 4, h: 3 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
  },
};
