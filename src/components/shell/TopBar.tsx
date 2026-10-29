import { useEffect, useState } from 'react';
import { useUser } from '@hakit/core';
import { Cloud, CloudRain, CloudSnow, CloudSun, Grip, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useEntitiesByDomain } from '@/hooks/useEntities';
import { useFormats } from '@/hooks/useFormats';
import { useI18n } from '@/i18n';

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
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 10_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

/**
 * Barre du haut : lanceur d'apps à gauche, météo, heure et utilisateur à droite.
 * Lisible de loin — c'est ce qu'on regarde en passant devant la tablette.
 */
export function TopBar({ onOpenLauncher }: { onOpenLauncher: () => void }) {
  const { t } = useI18n();
  const { formatTime } = useFormats();
  const now = useNow();
  const user = useUser();
  // Pas de réglage dédié : la première entité météo de l'installation.
  const weather = useEntitiesByDomain('weather')[0];
  const temperature = weather?.attributes.temperature as number | undefined;
  const WeatherIcon = CONDITION_ICONS[weather?.state ?? ''] ?? Cloud;

  return (
    <header className='fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 sm:px-10 pt-6 pointer-events-none'>
      <button
        onClick={onOpenLauncher}
        data-tour='settings'
        title={t('layout.shell.openLauncher')}
        aria-label={t('layout.shell.openLauncher')}
        className='pointer-events-auto flex size-[60px] items-center justify-center rounded-[var(--ds-radius-md)] bg-[var(--ds-accent)] text-white active:scale-95 transition-transform'
      >
        <Grip size={28} />
      </button>

      <div className='flex items-center gap-6 text-[var(--ds-ink)]'>
        {temperature != null && (
          <span className='flex items-center gap-2 text-[44px] leading-none font-medium'>
            <WeatherIcon size={34} aria-hidden='true' />
            {Math.round(temperature)}°
          </span>
        )}
        <time className='text-[56px] leading-none font-semibold tracking-[-1px] tabular-nums'>{formatTime(now)}</time>
        {user?.name && (
          <span
            role='img'
            aria-label={user.name}
            className='flex size-14 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-[22px] font-bold'
          >
            {user.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
    </header>
  );
}
