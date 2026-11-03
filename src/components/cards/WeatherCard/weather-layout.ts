import type { WidgetSize } from '@/hooks/useWidgetSize';

export interface WeatherLayout {
  /** Chips vent / humidité. */
  showStats: boolean;
  /** Pression, la plus accessoire des chips. */
  showPressure: boolean;
  /** Colonnes de prévisions. */
  showForecast: boolean;
  /** Classe Tailwind de la température. */
  tempClass: string;
  /** Côté de l'icône de condition, en px. */
  iconSize: number;
}

/**
 * Ce que la card météo affiche selon la place dont elle dispose, sur les deux axes.
 *
 * En case étroite (`xs`/`sm`, moins de ~200 px), la température en 72 px et
 * l'icône ne tiennent plus côte à côte : on réduit les deux et on retire les
 * quatre colonnes de prévisions, trop serrées pour rester lisibles. Les blocs
 * secondaires disparaissent plutôt que d'être rognés.
 */
export function getWeatherLayout(size: Pick<WidgetSize, 'w' | 'h'>, forecastCount: number): WeatherLayout {
  const narrow = size.w === 'xs' || size.w === 'sm';
  const short = size.h === 'short';
  return {
    showStats: size.h !== 'squat' && size.h !== 'short',
    showPressure: !narrow,
    showForecast: !narrow && (size.h === 'normal' || size.h === 'tall') && forecastCount > 0,
    tempClass: narrow ? 'text-3xl tracking-[-1px]' : short ? 'text-5xl tracking-[-2px]' : 'text-[72px] tracking-[-2px]',
    iconSize: narrow || short ? 40 : 56,
  };
}
