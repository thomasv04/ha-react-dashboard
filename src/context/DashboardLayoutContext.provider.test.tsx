import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

// Mock dependencies before importing
vi.mock('@hakit/core', () => ({ useHass: vi.fn() }));
// Store de configs partagé : `duplicateWidget` doit recopier celle de la source,
// ce qu'un mock renvoyant toujours `undefined` ne permettrait pas de vérifier.
const widgetConfigs = new Map<string, unknown>();
vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: () => ({
    getWidgetConfig: (id: string) => widgetConfigs.get(id),
    updateWidgetConfig: (id: string, cfg: unknown) => widgetConfigs.set(id, cfg),
  }),
}));

import { DashboardLayoutProvider, useDashboardLayout, useEditMode, type GridWidget } from './DashboardLayoutContext';

import { PageProvider } from './PageContext';

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <PageProvider>
        <DashboardLayoutProvider>{children}</DashboardLayoutProvider>
      </PageProvider>
    );
  };
}

describe('DashboardLayoutProvider', () => {
  it('provides default layout', () => {
    const { result } = renderHook(() => useDashboardLayout(), {
      wrapper: createWrapper(),
    });

    expect(result.current.layout).toBeDefined();
    expect(result.current.layout.cols).toEqual({ lg: 12, md: 8, sm: 4 });
    expect(Array.isArray(result.current.layout.widgets.lg)).toBe(true);
  });

  it('addWidget adds a widget to the layout', () => {
    const { result } = renderHook(() => useDashboardLayout(), {
      wrapper: createWrapper(),
    });

    const initialCount = result.current.layout.widgets.lg.length;
    const newWidget: GridWidget = {
      id: 'test-widget',
      type: 'sensor',
      x: 0,
      y: 20,
      w: 3,
      h: 2,
    };

    act(() => {
      result.current.addWidget(newWidget);
    });

    expect(result.current.layout.widgets.lg.length).toBe(initialCount + 1);
    const found = result.current.layout.widgets.lg.find(w => w.id === 'test-widget');
    expect(found).toBeDefined();
    expect(found!.type).toBe('sensor');
  });

  it('removeWidget removes a widget from all breakpoints', () => {
    const { result } = renderHook(() => useDashboardLayout(), {
      wrapper: createWrapper(),
    });

    // First add to a known state
    act(() => {
      result.current.addWidget({ id: 'to-remove', type: 'light', x: 0, y: 30, w: 2, h: 2 });
    });
    expect(result.current.layout.widgets.lg.find(w => w.id === 'to-remove')).toBeDefined();

    act(() => {
      result.current.removeWidget('to-remove');
    });

    expect(result.current.layout.widgets.lg.find(w => w.id === 'to-remove')).toBeUndefined();
  });

  it('updateWidget updates a widget property', () => {
    const { result } = renderHook(() => useDashboardLayout(), {
      wrapper: createWrapper(),
    });

    // Add a widget first, then update it
    act(() => {
      result.current.addWidget({ id: 'weather', type: 'weather', x: 0, y: 0, w: 3, h: 3 });
    });

    const weatherBefore = result.current.layout.widgets.lg.find(w => w.id === 'weather');
    expect(weatherBefore).toBeDefined();

    act(() => {
      result.current.updateWidget('weather', { w: 5, h: 4 });
    });

    const weatherAfter = result.current.layout.widgets.lg.find(w => w.id === 'weather');
    expect(weatherAfter!.w).toBe(5);
    expect(weatherAfter!.h).toBe(4);
  });
});

describe('duplicateWidget', () => {
  it('recopie le widget et sa configuration sous un nouvel identifiant', () => {
    widgetConfigs.clear();
    const { result } = renderHook(() => useDashboardLayout(), { wrapper: createWrapper() });

    act(() => {
      result.current.addWidget({ id: 'source', type: 'thermostat', x: 0, y: 0, w: 3, h: 3 });
    });
    widgetConfigs.set('source', { type: 'thermostat', entityId: 'climate.salon' });

    let copyId = '';
    act(() => {
      copyId = result.current.duplicateWidget('source');
    });

    expect(copyId).not.toBe('source');
    expect(result.current.layout.widgets.lg).toHaveLength(2);
    // Tout l'intérêt : la copie arrive déjà réglée.
    expect(widgetConfigs.get(copyId)).toEqual({ type: 'thermostat', entityId: 'climate.salon' });
  });

  it("ne superpose pas la copie à l'original", () => {
    widgetConfigs.clear();
    const { result } = renderHook(() => useDashboardLayout(), { wrapper: createWrapper() });

    act(() => {
      result.current.addWidget({ id: 'source', type: 'sensor', x: 0, y: 0, w: 2, h: 2 });
    });
    act(() => {
      result.current.duplicateWidget('source');
    });

    const [a, b] = result.current.layout.widgets.lg;
    expect(`${a.x},${a.y}`).not.toBe(`${b.x},${b.y}`);
  });

  it('ignore un identifiant inconnu', () => {
    const { result } = renderHook(() => useDashboardLayout(), { wrapper: createWrapper() });
    let id = 'x';
    act(() => {
      id = result.current.duplicateWidget('nexiste-pas');
    });
    expect(id).toBe('');
    expect(result.current.layout.widgets.lg).toEqual([]);
  });
});

