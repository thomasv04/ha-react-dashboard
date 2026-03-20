import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useHass } from '@hakit/core';

/**
 * Configuration d'un widget sur la grille
 * - x, y: position en colonnes et lignes
 * - w, h: largeur et hauteur en unités de grille
 */
export interface GridWidget {
  id: string;
  type: 'camera' | 'weather' | 'thermostat' | 'rooms' | 'shortcuts' | 'tempo' | 'energy' | 'greeting' | 'activity';
  x: number;
  y: number;
  w: number;
  h: number;
  static?: boolean;
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
  { type: 'rooms', label: 'Pièces', lg: { w: 4, h: 2 }, md: { w: 8, h: 2 }, sm: { w: 4, h: 2 } },
  { type: 'shortcuts', label: 'Raccourcis', lg: { w: 4, h: 2 }, md: { w: 8, h: 2 }, sm: { w: 4, h: 2 } },
  { type: 'tempo', label: 'Tempo EDF', lg: { w: 4, h: 1 }, md: { w: 8, h: 1 }, sm: { w: 4, h: 1 } },
  { type: 'energy', label: 'Énergie', lg: { w: 4, h: 1 }, md: { w: 8, h: 1 }, sm: { w: 4, h: 1 } },
];

export interface DashboardLayout {
  widgets: Record<'lg' | 'md' | 'sm', GridWidget[]>;
  cols: {
    lg: number; // Desktop (≥1200px) - 12 colonnes
    md: number; // Tablet (768-1200px) - 8 colonnes
    sm: number; // Mobile (<768px) - 4 colonnes
  };
}

interface DashboardLayoutContextValue {
  layout: DashboardLayout;
  setLayout: (layout: DashboardLayout) => void;
  addWidget: (widget: GridWidget) => void;
  removeWidget: (id: string) => void;
  updateWidget: (id: string, updates: Partial<GridWidget>, breakpoint?: 'lg' | 'md' | 'sm') => void;
  /** Sauvegarde manuellement dans localStorage */
  saveLayout: () => void;
  loadLayout: () => void;
  /**
   * Sauvegarde le layout dans Home Assistant via l'API frontend/store_user_data
   * Les données sont stockées par utilisateur dans la base HA (SQLite).
   * Nécessite d'être connecté à HA.
   */
  saveToHA: () => Promise<void>;
  /**
   * Charge le layout depuis Home Assistant.
   * Priorité : HA > localStorage > DEFAULT_LAYOUT
   */
  loadFromHA: () => Promise<void>;
  /** Mode édition pour les admins : affiche les overlays sur chaque card */
  isEditMode: boolean;
  setEditMode: (v: boolean) => void;
  /** Ajoute un widget par son type (tous breakpoints) avec sa position par défaut */
  addWidgetByType: (type: GridWidget['type']) => void;
}

const DashboardLayoutContext = createContext<DashboardLayoutContextValue | null>(null);

