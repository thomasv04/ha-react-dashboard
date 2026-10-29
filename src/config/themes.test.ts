import { test, expect } from 'vitest';
import { hexToTint, normalizeThemeId, tintToHex } from './themes';

test('un thème retiré en 4.0 bascule sur sombre ou clair selon sa surface', () => {
  expect(normalizeThemeId('light')).toBe('light');
  expect(normalizeThemeId('ha')).toBe('ha');
  expect(normalizeThemeId('clay')).toBe('light');
  expect(normalizeThemeId('sea-glass')).toBe('light');
  expect(normalizeThemeId('clay-dark')).toBe('dark');
  expect(normalizeThemeId('midnight')).toBe('dark');
  expect(normalizeThemeId(undefined)).toBe('dark');
});

test('la couleur choisie et la teinte des cards se convertissent sans perte', () => {
  expect(hexToTint('#16211f')).toBe('22 33 31');
  expect(tintToHex('22 33 31')).toBe('#16211f');
  expect(tintToHex(hexToTint('#0a0bff'))).toBe('#0a0bff');
});
