import React from 'react';
import {
  Thermometer,
  Lightbulb,
  Cloud,
  Zap,
  Video,
  LayoutGrid,
  Grip,
  ArrowUpDown,
  Users,
  Clock,
  Activity,
  Code2,
  Gauge,
  Workflow,
  Music,
} from 'lucide-react';
import type { GridWidget } from '@/context/DashboardLayoutContext';
import { WIDGET_CATALOG } from '@/context/DashboardLayoutContext';

// ── Preview dimension engine ──────────────────────────────────────────────────

const COL_PX = 90;
const ROW_PX = 90;
const PREVIEW_MAX_W = 390;
const PREVIEW_MAX_H = 265;
const MAX_SCALE = 1.5;

const CATALOG_HINTS: Partial<Record<GridWidget['type'], { w: number; h: number }>> = {
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
  const catalogEntry = WIDGET_CATALOG.find(c => c.type === type);
  const hint = CATALOG_HINTS[type];
  const lgSize = catalogEntry?.lg ?? hint ?? { w: 3, h: 2 };
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
  icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
  color: string;
}

export const WIDGET_META: WidgetMeta[] = [
  {
    type: 'sensor',
    label: 'Capteur',
    description: "N'importe quel capteur HA : température, humidité, puissance, binaire...",
    category: 'sensors',
    icon: Gauge,
    color: '#3b82f6',
  },
  {
    type: 'light',
    label: 'Lumière',
    description: 'Contrôle une lumière ou un groupe avec variateur de luminosité.',
    category: 'lights',
    icon: Lightbulb,
    color: '#eab308',
  },
  {
    type: 'weather',
    label: 'Météo',
    description: 'Conditions météo actuelles et prévisions sur plusieurs jours.',
    category: 'climate',
    icon: Cloud,
    color: '#0ea5e9',
  },
  {
    type: 'thermostat',
    label: 'Thermostat',
    description: 'Contrôle un thermostat climate.xxx avec la température cible.',
    category: 'climate',
    icon: Thermometer,
    color: '#f97316',
  },
  {
    type: 'energy',
    label: 'Énergie',
    description: "Vue d'ensemble production solaire, batterie, consommation maison.",
    category: 'energy',
    icon: Zap,
    color: '#22c55e',
  },
  {
    type: 'tempo',
    label: 'Tempo EDF',
    description: 'Couleur du jour Tempo RTE et heures pleines/creuses.',
    category: 'energy',
    icon: Activity,
    color: '#ef4444',
  },
  {
    type: 'camera',
    label: 'Caméra',
    description: "Flux vidéo en direct d'une ou plusieurs caméras Frigate/RTSP.",
    category: 'cameras',
    icon: Video,
    color: '#a855f7',
  },
  {
    type: 'rooms',
    label: 'Pièces',
    description: 'Grille de pièces avec température, lumières et accès rapide aux panneaux.',
    category: 'home',
    icon: LayoutGrid,
    color: '#6366f1',
  },
  {
    type: 'shortcuts',
    label: 'Raccourcis',
    description: 'Boutons rapides pour ouvrir les panneaux lumières, volets, sécurité...',
    category: 'home',
    icon: Grip,
    color: '#14b8a6',
  },
  {
    type: 'cover',
    label: 'Volet',
    description: 'Contrôle un volet ou store avec slider de position et boutons.',
    category: 'home',
    icon: ArrowUpDown,
    color: '#64748b',
  },
  {
    type: 'person',
    label: 'Personnes',
    description: 'Affiche la présence et localisation des personnes du foyer.',
    category: 'home',
    icon: Users,
    color: '#ec4899',
  },
  {
    type: 'greeting',
    label: 'Horloge',
    description: 'Horloge et message de bienvenue personnalisé.',
    category: 'system',
    icon: Clock,
    color: '#f59e0b',
  },
  {
    type: 'activity',
    label: "Barre d'activité",
    description: "Bandeau d'états rapides : alarme, poêle, batterie, Tempo...",
    category: 'system',
    icon: Activity,
    color: '#8b5cf6',
  },
  {
    type: 'template',
    label: 'Template',
    description: 'Widget entièrement personnalisable avec templates Jinja2/Nunjucks.',
    category: 'sensors',
    icon: Code2,
    color: '#06b6d4',
  },
  {
    type: 'automation',
    label: 'Automatisation',
    description: 'Active ou désactive une automatisation Home Assistant.',
    category: 'home',
    icon: Workflow,
    color: '#10b981',
  },
  {
    type: 'media_player',
    label: 'Lecteur média',
    description: 'Contrôle Spotify, Sonos, Chromecast — pochette, titre, play/pause, volume.',
    category: 'home',
    icon: Music,
    color: '#8b5cf6',
  },
];

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'sensors', label: 'Capteurs' },
  { id: 'lights', label: 'Lumières' },
  { id: 'climate', label: 'Climat' },
  { id: 'energy', label: 'Énergie' },
  { id: 'cameras', label: 'Caméras' },
  { id: 'home', label: 'Maison' },
  { id: 'system', label: 'Système' },
];
