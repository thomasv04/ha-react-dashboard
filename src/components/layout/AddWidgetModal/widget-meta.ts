import type { LucideIcon } from 'lucide-react';
import type { GridWidget } from '@/context/DashboardLayoutContext';

// ── Preview dimension engine ──────────────────────────────────────────────────

const COL_PX = 90;
const ROW_PX = 90;
const PREVIEW_MAX_W = 390;
const PREVIEW_MAX_H = 265;
const MAX_SCALE = 1.5;

const PREVIEW_LG_SIZES: Partial<Record<GridWidget['type'], { w: number; h: number }>> = {
  camera: { w: 6, h: 3 },
  weather: { w: 3, h: 3 },
  thermostat: { w: 3, h: 3 },
  shortcuts: { w: 4, h: 3 },
  tempo: { w: 4, h: 2 },
  energy: { w: 4, h: 2 },
  sensor: { w: 3, h: 2 },
  light: { w: 3, h: 2 },
  person: { w: 6, h: 1 },
  cover: { w: 2, h: 3 },
  template: { w: 3, h: 1 },
  automation: { w: 3, h: 1 },
  button: { w: 2, h: 2 },
  group: { w: 4, h: 4 },
  room: { w: 2, h: 2 },
  media_player: { w: 4, h: 3 },
  alarm: { w: 3, h: 3 },
  vacuum: { w: 3, h: 4 },
  pellet: { w: 2, h: 3 },
  greeting: { w: 4, h: 1 },
  activity: { w: 8, h: 1 },
};

export interface PreviewDims {
  renderW: number;
  renderH: number;
  scale: number;
  displayW: number;
  displayH: number;
}

export function getPreviewDims(type: GridWidget['type']): PreviewDims {
  const lgSize = PREVIEW_LG_SIZES[type] ?? { w: 3, h: 2 };
  const naturalW = lgSize.w * COL_PX;
  const naturalH = lgSize.h * ROW_PX;
  const scale = Math.min(PREVIEW_MAX_W / naturalW, PREVIEW_MAX_H / naturalH, MAX_SCALE);
  return {
    renderW: naturalW,
    renderH: naturalH,
    scale,
    displayW: Math.round(naturalW * scale),
    displayH: Math.round(naturalH * scale),
  };
}

// ── Widget metadata ───────────────────────────────────────────────────────────

export type Category = 'all' | 'sensors' | 'lights' | 'climate' | 'energy' | 'cameras' | 'home' | 'system';

export interface WidgetMeta {
  type: GridWidget['type'];
  label: string;
  description: string;
  category: Category;
  // `LucideIcon` plutôt qu'une signature réduite : toutes les entrées sont des
  // icônes Lucide, et la signature restreinte interdisait `style`, que les
  // appelants utilisent pour teinter l'icône.
  icon: LucideIcon;
  color: string;
  /** If set, show entity picker step before adding (filters HA entities by this domain) */
  entityDomain?: string;
  /** Config key to set with the chosen entity id (default: 'entityId') */
  entityConfigKey?: string;
}

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'layout.widgetCategories.all' },
  { id: 'sensors', label: 'layout.widgetCategories.sensors' },
  { id: 'lights', label: 'layout.widgetCategories.lights' },
  { id: 'climate', label: 'layout.widgetCategories.climate' },
  { id: 'energy', label: 'layout.widgetCategories.energy' },
  { id: 'cameras', label: 'layout.widgetCategories.cameras' },
  { id: 'home', label: 'layout.widgetCategories.home' },
  { id: 'system', label: 'layout.widgetCategories.system' },
];