// Configuration par défaut (layouts différents par breakpoint)
const DEFAULT_LAYOUT: DashboardLayout = {
  widgets: {
    // Desktop: 12 colonnes
    lg: [
      // Ligne 0: Activity bar (gauche) + Greeting/Clock horloge (droite)
      { id: 'activity', type: 'activity', x: 0, y: 0, w: 11, h: 1, static: true },
      { id: 'greeting', type: 'greeting', x: 11, y: 0, w: 1, h: 1, static: true },

      // Ligne 1-3: Camera (large gauche) + Weather (milieu) + Thermostat (droite)
      { id: 'camera', type: 'camera', x: 0, y: 1, w: 6, h: 3 },
      { id: 'weather', type: 'weather', x: 6, y: 1, w: 3, h: 3 },
      { id: 'thermostat', type: 'thermostat', x: 9, y: 1, w: 3, h: 3 },

      // Ligne 4-5: Rooms (gauche) + Shortcuts (milieu) + Tempo/Energy empilés (droite)
      { id: 'rooms', type: 'rooms', x: 0, y: 4, w: 4, h: 2 },
      { id: 'shortcuts', type: 'shortcuts', x: 4, y: 4, w: 4, h: 2 },
      { id: 'tempo', type: 'tempo', x: 8, y: 4, w: 4, h: 1 },
      { id: 'energy', type: 'energy', x: 8, y: 5, w: 4, h: 1 },
    ],

    // Tablet: 8 colonnes
    md: [
      // Ligne 0: Activity + Greeting
      { id: 'activity', type: 'activity', x: 0, y: 0, w: 7, h: 1, static: true },
      { id: 'greeting', type: 'greeting', x: 7, y: 0, w: 1, h: 1, static: true },

      // Ligne 1-3: Camera full width (collapser à 8)
      { id: 'camera', type: 'camera', x: 0, y: 1, w: 8, h: 3 },

      // Ligne 4-5: Weather (4 cols) + Thermostat (4 cols)
      { id: 'weather', type: 'weather', x: 0, y: 4, w: 4, h: 2 },
      { id: 'thermostat', type: 'thermostat', x: 4, y: 4, w: 4, h: 2 },

      // Ligne 6-7: Rooms (full)
      { id: 'rooms', type: 'rooms', x: 0, y: 6, w: 8, h: 2 },

      // Ligne 8-9: Shortcuts (full)
      { id: 'shortcuts', type: 'shortcuts', x: 0, y: 8, w: 8, h: 2 },

      // Ligne 10-11: Tempo + Energy empilés
      { id: 'tempo', type: 'tempo', x: 0, y: 10, w: 8, h: 1 },
      { id: 'energy', type: 'energy', x: 0, y: 11, w: 8, h: 1 },
    ],

    // Mobile: 4 colonnes
    sm: [
      // Ligne 0: Activity (full - collapser) + Greeting à côté
      { id: 'activity', type: 'activity', x: 0, y: 0, w: 3, h: 1, static: true },
      { id: 'greeting', type: 'greeting', x: 3, y: 0, w: 1, h: 1, static: true },

      // Ligne 1-2: Camera (full)
      { id: 'camera', type: 'camera', x: 0, y: 1, w: 4, h: 2 },

      // Ligne 3-4: Weather + Thermostat stacked
      { id: 'weather', type: 'weather', x: 0, y: 3, w: 4, h: 2 },
      { id: 'thermostat', type: 'thermostat', x: 0, y: 5, w: 4, h: 1.5 },

      // Ligne 7: Rooms (full)
      { id: 'rooms', type: 'rooms', x: 0, y: 6.5, w: 4, h: 2 },

      // Ligne 9: Shortcuts (full)
      { id: 'shortcuts', type: 'shortcuts', x: 0, y: 8.5, w: 4, h: 2 },

      // Ligne 11-12: Tempo + Energy empilés
      { id: 'tempo', type: 'tempo', x: 0, y: 10.5, w: 4, h: 1 },
      { id: 'energy', type: 'energy', x: 0, y: 11.5, w: 4, h: 1 },
    ],
  },
  cols: {
    lg: 12, // Desktop: 12 colonnes
    md: 8, // Tablet: 8 colonnes
    sm: 4, // Mobile: 4 colonnes
  },
};

