import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import type { ReactNode } from 'react';
import { PageProvider, usePages, type Page } from './PageContext';

const PAGES: Page[] = [
  { id: 'home', label: 'Accueil', type: 'grid', order: 0 },
  { id: 'cameras', label: 'Caméras', type: 'grid', order: 1 },
  { id: 'maison', label: 'Maison', type: 'floorplan', order: 2 },
];

describe('PageContext — showPage', () => {
  it("montre une page sans y naviguer : ce qui navigue entre-temps change la page d'en dessous", () => {
    const { result } = renderHook(() => usePages(), {
      wrapper: ({ children }: { children: ReactNode }) => <PageProvider initialPages={PAGES}>{children}</PageProvider>,
    });
    act(() => result.current.setCurrentPage('cameras'));
    act(() => result.current.showPage('maison'));
    expect(result.current.currentPage?.id).toBe('maison');
    expect(result.current.navigatedPageId).toBe('cameras');
    // Le retour à l'accueil, pendant la veille : la maison reste montrée.
    act(() => result.current.setCurrentPage('home'));
    expect(result.current.currentPageId).toBe('maison');
    act(() => result.current.showPage(null));
    expect(result.current.currentPageId).toBe('home');
  });
});
