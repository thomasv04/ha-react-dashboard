import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { WidgetConfig, WidgetConfigs } from '@/types/widget-configs';
import { DEFAULT_WIDGET_CONFIGS } from '@/types/widget-configs';
import { compactVertically } from '@/lib/grid-utils';
import { WIDGET_DISPOSITIONS } from '@/config/widget-dispositions';
import { usePages, type Page } from '@/context/PageContext';
import type { WallPanelConfig } from '@/types/wallpanel';

/**
 * Configuration d'un widget sur la grille
 * - x, y: position en colonnes et lignes
 * - w, h: largeur et hauteur en unités de grille
 */
export interface GridWidget {
  id: string;
  type: 'camera' | 'weather' | 'thermostat' | 'rooms' | 'shortcuts' | 'tempo' | 'energy' | 'greeting' | 'activity' | 'sensor' | 'light' | 'person' | 'cover' | 'template';
  x: number;
  y: number;
  w: number;
  h: number;
  static?: boolean;
  /** ID de la disposition choisie (ex: 'horizontal', 'vertical') */
  disposition?: string;
}

/** Catalogue de tous les widgets pouvant être ajoutés/remis dans le dashboard */
export interface WidgetCatalogEntry {
  type: GridWidget['type'];
  label: string;
  lg: { w: number; h: number };
  md: { w: number; h: number };
  sm: { w: number; h: number };
}