export function DashboardLayoutProvider({ children }: { children: ReactNode }) {
  const [layout, setLayout] = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [isEditMode, setEditMode] = useState(false);

  // Accès à la connexion HA pour la persistance serveur
  const connection = useHass(s => s.connection);

  // Defined before the effect that calls it to satisfy react-hooks/immutability
  const loadLayout = useCallback(() => {
    try {
      const saved = localStorage.getItem('dashboard-layout');
      if (saved) {
        const parsed = JSON.parse(saved);
        setLayout(parsed);
      }
    } catch (e) {
      console.warn('Failed to load dashboard layout from localStorage', e);
    }
  }, []);

  // Charger depuis localStorage au startup (HA prend le dessus si disponible)
  useEffect(() => {
    loadLayout();
  }, [loadLayout]);

  // Auto-save localStorage à chaque changement de layout (debounced 500ms)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem('dashboard-layout', JSON.stringify(layout));
      } catch (e) {
        console.warn('Failed to auto-save layout to localStorage', e);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [layout]);

  const saveLayout = () => {
    try {
      localStorage.setItem('dashboard-layout', JSON.stringify(layout));
      console.log('Dashboard layout saved to localStorage');
    } catch (e) {
      console.warn('Failed to save dashboard layout to localStorage', e);
    }
  };

  /**
   * Sauvegarde vers Home Assistant via frontend/store_user_data
   * Données stockées par utilisateur dans la base SQLite de HA.
   * Persiste entre appareils et sessions pour le même compte HA.
   */
  const saveToHA = useCallback(async () => {
    if (!connection) {
      console.warn('saveToHA: no HA connection available');
      return;
    }
    try {
      await connection.sendMessagePromise({
        type: 'frontend/store_user_data',
        key: 'ha-dashboard-layout',
        value: JSON.stringify(layout),
      });
      console.log('Dashboard layout saved to Home Assistant');
    } catch (e) {
      console.error('Failed to save layout to Home Assistant', e);
    }
  }, [connection, layout]);

  /**
   * Charge depuis Home Assistant (priorité sur localStorage).
   * Appelé au démarrage pour récupérer le layout sauvegardé côté HA.
   */
  const loadFromHA = useCallback(async () => {
    if (!connection) return;
    try {
      const result = await connection.sendMessagePromise<{ value: string | null }>({
        type: 'frontend/get_user_data',
        key: 'ha-dashboard-layout',
      });
      if (result?.value) {
        setLayout(JSON.parse(result.value));
        console.log('Dashboard layout loaded from Home Assistant');
      }
    } catch (e) {
      console.warn('Failed to load layout from Home Assistant, using localStorage', e);
    }
  }, [connection]);

  // Quand la connexion HA est dispo, charger depuis HA (prend le dessus sur localStorage)
  useEffect(() => {
    if (connection) {
      loadFromHA();
    }
  }, [connection, loadFromHA]);

  const addWidget = (widget: GridWidget, breakpoint: 'lg' | 'md' | 'sm' = 'lg') => {
    setLayout(prev => ({
      ...prev,
      widgets: {
        ...prev.widgets,
        [breakpoint]: [...prev.widgets[breakpoint], widget],
      },
    }));
  };

  // Supprime de tous les breakpoints
  const removeWidget = (id: string) => {
    setLayout(prev => ({
      ...prev,
      widgets: {
        lg: prev.widgets.lg.filter(w => w.id !== id),
        md: prev.widgets.md.filter(w => w.id !== id),
        sm: prev.widgets.sm.filter(w => w.id !== id),
      },
    }));
  };

  const updateWidget = (id: string, updates: Partial<GridWidget>, breakpoint: 'lg' | 'md' | 'sm' = 'lg') => {
    setLayout(prev => ({
      ...prev,
      widgets: {
        ...prev.widgets,
        [breakpoint]: prev.widgets[breakpoint].map(w => (w.id === id ? { ...w, ...updates } : w)),
      },
    }));
  };

  const addWidgetByType = useCallback((type: GridWidget['type']) => {
    const def = WIDGET_CATALOG.find(d => d.type === type);
    if (!def) return;
    setLayout(prev => {
      const maxY = (ws: GridWidget[]) => (ws.length ? Math.max(...ws.map(w => w.y + w.h)) : 0);
      const make = (bpDef: { w: number; h: number }, y: number): GridWidget => ({
        id: type,
        type,
        x: 0,
        y,
        w: bpDef.w,
        h: bpDef.h,
      });
      return {
        ...prev,
        widgets: {
          lg: [...prev.widgets.lg, make(def.lg, maxY(prev.widgets.lg))],
          md: [...prev.widgets.md, make(def.md, maxY(prev.widgets.md))],
          sm: [...prev.widgets.sm, make(def.sm, maxY(prev.widgets.sm))],
        },
      };
    });
  }, []);

  return (
    <DashboardLayoutContext.Provider
      value={{
        layout,
        setLayout,
        addWidget,
        removeWidget,
        updateWidget,
        saveLayout,
        loadLayout,
        saveToHA,
        loadFromHA,
        isEditMode,
        setEditMode,
        addWidgetByType,
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
