import { test, expect } from 'vitest';
import { hexToTint, tintToHex } from './themes';

test('la couleur choisie et la teinte des cards se convertissent sans perte', () => {
  expect(hexToTint('#16211f')).toBe('22 33 31');
  expect(tintToHex('22 33 31')).toBe('#16211f');
  expect(tintToHex(hexToTint('#0a0bff'))).toBe('#0a0bff');
});
