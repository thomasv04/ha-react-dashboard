import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { CustomPanel, DockConfig } from '@/types/custom-panel';
export type { DockConfig };

// Reprise des docks composés avant que la barre ne soit enregistrée côté
// serveur. Lu une fois au démarrage ; le premier enregistrement de la config
// le remplace définitivement.
const LEGACY_DOCK_KEY = 'ha-dashboard-dock-panels';
const LEGACY_LABELS_KEY = 'ha-dashboard-dock-labels';

function loadLegacyDock(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(LEGACY_DOCK_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function loadLegacyLabels(): boolean {
  try {
    return localStorage.getItem(LEGACY_LABELS_KEY) !== 'false';
  } catch {
    return true;
  }
}

interface CustomPanelContextValue {
  panels: CustomPanel[];
  getPanel: (id: string) => CustomPanel | undefined;
  upsertPanel: (panel: CustomPanel) => void;
  deletePanel: (id: string) => void;
  /** Composition de la barre du bas — voir [DockConfig]. */
  dock: DockConfig;
  setDock: (dock: DockConfig) => void;
}

const CustomPanelContext = createContext<CustomPanelContextValue | null>(null);

interface Props {
  children: ReactNode;
  initialPanels?: CustomPanel[];
  initialDock?: DockConfig;
}

export function CustomPanelProvider({ children, initialPanels = [], initialDock }: Props) {
  const [panels, setPanels] = useState<CustomPanel[]>(initialPanels);
  // Le dock vit avec les panneaux qu'il épingle, donc dans la configuration du
  // dashboard : une seule composition, la même sur tous les appareils. Il était
  // écrit dans le `localStorage` du navigateur, et ne quittait donc jamais
  // l'appareil sur lequel on l'avait composé.
  const [dock, setDock] = useState<DockConfig>(initialDock ?? { panels: loadLegacyDock(), labels: loadLegacyLabels() });

  // Même adoption tardive que pour l'écran de veille : la configuration servie
  // arrive après le premier rendu, peint depuis le cache local. Sans ça, un
  // dock composé sur un autre appareil n'apparaîtrait qu'au rechargement
  // suivant, une fois le cache renouvelé.
  useEffect(() => {
    if (initialPanels.length) setPanels(initialPanels);
  }, [initialPanels]);

  useEffect(() => {
    if (initialDock) setDock(initialDock);
  }, [initialDock]);

  const getPanel = (id: string) => panels.find(p => p.id === id);

  const upsertPanel = (panel: CustomPanel) => {
    setPanels(prev => {
      const idx = prev.findIndex(p => p.id === panel.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = panel;
        return next;
      }
      return [...prev, panel];
    });
  };

  const deletePanel = (id: string) => {
    setPanels(prev => prev.filter(p => p.id !== id));
  };

  return (
    <CustomPanelContext.Provider value={{ panels, getPanel, upsertPanel, deletePanel, dock, setDock }}>
      {children}
    </CustomPanelContext.Provider>
  );
}

export function useCustomPanels() {
  const ctx = useContext(CustomPanelContext);
  if (!ctx) throw new Error('useCustomPanels must be used within CustomPanelProvider');
  return ctx;
}
