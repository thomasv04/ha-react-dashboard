import { useHass } from '@hakit/core';
import type { LucideIcon } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { conditionIcon } from '@/lib/weather';

/**
 * Météo du moment. Pas de réglage dédié : la première entité météo de
 * l'installation.
 *
 * Le sélecteur ne rend que son identifiant — une chaîne stable — puis l'entité
 * est lue seule : la température est un attribut, qu'une comparaison sur l'état
 * seul laisserait figée tant que le ciel ne change pas.
 */
export function useWeatherNow(): { temperature: number | undefined; Icon: LucideIcon } {
  const weatherId = useHass(s => {
    for (const id in s.entities ?? {}) if (id.startsWith('weather.')) return id;
    return '';
  });
  const weather = useSafeEntity(weatherId);
  return {
    temperature: weather?.attributes.temperature as number | undefined,
    Icon: conditionIcon(weather?.state ?? '').Icon,
  };
}
