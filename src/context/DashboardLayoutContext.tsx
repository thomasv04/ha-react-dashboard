import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import type { WidgetConfigs } from '@/types/widget-configs';
import { compactVertically, firstFreeSlot, packWidgets } from '@/lib/grid-utils';
import { usePages, type Page } from '@/context/PageContext';
import type { WallPanelConfig } from '@/types/wallpanel';
import type { CustomPanel, DockConfig } from '@/types/custom-panel';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
// Registres dérivés des manifestes de widgets (cf. `src/widgets/index.ts`).
import { DEFAULT_WIDGET_CONFIGS, WIDGET_DISPOSITIONS, WIDGET_CATALOG, SIZE_PRESETS } from '@/widgets';
export { WIDGET_CATALOG, SIZE_PRESETS };

/**
 * Configuration d'un widget sur la grille
 * - x, y: position en colonnes et lignes
 * - w, h: largeur et hauteur en unités de grille
 */
export interface GridWidget {
  id: string;
  type:
    | 'camera'
    | 'weather'
    | 'thermostat'
    | 'shortcuts'
    | 'tempo'
    | 'energy'
    | 'energy_flow'
    | 'greeting'
    | 'activity'
    | 'sensor'
    | 'light'
    | 'person'
    | 'cover'
    | 'template'
    | 'automation'
    | 'automation_list'
    | 'button'
    | 'group'
    | 'room'
    | 'media_player'
    | 'alarm'
    | 'vacuum'
    | 'chart'
    | 'batteries'
    | 'lock'
    | 'calendar'
    | 'todo'
    | 'fan'
    | 'clock'
    | 'pellet';
  x: number;
  y: number;
  w: number;
  h: number;
  static?: boolean;
  /** ID de la disposition choisie (ex: 'horizontal', 'vertical') */
  disposition?: string;
}

export type { WidgetCatalogEntry } from '@/config/widget-catalog';

/** 3 presets de taille (compact/normal/large) par type de widget et par breakpoint */
export type SizePresetName = 'Compact' | 'Normal' | 'Large';
export interface SizePreset {
  name: SizePresetName;
  w: number;
  h: number;
}
// `Partial` : les presets sont facultatifs. En Record total, ajouter un type de
// widget obligeait à compléter le registre historique — exactement le couplage
// central que les manifestes suppriment. Les appelants utilisent déjà `?.`.
export type WidgetSizePresets = Partial<Record<GridWidget['type'], Partial<Record<'lg' | 'md' | 'sm', SizePreset[]>>>>;

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
  /** Panneaux personnalisés */
  customPanels?: CustomPanel[];
  /**
   * Barre du bas : panneaux épinglés et libellés. Ici plutôt que dans les
   * réglages d'appareil — elle n'épingle que des panneaux personnalisés, qui
   * sont eux-mêmes dans cette configuration, et une seule composition vaut pour
   * toute la maison.
   */
  dock?: DockConfig;
}

// ── Context value types ────────────────────────────────────────────────────────

interface LayoutContextValue {
  layout: DashboardLayout;
  setLayout: (layout: DashboardLayout) => void;
  addWidget: (widget: GridWidget) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<GridWidget>, breakpoint?: 'lg' | 'md' | 'sm') => void;
  saveLayout: () => void;
  addWidgetByType: (type: GridWidget['type']) => string;
  /** Recopie un widget et sa configuration au premier emplacement libre */
  duplicateWidget: (id: string) => string;
  /** Supprime plusieurs widgets en un seul geste (donc un seul « annuler ») */
  removeWidgets: (ids: string[]) => void;
  /** Referme les trous de la mise en page courante, pour un breakpoint donné */
  packLayout: (breakpoint: 'lg' | 'md' | 'sm') => void;
  allLayouts: Record<string, DashboardLayout>;
  /** Revient au point de retour précédent (Ctrl+Z) */
  undo: () => void;
  /** Rejoue le point de retour annulé (Ctrl+Maj+Z) */
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface EditModeContextValue {
  isEditMode: boolean;
  setEditMode: (v: boolean) => void;
}

interface SizePresetsContextValue {
  cycleSize: (id: string, breakpoint: 'lg' | 'md' | 'sm') => void;
  getCurrentPresetName: (id: string, breakpoint: 'lg' | 'md' | 'sm') => SizePresetName | null;
}

/** Combined type for the facade hook — backwards compatible */
type DashboardLayoutContextValue = LayoutContextValue & EditModeContextValue & SizePresetsContextValue;

