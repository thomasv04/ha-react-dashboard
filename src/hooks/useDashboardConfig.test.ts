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
}));

beforeEach(() => {
  vi.restoreAllMocks();
  mockAddToast.mockClear();
  // Le hook démarre désormais depuis un cache local : sans nettoyage, un test
  // hériterait de la config écrite par le précédent.
  localStorage.clear();
});

// ── Helpers ─────────────────────────────────────────────────────────────────────

function mockFetch(response: unknown, ok = true) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
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

    // After migration the v1 layout ends up under "home" page
    expect(result.current.allLayouts.home).toEqual(v1Config);
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

  it('saveConfig() sends a POST and updates local state', async () => {
    mockFetch({ message: 'No config found' }); // initial load

    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Now mock the POST response
    (global.fetch as Mock).mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });

    const newConfig = {
      version: 2 as const,
      pages: [{ id: 'custom', label: 'Custom', icon: 'Star', type: 'grid' as const, order: 0 }],
      layouts: { custom: { widgets: { lg: [], md: [], sm: [] }, cols: { lg: 12, md: 8, sm: 4 } } },
      widgetConfigs: { custom: {} },
    };

    await act(async () => {
      await result.current.saveConfig(newConfig);
    });

    // PUT, pas POST : c'est le verbe qu'utilise le hook (et qu'expose l'API).
    expect(global.fetch).toHaveBeenLastCalledWith('/api/config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    });
    expect(result.current.pages).toEqual(newConfig.pages);
    expect(result.current.allLayouts).toEqual(newConfig.layouts);
  });

  it('handles network errors and shows a toast', async () => {
    mockFetchReject(new Error('Network error'));

    const { result } = renderHook(() => useDashboardConfig());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Network error');
    expect(mockAddToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Hors ligne' }));
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
