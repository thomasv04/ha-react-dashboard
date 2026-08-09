import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_LAYOUT, type DashboardConfigV2, type DashboardLayout } from '@/context/DashboardLayoutContext';
import type { WidgetConfigs } from '@/types/widget-configs';
import { DEFAULT_WIDGET_CONFIGS } from '@/widgets';
import { DEFAULT_PAGES, type Page } from '@/context/PageContext';
import { DEFAULT_WALLPANEL_CONFIG, type WallPanelConfig } from '@/types/wallpanel';
import type { CustomPanel } from '@/types/custom-panel';
import { useToast } from '@/context/ToastContext';
import { apiUrl } from '@/lib/api-base';

/** Au-delà, on considère le serveur injoignable et on rend depuis le cache. */
const FETCH_TIMEOUT_MS = 8_000;
/** Réessais en arrière-plan, sans jamais bloquer l'affichage. */
const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000];
const CACHE_KEY = 'ha-dashboard-config-cache';

/** Étape de chargement, consommée par l'écran de démarrage. */
export type ConfigStatus =
  | 'loading' // premier chargement, rien à afficher
  | 'ready' // config à jour venue du serveur
  | 'cached' // config affichée depuis le cache, serveur injoignable
  | 'defaults'; // aucune config nulle part, dashboard vierge

// ── Migration v1 → v2 ─────────────────────────────────────────────────────────
function migrateConfig(data: unknown): DashboardConfigV2 {
  // Already v2
  if (data && typeof data === 'object' && 'version' in data && (data as { version: unknown }).version === 2) {
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

// ── Cache local ───────────────────────────────────────────────────────────────
// La disposition change rarement mais conditionne tout l'affichage : la garder
// en local permet de peindre le dashboard immédiatement au rechargement, sans
// attendre le réseau. Le serveur reste la source de vérité et écrase le cache
// dès qu'il répond.

function readCache(): DashboardConfigV2 | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as DashboardConfigV2) : null;
  } catch {
    return null;
  }
}

function writeCache(config: DashboardConfigV2) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(config));
  } catch {
    // Quota dépassé ou navigation privée — le cache est un bonus, pas un dû.
  }
}

export function useDashboardConfig() {
  // Initialiseur paresseux de `useState` plutôt qu'un ref : lu une seule fois,
  // stable pour la vie du hook, et légitimement consultable pendant le rendu.
  const [cached] = useState(readCache);

  const [pages, setPages] = useState<Page[]>(cached?.pages ?? DEFAULT_PAGES);
  const [allLayouts, setAllLayouts] = useState<Record<string, DashboardLayout>>(cached?.layouts ?? { home: DEFAULT_LAYOUT });
  const [allWidgetConfigs, setAllWidgetConfigs] = useState<Record<string, WidgetConfigs>>(
    cached?.widgetConfigs ?? { home: DEFAULT_WIDGET_CONFIGS }
  );
  const [wallPanelConfig, setWallPanelConfig] = useState<WallPanelConfig>(cached?.wallPanel?.config ?? DEFAULT_WALLPANEL_CONFIG);
  const [wallPanelLayout, setWallPanelLayout] = useState<DashboardLayout>(
    cached?.wallPanel?.layout ?? { ...DEFAULT_LAYOUT, widgets: { lg: [], md: [], sm: [] } }
  );
  const [customPanels, setCustomPanels] = useState<CustomPanel[]>(cached?.customPanels ?? []);

  // Un cache présent = plus rien à attendre pour peindre : on démarre « prêt ».
  const [status, setStatus] = useState<ConfigStatus>(cached ? 'cached' : 'loading');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { addToast } = useToast();

  // Load config from server — avec délai maximal et réessais en arrière-plan
  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    const hadCache = cached !== null;

    const apply = (v2: DashboardConfigV2) => {
      setPages(v2.pages);
      setAllLayouts(v2.layouts);
      setAllWidgetConfigs(v2.widgetConfigs);
      if (v2.wallPanel) {
        setWallPanelConfig(v2.wallPanel.config);
        setWallPanelLayout(v2.wallPanel.layout);
      }
      if (v2.customPanels) setCustomPanels(v2.customPanels);
      writeCache(v2);
    };

    const load = async () => {
      // `AbortSignal.timeout` plutôt qu'un `fetch` nu : sans délai maximal, une
      // connexion qui pend (wifi faible, serveur qui ne répond plus) laissait la
      // promesse en suspens — l'écran de chargement ne partait jamais.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(apiUrl('/api/config'), { signal: controller.signal });
        const data: unknown = await res.json();
        if (cancelled) return;

        if (data && typeof data === 'object' && 'message' in data) {
          // Pas encore de config côté serveur : dashboard vierge, pas une erreur.
          setStatus(hadCache ? 'ready' : 'defaults');
        } else {
          apply(migrateConfig(data));
          setStatus('ready');
        }
        setError(null);
      } catch (err) {
        if (cancelled) return;
        const e = err instanceof Error ? err : new Error(String(err));
        console.error('Erreur de chargement de la config:', e);
        setError(e);

        // On n'affiche jamais un écran bloqué : cache si on en a, défauts sinon.
        setStatus(hadCache ? 'cached' : 'defaults');

        // Un seul toast, au premier échec, et seulement sans cache — sinon le
        // dashboard est utilisable et l'alerte serait du bruit.
        if (attempt === 0 && !hadCache) {
          addToast({ title: 'Hors ligne', description: 'Configuration indisponible, affichage par défaut', sound: false });
        }

        const delay = RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];
        attempt += 1;
        retryTimer = setTimeout(load, delay);
      } finally {
        clearTimeout(timer);
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  // Save full config v2 (pages + all layouts + all widget configs)
  const saveConfig = useCallback(async (config: DashboardConfigV2) => {
    setIsSaving(true);
    try {
      const response = await fetch(apiUrl('/api/config'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        setPages(config.pages);
        setAllLayouts(config.layouts);
        setAllWidgetConfigs(config.widgetConfigs);
        writeCache(config);
      }
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      addToast({ title: 'Erreur', description: 'Impossible de sauvegarder la configuration', sound: false });
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    pages,
    allLayouts,
    allWidgetConfigs,
    wallPanelConfig,
    wallPanelLayout,
    customPanels,
    status,
    /** Vrai uniquement tant qu'il n'y a strictement rien à afficher. */
    isLoading: status === 'loading',
    /** Config affichée depuis le cache : le serveur n'a pas (encore) répondu. */
    isStale: status === 'cached',
    isSaving,
    error,
    saveConfig,
  };
}
