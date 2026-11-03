import { render, act } from '@testing-library/react';
import { vi, describe, it, expect } from 'vitest';

vi.mock('@hakit/core', () => ({ useHass: vi.fn() }));
vi.mock('@/context/WidgetConfigContext', () => ({
  useWidgetConfig: () => ({ getWidgetConfig: () => undefined, updateWidgetConfig: () => undefined }),
}));

import { PageProvider, usePages, DEFAULT_PAGES, type Page } from './PageContext';
import { DashboardLayoutProvider, useDashboardLayout, type DashboardLayout } from './DashboardLayoutContext';

const page = (id: string, order: number): Page => ({ id, label: id, type: 'grid', order });
const CACHE = [page('home', 0), page('cameras', 1)];

interface Props {
  pages?: Page[];
  layouts?: Record<string, DashboardLayout>;
}

/** Monte les providers comme `Dashboard` : les props suivent la réponse du serveur. */
function setup(initial: Props) {
  const out = {} as { pages: ReturnType<typeof usePages>; layout: ReturnType<typeof useDashboardLayout> };
  function Probe() {
    out.pages = usePages();
    out.layout = useDashboardLayout();
    return null;
  }
  const tree = ({ pages, layouts }: Props) => (
    <PageProvider initialPages={pages}>
      <DashboardLayoutProvider initialLayouts={layouts}>
        <Probe />
      </DashboardLayoutProvider>
    </PageProvider>
  );
  const view = render(tree(initial));
  return { out, update: (next: Props) => view.rerender(tree(next)) };
}

const ids = (pages: Page[]) => pages.map(p => p.id);

describe('PageProvider — synchro avec le serveur (#25)', () => {
  it('suit une page ajoutée côté serveur', () => {
    const { out, update } = setup({ pages: CACHE });
    update({ pages: [...CACHE, page('salon', 2)] });
    expect(ids(out.pages.pages)).toEqual(['home', 'cameras', 'salon']);
  });

  it('suit une page supprimée ou réordonnée', () => {
    const { out, update } = setup({ pages: CACHE });
    update({ pages: [page('cameras', 0), page('home', 1)] });
    expect(ids(out.pages.pages)).toEqual(['cameras', 'home']);
    update({ pages: [page('home', 0)] });
    expect(ids(out.pages.pages)).toEqual(['home']);
  });

  it('page courante conservée : inchangée', () => {
    const { out, update } = setup({ pages: CACHE });
    act(() => out.pages.setCurrentPage('cameras'));
    update({ pages: [...CACHE, page('salon', 2)] });
    expect(out.pages.currentPageId).toBe('cameras');
  });

  it('page courante supprimée : retour à la première page, même sans « home »', () => {
    const { out, update } = setup({ pages: CACHE });
    act(() => out.pages.setCurrentPage('cameras'));
    update({ pages: [page('salon', 0), page('chambre', 1)] });
    expect(out.pages.currentPageId).toBe('salon');
  });

  it('initialPages absente ou vide : rien ne change', () => {
    const { out, update } = setup({ pages: CACHE });
    update({ pages: undefined });
    expect(out.pages.pages).toEqual(CACHE);
    update({ pages: [] });
    expect(out.pages.pages).toEqual(CACHE);
  });

  it('sans cache : les pages par défaut cèdent la place à la réponse du serveur', () => {
    const { out, update } = setup({ pages: DEFAULT_PAGES });
    update({ pages: [page('salon', 0), page('home', 1)] });
    expect(ids(out.pages.pages)).toEqual(['salon', 'home']);
    expect(out.pages.currentPageId).toBe('home');
  });

  it('avec DashboardLayoutProvider : la disposition de la page ajoutée, venue du serveur, est conservée', () => {
    const salon = { panels: [{ id: 'p1', widgets: [{ id: 'w1', type: 'sensor', w: 2, h: 1 }] }] } as unknown as DashboardLayout;
    const { out, update } = setup({ pages: CACHE, layouts: {} });
    update({ pages: [...CACHE, page('salon', 2)], layouts: { salon } });
    act(() => out.pages.setCurrentPage('salon'));
    expect(out.layout.layout.panels).toHaveLength(1);
  });
});
