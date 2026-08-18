import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_LAYOUT, type DashboardConfigV2, type DashboardLayout, type GridWidget } from '@/context/DashboardLayoutContext';
import type { WidgetConfigs } from '@/types/widget-configs';
import { DEFAULT_WIDGET_CONFIGS } from '@/widgets';
import { DEFAULT_PAGES, type Page } from '@/context/PageContext';
import { DEFAULT_WALLPANEL_CONFIG, type WallPanelConfig } from '@/types/wallpanel';
import type { CustomPanel, DockConfig } from '@/types/custom-panel';
import { useToast } from '@/context/ToastContext';
import { useI18n } from '@/i18n';
import { apiFetch } from '@/lib/api-base';

/** Au-delà, on considère le serveur injoignable et on rend depuis le cache. */
const FETCH_TIMEOUT_MS = 8_000;
/** Réessais en arrière-plan, sans jamais bloquer l'affichage. */
const RETRY_DELAYS_MS = [2_000, 5_000, 15_000, 30_000];
const CACHE_KEY = 'ha-dashboard-config-cache';

/**
 * Revision du document servi, partagee par tous les appelants du hook.
 *
 * Elle decrit le fichier cote serveur, pas un composant : gardee par instance,
 * le deuxieme enregistreur (barre d'edition, ecran de veille…) partait avec une
 * revision perimee des que l'autre avait ecrit, et se voyait refuser sa
 * sauvegarde avec un message de conflit qui n'en etait pas un.
 */
let serverRevision = 0;

/** Étape de chargement, consommée par l'écran de démarrage. */
export type ConfigStatus =
  | 'loading' // premier chargement, rien à afficher
  | 'ready' // config à jour venue du serveur
  | 'cached' // config affichée depuis le cache, serveur injoignable
  | 'defaults'; // aucune config nulle part, dashboard vierge

// ── Validation ────────────────────────────────────────────────────────────────
//
// La config était consommée telle quelle après `JSON.parse`. Un fichier tronqué,
// un import bricolé à la main ou une config écrite par une version future
// suffisaient à faire lever une exception au rendu — écran blanc, sans message,
// et sans moyen d'atteindre les réglages pour réparer.
//
// Une fonction de garde suffit : le schéma est petit et stable. `zod` ajouterait
// une dépendance et une deuxième définition de la même forme.

/** Position de repli d'un widget dont les coordonnées sont illisibles. */
const FALLBACK_BOX = { x: 0, y: 0, w: 2, h: 2 };

/**
 * Rend un widget affichable, ou `null` s'il ne peut pas l'être.
 *
 * Deux traitements, parce que les défauts n'ont pas la même gravité :
 *
 * - **`id` ou `type` manquant** → écarté. La grille indexe par `id` et le rendu
 *   choisit le composant par `type` : sans eux, il n'y a rien à afficher.
 * - **coordonnée illisible** → réparée. Une carte mal placée reste une carte que
 *   l'utilisateur a créée et configurée ; la supprimer pour un `x` corrompu
 *   détruirait son travail là où un déplacement suffit à réparer.
 */
function sanitizeWidget(w: unknown): GridWidget | null {
  if (!w || typeof w !== 'object') return null;
  const g = w as Record<string, unknown>;
  if (typeof g.id !== 'string' || typeof g.type !== 'string') return null;

  const box: Record<string, number> = {};
  for (const k of ['x', 'y', 'w', 'h'] as const) {
    box[k] = typeof g[k] === 'number' && Number.isFinite(g[k]) ? (g[k] as number) : FALLBACK_BOX[k];
  }
  return { ...g, ...box } as unknown as GridWidget;
}

/**
 * Écarte ce qui est inexploitable au lieu de laisser planter le rendu.
 *
 * Un widget cassé disparaît de la grille ; une page cassée disparaît de la
 * barre d'onglets. Le reste du dashboard s'affiche. Renvoie le nombre
 * d'éléments retirés, pour pouvoir le dire à l'utilisateur.
 */
function sanitizeConfig(config: DashboardConfigV2): { config: DashboardConfigV2; dropped: number } {
  let dropped = 0;

  const pages = Array.isArray(config.pages) ? config.pages.filter(p => p && typeof p.id === 'string') : [...DEFAULT_PAGES];
  dropped += (Array.isArray(config.pages) ? config.pages.length : 0) - pages.length;

  const layouts: Record<string, DashboardLayout> = {};
  for (const [pageId, layout] of Object.entries(config.layouts ?? {})) {
    const widgets = { lg: [], md: [], sm: [] } as DashboardLayout['widgets'];
    for (const bp of ['lg', 'md', 'sm'] as const) {
      const list = layout?.widgets?.[bp];
      if (!Array.isArray(list)) continue;
      const kept = list.map(sanitizeWidget).filter((w): w is GridWidget => w !== null);
      dropped += list.length - kept.length;
      widgets[bp] = kept;
    }
    layouts[pageId] = { ...layout, widgets };
  }

  // Aucune page valide : mieux vaut un dashboard vierge, où les réglages
  // restent accessibles, qu'un écran sans rien du tout.
  return {
    config: { ...config, pages: pages.length ? pages : [...DEFAULT_PAGES], layouts },
    dropped,
  };
}

