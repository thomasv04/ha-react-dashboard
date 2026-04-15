import { useState, useEffect, useCallback } from 'react';
import {
  DEFAULT_LAYOUT,
  type DashboardConfig,
  type DashboardConfigV2,
  type DashboardLayout,
} from '@/context/DashboardLayoutContext';
import { DEFAULT_WIDGET_CONFIGS, type WidgetConfigs } from '@/types/widget-configs';
import { DEFAULT_PAGES, type Page } from '@/context/PageContext';
import { DEFAULT_WALLPANEL_CONFIG, type WallPanelConfig } from '@/types/wallpanel';
import { useToast } from '@/context/ToastContext';

// ── Migration v1 → v2 ─────────────────────────────────────────────────────────
function migrateConfig(data: unknown): DashboardConfigV2 {
  // Already v2
  if (
    data &&
    typeof data === 'object' &&
    'version' in data &&
    (data as { version: unknown }).version === 2
  ) {
    return data as DashboardConfigV2;
  }

  // v1 migration: put everything under the "home" page
  let layout: DashboardLayout = DEFAULT_LAYOUT;
  let widgetConfigs: WidgetConfigs = DEFAULT_WIDGET_CONFIGS;

  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (d.widgets) {
      // Legacy: layout at root level
      layout = data as DashboardLayout;
    } else if (d.layout) {
      layout = d.layout as DashboardLayout;
      if (d.widgetConfigs) {
        widgetConfigs = { ...DEFAULT_WIDGET_CONFIGS, ...(d.widgetConfigs as WidgetConfigs) };
      }
    }
  }

  return {
    version: 2,
    pages: [...DEFAULT_PAGES],
    layouts: { home: layout },
    widgetConfigs: { home: widgetConfigs },
  };
}

export function useDashboardConfig() {
  const [pages, setPages] = useState<Page[]>(DEFAULT_PAGES);
  const [allLayouts, setAllLayouts] = useState<Record<string, DashboardLayout>>({ home: DEFAULT_LAYOUT });
  const [allWidgetConfigs, setAllWidgetConfigs] = useState<Record<string, WidgetConfigs>>({ home: DEFAULT_WIDGET_CONFIGS });
  const [wallPanelConfig, setWallPanelConfig] = useState<WallPanelConfig>(DEFAULT_WALLPANEL_CONFIG);
  const [wallPanelLayout, setWallPanelLayout] = useState<DashboardLayout>({
    ...DEFAULT_LAYOUT,
    widgets: { lg: [], md: [], sm: [] },
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { addToast } = useToast();

  // Load config from server
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then((data: unknown) => {
        if (data && typeof data === 'object' && 'message' in data) {
          // No config yet — use defaults
          setPages(DEFAULT_PAGES);
          setAllLayouts({ home: DEFAULT_LAYOUT });
          setAllWidgetConfigs({ home: DEFAULT_WIDGET_CONFIGS });
        } else {
          const v2 = migrateConfig(data);
          setPages(v2.pages);
          setAllLayouts(v2.layouts);
          setAllWidgetConfigs(v2.widgetConfigs);
          if (v2.wallPanel) {
            setWallPanelConfig(v2.wallPanel.config);
            setWallPanelLayout(v2.wallPanel.layout);
          }
        }
      })
      .catch(err => {
        console.error("Erreur de chargement de la config:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        addToast({ title: 'Erreur', description: 'Impossible de charger la configuration', sound: false });
      })
      .finally(() => setIsLoading(false));
  }, []);

  // Save full config v2 (pages + all layouts + all widget configs)
  const saveConfig = useCallback(async (config: DashboardConfigV2) => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        setPages(config.pages);
        setAllLayouts(config.layouts);
        setAllWidgetConfigs(config.widgetConfigs);
        console.log("Configuration sauvegardée avec succès !");
      }
    } catch (err) {
      console.error("Erreur lors de la sauvegarde:", err);
      addToast({ title: 'Erreur', description: 'Impossible de sauvegarder la configuration', sound: false });
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { pages, allLayouts, allWidgetConfigs, wallPanelConfig, wallPanelLayout, isLoading, isSaving, error, saveConfig };
}