const LayoutContext = createContext<LayoutContextValue | null>(null);
const EditModeContext = createContext<EditModeContextValue | null>(null);
const SizePresetsContext = createContext<SizePresetsContextValue | null>(null);

/** Profondeur de la pile « annuler ». */
const HISTORY_LIMIT = 20;
/** Mutations plus rapprochées que ça = un seul point de retour. */
const HISTORY_COALESCE_MS = 400;

// Configuration par défaut (layouts différents par breakpoint)
// On la garde ici au cas où l'API Node renvoie un fichier vide
export const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: {
    lg: [],
    md: [],
    sm: [],
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

export function DashboardLayoutProvider({ children, initialLayouts, initialAllWidgetConfigs: _initialAllWidgetConfigs }: ProviderProps) {
  const { currentPageId, pages } = usePages();
  const { updateWidgetConfig: widgetCfgUpdate, getWidgetConfig } = useWidgetConfig();

  const [layouts, setLayouts] = useState<Record<string, DashboardLayout>>(() =>
    initialLayouts && Object.keys(initialLayouts).length > 0 ? initialLayouts : { home: DEFAULT_LAYOUT }
  );
  const [isEditMode, setEditMode] = useState(false);

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

  // Sync new/deleted pages: ensure every current page has a layout entry
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
  }, [pages]);

  // Current page's layout (derived)
  const layout = layouts[currentPageId] ?? DEFAULT_LAYOUT;

  // ── Annuler / rétablir ──────────────────────────────────────────────────────
  //
  // Un déplacement raté était irréversible : il fallait le refaire à la main, ou
  // recharger la page en ayant perdu tout le reste. La pile vit en mémoire et
  // meurt avec la session — l'historique long terme, c'est `config_history`
  // côté serveur, qui répond à un autre besoin (revenir à hier, pas à il y a
  // trois secondes).

  // Écrit dans un effet et non pendant le rendu : y toucher pendant le rendu
  // n'est pas sûr en mode concurrent, React pouvant abandonner un rendu commencé.
  // Les lecteurs (`pushHistory`, `undo`, `duplicateWidget`) sont tous des
  // gestionnaires d'événement, qui ne s'exécutent qu'après le commit — la
  // valeur y est donc toujours à jour.
  const layoutsRef = useRef(layouts);
  useEffect(() => {
    layoutsRef.current = layouts;
  }, [layouts]);

  const pastRef = useRef<Record<string, DashboardLayout>[]>([]);
  const futureRef = useRef<Record<string, DashboardLayout>[]>([]);
  const lastPushRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  /**
   * Enregistre l'état courant comme point de retour.
   *
   * Appelée par chaque mutation, donc aussi à chaque pixel d'un
   * redimensionnement ou d'un glisser-déposer : sans regroupement, un seul
   * geste remplirait la pile et « annuler » ne reculerait que d'un pixel.
   *
   * ponytail: regroupement par fenêtre de temps. Un geste très lent produit
   * quelques entrées au lieu d'une. Passer par des bornes de geste explicites
   * (début/fin de drag remontés depuis DashboardGrid) si ça gêne à l'usage.
   */
  const pushHistory = useCallback(() => {
    const now = Date.now();
    if (now - lastPushRef.current < HISTORY_COALESCE_MS) return;
    lastPushRef.current = now;

    pastRef.current = [...pastRef.current.slice(-(HISTORY_LIMIT - 1)), layoutsRef.current];
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const undo = useCallback(() => {
    const previous = pastRef.current.at(-1);
    if (!previous) return;
    futureRef.current = [layoutsRef.current, ...futureRef.current];
    pastRef.current = pastRef.current.slice(0, -1);
    // Le prochain geste doit repartir d'un point de retour propre, même s'il
    // suit l'annulation de très près.
    lastPushRef.current = 0;
    setLayouts(previous);
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
  }, []);

  const redo = useCallback(() => {
    const [next, ...rest] = futureRef.current;
    if (!next) return;
    pastRef.current = [...pastRef.current, layoutsRef.current];
    futureRef.current = rest;
    lastPushRef.current = 0;
    setLayouts(next);
    setCanUndo(true);
    setCanRedo(rest.length > 0);
  }, []);

  // Ctrl+Z / Ctrl+Maj+Z, **en mode édition seulement** : hors édition, ces
  // touches appartiennent au champ de saisie qui a le focus, et les intercepter
  // globalement casserait la correction d'une recherche ou d'un nom de page.
  useEffect(() => {
    if (!isEditMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      const el = e.target as HTMLElement | null;
      if (el?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName ?? '')) return;
      e.preventDefault();
      (e.shiftKey ? redo : undo)();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEditMode, undo, redo]);

  const saveLayout = () => {
    // Cette fonction ne fait plus d'appel réseau.
    // Le vrai bouton "Sauvegarder" de EditButton lit les variables
    // et les envoie via useDashboardConfig() !
  };

  const setLayout = useCallback(
    (newLayout: DashboardLayout) => {
      pushHistory();
      setLayouts(prev => ({ ...prev, [currentPageId]: newLayout }));
    },
    [currentPageId, pushHistory]
  );

  const addWidget = useCallback(
    (widget: GridWidget, breakpoint: 'lg' | 'md' | 'sm' = 'lg') => {
      pushHistory();
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
    },
    [currentPageId, pushHistory]
  );

  // Supprime de tous les breakpoints
  const removeWidget = useCallback(
    (id: string) => {
      pushHistory();
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
    },
    [currentPageId, pushHistory]
  );

  /**
   * Supprime plusieurs widgets d'un coup, sur tous les breakpoints.
   *
   * Un seul point d'historique (`pushHistory` n'est appelé qu'une fois) : une
   * suppression multiple est un geste, et devrait s'annuler d'un seul Ctrl+Z.
   */
  const removeWidgets = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const doomed = new Set(ids);
      pushHistory();
      setLayouts(prev => {
        const current = prev[currentPageId] ?? DEFAULT_LAYOUT;
        return {
          ...prev,
          [currentPageId]: {
            ...current,
            widgets: {
              lg: current.widgets.lg.filter(w => !doomed.has(w.id)),
              md: current.widgets.md.filter(w => !doomed.has(w.id)),
              sm: current.widgets.sm.filter(w => !doomed.has(w.id)),
            },
          },
        };
      });
    },
    [currentPageId, pushHistory]
  );

  const updateWidget = useCallback(
    (id: string, updates: Partial<GridWidget>, breakpoint: 'lg' | 'md' | 'sm' = 'lg') => {
      pushHistory();
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
    },
    [currentPageId, pushHistory]
  );

  const addWidgetByType = useCallback(
    (type: GridWidget['type']) => {
      // Try new disposition system first, fallback to WIDGET_CATALOG
      const dispositions = WIDGET_DISPOSITIONS[type];
      const disposition = dispositions?.[0];
      const def = WIDGET_CATALOG.find(d => d.type === type);
      if (!disposition && !def) return '';
      pushHistory();
      // Generate a unique id so the same type can be added multiple times
      const id = `${type}-${Date.now()}`;
      setLayouts(prev => {
        const current = prev[currentPageId] ?? DEFAULT_LAYOUT;
        // Première place libre plutôt que `x: 0` tout en bas : un widget de
        // demi-largeur se range à côté d'un autre au lieu d'ouvrir une rangée
        // à moitié vide. C'est ce qui produisait des trous latéraux définitifs,
        // puisque le compactage ne referme que la verticale.
        const make = (bp: 'lg' | 'md' | 'sm'): GridWidget => {
          const size = disposition ? disposition.defaultSize[bp] : def![bp];
          const w = Math.min(size.w, current.cols[bp]);
          const { x, y } = firstFreeSlot(current.widgets[bp], current.cols[bp], w, size.h);
          return {
            id,
            type,
            x,
            y,
            w,
            h: size.h,
            ...(disposition ? { disposition: disposition.id } : {}),
          };
        };
        return {
          ...prev,
          [currentPageId]: {
            ...current,
            widgets: {
              lg: [...current.widgets.lg, make('lg')],
              md: [...current.widgets.md, make('md')],
              sm: [...current.widgets.sm, make('sm')],
            },
          },
        };
      });
      // Initialize widget config using the type's default (if one exists)
      const defaultCfg = DEFAULT_WIDGET_CONFIGS[type];
      if (defaultCfg) {
        widgetCfgUpdate(id, { ...defaultCfg });
      }
      return id;
    },
    [currentPageId, widgetCfgUpdate, pushHistory]
  );

  /**
   * Recopie un widget, sa configuration comprise.
   *
   * C'est là tout l'intérêt : refaire à la main un thermostat ou un graphe
   * finement réglé, uniquement pour l'avoir sur une autre page, était le geste
   * le plus fastidieux du mode édition.
   *
   * La copie est placée au premier emplacement libre de chaque breakpoint —
   * pas aux coordonnées de l'original, où elle se superposerait exactement.
   */
  const duplicateWidget = useCallback(
    (id: string) => {
      const source = layoutsRef.current[currentPageId]?.widgets.lg.find(w => w.id === id);
      if (!source) return '';

      const newId = `${source.type}-${Date.now()}`;
      pushHistory();

      setLayouts(prev => {
        const current = prev[currentPageId] ?? DEFAULT_LAYOUT;
        const widgets = { ...current.widgets };
        for (const bp of ['lg', 'md', 'sm'] as const) {
          const original = current.widgets[bp].find(w => w.id === id);
          if (!original) continue;
          const { x, y } = firstFreeSlot(current.widgets[bp], current.cols[bp], original.w, original.h);
          widgets[bp] = [...current.widgets[bp], { ...original, id: newId, x, y }];
        }
        return { ...prev, [currentPageId]: { ...current, widgets } };
      });

      const sourceConfig = getWidgetConfig(id);
      if (sourceConfig) widgetCfgUpdate(newId, { ...sourceConfig });

      return newId;
    },
    [currentPageId, pushHistory, getWidgetConfig, widgetCfgUpdate]
  );

  const packLayout = useCallback(
    (breakpoint: 'lg' | 'md' | 'sm') => {
      pushHistory();
      setLayouts(prev => {
        const current = prev[currentPageId] ?? DEFAULT_LAYOUT;
        return {
          ...prev,
          [currentPageId]: {
            ...current,
            widgets: {
              ...current.widgets,
              [breakpoint]: packWidgets(current.widgets[breakpoint], current.cols[breakpoint]),
            },
          },
        };
      });
    },
    [currentPageId, pushHistory]
  );

  const cycleSize = useCallback(
    (id: string, breakpoint: 'lg' | 'md' | 'sm') => {
      pushHistory();
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
              [breakpoint]: widgets.map(w => (w.id === id ? { ...w, w: nextPreset.w, h: nextPreset.h } : w)),
            },
          },
        };
      });
    },
    [currentPageId, pushHistory]
  );

  const getCurrentPresetName = useCallback(
    (id: string, breakpoint: 'lg' | 'md' | 'sm'): SizePresetName | null => {
      const currentLayout = layouts[currentPageId] ?? DEFAULT_LAYOUT;
      const widget = currentLayout.widgets[breakpoint]?.find(w => w.id === id);
      if (!widget) return null;
      const presets = SIZE_PRESETS[widget.type]?.[breakpoint];
      if (!presets) return null;
      const match = presets.find(p => p.w === widget.w && p.h === widget.h);
      return match?.name ?? 'Normal';
    },
    [layouts, currentPageId]
  );

  const editModeValue = useMemo<EditModeContextValue>(() => ({ isEditMode, setEditMode }), [isEditMode]);

  const sizePresetsValue = useMemo<SizePresetsContextValue>(() => ({ cycleSize, getCurrentPresetName }), [cycleSize, getCurrentPresetName]);

  const layoutValue = useMemo<LayoutContextValue>(
    () => ({
      layout,
      setLayout,
      addWidget,
      removeWidget,
      updateWidget,
      saveLayout,
      addWidgetByType,
      duplicateWidget,
      removeWidgets,
      packLayout,
      allLayouts: layouts,
      undo,
      redo,
      canUndo,
      canRedo,
    }),
    [
      layout,
      setLayout,
      addWidget,
      removeWidget,
      updateWidget,
      saveLayout,
      addWidgetByType,
      duplicateWidget,
      removeWidgets,
      packLayout,
      layouts,
      undo,
      redo,
      canUndo,
      canRedo,
    ]
  );

  return (
    <EditModeContext.Provider value={editModeValue}>
      <SizePresetsContext.Provider value={sizePresetsValue}>
        <LayoutContext.Provider value={layoutValue}>{children}</LayoutContext.Provider>
      </SizePresetsContext.Provider>
    </EditModeContext.Provider>
  );
}

// ── Granular hooks (prefer these for performance) ──────────────────────────────

export function useEditMode() {
  const ctx = useContext(EditModeContext);
  if (!ctx) throw new Error('useEditMode must be used within DashboardLayoutProvider');
  return ctx;
}

export function useSizePresets() {
  const ctx = useContext(SizePresetsContext);
  if (!ctx) throw new Error('useSizePresets must be used within DashboardLayoutProvider');
  return ctx;
}

// ── Facade hook (backwards compatible) ─────────────────────────────────────────

export function useDashboardLayout(): DashboardLayoutContextValue {
  const layout = useContext(LayoutContext);
  const editMode = useContext(EditModeContext);
  const sizePresets = useContext(SizePresetsContext);
  if (!layout || !editMode || !sizePresets) {
    throw new Error('useDashboardLayout must be used within DashboardLayoutProvider');
  }
  return { ...layout, ...editMode, ...sizePresets };
}
