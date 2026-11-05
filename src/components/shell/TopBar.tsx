import { useUser } from '@hakit/core';
import { Grip, X } from 'lucide-react';
import { useNow } from '@/hooks/useNow';
import { useWeatherNow } from '@/hooks/useWeatherNow';
import { useFormats } from '@/hooks/useFormats';
import { useI18n } from '@/i18n';
import { useTheme } from '@/context/ThemeContext';
import { useWallPanel } from '@/context/WallPanelContext';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { gesturesOf } from '@/types/wallpanel';

/** Glissé vers le bas, en px, qui vaut un appui sur la poignée. */
const PULL = 24;

/**
 * La poignée en haut au centre, comme sur l'Echo Show : un appui, ou un glissé
 * vers le bas, ouvre le menu rapide — la modale que la veille ouvre déjà d'un
 * balayage vers le haut. Sans menu rapide choisi, pas de poignée.
 */
function QuickHandle() {
  const { t } = useI18n();
  const { config } = useWallPanel();
  const { openPanel } = usePanel();
  const quickPanelId = gesturesOf(config).quickPanelId;
  if (!quickPanelId) return null;
  const open = () => openPanel(quickPanelId as PanelId);
  return (
    <button
      onClick={open}
      onPointerDown={e => {
        const startY = e.clientY;
        const onMove = (m: PointerEvent) => {
          if (m.clientY - startY < PULL) return;
          stop();
          open();
        };
        const stop = () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', stop);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', stop);
      }}
      title={t('layout.wallPanel.gestures.quickMenu')}
      aria-label={t('layout.wallPanel.gestures.quickMenu')}
      className='pointer-events-auto absolute left-1/2 top-1 flex h-9 w-36 -translate-x-1/2 touch-none items-start justify-center pt-2'
    >
      <span aria-hidden='true' className='h-1.5 w-24 rounded-full bg-[var(--ds-accent)] opacity-80' />
    </button>
  );
}

/**
 * Barre du haut : lanceur d'apps à gauche, météo, heure et utilisateur à droite.
 * Lisible de loin — c'est ce qu'on regarde en passant devant la tablette.
 */
export function TopBar({ launcherOpen, onToggleLauncher }: { launcherOpen: boolean; onToggleLauncher: () => void }) {
  const { t } = useI18n();
  const { formatTime } = useFormats();
  const now = useNow();
  const user = useUser();
  const { behaviourSettings } = useTheme();
  const { temperature, Icon: WeatherIcon } = useWeatherNow();

  return (
    // Au-dessus du voile du lanceur : le bouton devient son X, comme sur l'Echo Show.
    <header
      className={`fixed inset-x-0 top-0 ${launcherOpen ? 'z-[62]' : 'z-40'} flex items-center justify-between px-6 sm:px-10 pt-6 pointer-events-none`}
    >
      <QuickHandle />
      <button
        onClick={onToggleLauncher}
        data-tour='settings'
        title={launcherOpen ? t('layout.shell.closeLauncher') : t('layout.shell.openLauncher')}
        aria-label={launcherOpen ? t('layout.shell.closeLauncher') : t('layout.shell.openLauncher')}
        className='pointer-events-auto flex size-[60px] items-center justify-center rounded-[var(--ds-radius-md)] bg-[var(--ds-accent)] text-white active:scale-95 transition-transform'
      >
        {launcherOpen ? <X size={28} /> : <Grip size={28} />}
      </button>

      <div className='flex items-center gap-6 text-[var(--ds-ink)]'>
        {temperature != null && (
          <span className='flex items-center gap-2 text-[44px] leading-none font-medium'>
            <WeatherIcon size={34} aria-hidden='true' />
            {Math.round(temperature)}°
          </span>
        )}
        <time className='text-[56px] leading-none font-semibold tracking-[-1px] tabular-nums'>{formatTime(now)}</time>
        {behaviourSettings.showUser && user?.name && (
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
