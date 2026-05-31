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

    expect(global.fetch).toHaveBeenCalledWith('/api/config');
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
      layouts: { custom: { widgets: { lg: [], md: [], sm: [] } } },
      widgetConfigs: { custom: {} },
    };

    await act(async () => {
      await result.current.saveConfig(newConfig);
    });

    expect(global.fetch).toHaveBeenLastCalledWith('/api/config', {
      method: 'POST',
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
    expect(mockAddToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Erreur', description: 'Impossible de charger la configuration' }),
    );
  });
});