export const WIDGET_CATALOG: WidgetCatalogEntry[] = [
  { type: 'camera', label: 'Caméra', lg: { w: 6, h: 3 }, md: { w: 8, h: 3 }, sm: { w: 4, h: 2 } },
  { type: 'weather', label: 'Météo', lg: { w: 3, h: 3 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
  { type: 'thermostat', label: 'Thermostat', lg: { w: 3, h: 3 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
  { type: 'rooms', label: 'Pièces', lg: { w: 4, h: 5 }, md: { w: 8, h: 4 }, sm: { w: 4, h: 4 } },
  { type: 'shortcuts', label: 'Raccourcis', lg: { w: 4, h: 3 }, md: { w: 8, h: 3 }, sm: { w: 4, h: 3 } },
  { type: 'tempo', label: 'Tempo EDF', lg: { w: 4, h: 2 }, md: { w: 8, h: 2 }, sm: { w: 4, h: 2 } },
  { type: 'energy', label: 'Énergie', lg: { w: 4, h: 2 }, md: { w: 8, h: 2 }, sm: { w: 4, h: 2 } },
  { type: 'sensor', label: 'Capteur', lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
  { type: 'light', label: 'Lumière', lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
  { type: 'person', label: 'Personnes', lg: { w: 6, h: 1 }, md: { w: 8, h: 1 }, sm: { w: 4, h: 1 } },
  { type: 'cover', label: 'Volet', lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
  { type: 'template', label: 'Template', lg: { w: 3, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
];

/** 3 presets de taille (compact/normal/large) par type de widget et par breakpoint */
export type SizePresetName = 'Compact' | 'Normal' | 'Large';
export interface SizePreset { name: SizePresetName; w: number; h: number; }
export type WidgetSizePresets = Record<GridWidget['type'], Record<'lg' | 'md' | 'sm', SizePreset[]>>;

export const SIZE_PRESETS: WidgetSizePresets = {
  camera:     { lg: [{ name: 'Compact', w: 4, h: 2 }, { name: 'Normal', w: 6, h: 3 }, { name: 'Large', w: 8, h: 4 }],   md: [{ name: 'Compact', w: 4, h: 2 }, { name: 'Normal', w: 8, h: 3 }, { name: 'Large', w: 8, h: 4 }],   sm: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 4, h: 3 }] },
  weather:    { lg: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 3, h: 3 }, { name: 'Large', w: 4, h: 3 }],   md: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 8, h: 2 }],   sm: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 4, h: 3 }] },
  thermostat: { lg: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 3, h: 3 }, { name: 'Large', w: 4, h: 3 }],   md: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 8, h: 3 }],   sm: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 4, h: 3 }] },
  rooms:      { lg: [{ name: 'Compact', w: 3, h: 3 }, { name: 'Normal', w: 4, h: 5 }, { name: 'Large', w: 6, h: 6 }],   md: [{ name: 'Compact', w: 4, h: 3 }, { name: 'Normal', w: 8, h: 4 }, { name: 'Large', w: 8, h: 5 }],   sm: [{ name: 'Compact', w: 4, h: 2 }, { name: 'Normal', w: 4, h: 4 }, { name: 'Large', w: 4, h: 5 }] },
  shortcuts:  { lg: [{ name: 'Compact', w: 3, h: 2 }, { name: 'Normal', w: 4, h: 3 }, { name: 'Large', w: 6, h: 4 }],   md: [{ name: 'Compact', w: 4, h: 2 }, { name: 'Normal', w: 8, h: 3 }, { name: 'Large', w: 8, h: 4 }],   sm: [{ name: 'Compact', w: 4, h: 2 }, { name: 'Normal', w: 4, h: 3 }, { name: 'Large', w: 4, h: 4 }] },
  tempo:      { lg: [{ name: 'Compact', w: 3, h: 1 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 6, h: 3 }],   md: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 8, h: 2 }, { name: 'Large', w: 8, h: 3 }],   sm: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 4, h: 3 }] },
  energy:     { lg: [{ name: 'Compact', w: 3, h: 1 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 6, h: 3 }],   md: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 8, h: 2 }, { name: 'Large', w: 8, h: 3 }],   sm: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 4, h: 3 }] },
  activity:   { lg: [{ name: 'Normal', w: 11, h: 1 }, { name: 'Normal', w: 11, h: 1 }, { name: 'Normal', w: 11, h: 1 }], md: [{ name: 'Normal', w: 7, h: 1 }, { name: 'Normal', w: 7, h: 1 }, { name: 'Normal', w: 7, h: 1 }],   sm: [{ name: 'Normal', w: 3, h: 1 }, { name: 'Normal', w: 3, h: 1 }, { name: 'Normal', w: 3, h: 1 }] },
  greeting:   { lg: [{ name: 'Normal', w: 1, h: 1 }, { name: 'Normal', w: 1, h: 1 }, { name: 'Normal', w: 1, h: 1 }],   md: [{ name: 'Normal', w: 1, h: 1 }, { name: 'Normal', w: 1, h: 1 }, { name: 'Normal', w: 1, h: 1 }],   sm: [{ name: 'Normal', w: 1, h: 1 }, { name: 'Normal', w: 1, h: 1 }, { name: 'Normal', w: 1, h: 1 }] },
  sensor:     { lg: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 3, h: 2 }, { name: 'Large', w: 4, h: 3 }],   md: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 4, h: 3 }],   sm: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 4, h: 3 }] },
  light:      { lg: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 3, h: 2 }, { name: 'Large', w: 4, h: 3 }],   md: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 4, h: 3 }],   sm: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 4, h: 2 }, { name: 'Large', w: 4, h: 3 }] },
  person:     { lg: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 6, h: 1 }, { name: 'Large', w: 8, h: 1 }],   md: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 8, h: 1 }, { name: 'Large', w: 8, h: 1 }],   sm: [{ name: 'Compact', w: 4, h: 1 }, { name: 'Normal', w: 4, h: 1 }, { name: 'Large', w: 4, h: 1 }] },
  cover:      { lg: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 2, h: 3 }, { name: 'Large', w: 3, h: 4 }],   md: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 2, h: 3 }, { name: 'Large', w: 4, h: 3 }],   sm: [{ name: 'Compact', w: 2, h: 2 }, { name: 'Normal', w: 2, h: 3 }, { name: 'Large', w: 4, h: 3 }] },
  template:   { lg: [{ name: 'Compact', w: 2, h: 1 }, { name: 'Normal', w: 3, h: 1 }, { name: 'Large', w: 4, h: 2 }],   md: [{ name: 'Compact', w: 2, h: 1 }, { name: 'Normal', w: 4, h: 1 }, { name: 'Large', w: 4, h: 2 }],   sm: [{ name: 'Compact', w: 2, h: 1 }, { name: 'Normal', w: 4, h: 1 }, { name: 'Large', w: 4, h: 2 }] },
};

export interface DashboardLayout {
  widgets: Record<'lg' | 'md' | 'sm', GridWidget[]>;
  cols: {
    lg: number; // Desktop (≥1200px) - 12 colonnes
    md: number; // Tablet (768-1200px) - 8 colonnes
    sm: number; // Mobile (<768px) - 4 colonnes
  };
}

