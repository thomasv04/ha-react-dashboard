import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

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
      { id: 'rooms', type: 'rooms', x: 0, y: 4, w: 4, h: 2 },
      { id: 'shortcuts', type: 'shortcuts', x: 4, y: 4, w: 4, h: 2 },
      { id: 'tempo', type: 'tempo', x: 8, y: 4, w: 4, h: 1 },
      { id: 'energy', type: 'energy', x: 8, y: 5, w: 4, h: 1 },
    ],
    md: [
      { id: 'activity', type: 'activity', x: 0, y: 0, w: 7, h: 1, static: true },
      { id: 'greeting', type: 'greeting', x: 7, y: 0, w: 1, h: 1, static: true },
      { id: 'camera', type: 'camera', x: 0, y: 1, w: 8, h: 3 },
      { id: 'weather', type: 'weather', x: 0, y: 4, w: 4, h: 2 },
      { id: 'thermostat', type: 'thermostat', x: 4, y: 4, w: 4, h: 2 },
      { id: 'rooms', type: 'rooms', x: 0, y: 6, w: 8, h: 2 },
      { id: 'shortcuts', type: 'shortcuts', x: 0, y: 8, w: 8, h: 2 },
      { id: 'tempo', type: 'tempo', x: 0, y: 10, w: 8, h: 1 },
      { id: 'energy', type: 'energy', x: 0, y: 11, w: 8, h: 1 },
    ],
    sm: [
      { id: 'activity', type: 'activity', x: 0, y: 0, w: 3, h: 1, static: true },
      { id: 'greeting', type: 'greeting', x: 3, y: 0, w: 1, h: 1, static: true },
      { id: 'camera', type: 'camera', x: 0, y: 1, w: 4, h: 2 },
      { id: 'weather', type: 'weather', x: 0, y: 3, w: 4, h: 2 },
      { id: 'thermostat', type: 'thermostat', x: 0, y: 5, w: 4, h: 1.5 },
      { id: 'rooms', type: 'rooms', x: 0, y: 6.5, w: 4, h: 2 },
      { id: 'shortcuts', type: 'shortcuts', x: 0, y: 8.5, w: 4, h: 2 },
      { id: 'tempo', type: 'tempo', x: 0, y: 10.5, w: 4, h: 1 },
      { id: 'energy', type: 'energy', x: 0, y: 11.5, w: 4, h: 1 },
    ],
  },
  cols: { lg: 12, md: 8, sm: 4 },
};

// 👉 NOUVEAU : On passe initialLayout en prop depuis Dashboard.tsx !
interface ProviderProps {
  children: ReactNode;
  initialLayout?: DashboardLayout;
}

export function DashboardLayoutProvider({ children, initialLayout }: ProviderProps) {
  // On initialise le layout avec les données du serveur Node (ou DEFAULT_LAYOUT si vide)
  const [layout, setLayout] = useState<DashboardLayout>(initialLayout || DEFAULT_LAYOUT);
  const [isEditMode, setEditMode] = useState(false);

  // Mettre à jour le layout local si le serveur envoie de nouvelles données
  useEffect(() => {
    if (initialLayout) {
      setLayout(initialLayout);
    }
  }, [initialLayout]);

  const saveLayout = () => {
    // Cette fonction ne fait plus d'appel réseau. 
    // Le vrai bouton "Sauvegarder" de EditButton lit la variable "layout" 
    // et l'envoie via useDashboardConfig() !
    console.log("Layout préparé pour l'envoi au backend");
  };

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