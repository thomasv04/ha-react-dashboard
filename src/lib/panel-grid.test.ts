import { describe, it, expect } from 'vitest';
import { colsThatFit, colsWidth, panelsFromLegacy, placePanel, toPanelLayout } from './panel-grid';

describe('trame', () => {
  it('largeur de n colonnes, et combien tiennent', () => {
    expect(colsWidth(1)).toBe(96);
    expect(colsWidth(3)).toBe(3 * 96 + 2 * 16);
    expect(colsThatFit(colsWidth(6))).toBe(6);
    expect(colsThatFit(colsWidth(6) - 1)).toBe(5);
    // Jamais zéro : une tuile s'affiche toujours.
    expect(colsThatFit(10)).toBe(1);
  });
});

describe('conversion des dispositions d’avant la 4.0', () => {
  const legacy = {
    widgets: {
      lg: [
        { id: 'b', type: 'light', x: 6, y: 0, w: 6, h: 2 },
        { id: 'c', type: 'cover', x: 0, y: 2, w: 14, h: 2 },
        { id: 'a', type: 'sensor', x: 0, y: 0, w: 6, h: 2 },
      ],
      md: [],
      sm: [],
    },
    cols: { lg: 12, md: 8, sm: 4 },
  };

  it('un panneau, la grille lg dans l’ordre de lecture, sans coordonnées', () => {
    const [panel, ...rest] = panelsFromLegacy(legacy as never);
    expect(rest).toEqual([]);
    expect(panel.cols).toBe(12);
    expect(panel.widgets.map(w => w.id)).toEqual(['a', 'b', 'c']);
    expect(panel.widgets[0]).not.toHaveProperty('x');
    // Plus large que le panneau : ramenée à sa largeur.
    expect(panel.widgets[2].w).toBe(12);
  });

  it('une page vide ne donne aucun panneau', () => {
    expect(panelsFromLegacy({ widgets: { lg: [] } })).toEqual([]);
  });

  it('toPanelLayout laisse passer une disposition déjà en panneaux', () => {
    const layout = { panels: [{ id: 'p', cols: 6, widgets: [] }] };
    expect(toPanelLayout(layout)).toBe(layout);
    expect(toPanelLayout(legacy).panels[0].widgets).toHaveLength(3);
    expect(toPanelLayout(undefined)).toEqual({ panels: [] });
  });
});

describe('placePanel', () => {
  const panel = (id: string, below?: boolean) => ({ id, cols: 4, widgets: [], ...(below ? { below } : {}) });
  /** « A B/C D » : deux colonnes — A au-dessus de B, C au-dessus de D. */
  const shape = (l: { panels: { id: string; below?: boolean }[] }) =>
    l.panels.reduce((s, p) => s + (p.below ? '/' : s ? ' ' : '') + p.id, '');

  it('à gauche ou à droite : une colonne à lui', () => {
    const l = { panels: [panel('A'), panel('B', true), panel('C')] };
    expect(shape(placePanel(l, 'C', 'A', 'left'))).toBe('C A/B');
    expect(shape(placePanel(l, 'A', 'C', 'right'))).toBe('B C A');
  });

  it('au-dessus ou en dessous : dans la colonne visée', () => {
    const l = { panels: [panel('A'), panel('B'), panel('C')] };
    expect(shape(placePanel(l, 'C', 'A', 'below'))).toBe('A/C B');
    expect(shape(placePanel(l, 'C', 'A', 'above'))).toBe('C/A B');
    expect(shape(placePanel(l, 'A', 'C', 'above'))).toBe('B A/C');
  });

  it('retirer une tête de colonne passe la main à son suivant', () => {
    const l = { panels: [panel('A'), panel('B', true), panel('C')] };
    // A part à droite de C : B devient la tête de sa colonne.
    expect(shape(placePanel(l, 'A', 'C', 'right'))).toBe('B C A');
    // B (sous A) rejoint C : A reste seul.
    expect(shape(placePanel(l, 'B', 'C', 'below'))).toBe('A C/B');
  });

  it("le premier panneau n'est jamais « sous » un autre, et un id inconnu ne change rien", () => {
    const l = { panels: [panel('A'), panel('B')] };
    expect(placePanel(l, 'B', 'A', 'above').panels[0].below).toBeUndefined();
    expect(placePanel(l, 'X', 'A', 'left')).toBe(l);
    expect(placePanel(l, 'A', 'A', 'left')).toBe(l);
  });
});
