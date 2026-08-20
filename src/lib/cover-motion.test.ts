import { describe, it, expect } from 'vitest';
import { coverArrowMotion } from './cover-motion';

describe('coverArrowMotion', () => {
  it('balance la flèche du haut pendant une ouverture, et elle seule', () => {
    expect(coverArrowMotion('opening', 'up')?.animate.y).toEqual([0, -3, 0]);
    expect(coverArrowMotion('opening', 'down')).toBeUndefined();
  });

  it('balance la flèche du bas pendant une fermeture, vers le bas', () => {
    expect(coverArrowMotion('closing', 'down')?.animate.y).toEqual([0, 3, 0]);
    expect(coverArrowMotion('closing', 'up')).toBeUndefined();
  });

  it('laisse un volet à l’arrêt tranquille', () => {
    for (const state of ['open', 'closed', 'unavailable', undefined]) {
      expect(coverArrowMotion(state, 'up')).toBeUndefined();
      expect(coverArrowMotion(state, 'down')).toBeUndefined();
    }
  });

  it('respecte le refus des animations', () => {
    expect(coverArrowMotion('opening', 'up', false)).toBeUndefined();
  });
});
