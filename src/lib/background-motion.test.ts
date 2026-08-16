import { describe, it, expect } from 'vitest';
import { advanceParticle, TRACK_MIN, TRACK_MAX, type Particle } from './background-motion';

const particle = (nx = 0.5, ny = 0.5): Particle => ({ nx, ny, dirX: 1, dirY: 1 });

describe('advanceParticle', () => {
  it('avance simplement tant que la particule est loin des bords', () => {
    const p = particle();
    const alpha = advanceParticle(p, 0.1, 0.05, 'fade');

    expect(p.nx).toBeCloseTo(0.6);
    expect(p.ny).toBeCloseTo(0.55);
    expect(alpha).toBe(1);
  });

  describe('fade', () => {
    it('éteint la particule à mesure qu\'elle approche du bord', () => {
      const loin = advanceParticle(particle(0.5), 0, 0, 'fade');
      const proche = advanceParticle(particle(TRACK_MAX - 0.15), 0, 0, 'fade');
      const auBord = advanceParticle(particle(TRACK_MAX), 0, 0, 'fade');

      expect(loin).toBe(1);
      expect(proche).toBeLessThan(1);
      expect(proche).toBeGreaterThan(0);
      expect(auBord).toBe(0);
    });

    it('téléporte alors que la particule est déjà invisible — le saut ne se voit pas', () => {
      // Tout l'objet du mode : le franchissement a lieu à opacité nulle.
      const p = particle(TRACK_MAX - 0.01);
      const alpha = advanceParticle(p, 0.05, 0, 'fade');

      expect(p.nx).toBe(TRACK_MIN);
      expect(alpha).toBe(0);
    });

    it('remonte progressivement en opacité après être réapparue', () => {
      const p = particle(TRACK_MIN);
      let alpha = advanceParticle(p, 0.1, 0, 'fade');
      const premier = alpha;
      alpha = advanceParticle(p, 0.1, 0, 'fade');

      expect(premier).toBeGreaterThan(0);
      expect(alpha).toBeGreaterThan(premier);
    });
  });

  describe('bounce', () => {
    it('inverse le sens au lieu de traverser', () => {
      const p = particle(TRACK_MAX - 0.01);
      advanceParticle(p, 0.05, 0, 'bounce');

      expect(p.dirX).toBe(-1);
      expect(p.nx).toBeLessThanOrEqual(TRACK_MAX);
      // Et surtout : elle n'a pas été renvoyée à l'autre bout.
      expect(p.nx).toBeGreaterThan(0.5);
    });

    it('repart bien dans l\'autre sens au pas suivant', () => {
      const p = particle(TRACK_MAX - 0.01);
      advanceParticle(p, 0.05, 0, 'bounce');
      const apresRebond = p.nx;
      advanceParticle(p, 0.05, 0, 'bounce');

      expect(p.nx).toBeLessThan(apresRebond);
    });

    it('ne reste pas coincée quand un pas dépasse largement la borne', () => {
      // Une particule rapide sortait loin des bornes : sans recadrage, elle
      // oscillait sur place entre deux inversions sans jamais revenir.
      const p = particle(TRACK_MAX - 0.01);
      advanceParticle(p, 5, 0, 'bounce');
      expect(p.nx).toBe(TRACK_MAX);

      advanceParticle(p, 0.1, 0, 'bounce');
      expect(p.nx).toBeLessThan(TRACK_MAX);
    });

    it('traite les deux axes indépendamment', () => {
      const p = particle(TRACK_MAX - 0.01, 0.5);
      advanceParticle(p, 0.05, 0.05, 'bounce');

      expect(p.dirX).toBe(-1);
      expect(p.dirY).toBe(1);
    });

    it('garde une opacité pleine — rien ne disparaît dans ce mode', () => {
      expect(advanceParticle(particle(TRACK_MAX), 0.05, 0, 'bounce')).toBe(1);
    });
  });

  describe('wrap', () => {
    it('reproduit le comportement d\'origine, saut compris', () => {
      const p = particle(TRACK_MAX - 0.01);
      const alpha = advanceParticle(p, 0.05, 0, 'wrap');

      expect(p.nx).toBe(TRACK_MIN);
      expect(alpha).toBe(1); // à pleine opacité : c'est bien ce qui se voyait
    });

    it('traverse aussi vers le bas', () => {
      const p = particle(0.5, TRACK_MIN + 0.01);
      advanceParticle(p, 0, -0.05, 'wrap');
      expect(p.ny).toBe(TRACK_MAX);
    });
  });
});
