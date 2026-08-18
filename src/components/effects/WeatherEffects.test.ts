import { describe, it, expect } from 'vitest';
import { getEffectType, hasLightning } from './WeatherEffects';

describe('getEffectType', () => {
  it('couvre les états de pluie, de neige et de vent de Home Assistant', () => {
    expect(getEffectType('rainy')).toBe('rain');
    expect(getEffectType('pouring')).toBe('pouring');
    expect(getEffectType('lightning-rainy')).toBe('rain');
    expect(getEffectType('snowy')).toBe('snow');
    expect(getEffectType('snowy-rainy')).toBe('snow');
    expect(getEffectType('hail')).toBe('hail');
    expect(getEffectType('fog')).toBe('fog');
    expect(getEffectType('cloudy')).toBe('clouds');
    expect(getEffectType('partlycloudy')).toBe('clouds');
    expect(getEffectType('windy')).toBe('wind');
    expect(getEffectType('windy-variant')).toBe('wind');
    expect(getEffectType('clear-night')).toBe('stars');
  });

  it('laisse le beau temps tranquille', () => {
    // Rien à animer : une card de plein soleil agitée de particules serait du
    // bruit, pas de l'information.
    expect(getEffectType('sunny')).toBeNull();
    expect(getEffectType('exceptional')).toBeNull();
    expect(getEffectType(undefined)).toBeNull();
    expect(getEffectType('')).toBeNull();
  });

  it("n'éclaire que les orages", () => {
    expect(hasLightning('lightning')).toBe(true);
    expect(hasLightning('lightning-rainy')).toBe(true);
    expect(hasLightning('rainy')).toBe(false);
    expect(hasLightning(undefined)).toBe(false);
  });

  it("l'orage sec n'a pas de particules mais garde son éclair", () => {
    expect(getEffectType('lightning')).toBeNull();
    expect(hasLightning('lightning')).toBe(true);
  });
});
