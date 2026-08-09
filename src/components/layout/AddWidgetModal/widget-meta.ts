import {
  Thermometer,
  Lightbulb,
  Cloud,
  Zap,
  Video,
  Grip,
  ArrowUpDown,
  Users,
  Clock,
  Activity,
  Code2,
  Gauge,
  Workflow,
  Music,
  Shield,
  Bot,
  Flame,
  Play,
  Layers,
  Home,
  type LucideIcon,
} from 'lucide-react';
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

export const LEGACY_WIDGET_META: WidgetMeta[] = [
  {
    type: 'sensor',
    label: 'widgets.sensor.label',
    description: 'widgets.sensor.description',
    category: 'sensors',
    icon: Gauge,
    color: '#3b82f6',
    entityDomain: 'sensor',
  },
  {
    type: 'light',
    label: 'widgets.light.label',
    description: 'widgets.light.description',
    category: 'lights',
    icon: Lightbulb,
    color: '#eab308',
    entityDomain: 'light',
  },
  {
    type: 'weather',
    label: 'widgets.weather.label',
    description: 'widgets.weather.description',
    category: 'climate',
    icon: Cloud,
    color: '#0ea5e9',
    entityDomain: 'weather',
  },
  {
    type: 'thermostat',
    label: 'widgets.thermostat.label',
    description: 'widgets.thermostat.description',
    category: 'climate',
    icon: Thermometer,
    color: '#f97316',
    entityDomain: 'climate',
  },
  {
    type: 'energy',
    label: 'widgets.energy.label',
    description: 'widgets.energy.description',
    category: 'energy',
    icon: Zap,
    color: '#22c55e',
  },
  {
    type: 'tempo',
    label: 'widgets.tempo.label',
    description: 'widgets.tempo.description',
    category: 'energy',
    icon: Activity,
    color: '#ef4444',
  },
  {
    type: 'camera',
    label: 'widgets.camera.label',
    description: 'widgets.camera.description',
    category: 'cameras',
    icon: Video,
    color: '#a855f7',
  },
  {
    type: 'shortcuts',
    label: 'widgets.shortcuts.label',
    description: 'widgets.shortcuts.description',
    category: 'home',
    icon: Grip,
    color: '#14b8a6',
  },
  {
    type: 'cover',
    label: 'widgets.cover.label',
    description: 'widgets.cover.description',
    category: 'home',
    icon: ArrowUpDown,
    color: '#64748b',
    entityDomain: 'cover',
  },
  {
    type: 'person',
    label: 'widgets.person.label',
    description: 'widgets.person.description',
    category: 'home',
    icon: Users,
    color: '#ec4899',
  },
  {
    type: 'greeting',
    label: 'widgets.greeting.label',
    description: 'widgets.greeting.description',
    category: 'system',
    icon: Clock,
    color: '#f59e0b',
  },
  {
    type: 'activity',
    label: 'widgets.activity.label',
    description: 'widgets.activity.description',
    category: 'system',
    icon: Activity,
    color: '#8b5cf6',
  },
  {
    type: 'template',
    label: 'widgets.template.label',
    description: 'widgets.template.description',
    category: 'sensors',
    icon: Code2,
    color: '#06b6d4',
  },
  {
    type: 'automation',
    label: 'widgets.automation.label',
    description: 'widgets.automation.description',
    category: 'home',
    icon: Workflow,
    color: '#10b981',
    entityDomain: 'automation',
  },
  {
    type: 'button',
    label: 'widgets.button.label',
    description: 'widgets.button.description',
    category: 'home',
    icon: Play,
    color: '#3b82f6',
  },
  {
    type: 'group',
    label: 'widgets.group.label',
    description: 'widgets.group.description',
    category: 'home',
    icon: Layers,
    color: '#6366f1',
  },
  {
    type: 'room',
    label: 'widgets.room.label',
    description: 'widgets.room.description',
    category: 'home',
    icon: Home,
    color: '#0ea5e9',
  },
  {
    type: 'media_player',
    label: 'widgets.media_player.label',
    description: 'widgets.media_player.description',
    category: 'home',
    icon: Music,
    color: '#8b5cf6',
    entityDomain: 'media_player',
  },
  {
    type: 'alarm',
    label: 'widgets.alarm.label',
    description: 'widgets.alarm.description',
    category: 'home',
    icon: Shield,
    color: '#ef4444',
    entityDomain: 'alarm_control_panel',
  },
  {
    type: 'vacuum',
    label: 'widgets.vacuum.label',
    description: 'widgets.vacuum.description',
    category: 'home',
    icon: Bot,
    color: '#14b8a6',
    entityDomain: 'vacuum',
  },
  {
    type: 'pellet',
    label: 'widgets.pellet.label',
    description: 'widgets.pellet.description',
    category: 'climate',
    icon: Flame,
    color: '#f97316',
    entityDomain: 'climate',
  },
];

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
