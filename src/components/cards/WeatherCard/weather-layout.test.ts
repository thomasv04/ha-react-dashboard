import { describe, expect, test } from 'vitest';
import { getWeatherLayout } from './weather-layout';

describe('getWeatherLayout', () => {
  test('case large et haute : tout est affiché, température pleine taille', () => {
    expect(getWeatherLayout({ w: 'lg', h: 'normal' }, 4)).toEqual({
      showStats: true,
      showPressure: true,
      showForecast: true,
      tempClass: 'text-[72px] tracking-[-2px]',
      iconSize: 56,
    });
  });

  test.each(['xs', 'sm'] as const)('case étroite (%s) : température et icône réduites, prévisions et pression repliées', w => {
    const layout = getWeatherLayout({ w, h: 'tall' }, 4);
    expect(layout.tempClass).toContain('text-3xl');
    expect(layout.iconSize).toBe(40);
    expect(layout.showForecast).toBe(false);
    expect(layout.showPressure).toBe(false);
    // Le bloc vent / humidité, lui, reste (il passe à la ligne).
    expect(layout.showStats).toBe(true);
  });

  test('largeur md : la pression et les prévisions reviennent', () => {
    const layout = getWeatherLayout({ w: 'md', h: 'normal' }, 4);
    expect(layout.showPressure).toBe(true);
    expect(layout.showForecast).toBe(true);
  });

  test('case peu haute : ni chips ni prévisions', () => {
    const layout = getWeatherLayout({ w: 'lg', h: 'short' }, 4);
    expect(layout.showStats).toBe(false);
    expect(layout.showForecast).toBe(false);
  });

  test('sans prévision à afficher, la grille de prévisions est absente', () => {
    expect(getWeatherLayout({ w: 'xl', h: 'tall' }, 0).showForecast).toBe(false);
  });
});
