import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { useDashboardConfig } from './useDashboardConfig';

// ── Mocks ───────────────────────────────────────────────────────────────────────

const mockAddToast = vi.fn();

vi.mock('@/context/ToastContext', () => ({
  useToast: () => ({ addToast: mockAddToast }),
}));

vi.mock('@/lib/api-base', () => ({
  apiUrl: (path: string) => path,
  // Hors mode carte, `apiFetch` n'ajoute rien : les assertions portent
  // toujours sur `global.fetch`.
  apiFetch: (path: string, init?: RequestInit) => fetch(path, init),
}));

beforeEach(() => {
  vi.restoreAllMocks();
  mockAddToast.mockClear();
  // Le hook démarre désormais depuis un cache local : sans nettoyage, un test
  // hériterait de la config écrite par le précédent.
  localStorage.clear();
});

// ── Helpers ─────────────────────────────────────────────────────────────────────

function mockFetch(response: unknown, ok = true, revision = '0') {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    headers: new Headers({ 'X-Config-Revision': revision }),
    json: () => Promise.resolve(response),
  }) as Mock;
}

function mockFetchReject(error: Error) {
  global.fetch = vi.fn().mockRejectedValue(error) as Mock;
}

// ── Tests ───────────────────────────────────────────────────────────────────────

