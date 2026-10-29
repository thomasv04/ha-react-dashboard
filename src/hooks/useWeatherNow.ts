import { useEffect, useState } from 'react';
import { Cloud, CloudRain, CloudSnow, CloudSun, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useEntitiesByDomain } from '@/hooks/useEntities';

const CONDITION_ICONS: Record<string, LucideIcon> = {
  sunny: Sun,
  'clear-night': Moon,
  partlycloudy: CloudSun,
  rainy: CloudRain,
  pouring: CloudRain,
  snowy: CloudSnow,
  'snowy-rainy': CloudSnow,
};

/** Heure de la barre, rafraîchie assez souvent pour ne jamais rater une minute. */
export function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/** Météo du moment. Pas de réglage dédié : la première entité météo de l'installation. */
export function useWeatherNow(): { temperature: number | undefined; Icon: LucideIcon } {
  const weather = useEntitiesByDomain('weather')[0];
  return {
    temperature: weather?.attributes.temperature as number | undefined,
    Icon: CONDITION_ICONS[weather?.state ?? ''] ?? Cloud,
  };
}
