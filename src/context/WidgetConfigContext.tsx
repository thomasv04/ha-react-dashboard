import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { WidgetConfig, WidgetConfigs } from '@/types/widget-configs';
import { DEFAULT_WIDGET_CONFIGS } from '@/types/widget-configs';
import { usePages } from '@/context/PageContext';

interface WidgetConfigContextValue {
  widgetConfigs: WidgetConfigs;
  getWidgetConfig: <T extends WidgetConfig>(id: string) => T | undefined;
  updateWidgetConfig: (id: string, config: WidgetConfig) => void;
  setPreviewConfig: (id: string, config: WidgetConfig) => void;
  clearPreviewConfig: () => void;
  editingWidgetId: string | null;
  setEditingWidgetId: (id: string | null) => void;
  /** All pages' widget configs — used for saving */
  allWidgetConfigsByPage: Record<string, WidgetConfigs>;
}

const WidgetConfigContext = createContext<WidgetConfigContextValue | null>(null);

interface WidgetConfigProviderProps {
  children: ReactNode;
  initialAllWidgetConfigs?: Record<string, WidgetConfigs>;
}

export function WidgetConfigProvider({ children, initialAllWidgetConfigs }: WidgetConfigProviderProps) {
  const { currentPageId, pages } = usePages();

  const [allWidgetConfigs, setAllWidgetConfigs] = useState<Record<string, WidgetConfigs>>(() => {
    if (initialAllWidgetConfigs && Object.keys(initialAllWidgetConfigs).length > 0) {
      const merged: Record<string, WidgetConfigs> = {};
      for (const [pageId, configs] of Object.entries(initialAllWidgetConfigs)) {
        merged[pageId] = { ...DEFAULT_WIDGET_CONFIGS, ...configs };
      }
      return merged;
    }
    return { home: { ...DEFAULT_WIDGET_CONFIGS } };
  });

  const [editingWidgetId, setEditingWidgetId] = useState<string | null>(null);
  const [previewConfigEntry, setPreviewConfigEntry] = useState<{ id: string; config: WidgetConfig } | null>(null);

  // Sync when server data loads
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

  // Sync new/deleted pages
  useEffect(() => {
    const pageIds = new Set(pages.map(p => p.id));
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

  const widgetConfigs = allWidgetConfigs[currentPageId] ?? DEFAULT_WIDGET_CONFIGS;

  const getWidgetConfig = useCallback(<T extends WidgetConfig>(id: string): T | undefined => {
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
    <WidgetConfigContext.Provider value={{
      widgetConfigs,
      getWidgetConfig,
      updateWidgetConfig,
      setPreviewConfig,
      clearPreviewConfig,
      editingWidgetId,
      setEditingWidgetId,
      allWidgetConfigsByPage: allWidgetConfigs,
    }}>
      {children}
    </WidgetConfigContext.Provider>
  );
}

export function useWidgetConfig() {
  const ctx = useContext(WidgetConfigContext);
  if (!ctx) {
    throw new Error('useWidgetConfig must be used within WidgetConfigProvider');
  }
  return ctx;
}
