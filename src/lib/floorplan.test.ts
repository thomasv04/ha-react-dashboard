import { describe, it, expect } from 'vitest';
import {
  containSize,
  isNightDimmed,
  lightGlow,
  movePos,
  normalizeAnchor,
  normalizePos,
  resizePos,
  sunLighting,
  DEFAULT_WIDGET_SIZE,
} from './floorplan';

const RECT = { width: 1000, height: 500 };

describe('normalizePos', () => {
  it('keeps a valid position', () => {
    expect(normalizePos({ x: 20, y: 70 }, false)).toEqual({ x: 20, y: 70 });
  });

  it('centres an unreadable position instead of losing the element', () => {
    expect(normalizePos(undefined, false)).toEqual({ x: 50, y: 50 });
    expect(normalizePos({ x: '12', y: NaN }, false)).toEqual({ x: 50, y: 50 });
  });

  it('clamps into the plan', () => {
    expect(normalizePos({ x: -40, y: 180 }, false)).toEqual({ x: 0, y: 100 });
  });

  it('gives a widget a default size, and a chip none', () => {
    expect(normalizePos({ x: 50, y: 50 }, true)).toEqual({ x: 50, y: 50, ...DEFAULT_WIDGET_SIZE });
    expect(normalizePos({ x: 50, y: 50, w: 30, h: 20 }, false)).toEqual({ x: 50, y: 50 });
  });
});

describe('containSize', () => {
  it('fits the height when the area is wide', () => {
    expect(containSize(2000, 500, 2)).toEqual({ w: 1000, h: 500 });
  });

  it('fits the width when the area is tall', () => {
    expect(containSize(1000, 2000, 2)).toEqual({ w: 1000, h: 500 });
  });

  it('never goes below the minimum width (the area scrolls instead)', () => {
    expect(containSize(375, 700, 2)).toEqual({ w: 768, h: 384 });
  });
});

describe('movePos', () => {
  it('converts a pixel drag into % of the plan', () => {
    expect(movePos({ x: 50, y: 50 }, 100, -50, RECT)).toEqual({ x: 60, y: 40 });
  });

  it('lets a chip reach the edge, but keeps a widget whole inside the plan', () => {
    expect(movePos({ x: 90, y: 50 }, 500, 0, RECT).x).toBe(100);
    expect(movePos({ x: 50, y: 50, w: 20, h: 10 }, 5000, 5000, RECT)).toEqual({ x: 90, y: 95, w: 20, h: 10 });
  });
});

describe('resizePos', () => {
  it('grows from the bottom-right corner, top-left corner fixed', () => {
    // Boîte 20 × 10 dont le coin haut-gauche est en (40, 45).
    const next = resizePos({ x: 50, y: 50, w: 20, h: 10 }, 100, 50, RECT);
    expect(next).toEqual({ x: 55, y: 55, w: 30, h: 20 });
    expect(next.x - next.w! / 2).toBe(40);
    expect(next.y - next.h! / 2).toBe(45);
  });

  it('stops at the plan edge and at a minimum size', () => {
    expect(resizePos({ x: 50, y: 50, w: 20, h: 10 }, 9000, 0, RECT).w).toBe(60);
    expect(resizePos({ x: 50, y: 50, w: 20, h: 10 }, -9000, 0, RECT).w).toBe(4);
  });
});

describe('lightGlow', () => {
  it('uses the real colour of the lamp, and its brightness for opacity', () => {
    expect(lightGlow('on', { rgb_color: [255, 0, 0], brightness: 255 })).toEqual({ color: [255, 0, 0], opacity: 0.8 });
  });

  it('falls back to warm white for a dimmer-only lamp, and stays visible at minimum brightness', () => {
    const glow = lightGlow('on', { brightness: 0 });
    expect(glow?.color).toEqual([255, 196, 128]);
    expect(glow?.opacity).toBeCloseTo(0.25);
  });

  it('has no halo when off or unavailable', () => {
    expect(lightGlow('off', { rgb_color: [255, 0, 0] })).toBeNull();
    expect(lightGlow('unavailable', {})).toBeNull();
  });
});

describe('normalizeAnchor', () => {
  it('keeps a 3D point and rejects anything else', () => {
    expect(normalizeAnchor([1, 2.5, -3])).toEqual([1, 2.5, -3]);
    expect(normalizeAnchor([1, 2])).toBeUndefined();
    expect(normalizeAnchor([1, NaN, 3])).toBeUndefined();
    expect(normalizeAnchor('1,2,3')).toBeUndefined();
  });
});

describe('sunLighting', () => {
  const round = (v: number[]) => v.map(n => Math.round(n * 1000) / 1000 + 0);

  it('points the sun to the right compass direction', () => {
    expect(round(sunLighting({ azimuth: 0, elevation: 0 }).dir)).toEqual([0, 0, -1]); // nord : −z
    expect(round(sunLighting({ azimuth: 90, elevation: 0 }).dir)).toEqual([1, 0, 0]); // est : +x
    expect(round(sunLighting({ azimuth: 180, elevation: 90 }).dir)).toEqual([0, 1, 0]); // zénith
  });

  it('turns the sun with the model orientation', () => {
    expect(round(sunLighting({ azimuth: 0, elevation: 0 }, 90).dir)).toEqual([1, 0, 0]);
  });

  it('switches the sun off at night, and dims the ambient light through dusk', () => {
    const night = sunLighting({ azimuth: 300, elevation: -12 });
    expect(night.sun).toBe(0);
    expect(night.ambient).toBeCloseTo(0.15);
    expect(sunLighting({ azimuth: 180, elevation: 30 }).ambient).toBe(1);
    const dusk = sunLighting({ azimuth: 270, elevation: 2 }).ambient;
    expect(dusk).toBeGreaterThan(0.15);
    expect(dusk).toBeLessThan(1);
  });

  it('assumes an afternoon sun when sun.sun is missing', () => {
    expect(sunLighting(undefined).sun).toBeGreaterThan(1);
  });
});

describe('isNightDimmed', () => {
  it('dims after sunset unless disabled', () => {
    expect(isNightDimmed('below_horizon', undefined)).toBe(true);
    expect(isNightDimmed('below_horizon', false)).toBe(false);
    expect(isNightDimmed('above_horizon', true)).toBe(false);
    expect(isNightDimmed(undefined, true)).toBe(false);
  });
});
