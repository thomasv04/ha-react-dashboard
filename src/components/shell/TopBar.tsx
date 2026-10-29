import { useUser } from '@hakit/core';
import { Grip } from 'lucide-react';
import { useNow, useWeatherNow } from '@/hooks/useWeatherNow';
import { useFormats } from '@/hooks/useFormats';
import { useI18n } from '@/i18n';

/**
 * Barre du haut : lanceur d'apps à gauche, météo, heure et utilisateur à droite.
 * Lisible de loin — c'est ce qu'on regarde en passant devant la tablette.
 */
export function TopBar({ onOpenLauncher }: { onOpenLauncher: () => void }) {
  const { t } = useI18n();
  const { formatTime } = useFormats();
  const now = useNow();
  const user = useUser();
  const { temperature, Icon: WeatherIcon } = useWeatherNow();

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