describe('useDashboardConfig', () => {
  it('loads config from /api/config on mount', async () => {
    const v2Config = {
      version: 2,
      pages: [{ id: 'home', label: 'Home', icon: 'LayoutGrid', type: 'grid', order: 0 }],
      layouts: { home: { widgets: { lg: [], md: [], sm: [] } } },
      widgetConfigs: { home: {} },
    };
    mockFetch(v2Config);

    const { result } = renderHook(() => useDashboardConfig());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Le second argument porte le `signal` du délai maximal.
    expect(global.fetch).toHaveBeenCalledWith('/api/config', expect.objectContaining({ signal: expect.any(AbortSignal) }));
    expect(result.current.pages).toEqual(v2Config.pages);
    expect(result.current.allLayouts).toEqual(v2Config.layouts);
    expect(result.current.allWidgetConfigs).toEqual(v2Config.widgetConfigs);
  });

  it('migrates a v1 config to v2', async () => {
    // v1 config has layout at root level with a widgets key
    const v1Config = {
      widgets: { lg: [{ id: 'w1', type: 'light' }], md: [], sm: [] },
    };
    mockFetch(v1Config);

    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // After migration the v1 layout ends up under "home" page. Les coordonnées
    // absentes du format v1 sont complétées plutôt que de faire disparaître la
    // carte (cf. `sanitizeWidget`).
    expect(result.current.allLayouts.home.widgets.lg).toEqual([{ id: 'w1', type: 'light', x: 0, y: 0, w: 2, h: 2 }]);
  });

  it('handles "no config" (message response) by using defaults', async () => {
    mockFetch({ message: 'No config found' });

    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Should keep defaults — at least one page called "home"
    expect(result.current.pages.length).toBeGreaterThanOrEqual(1);
    expect(result.current.pages[0].id).toBe('home');
    expect(result.current.error).toBeNull();
  });

  const NEW_CONFIG = {
    version: 2 as const,
    pages: [{ id: 'custom', label: 'Custom', icon: 'Star', type: 'grid' as const, order: 0 }],
    layouts: { custom: { widgets: { lg: [], md: [], sm: [] }, cols: { lg: 12, md: 8, sm: 4 } } },
    widgetConfigs: { custom: {} },
  };

  it('saveConfig() sends a POST and updates local state', async () => {
    mockFetch({ message: 'No config found' }); // initial load

    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Now mock the POST response
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'X-Config-Revision': '1' }),
      json: () => Promise.resolve({}),
    });

    await act(async () => {
      await result.current.saveConfig(NEW_CONFIG);
    });

    // PUT, pas POST : c'est le verbe qu'utilise le hook (et qu'expose l'API).
    expect(global.fetch).toHaveBeenLastCalledWith('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Expected-Revision': '0' },
      body: JSON.stringify(NEW_CONFIG),
    });
    expect(result.current.pages).toEqual(NEW_CONFIG.pages);
    expect(result.current.allLayouts).toEqual(NEW_CONFIG.layouts);
  });

  it('renvoie la révision reçue du serveur à la sauvegarde suivante', async () => {
    mockFetch({ message: 'No config found' }, true, '7');

    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'X-Config-Revision': '8' }),
      json: () => Promise.resolve({}),
    });
    await act(async () => {
      await result.current.saveConfig(NEW_CONFIG);
    });
    expect((global.fetch as Mock).mock.lastCall?.[1].headers['X-Expected-Revision']).toBe('7');

    // La révision renvoyée par le serveur remplace celle du chargement : sans
    // ça, la deuxième sauvegarde d'affilée se ferait refuser par sa propre
    // écriture précédente.
    (global.fetch as Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({ 'X-Config-Revision': '9' }),
      json: () => Promise.resolve({}),
    });
    await act(async () => {
      await result.current.saveConfig(NEW_CONFIG);
    });
    expect((global.fetch as Mock).mock.lastCall?.[1].headers['X-Expected-Revision']).toBe('8');
  });

  it("prévient sans rien écraser quand un autre appareil a enregistré (409)", async () => {
    mockFetch({ message: 'No config found' });

    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const pagesBefore = result.current.pages;

    (global.fetch as Mock).mockResolvedValueOnce({
      ok: false,
      status: 409,
      headers: new Headers(),
      json: () => Promise.resolve({ error: 'Conflict', current_revision: 3 }),
    });

    await act(async () => {
      await result.current.saveConfig(NEW_CONFIG);
    });

    expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'dashboard.conflictTitle' }));
    // L'état local ne bouge pas : il refléterait sinon une config que le
    // serveur a refusée.
    expect(result.current.pages).toEqual(pagesBefore);
  });

  it('écarte les widgets illisibles au lieu de laisser planter le rendu', async () => {
    mockFetch({
      version: 2,
      pages: [{ id: 'home', label: 'Home', icon: 'LayoutGrid', type: 'grid', order: 0 }],
      layouts: {
        home: {
          widgets: {
            lg: [
              { id: 'ok', type: 'light', x: 0, y: 0, w: 2, h: 2 },
              { id: 'sans-type', x: 0, y: 2, w: 2, h: 2 }, // écarté : rien à rendre
              { id: 'position-cassée', type: 'light', x: null, y: 'trois' }, // réparé
              null,
            ],
            md: [],
            sm: [],
          },
        },
      },
      widgetConfigs: { home: {} },
    });

    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // La carte sans type disparaît, celle dont la position est cassée survit
    // avec des coordonnées de repli — supprimer le travail de l'utilisateur
    // pour un `x` corrompu serait pire que le défaut lui-même.
    expect(result.current.allLayouts.home.widgets.lg.map(w => w.id)).toEqual(['ok', 'position-cassée']);
    expect(result.current.allLayouts.home.widgets.lg[1]).toMatchObject({ x: 0, y: 0, w: 2, h: 2 });
    expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'dashboard.repairedTitle' }));
  });

  it('retombe sur une page par défaut si aucune page n\'est exploitable', async () => {
    // Un dashboard vierge laisse au moins l'accès aux réglages — un écran
    // blanc, non.
    mockFetch({ version: 2, pages: [null, { pasDId: true }], layouts: {}, widgetConfigs: {} });

    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.pages.length).toBeGreaterThanOrEqual(1);
    expect(result.current.pages[0].id).toBe('home');
  });

  it('handles network errors and shows a toast', async () => {
    mockFetchReject(new Error('Network error'));

    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'dashboard.offlineTitle' }));
  });

  // ── Non-régression : « des fois ça reste bloqué » ─────────────────────────
  // Le symptôme d'origine était un `fetch` sans délai maximal : sur une
  // connexion qui pend, la promesse ne se résolvait jamais et l'écran de
  // chargement restait à l'écran indéfiniment.

  it('ne reste jamais bloqué quand le serveur ne répond pas', async () => {
    // Une requête qui ne se résout jamais — le cas exact du wifi faible.
    global.fetch = vi.fn().mockImplementation(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        })
    ) as Mock;

    const { result } = renderHook(() => useDashboardConfig());
    expect(result.current.isLoading).toBe(true);

    // Le délai maximal du hook (8 s) doit finir par débloquer l'affichage.
    await waitFor(() => expect(result.current.isLoading).toBe(false), { timeout: 12_000 });
    expect(result.current.status).toBe('defaults');
  }, 15_000);

  it('affiche immédiatement depuis le cache local, sans attendre le réseau', async () => {
    const cachedConfig = {
      version: 2,
      pages: [{ id: 'home', label: 'Depuis le cache', icon: 'LayoutGrid', type: 'grid', order: 0 }],
      layouts: { home: { widgets: { lg: [], md: [], sm: [] }, cols: { lg: 12, md: 8, sm: 4 } } },
      widgetConfigs: { home: {} },
    };
    localStorage.setItem('ha-dashboard-config-cache', JSON.stringify(cachedConfig));
    // Réseau muet : le rendu ne doit rien lui devoir.
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {})) as Mock;

    const { result } = renderHook(() => useDashboardConfig());

    // Dès le premier rendu, sans `waitFor` : rien n'est attendu.
    expect(result.current.isLoading).toBe(false);
    expect(result.current.status).toBe('cached');
    expect(result.current.pages[0].label).toBe('Depuis le cache');
  });
});
