import { describe, it, expect, vi } from 'vitest';
import { WIDGET_CATALOG, type GridWidget } from './DashboardLayoutContext';

// @hakit/core use CJS lodash internally - mock it so tests can import without browser WS
vi.mock('@hakit/core', () => ({ useHass: vi.fn() }));

describe('WIDGET_CATALOG', () => {
  const EXPECTED_TYPES: GridWidget['type'][] = ['camera', 'weather', 'thermostat', 'shortcuts', 'tempo', 'energy'];

  it('contient toutes les entrées attendues', () => {
    const types = WIDGET_CATALOG.map(w => w.type);
    for (const expected of EXPECTED_TYPES) {
      expect(types).toContain(expected);
    }
  });

  it('contient aussi les widgets système (activity, greeting)', () => {
    // Ils sont proposés dans la modale d'ajout au même titre que les autres :
    // le catalogue doit donc les décrire.
    const types = WIDGET_CATALOG.map(w => w.type);
    expect(types).toContain('activity');
    expect(types).toContain('greeting');
  });

  it('chaque entrée a un label non vide', () => {
    for (const entry of WIDGET_CATALOG) {
      expect(entry.label.trim()).not.toBe('');
    }
  });

  it('chaque entrée a des dimensions valides (w > 0, h > 0) pour tous les breakpoints', () => {
    for (const entry of WIDGET_CATALOG) {
      for (const bp of ['lg', 'md', 'sm'] as const) {
        expect(entry[bp].w).toBeGreaterThan(0);
        expect(entry[bp].h).toBeGreaterThan(0);
      }
    }
  });

  it('les largeurs ne dépassent pas la grille pour chaque breakpoint', () => {
    const maxCols = { lg: 12, md: 8, sm: 4 };
    for (const entry of WIDGET_CATALOG) {
      expect(entry.lg.w).toBeLessThanOrEqual(maxCols.lg);
      expect(entry.md.w).toBeLessThanOrEqual(maxCols.md);
      expect(entry.sm.w).toBeLessThanOrEqual(maxCols.sm);
    }
  });

  it('ne contient pas de doublons de type', () => {
    const types = WIDGET_CATALOG.map(w => w.type);
    const unique = new Set(types);
    expect(unique.size).toBe(types.length);
  });
});