/**
 * Configs des widgets de l'écran de veille, reprises des pages si besoin.
 *
 * Elles étaient écrites dans `widgetConfigs[page affichée]` faute d'un endroit
 * à elles ; `wallPanel.widgetConfigs` était enregistré vide. Sans cette pêche
 * au premier chargement, les widgets déjà posés sur la veille repartiraient
 * sans entité — donc vides.
 */
export function wallPanelWidgetConfigsOf(v2: DashboardConfigV2): WidgetConfigs {
  const saved = v2.wallPanel?.widgetConfigs;
  if (saved && Object.keys(saved).length > 0) return saved;

  const ids = new Set((v2.wallPanel?.layout?.widgets?.lg ?? []).map(w => w.id));
  const harvested: WidgetConfigs = {};
  for (const configs of Object.values(v2.widgetConfigs ?? {})) {
    for (const [id, config] of Object.entries(configs)) {
      if (ids.has(id)) harvested[id] = config;
    }
  }
  return harvested;
}

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
  const [wallPanelWidgetConfigs, setWallPanelWidgetConfigs] = useState<WidgetConfigs>(cached ? wallPanelWidgetConfigsOf(cached) : {});
  const [customPanels, setCustomPanels] = useState<CustomPanel[]>(cached?.customPanels ?? []);
  const [dock, setDock] = useState<DockConfig | undefined>(cached?.dock);

  // Un cache présent = plus rien à attendre pour peindre : on démarre « prêt ».
  const [status, setStatus] = useState<ConfigStatus>(cached ? 'cached' : 'loading');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { addToast } = useToast();
  const { t } = useI18n();

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
        setWallPanelWidgetConfigs(wallPanelWidgetConfigsOf(v2));
      }
      if (v2.customPanels) setCustomPanels(v2.customPanels);
      if (v2.dock) setDock(v2.dock);
      writeCache(v2);
    };

    const load = async () => {
      // `AbortSignal.timeout` plutôt qu'un `fetch` nu : sans délai maximal, une
      // connexion qui pend (wifi faible, serveur qui ne répond plus) laissait la
      // promesse en suspens — l'écran de chargement ne partait jamais.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      try {
        const res = await apiFetch('/api/config', { signal: controller.signal });
        const data: unknown = await res.json();
        if (cancelled) return;

        serverRevision = Number(res.headers.get('X-Config-Revision') ?? 0);

        if (data && typeof data === 'object' && 'message' in data) {
          // Pas encore de config côté serveur : dashboard vierge, pas une erreur.
          setStatus(hadCache ? 'ready' : 'defaults');
        } else {
          const { config, dropped } = sanitizeConfig(migrateConfig(data));
          apply(config);
          setStatus('ready');
          if (dropped > 0) {
            console.warn(`[config] ${dropped} élément(s) invalide(s) écarté(s)`);
            addToast({ title: t('dashboard.repairedTitle'), description: t('dashboard.repairedDescription'), sound: false });
          }
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
          addToast({ title: t('dashboard.offlineTitle'), description: t('dashboard.offlineDescription'), sound: false });
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
  const saveConfig = useCallback(
    async (config: DashboardConfigV2) => {
      setIsSaving(true);
      try {
        const response = await apiFetch('/api/config', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            // Révision lue au dernier chargement. Le serveur refuse (409) si un
            // autre appareil a enregistré entre-temps : sans cet en-tête, le
            // dernier à cliquer effaçait le travail de l'autre sans un mot.
            'X-Expected-Revision': String(serverRevision),
          },
          body: JSON.stringify(config),
        });

        if (response.status === 409) {
          // Pas de fusion automatique : deux dispositions divergentes ne se
          // recollent pas, et deviner produirait un résultat que personne n'a
          // voulu. On prévient, l'utilisateur recharge et refait son geste.
          addToast({
            title: t('dashboard.conflictTitle'),
            description: t('dashboard.conflictDescription'),
            sound: false,
          });
          return;
        }

        if (response.ok) {
          const revision = response.headers.get('X-Config-Revision');
          if (revision !== null) serverRevision = Number(revision);
          setPages(config.pages);
          setAllLayouts(config.layouts);
          setAllWidgetConfigs(config.widgetConfigs);
          writeCache(config);
        }
      } catch (err) {
        console.error('Erreur lors de la sauvegarde:', err);
        addToast({ title: t('common.error'), description: t('dashboard.saveFailed'), sound: false });
      } finally {
        setIsSaving(false);
      }
    },
    [t]
  );

  return {
    pages,
    allLayouts,
    allWidgetConfigs,
    wallPanelConfig,
    wallPanelLayout,
    wallPanelWidgetConfigs,
    customPanels,
    dock,
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
