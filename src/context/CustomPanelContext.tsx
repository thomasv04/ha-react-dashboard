import { createContext, useContext, useState, type ReactNode } from 'react';
import type { CustomPanel } from '@/types/custom-panel';

interface CustomPanelContextValue {
  panels: CustomPanel[];
  getPanel: (id: string) => CustomPanel | undefined;
  upsertPanel: (panel: CustomPanel) => void;
  deletePanel: (id: string) => void;
}

const CustomPanelContext = createContext<CustomPanelContextValue | null>(null);

interface Props {
  children: ReactNode;
  initialPanels?: CustomPanel[];
}

export function CustomPanelProvider({ children, initialPanels = [] }: Props) {
  const [panels, setPanels] = useState<CustomPanel[]>(initialPanels);

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

  return <CustomPanelContext.Provider value={{ panels, getPanel, upsertPanel, deletePanel }}>{children}</CustomPanelContext.Provider>;
}

export function useCustomPanels() {
  const ctx = useContext(CustomPanelContext);
  if (!ctx) throw new Error('useCustomPanels must be used within CustomPanelProvider');
  return ctx;
}
