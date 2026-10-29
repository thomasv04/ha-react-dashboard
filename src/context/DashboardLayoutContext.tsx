import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import type { WidgetConfigs } from '@/types/widget-configs';
import { isTypingTarget } from '@/lib/utils';
import { EMPTY_LAYOUT, newPanel, toPanelLayout } from '@/lib/panel-grid';
import { usePages, type Page } from '@/context/PageContext';
import type { WallPanelConfig } from '@/types/wallpanel';
import type { CustomPanel, DockConfig } from '@/types/custom-panel';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
// Registres dérivés des manifestes de widgets (cf. `src/widgets/index.ts`).
import { DEFAULT_WIDGET_CONFIGS, WIDGET_DISPOSITIONS, WIDGET_CATALOG, SIZE_PRESETS } from '@/widgets';
import type { ManifestWidgetType } from '@/widgets/registry';
export { WIDGET_CATALOG, SIZE_PRESETS };

/**
 * Un widget dans un panneau. Sa place vient de son rang dans le panneau : il
 * n'a plus de coordonnées, seulement une taille en cases de la trame.
 * - w, h: largeur en colonnes, hauteur en rangées
 */
export interface GridWidget {
  id: string;
  /**
   * Dérivé des manifestes : `defineWidget` fixe l'inférence en `const` pour
   * que `WIDGETS` produise une union de littéraux. L'union vivait ici, tenue à
   * la main, et un script en regex vérifiait qu'elle suivait les manifestes.
   */
  type: ManifestWidgetType;
  w: number;
  h: number;
  static?: boolean;
  /** ID de la disposition choisie (ex: 'horizontal', 'vertical') */
  disposition?: string;
  /** Position sur une page `floorplan`, en % du plan : centre de l'élément, et taille pour les widgets. */
  pos?: FloorplanPos;
}

export interface FloorplanPos {
  x: number;
  y: number;
  w?: number;
  h?: number;
  /**
   * Maquette 3D : point de la maquette où la pastille est accrochée, dans ses
   * propres coordonnées. `x/y` ne servent alors que de repli.
   */
  anchor?: [number, number, number];
}

export type { WidgetCatalogEntry } from '@/config/widget-catalog';

/** 3 presets de taille (compact/normal/large) par type de widget */
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

/**
 * Un panneau de l'Echo Show : un titre facultatif, une largeur en colonnes de
 * la trame, et ses tuiles dans l'ordre où elles se rangent.
 */
export interface LayoutPanel {
  id: string;
  title?: string;
  cols: number;
  widgets: GridWidget[];
}

/**
 * Une page : ses panneaux, côte à côte. Une seule disposition pour toutes les
 * tailles d'écran — sur un écran étroit, les panneaux s'empilent.
 */
export interface DashboardLayout {
  panels: LayoutPanel[];
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
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<GridWidget>) => void;
  saveLayout: () => void;
  /** Ajoute un widget à la fin d'un panneau — le dernier par défaut, créé s'il n'y en a aucun. */
  addWidgetByType: (type: GridWidget['type'], panelId?: string) => string;
  /** Recopie un widget et sa configuration, juste après l'original */
  duplicateWidget: (id: string) => string;
  /** Supprime plusieurs widgets en un seul geste (donc un seul « annuler ») */
  removeWidgets: (ids: string[]) => void;
  /** Range un widget dans un panneau, au rang `index` (à la fin si absent) */
  moveWidget: (id: string, panelId: string, index?: number) => void;
  addPanel: () => string;
  updatePanel: (id: string, updates: Partial<Omit<LayoutPanel, 'id' | 'widgets'>>) => void;
  /** Supprime un panneau et ses tuiles */
  removePanel: (id: string) => void;
  /** Décale un panneau d'un cran vers la gauche (-1) ou la droite (+1) */
  movePanel: (id: string, delta: -1 | 1) => void;
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
  cycleSize: (id: string) => void;
  getCurrentPresetName: (id: string) => SizePresetName | null;
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

/** Page sans panneau — vierge, ou dont l'API a renvoyé un fichier vide. */
export const DEFAULT_LAYOUT: DashboardLayout = EMPTY_LAYOUT;