describe('removeWidgets', () => {
  const wid = (id: string): GridWidget => ({ id, type: 'sensor', x: 0, y: 0, w: 2, h: 2 });

  it('supprime tout le groupe en un seul geste', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDashboardLayout(), { wrapper: createWrapper() });

    act(() => {
      result.current.addWidget(wid('a'));
      result.current.addWidget(wid('b'));
      result.current.addWidget(wid('c'));
    });

    act(() => {
      vi.setSystemTime(Date.now() + 500);
      result.current.removeWidgets(['a', 'c']);
    });
    expect(result.current.layout.widgets.lg.map(w => w.id)).toEqual(['b']);

    // Un seul point d'historique : une suppression multiple est *un* geste.
    act(() => result.current.undo());
    expect(result.current.layout.widgets.lg.map(w => w.id)).toEqual(['a', 'b', 'c']);

    vi.useRealTimers();
  });

  it("ignore une liste vide sans toucher à l'historique", () => {
    const { result } = renderHook(() => useDashboardLayout(), { wrapper: createWrapper() });
    act(() => result.current.addWidget(wid('a')));
    const before = result.current.canUndo;

    act(() => result.current.removeWidgets([]));

    expect(result.current.layout.widgets.lg).toHaveLength(1);
    expect(result.current.canUndo).toBe(before);
  });
});

describe('annuler / rétablir', () => {
  const wid = (id: string): GridWidget => ({ id, type: 'sensor', x: 0, y: 0, w: 2, h: 2 });

  /** Les mutations sont regroupées sur 400 ms — les espacer force des points de retour distincts. */
  const advance = () => vi.setSystemTime(Date.now() + 500);

  it('revient sur un ajout, puis le rejoue', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDashboardLayout(), { wrapper: createWrapper() });

    expect(result.current.canUndo).toBe(false);

    act(() => result.current.addWidget(wid('a')));
    expect(result.current.layout.widgets.lg.map(w => w.id)).toEqual(['a']);
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.layout.widgets.lg).toEqual([]);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(result.current.layout.widgets.lg.map(w => w.id)).toEqual(['a']);

    vi.useRealTimers();
  });

  it('remonte plusieurs gestes un par un', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDashboardLayout(), { wrapper: createWrapper() });

    act(() => result.current.addWidget(wid('a')));
    act(() => {
      advance();
      result.current.addWidget(wid('b'));
    });
    act(() => {
      advance();
      result.current.addWidget(wid('c'));
    });
    expect(result.current.layout.widgets.lg).toHaveLength(3);

    act(() => result.current.undo());
    expect(result.current.layout.widgets.lg.map(w => w.id)).toEqual(['a', 'b']);
    act(() => result.current.undo());
    expect(result.current.layout.widgets.lg.map(w => w.id)).toEqual(['a']);

    vi.useRealTimers();
  });

  it("regroupe les mutations rapprochées — un glisser-déposer n'est pas cent points de retour", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDashboardLayout(), { wrapper: createWrapper() });

    act(() => result.current.addWidget(wid('a')));
    act(() => {
      advance();
      // Cinquante déplacements d'affilée, comme pendant un redimensionnement.
      for (let x = 1; x <= 50; x++) result.current.updateWidget('a', { x });
    });
    expect(result.current.layout.widgets.lg[0].x).toBe(50);

    // Une seule annulation ramène avant le geste entier, pas d'un pixel.
    act(() => result.current.undo());
    expect(result.current.layout.widgets.lg[0].x).toBe(0);

    vi.useRealTimers();
  });

  it('une nouvelle action efface le futur', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useDashboardLayout(), { wrapper: createWrapper() });

    act(() => result.current.addWidget(wid('a')));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);

    act(() => {
      advance();
      result.current.addWidget(wid('b'));
    });
    expect(result.current.canRedo).toBe(false);

    vi.useRealTimers();
  });

  it('ne fait rien quand il n\'y a rien à annuler', () => {
    const { result } = renderHook(() => useDashboardLayout(), { wrapper: createWrapper() });
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(result.current.layout.widgets.lg).toEqual([]);
  });
});

describe('useEditMode', () => {
  it('defaults to false', () => {
    const { result } = renderHook(() => useEditMode(), {
      wrapper: createWrapper(),
    });
    expect(result.current.isEditMode).toBe(false);
  });

  it('toggles edit mode', () => {
    const { result } = renderHook(() => useEditMode(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setEditMode(true);
    });
    expect(result.current.isEditMode).toBe(true);

    act(() => {
      result.current.setEditMode(false);
    });
    expect(result.current.isEditMode).toBe(false);
  });
});
