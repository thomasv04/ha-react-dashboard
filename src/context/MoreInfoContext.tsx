import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

export interface CardRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface MoreInfoState {
  widgetId: string;
  widgetType: string;
  entityId: string;
  cardRect: CardRect | null;
}

interface MoreInfoContextValue {
  state: MoreInfoState | null;
  openMoreInfo: (widgetId: string, widgetType: string, entityId: string, cardRect?: CardRect | null) => void;
  closeMoreInfo: () => void;
}

const MoreInfoContext = createContext<MoreInfoContextValue | null>(null);

export function MoreInfoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MoreInfoState | null>(null);

  const openMoreInfo = useCallback((widgetId: string, widgetType: string, entityId: string, cardRect?: CardRect | null) => {
    setState({ widgetId, widgetType, entityId, cardRect: cardRect ?? null });
  }, []);

  const closeMoreInfo = useCallback(() => setState(null), []);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMoreInfo();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeMoreInfo]);

  return <MoreInfoContext.Provider value={{ state, openMoreInfo, closeMoreInfo }}>{children}</MoreInfoContext.Provider>;
}

export function useMoreInfo() {
  const ctx = useContext(MoreInfoContext);
  if (!ctx) throw new Error('useMoreInfo must be used within MoreInfoProvider');
  return ctx;
}