/** Applique `fn` à chaque panneau ; les autres pages ne bougent pas. */
const mapPanels = (layout: DashboardLayout, fn: (p: LayoutPanel) => LayoutPanel): DashboardLayout => ({
  ...layout,
  panels: layout.panels.map(fn),
});

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
    setLayouts(Object.fromEntries(Object.entries(initialLayouts).map(([pageId, l]) => [pageId, toPanelLayout(l)])));
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
        if (!(page.id in updated)) updated[page.id] = DEFAULT_LAYOUT;
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
      if (isTypingTarget(e)) return;
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

  /** Applique une transformation à la page courante, en un point de retour. */
  const mutate = useCallback(
    (fn: (layout: DashboardLayout) => DashboardLayout) => {
      pushHistory();
      setLayouts(prev => ({ ...prev, [currentPageId]: fn(prev[currentPageId] ?? DEFAULT_LAYOUT) }));
    },
    [currentPageId, pushHistory]
  );

  const setLayout = useCallback((newLayout: DashboardLayout) => mutate(() => newLayout), [mutate]);

  const removeWidgets = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const doomed = new Set(ids);
      mutate(l => mapPanels(l, p => ({ ...p, widgets: p.widgets.filter(w => !doomed.has(w.id)) })));
    },
    [mutate]
  );

  const removeWidget = useCallback((id: string) => removeWidgets([id]), [removeWidgets]);

  const updateWidget = useCallback(
    (id: string, updates: Partial<GridWidget>) =>
      mutate(l => mapPanels(l, p => ({ ...p, widgets: p.widgets.map(w => (w.id === id ? { ...w, ...updates } : w)) }))),
    [mutate]
  );

  const addWidgetByType = useCallback(
    (type: GridWidget['type'], panelId?: string) => {
      // Try new disposition system first, fallback to WIDGET_CATALOG
      const disposition = WIDGET_DISPOSITIONS[type]?.[0];
      const def = WIDGET_CATALOG.find(d => d.type === type);
      if (!disposition && !def) return '';
      // Generate a unique id so the same type can be added multiple times
      const id = `${type}-${Date.now()}`;
      const size = disposition ? disposition.defaultSize.lg : def!.lg;
      mutate(l => {
        // Pas encore de panneau : le premier widget en crée un.
        const panels = l.panels.length ? l.panels : [newPanel()];
        const target = panels.find(p => p.id === panelId) ?? panels[panels.length - 1];
        const widget: GridWidget = {
          id,
          type,
          w: Math.min(size.w, target.cols),
          h: size.h,
          ...(disposition ? { disposition: disposition.id } : {}),
        };
        return { ...l, panels: panels.map(p => (p.id === target.id ? { ...p, widgets: [...p.widgets, widget] } : p)) };
      });
      // Initialize widget config using the type's default (if one exists)
      const defaultCfg = DEFAULT_WIDGET_CONFIGS[type];
      if (defaultCfg) widgetCfgUpdate(id, { ...defaultCfg });
      return id;
    },
    [mutate, widgetCfgUpdate]
  );

  /**
   * Recopie un widget, sa configuration comprise, juste après l'original.
   *
   * C'est là tout l'intérêt : refaire à la main un thermostat ou un graphe
   * finement réglé, uniquement pour l'avoir sur une autre page, était le geste
   * le plus fastidieux du mode édition.
   */
  const duplicateWidget = useCallback(
    (id: string) => {
      const source = (layoutsRef.current[currentPageId] ?? DEFAULT_LAYOUT).panels.flatMap(p => p.widgets).find(w => w.id === id);
      if (!source) return '';
      const newId = `${source.type}-${Date.now()}`;
      mutate(l =>
        mapPanels(l, p => {
          const at = p.widgets.findIndex(w => w.id === id);
          if (at < 0) return p;
          return { ...p, widgets: [...p.widgets.slice(0, at + 1), { ...source, id: newId }, ...p.widgets.slice(at + 1)] };
        })
      );
      const sourceConfig = getWidgetConfig(id);
      if (sourceConfig) widgetCfgUpdate(newId, { ...sourceConfig });
      return newId;
    },
    [currentPageId, mutate, getWidgetConfig, widgetCfgUpdate]
  );

  const moveWidget = useCallback(
    (id: string, panelId: string, index?: number) =>
      mutate(l => {
        const widget = l.panels.flatMap(p => p.widgets).find(w => w.id === id);
        if (!widget) return l;
        return mapPanels(l, p => {
          const rest = p.widgets.filter(w => w.id !== id);
          if (p.id !== panelId) return rest.length === p.widgets.length ? p : { ...p, widgets: rest };
          // Le rang est compté *avant* le retrait : déplacer vers la droite
          // dans le même panneau décale d'une case.
          const from = p.widgets.findIndex(w => w.id === id);
          let at = index ?? rest.length;
          if (from >= 0 && from < at) at -= 1;
          at = Math.max(0, Math.min(at, rest.length));
          return { ...p, widgets: [...rest.slice(0, at), { ...widget, w: Math.min(widget.w, p.cols) }, ...rest.slice(at)] };
        });
      }),
    [mutate]
  );

  const addPanel = useCallback(() => {
    const panel = newPanel();
    mutate(l => ({ ...l, panels: [...l.panels, panel] }));
    return panel.id;
  }, [mutate]);

  const updatePanel = useCallback(
    (id: string, updates: Partial<Omit<LayoutPanel, 'id' | 'widgets'>>) =>
      mutate(l =>
        mapPanels(l, p => {
          if (p.id !== id) return p;
          const next = { ...p, ...updates };
          // Un panneau rétréci ramène ses tuiles trop larges à sa largeur.
          return { ...next, widgets: next.widgets.map(w => (w.w > next.cols ? { ...w, w: next.cols } : w)) };
        })
      ),
    [mutate]
  );

  const removePanel = useCallback((id: string) => mutate(l => ({ ...l, panels: l.panels.filter(p => p.id !== id) })), [mutate]);

  const movePanel = useCallback(
    (id: string, delta: -1 | 1) =>
      mutate(l => {
        const from = l.panels.findIndex(p => p.id === id);
        const to = from + delta;
        if (from < 0 || to < 0 || to >= l.panels.length) return l;
        const panels = [...l.panels];
        [panels[from], panels[to]] = [panels[to], panels[from]];
        return { ...l, panels };
      }),
    [mutate]
  );

  const findWidget = (l: DashboardLayout, id: string) => l.panels.flatMap(p => p.widgets).find(w => w.id === id);

  const cycleSize = useCallback(
    (id: string) => {
      const widget = findWidget(layoutsRef.current[currentPageId] ?? DEFAULT_LAYOUT, id);
      if (!widget || widget.static) return;
      const presets = SIZE_PRESETS[widget.type]?.lg;
      if (!presets || presets.length === 0) return;
      // Trouver le preset actuel par correspondance exacte w+h
      const currentIdx = presets.findIndex(p => p.w === widget.w && p.h === widget.h);
      const next = presets[(currentIdx + 1) % presets.length];
      updateWidget(id, { w: next.w, h: next.h });
    },
    [currentPageId, updateWidget]
  );

  const getCurrentPresetName = useCallback(
    (id: string): SizePresetName | null => {
      const widget = findWidget(layouts[currentPageId] ?? DEFAULT_LAYOUT, id);
      if (!widget) return null;
      const presets = SIZE_PRESETS[widget.type]?.lg;
      if (!presets) return null;
      return presets.find(p => p.w === widget.w && p.h === widget.h)?.name ?? 'Normal';
    },
    [layouts, currentPageId]
  );

  const editModeValue = useMemo<EditModeContextValue>(() => ({ isEditMode, setEditMode }), [isEditMode]);

  const sizePresetsValue = useMemo<SizePresetsContextValue>(() => ({ cycleSize, getCurrentPresetName }), [cycleSize, getCurrentPresetName]);

  const layoutValue = useMemo<LayoutContextValue>(
    () => ({
      layout,
      setLayout,
      removeWidget,
      updateWidget,
      saveLayout,
      addWidgetByType,
      duplicateWidget,
      removeWidgets,
      moveWidget,
      addPanel,
      updatePanel,
      removePanel,
      movePanel,
      allLayouts: layouts,
      undo,
      redo,
      canUndo,
      canRedo,
    }),
    [
      layout,
      setLayout,
      removeWidget,
      updateWidget,
      saveLayout,
      addWidgetByType,
      duplicateWidget,
      removeWidgets,
      moveWidget,
      addPanel,
      updatePanel,
      removePanel,
      movePanel,
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
