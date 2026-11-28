import { describe, expect, it } from 'vitest';
import { placeBubble, valueStep } from './touch-feedback';

describe('valueStep', () => {
  it('compte les crans de 5 % de la course', () => {
    expect(valueStep(0, 0, 100)).toBe(0);
    expect(valueStep(42, 0, 100)).toBe(8);
    expect(valueStep(100, 0, 100)).toBe(20);
    expect(valueStep(180, 0, 359)).toBe(10);
    expect(valueStep(3000, 2000, 6000)).toBe(5);
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
