import { describe, it, expect, vi } from 'vitest';

// La fiche importe tout le socle HA ; seul le calcul de position est testé ici.
vi.mock('@hakit/core', () => ({ useHass: () => ({ helpers: {} }) }));

import { positionFromPointer } from './CoverMoreInfo';

describe('positionFromPointer', () => {
  // Rectangle de 280 px de haut, posé à 100 px du haut de la fenêtre.
  const at = (y: number) => positionFromPointer(y, 100, 280);

  it('donne 100 % en haut du rectangle et 0 % en bas', () => {
    expect(at(100)).toBe(100);
    expect(at(380)).toBe(0);
  });

  it('borne les points hors du rectangle', () => {
    expect(at(-500)).toBe(100);
    expect(at(9999)).toBe(0);
  });

  it('arrondit au pour cent', () => {
    expect(at(240)).toBe(50);
    expect(at(243)).toBe(49);
    expect(at(213)).toBe(60);
  });

  it('renvoie 0 sur un rectangle non mesuré', () => {
    expect(positionFromPointer(120, 0, 0)).toBe(0);
  });
});
