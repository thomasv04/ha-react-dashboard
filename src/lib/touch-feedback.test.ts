import { describe, expect, it } from 'vitest';
import { placeBubble, tileValueAt, valueStep } from './touch-feedback';

describe('valueStep', () => {
  it('compte les crans de 5 % de la course', () => {
    expect(valueStep(0, 0, 100)).toBe(0);
    expect(valueStep(42, 0, 100)).toBe(8);
    expect(valueStep(100, 0, 100)).toBe(20);
    expect(valueStep(180, 0, 359)).toBe(10);
    expect(valueStep(3000, 2000, 6000)).toBe(5);
  });
});

describe('tileValueAt', () => {
  it('lit la position du doigt sur la largeur de la tuile', () => {
    expect(tileValueAt(100, 100, 200)).toBe(0);
    expect(tileValueAt(184, 100, 200)).toBe(42);
    expect(tileValueAt(300, 100, 200)).toBe(100);
    expect(tileValueAt(20, 100, 200)).toBe(0);
    expect(tileValueAt(500, 100, 200)).toBe(100);
  });

  it('lumière : le bord gauche éteint, ailleurs au moins 1 %', () => {
    expect(tileValueAt(102, 100, 200, { offEdge: true })).toBe(0);
    expect(tileValueAt(50, 100, 200, { offEdge: true })).toBe(0);
    expect(tileValueAt(103, 100, 200, { offEdge: true })).toBe(2);
    expect(tileValueAt(105, 100, 400, { offEdge: true })).toBe(1);
  });

  it('volet : crans de 5 % entre deux marges inertes', () => {
    expect(tileValueAt(116, 100, 232, { inset: 16, step: 5 })).toBe(0);
    expect(tileValueAt(105, 100, 232, { inset: 16, step: 5 })).toBe(0);
    expect(tileValueAt(116 + 87, 100, 232, { inset: 16, step: 5 })).toBe(45);
    expect(tileValueAt(332, 100, 232, { inset: 16, step: 5 })).toBe(100);
  });
});

describe('placeBubble', () => {
  it('centre la bulle 34 px au-dessus du point', () => {
    expect(placeBubble(200, 300, 80, 30, 1000)).toEqual({ left: 160, top: 236 });
  });

  it('ne sort pas de l’écran à gauche, à droite ni en haut', () => {
    expect(placeBubble(10, 300, 80, 30, 390).left).toBe(8);
    expect(placeBubble(385, 300, 80, 30, 390).left).toBe(302);
    expect(placeBubble(200, 20, 80, 30, 390).top).toBe(8);
  });
});
