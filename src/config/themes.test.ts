import { test, expect } from 'vitest';
import { normalizeThemeId } from './themes';

test('un thème retiré en 4.0 bascule sur sombre ou clair selon sa surface', () => {
  expect(normalizeThemeId('light')).toBe('light');
  expect(normalizeThemeId('ha')).toBe('ha');
  expect(normalizeThemeId('clay')).toBe('light');
  expect(normalizeThemeId('sea-glass')).toBe('light');
  expect(normalizeThemeId('clay-dark')).toBe('dark');
  expect(normalizeThemeId('midnight')).toBe('dark');
  expect(normalizeThemeId(undefined)).toBe('dark');
});
