import { createContext, useContext, useState, type ReactNode } from 'react';

export type PanelId = 'volets' | 'lumieres' | 'security' | 'aspirateur' | 'notifications' | 'alarme' | 'flowers' | 'cameras' | null;

interface PanelContextValue {
  activePanel: PanelId;
  autoCloseMs: number | null;
  openPanel: (id: PanelId, autoCloseMs?: number) => void;
  closePanel: () => void;
}

const PanelContext = createContext<PanelContextValue | null>(null);

export function PanelProvider({ children }: { children: ReactNode }) {
  const [activePanel, setActivePanel] = useState<PanelId>(null);
  const [autoCloseMs, setAutoCloseMs] = useState<number | null>(null);

  function openPanel(id: PanelId, ms?: number) {
    setActivePanel(id);
    setAutoCloseMs(ms ?? null);
  }

  function closePanel() {
    setActivePanel(null);
    setAutoCloseMs(null);
  }

  return <PanelContext.Provider value={{ activePanel, autoCloseMs, openPanel, closePanel }}>{children}</PanelContext.Provider>;
}

export function usePanel() {
  const ctx = useContext(PanelContext);
  if (!ctx) throw new Error('usePanel must be used within PanelProvider');
  return ctx;
}
