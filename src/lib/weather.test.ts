import { describe, it, expect } from 'vitest';
import fr from '@/i18n/locales/fr/widgets.json';
import { conditionKey } from './weather';

const label = (state: string) =>
  conditionKey(state)
    .split('.')
    .slice(1)
    .reduce<unknown>((node, k) => (node as Record<string, unknown> | undefined)?.[k], fr);

describe('conditionKey (#80)', () => {
  it('ramène `partly-cloudy` au `partlycloudy` de Home Assistant', () => {
    expect(label('partly-cloudy')).toBe(label('partlycloudy'));
    expect(typeof label('partly-cloudy')).toBe('string');
  });

  it('garde les vraies clés à tiret de Home Assistant', () => {
    for (const state of ['clear-night', 'lightning-rainy', 'snowy-rainy', 'windy-variant']) {
      expect(typeof label(state)).toBe('string');
    }
  });
});
