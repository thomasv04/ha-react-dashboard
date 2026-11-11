import { describe, expect, it } from 'vitest';
import { isChristmasSeason } from './ThemeContext';

describe('isChristmasSeason', () => {
  it('va du 1er décembre au 6 janvier inclus', () => {
    expect(isChristmasSeason(new Date(2026, 10, 30))).toBe(false);
    expect(isChristmasSeason(new Date(2026, 11, 1))).toBe(true);
    expect(isChristmasSeason(new Date(2026, 11, 31))).toBe(true);
    expect(isChristmasSeason(new Date(2027, 0, 6))).toBe(true);
    expect(isChristmasSeason(new Date(2027, 0, 7))).toBe(false);
  });
});
