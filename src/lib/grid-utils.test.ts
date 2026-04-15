import { describe, it, expect } from 'vitest';
import { buildOccupancyMap, canPlace, compactVertically, placeWidgetAt, pixelToGrid } from './grid-utils';
import type { GridWidget } from '@/context/DashboardLayoutContext';

const w = (id: string, x: number, y: number, ww: number, h: number): GridWidget => ({
  id,
  type: 'sensor',
  x,
  y,
  w: ww,
  h,
});

describe('buildOccupancyMap', () => {
  it('marks occupied cells', () => {
    const widgets = [w('a', 0, 0, 2, 1)];
    const map = buildOccupancyMap(widgets, 4, 2);
    expect(map[0][0]).toBe('a');
    expect(map[0][1]).toBe('a');
    expect(map[0][2]).toBeNull();
  });

  it('excludes specified widget', () => {
    const widgets = [w('a', 0, 0, 2, 1), w('b', 2, 0, 1, 1)];
    const map = buildOccupancyMap(widgets, 4, 2, 'a');
    expect(map[0][0]).toBeNull();
    expect(map[0][2]).toBe('b');
  });
});

describe('canPlace', () => {
  it('allows placement in empty area', () => {
    const map = buildOccupancyMap([], 4, 4);
    expect(canPlace(map, 0, 0, 2, 2, 4)).toBe(true);
  });

  it('rejects placement out of bounds', () => {
    const map = buildOccupancyMap([], 4, 4);
    expect(canPlace(map, 3, 0, 2, 1, 4)).toBe(false);
  });

  it('rejects overlap', () => {
    const widgets = [w('a', 0, 0, 2, 2)];
    const map = buildOccupancyMap(widgets, 4, 4);
    expect(canPlace(map, 1, 0, 2, 2, 4)).toBe(false);
  });
});

describe('compactVertically', () => {
  it('moves widgets up to fill gaps', () => {
    const widgets = [w('a', 0, 5, 2, 1)];
    const result = compactVertically(widgets, 4);
    expect(result[0].y).toBe(0);
  });

  it('preserves static widgets', () => {
    const widgets = [{ ...w('a', 0, 3, 2, 1), static: true }];
    const result = compactVertically(widgets, 4);
    expect(result[0].y).toBe(3);
  });

  it('stacks widgets without overlap', () => {
    const widgets = [w('a', 0, 0, 4, 1), w('b', 0, 0, 4, 1)];
    const result = compactVertically(widgets, 4);
    expect(result[0].y).toBe(0);
    expect(result[1].y).toBe(1);
  });
});

describe('placeWidgetAt', () => {
  it('places widget at target position', () => {
    const widget = w('a', 0, 0, 2, 1);
    const result = placeWidgetAt(widget, 2, 3, [widget], 4);
    const moved = result.find(r => r.id === 'a');
    expect(moved?.x).toBe(2);
  });

  it('pushes conflicting widgets down', () => {
    const a = w('a', 0, 0, 2, 2);
    const b = w('b', 0, 0, 2, 2);
    const result = placeWidgetAt(a, 0, 0, [a, b], 4);
    const bResult = result.find(r => r.id === 'b');
    expect(bResult!.y).toBeGreaterThanOrEqual(2);
  });
});

describe('pixelToGrid', () => {
  it('converts pixel to grid coords', () => {
    const rect = { left: 0, top: 0, width: 400, height: 600 } as DOMRect;
    const { col, row } = pixelToGrid(110, 95, rect, 4, 80, 16);
    expect(col).toBeGreaterThanOrEqual(0);
    expect(row).toBeGreaterThanOrEqual(0);
  });
});
