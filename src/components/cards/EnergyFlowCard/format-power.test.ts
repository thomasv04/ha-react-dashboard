import { describe, expect, test } from 'vitest';
import { formatPower } from './format-power';

describe('formatPower', () => {
  test('écrit les kilowatts avec le séparateur décimal de la locale', () => {
    expect(formatPower(1500, 'fr')).toEqual({ value: '1,5', unit: 'kW' });
    expect(formatPower(1500, 'en')).toEqual({ value: '1.5', unit: 'kW' });
  });

  test('garde une décimale au plus et retire la décimale nulle', () => {
    expect(formatPower(1234, 'en')).toEqual({ value: '1.2', unit: 'kW' });
    expect(formatPower(2000, 'fr')).toEqual({ value: '2', unit: 'kW' });
  });

  test('reste en watts, arrondis, sous le kilowatt', () => {
    expect(formatPower(999.4, 'fr')).toEqual({ value: '999', unit: 'W' });
    expect(formatPower(42.6, 'en')).toEqual({ value: '43', unit: 'W' });
  });

  test('bascule en kW à partir de 1000 W, en valeur absolue', () => {
    expect(formatPower(1000, 'en')).toEqual({ value: '1', unit: 'kW' });
    expect(formatPower(-1500, 'fr')).toEqual({ value: '-1,5', unit: 'kW' });
  });
});