/** Full dashboard config v1 (legacy) */
export interface DashboardConfig {
  layout: DashboardLayout;
  widgetConfigs: WidgetConfigs;
}

/** Full dashboard config v2 (multi-pages) */
export interface DashboardConfigV2 {
  version: 2;
  pages: Page[];
  layouts: Record<string, DashboardLayout>;
  widgetConfigs: Record<string, WidgetConfigs>;
  /** Config WallPanel (optionnelle, rétrocompatible) */
  wallPanel?: {
    config: WallPanelConfig;
    layout: DashboardLayout;
    widgetConfigs: WidgetConfigs;
  };
}

interface DashboardLayoutContextValue {
  layout: DashboardLayout;
  setLayout: (layout: DashboardLayout) => void;
  addWidget: (widget: GridWidget) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<GridWidget>, breakpoint?: 'lg' | 'md' | 'sm') => void;
  
  /** Cycle au preset de taille suivant (Compact → Normal → Large → Compact) */
  cycleSize: (id: string, breakpoint: 'lg' | 'md' | 'sm') => void;
  
  /** Retourne le nom du preset actuel pour un widget/breakpoint donné */
  getCurrentPresetName: (id: string, breakpoint: 'lg' | 'md' | 'sm') => SizePresetName | null;

  /** * On garde une fonction "saveLayout" pour que tes composants puissent forcer 
   * la synchronisation du state local avec le composant parent, mais 
   * la vraie sauvegarde serveur se fera via le hook useDashboardConfig
   */
  saveLayout: () => void;
  
  /** Mode édition pour les admins : affiche les overlays sur chaque card */
  isEditMode: boolean;
  setEditMode: (v: boolean) => void;
  
  /** Ajoute un widget par son type (tous breakpoints) avec sa position par défaut */
  addWidgetByType: (type: GridWidget['type']) => void;

  /** Per-widget configuration (entities, labels, etc.) */
  widgetConfigs: WidgetConfigs;
  getWidgetConfig: <T extends WidgetConfig>(id: string) => T | undefined;
  updateWidgetConfig: (id: string, config: WidgetConfig) => void;

  /** Preview config: when set, getWidgetConfig returns this for the given widget */
  setPreviewConfig: (id: string, config: WidgetConfig) => void;
  clearPreviewConfig: () => void;

  /** Widget currently being edited (for modal) */
  editingWidgetId: string | null;
  setEditingWidgetId: (id: string | null) => void;

  /** All pages' layouts — used for saving */
  allLayouts: Record<string, DashboardLayout>;
  /** All pages' widget configs — used for saving */
  allWidgetConfigsByPage: Record<string, WidgetConfigs>;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

// Configuration par défaut (layouts différents par breakpoint)
// On la garde ici au cas où l'API Node renvoie un fichier vide
export const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: {
    lg: [
      { id: 'activity', type: 'activity', x: 0, y: 0, w: 11, h: 1, static: true },
      { id: 'greeting', type: 'greeting', x: 11, y: 0, w: 1, h: 1, static: true },
      { id: 'camera', type: 'camera', x: 0, y: 1, w: 6, h: 3 },
      { id: 'weather', type: 'weather', x: 6, y: 1, w: 3, h: 3 },
      { id: 'thermostat', type: 'thermostat', x: 9, y: 1, w: 3, h: 3 },
      { id: 'rooms', type: 'rooms', x: 0, y: 4, w: 4, h: 5 },
      { id: 'shortcuts', type: 'shortcuts', x: 4, y: 4, w: 4, h: 3 },
      { id: 'tempo', type: 'tempo', x: 8, y: 4, w: 4, h: 2 },
      { id: 'energy', type: 'energy', x: 8, y: 6, w: 4, h: 2 },
    ],
    md: [
      { id: 'activity', type: 'activity', x: 0, y: 0, w: 7, h: 1, static: true },
      { id: 'greeting', type: 'greeting', x: 7, y: 0, w: 1, h: 1, static: true },
      { id: 'camera', type: 'camera', x: 0, y: 1, w: 8, h: 3 },
      { id: 'weather', type: 'weather', x: 0, y: 4, w: 4, h: 2 },
      { id: 'thermostat', type: 'thermostat', x: 4, y: 4, w: 4, h: 2 },
      { id: 'rooms', type: 'rooms', x: 0, y: 6, w: 8, h: 4 },
      { id: 'shortcuts', type: 'shortcuts', x: 0, y: 10, w: 8, h: 3 },
      { id: 'tempo', type: 'tempo', x: 0, y: 13, w: 8, h: 2 },
      { id: 'energy', type: 'energy', x: 0, y: 15, w: 8, h: 2 },
    ],
    sm: [
      { id: 'activity', type: 'activity', x: 0, y: 0, w: 3, h: 1, static: true },
      { id: 'greeting', type: 'greeting', x: 3, y: 0, w: 1, h: 1, static: true },
      { id: 'camera', type: 'camera', x: 0, y: 1, w: 4, h: 2 },
      { id: 'weather', type: 'weather', x: 0, y: 3, w: 4, h: 2 },
      { id: 'thermostat', type: 'thermostat', x: 0, y: 5, w: 4, h: 2 },
      { id: 'rooms', type: 'rooms', x: 0, y: 7, w: 4, h: 4 },
      { id: 'shortcuts', type: 'shortcuts', x: 0, y: 11, w: 4, h: 3 },
      { id: 'tempo', type: 'tempo', x: 0, y: 14, w: 4, h: 2 },
      { id: 'energy', type: 'energy', x: 0, y: 16, w: 4, h: 2 },
    ],
  },
  cols: { lg: 12, md: 8, sm: 4 },
};

