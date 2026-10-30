import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

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

import { DashboardLayoutProvider, useDashboardLayout, useEditMode } from './DashboardLayoutContext';
import { PageProvider } from './PageContext';
import { layoutWidgets } from '@/lib/panel-grid';

function createWrapper() {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <PageProvider>
        <DashboardLayoutProvider>{children}</DashboardLayoutProvider>
      </PageProvider>
    );
  };
}

const setup = () => renderHook(() => useDashboardLayout(), { wrapper: createWrapper() }).result;
type Ctx = ReturnType<typeof setup>;

/**
 * Les ids et les points de retour se fondent sur l'heure : chaque geste avance
 * l'horloge, comme deux appuis réels séparés.
 */
const step = (result: Ctx, fn: (c: Ctx['current']) => unknown) => {
  let out: unknown;
  act(() => {
    vi.setSystemTime(Date.now() + 500);
    out = fn(result.current);
  });
  return out as string;
};

const ids = (result: Ctx, panel = 0) => result.current.layout.panels[panel].widgets.map(w => w.id);

beforeEach(() => {
  vi.useFakeTimers();
  widgetConfigs.clear();
});
afterEach(() => vi.useRealTimers());

describe('DashboardLayoutProvider', () => {
  it('commence sans panneau', () => {
    const result = setup();
    expect(result.current.layout.panels).toEqual([]);
  });

  it('le premier widget crée un panneau', () => {
    const result = setup();
    const id = step(result, c => c.addWidgetByType('sensor'));
    expect(result.current.layout.panels).toHaveLength(1);
    expect(ids(result)).toEqual([id]);
  });

  it('ajoute au panneau demandé, sinon au dernier', () => {
    const result = setup();
    const first = step(result, c => c.addPanel());
    step(result, c => c.addPanel());
    const a = step(result, c => c.addWidgetByType('sensor', first));
    const b = step(result, c => c.addWidgetByType('light'));
    expect(ids(result, 0)).toEqual([a]);
    expect(ids(result, 1)).toEqual([b]);
  });

  it('removeWidget et updateWidget agissent sur la tuile, où qu’elle soit', () => {
    const result = setup();
    const a = step(result, c => c.addWidgetByType('sensor'));
    const b = step(result, c => c.addWidgetByType('light'));
    step(result, c => c.updateWidget(b, { w: 4, h: 3 }));
    expect(layoutWidgets(result.current.layout).find(w => w.id === b)).toMatchObject({ w: 4, h: 3 });
    step(result, c => c.removeWidget(a));
    expect(ids(result)).toEqual([b]);
  });
});

describe('duplicateWidget', () => {
  it('recopie le widget et sa configuration, juste après lui', () => {
    const result = setup();
    const a = step(result, c => c.addWidgetByType('thermostat'));
    const b = step(result, c => c.addWidgetByType('sensor'));
    widgetConfigs.set(a, { type: 'thermostat', entityId: 'climate.salon' });

    const copy = step(result, c => c.duplicateWidget(a));

    expect(ids(result)).toEqual([a, copy, b]);
    // Tout l'intérêt : la copie arrive déjà réglée.
    expect(widgetConfigs.get(copy)).toEqual({ type: 'thermostat', entityId: 'climate.salon' });
  });

  it('ignore un identifiant inconnu', () => {
    const result = setup();
    expect(step(result, c => c.duplicateWidget('nexiste-pas'))).toBe('');
    expect(result.current.layout.panels).toEqual([]);
  });
});

describe('moveWidget', () => {
  it('réordonne dans un panneau, dans les deux sens', () => {
    const result = setup();
    const [a, b, c] = ['sensor', 'light', 'cover'].map(t => step(result, x => x.addWidgetByType(t as 'sensor')));
    const panel = result.current.layout.panels[0].id;

    // Vers la droite : le rang visé compte la tuile déplacée.
    step(result, x => x.moveWidget(a, panel, 2));
    expect(ids(result)).toEqual([b, a, c]);

    step(result, x => x.moveWidget(c, panel, 0));
    expect(ids(result)).toEqual([c, b, a]);
  });

  it('passe d’un panneau à l’autre en se ramenant à sa largeur', () => {
    const result = setup();
    const a = step(result, c => c.addWidgetByType('sensor'));
    step(result, c => c.updateWidget(a, { w: 6 }));
    const narrow = step(result, c => c.addPanel());
    step(result, c => c.updatePanel(narrow, { cols: 3 }));

    step(result, c => c.moveWidget(a, narrow));

    expect(ids(result, 0)).toEqual([]);
    expect(result.current.layout.panels[1].widgets).toMatchObject([{ id: a, w: 3 }]);
  });
});