// 👉 Layout par défaut pour une page vide
export const EMPTY_PAGE_LAYOUT: DashboardLayout = {
  widgets: { lg: [], md: [], sm: [] },
  cols: { lg: 12, md: 8, sm: 4 },
};

// 👉 NOUVEAU : On passe initialLayouts en prop depuis Dashboard.tsx !
interface ProviderProps {
  children: ReactNode;
  initialLayouts?: Record<string, DashboardLayout>;
  initialAllWidgetConfigs?: Record<string, WidgetConfigs>;
}

export function DashboardLayoutProvider({ children, initialLayouts, initialAllWidgetConfigs }: ProviderProps) {
  const { currentPageId, pages } = usePages();

  const [layouts, setLayouts] = useState<Record<string, DashboardLayout>>(
    () => initialLayouts && Object.keys(initialLayouts).length > 0
      ? initialLayouts
      : { home: DEFAULT_LAYOUT }
  );
  const [allWidgetConfigs, setAllWidgetConfigs] = useState<Record<string, WidgetConfigs>>(
    () => {
      if (initialAllWidgetConfigs && Object.keys(initialAllWidgetConfigs).length > 0) {
        const merged: Record<string, WidgetConfigs> = {};
        for (const [pageId, configs] of Object.entries(initialAllWidgetConfigs)) {
          merged[pageId] = { ...DEFAULT_WIDGET_CONFIGS, ...configs };
        }
        return merged;
      }
      return { home: { ...DEFAULT_WIDGET_CONFIGS } };
    }
  );
  const [isEditMode, setEditMode] = useState(false);
  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [previewConfigEntry, setPreviewConfigEntry] = useState<{ id: string; config: WidgetConfig } | null>(null);

  // Sync when server data loads (runs once after initial fetch completes)
  useEffect(() => {
    if (!initialLayouts || Object.keys(initialLayouts).length === 0) return;
    const compacted: Record<string, DashboardLayout> = {};
    for (const [pageId, l] of Object.entries(initialLayouts)) {
      compacted[pageId] = {
        ...l,
        widgets: {
          lg: compactVertically(l.widgets.lg, l.cols.lg),
          md: compactVertically(l.widgets.md, l.cols.md),
          sm: compactVertically(l.widgets.sm, l.cols.sm),
        },
      };
    }
    setLayouts(compacted);
  }, [initialLayouts]);

  useEffect(() => {
    if (!initialAllWidgetConfigs || Object.keys(initialAllWidgetConfigs).length === 0) return;
    setAllWidgetConfigs(() => {
      const merged: Record<string, WidgetConfigs> = {};
      for (const [pageId, configs] of Object.entries(initialAllWidgetConfigs)) {
        merged[pageId] = { ...DEFAULT_WIDGET_CONFIGS, ...configs };
      }
      return merged;
    });
  }, [initialAllWidgetConfigs]);

  // Sync new/deleted pages: ensure every current page has layout & config entries
  useEffect(() => {
    const pageIds = new Set(pages.map(p => p.id));

    setLayouts(prev => {
      const updated: Record<string, DashboardLayout> = {};
      for (const [id, l] of Object.entries(prev)) {
        if (pageIds.has(id)) updated[id] = l;
      }
      for (const page of pages) {
        if (!(page.id in updated)) {
          updated[page.id] = { ...EMPTY_PAGE_LAYOUT };
        }
      }
      return updated;
    });

    setAllWidgetConfigs(prev => {
      const updated: Record<string, WidgetConfigs> = {};
      for (const [id, configs] of Object.entries(prev)) {
        if (pageIds.has(id)) updated[id] = configs;
      }
      for (const page of pages) {
        if (!(page.id in updated)) {
          updated[page.id] = { ...DEFAULT_WIDGET_CONFIGS };
        }
      }
      return updated;
    });
  }, [pages]);

  // Current page's layout and widgetConfigs (derived)
  const layout = layouts[currentPageId] ?? DEFAULT_LAYOUT;
  const widgetConfigs = allWidgetConfigs[currentPageId] ?? DEFAULT_WIDGET_CONFIGS;

  const saveLayout = () => {
    // Cette fonction ne fait plus d'appel réseau.
    // Le vrai bouton "Sauvegarder" de EditButton lit les variables
    // et les envoie via useDashboardConfig() !
    console.log("Layout préparé pour l'envoi au backend");
  };

  const setLayout = useCallback((newLayout: DashboardLayout) => {
    setLayouts(prev => ({ ...prev, [currentPageId]: newLayout }));
  }, [currentPageId]);

  const addWidget = useCallback((widget: GridWidget, breakpoint: 'lg' | 'md' | 'sm' = 'lg') => {
    setLayouts(prev => {
      const current = prev[currentPageId] ?? DEFAULT_LAYOUT;
      return {
        ...prev,
        [currentPageId]: {
          ...current,
          widgets: {
            ...current.widgets,
            [breakpoint]: [...current.widgets[breakpoint], widget],
          },
        },
      };
    });
  }, [currentPageId]);

  // Supprime de tous les breakpoints
  const removeWidget = useCallback((id: string) => {
    setLayouts(prev => {
      const current = prev[currentPageId] ?? DEFAULT_LAYOUT;
      return {
        ...prev,
        [currentPageId]: {
          ...current,
          widgets: {
            lg: current.widgets.lg.filter(w => w.id !== id),
            md: current.widgets.md.filter(w => w.id !== id),
            sm: current.widgets.sm.filter(w => w.id !== id),
          },
        },
      };
    });
  }, [currentPageId]);

  const updateWidget = useCallback((id: string, updates: Partial<GridWidget>, breakpoint: 'lg' | 'md' | 'sm' = 'lg') => {
    setLayouts(prev => {
      const current = prev[currentPageId] ?? DEFAULT_LAYOUT;
      return {
        ...prev,
        [currentPageId]: {
          ...current,
          widgets: {
            ...current.widgets,
            [breakpoint]: current.widgets[breakpoint].map(w => (w.id === id ? { ...w, ...updates } : w)),
          },
        },
      };
    });
  }, [currentPageId]);

  const addWidgetByType = useCallback((type: GridWidget['type']) => {
    // Try new disposition system first, fallback to WIDGET_CATALOG
    const dispositions = WIDGET_DISPOSITIONS[type];
    const disposition = dispositions?.[0];
    const def = WIDGET_CATALOG.find(d => d.type === type);
    if (!disposition && !def) return;
    // Generate a unique id so the same type can be added multiple times
    const id = `${type}-${Date.now()}`;
    setLayouts(prev => {
      const current = prev[currentPageId] ?? DEFAULT_LAYOUT;
      const maxY = (ws: GridWidget[]) => (ws.length ? Math.max(...ws.map(w => w.y + w.h)) : 0);
      const make = (bp: 'lg' | 'md' | 'sm', y: number): GridWidget => {
        const size = disposition ? disposition.defaultSize[bp] : def![bp];
        return {
          id,
          type,
          x: 0,
          y,
          w: size.w,
          h: size.h,
          ...(disposition ? { disposition: disposition.id } : {}),
        };
      };
      return {
        ...prev,
        [currentPageId]: {
          ...current,
          widgets: {
            lg: [...current.widgets.lg, make('lg', maxY(current.widgets.lg))],
            md: [...current.widgets.md, make('md', maxY(current.widgets.md))],
            sm: [...current.widgets.sm, make('sm', maxY(current.widgets.sm))],
          },
        },
      };
    });
    // Initialize widget config using the type's default (if one exists)
    setAllWidgetConfigs(prev => {
      const current = prev[currentPageId] ?? DEFAULT_WIDGET_CONFIGS;
      const defaultCfg = DEFAULT_WIDGET_CONFIGS[type];
      if (!defaultCfg) return prev;
      return { ...prev, [currentPageId]: { ...current, [id]: { ...defaultCfg } } };
    });
  }, [currentPageId]);

  const cycleSize = useCallback((id: string, breakpoint: 'lg' | 'md' | 'sm') => {
    setLayouts(prev => {
      const current = prev[currentPageId] ?? DEFAULT_LAYOUT;
      const widgets = current.widgets[breakpoint];
      const widget = widgets.find(w => w.id === id);
      if (!widget || widget.static) return prev;
      const presets = SIZE_PRESETS[widget.type]?.[breakpoint];
      if (!presets || presets.length === 0) return prev;
      // Trouver le preset actuel par correspondance exacte w+h
      const currentIdx = presets.findIndex(p => p.w === widget.w && p.h === widget.h);
      const nextPreset = presets[(currentIdx + 1) % presets.length];
      return {
        ...prev,
        [currentPageId]: {
          ...current,
          widgets: {
            ...current.widgets,
            [breakpoint]: widgets.map(w => w.id === id ? { ...w, w: nextPreset.w, h: nextPreset.h } : w),
          },
        },
      };
    });
  }, [currentPageId]);

  const getCurrentPresetName = useCallback((id: string, breakpoint: 'lg' | 'md' | 'sm'): SizePresetName | null => {
    const currentLayout = layouts[currentPageId] ?? DEFAULT_LAYOUT;
    const widget = currentLayout.widgets[breakpoint]?.find(w => w.id === id);
    if (!widget) return null;
    const presets = SIZE_PRESETS[widget.type]?.[breakpoint];
    if (!presets) return null;
    const match = presets.find(p => p.w === widget.w && p.h === widget.h);
    return match?.name ?? 'Normal';
  }, [layouts, currentPageId]);

  const getWidgetConfig = useCallback(<T extends WidgetConfig>(id: string): T | undefined => {
    // If there's a preview config for this widget, return it instead
    if (previewConfigEntry && previewConfigEntry.id === id) {
      return previewConfigEntry.config as T;
    }
    const currentConfigs = allWidgetConfigs[currentPageId] ?? DEFAULT_WIDGET_CONFIGS;
    return currentConfigs[id] as T | undefined;
  }, [allWidgetConfigs, previewConfigEntry, currentPageId]);

  const updateWidgetConfig = useCallback((id: string, config: WidgetConfig) => {
    setAllWidgetConfigs(prev => {
      const current = prev[currentPageId] ?? DEFAULT_WIDGET_CONFIGS;
      return { ...prev, [currentPageId]: { ...current, [id]: config } };
    });
  }, [currentPageId]);

  const setPreviewConfig = useCallback((id: string, config: WidgetConfig) => {
    setPreviewConfigEntry({ id, config });
  }, []);

  const clearPreviewConfig = useCallback(() => {
    setPreviewConfigEntry(null);
  }, []);

  return (
    <DashboardLayoutContext.Provider
      value={{
        layout,
        setLayout,
        addWidget,
        removeWidget,
        updateWidget,
        cycleSize,
        getCurrentPresetName,
        saveLayout,
        isEditMode,
        setEditMode,
        addWidgetByType,
        widgetConfigs,
        getWidgetConfig,
        updateWidgetConfig,
        setPreviewConfig,
        clearPreviewConfig,
        editingWidgetId,
        setEditingWidgetId,
        allLayouts: layouts,
        allWidgetConfigsByPage: allWidgetConfigs,
      }}
    >
      {children}
    </DashboardLayoutContext.Provider>
  );
}

export function useDashboardLayout() {
  const ctx = useContext(DashboardLayoutContext);
  if (!ctx) {
    throw new Error('useDashboardLayout must be used within DashboardLayoutProvider');
  }
  return ctx;
}