describe('panneaux', () => {
  it('rétrécir un panneau ramène ses tuiles trop larges', () => {
    const result = setup();
    const a = step(result, c => c.addWidgetByType('sensor'));
    step(result, c => c.updateWidget(a, { w: 5 }));
    const panel = result.current.layout.panels[0].id;
    step(result, c => c.updatePanel(panel, { cols: 4, title: 'Favoris' }));
    expect(result.current.layout.panels[0]).toMatchObject({ title: 'Favoris', cols: 4, widgets: [{ w: 4 }] });
  });

  it('déplace et supprime un panneau', () => {
    const result = setup();
    const p1 = step(result, c => c.addPanel());
    const p2 = step(result, c => c.addPanel());
    step(result, c => c.movePanelTo(p2, p1, 'left'));
    expect(result.current.layout.panels.map(p => p.id)).toEqual([p2, p1]);
    // Sur lui-même : rien ne bouge.
    step(result, c => c.movePanelTo(p2, p2, 'right'));
    expect(result.current.layout.panels.map(p => p.id)).toEqual([p2, p1]);
    step(result, c => c.removePanel(p2));
    expect(result.current.layout.panels.map(p => p.id)).toEqual([p1]);
  });
});

describe('removeWidgets', () => {
  it('supprime tout le groupe en un seul geste', () => {
    const result = setup();
    const [a, b, c] = ['sensor', 'light', 'cover'].map(t => step(result, x => x.addWidgetByType(t as 'sensor')));

    step(result, x => x.removeWidgets([a, c]));
    expect(ids(result)).toEqual([b]);

    // Un seul point d'historique : une suppression multiple est *un* geste.
    act(() => result.current.undo());
    expect(ids(result)).toEqual([a, b, c]);
  });

  it("ignore une liste vide sans toucher à l'historique", () => {
    const result = setup();
    step(result, c => c.addWidgetByType('sensor'));
    const before = result.current.canUndo;
    act(() => result.current.removeWidgets([]));
    expect(ids(result)).toHaveLength(1);
    expect(result.current.canUndo).toBe(before);
  });
});

describe('annuler / rétablir', () => {
  it('revient sur un ajout, puis le rejoue', () => {
    const result = setup();
    expect(result.current.canUndo).toBe(false);

    const a = step(result, c => c.addWidgetByType('sensor'));
    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());
    expect(result.current.layout.panels).toEqual([]);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());
    expect(ids(result)).toEqual([a]);
  });

  it("regroupe les mutations rapprochées — un redimensionnement n'est pas cent points de retour", () => {
    const result = setup();
    const a = step(result, c => c.addWidgetByType('sensor'));
    const before = layoutWidgets(result.current.layout)[0].h;
    act(() => {
      vi.setSystemTime(Date.now() + 500);
      for (let h = 1; h <= 20; h++) result.current.updateWidget(a, { h });
    });
    expect(layoutWidgets(result.current.layout)[0].h).toBe(20);

    // Une seule annulation ramène avant le geste entier.
    act(() => result.current.undo());
    expect(layoutWidgets(result.current.layout)[0].h).toBe(before);
  });

  it('une nouvelle action efface le futur', () => {
    const result = setup();
    step(result, c => c.addWidgetByType('sensor'));
    act(() => result.current.undo());
    expect(result.current.canRedo).toBe(true);
    step(result, c => c.addWidgetByType('light'));
    expect(result.current.canRedo).toBe(false);
  });

  it("ne fait rien quand il n'y a rien à annuler", () => {
    const result = setup();
    act(() => result.current.undo());
    act(() => result.current.redo());
    expect(result.current.layout.panels).toEqual([]);
  });
});

describe('useEditMode', () => {
  it('defaults to false, then toggles', () => {
    const { result } = renderHook(() => useEditMode(), { wrapper: createWrapper() });
    expect(result.current.isEditMode).toBe(false);
    act(() => result.current.setEditMode(true));
    expect(result.current.isEditMode).toBe(true);
    act(() => result.current.setEditMode(false));
    expect(result.current.isEditMode).toBe(false);
  });
});
