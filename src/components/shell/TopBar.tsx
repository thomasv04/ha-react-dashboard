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
import { cn } from '@/lib/utils';

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

/** Le bouton des apps, en haut à gauche — sur l'accueil comme sur la veille. */
export function LauncherButton({
  open = false,
  onClick,
  className,
  tour,
}: {
  open?: boolean;
  onClick: (e: React.MouseEvent) => void;
  className?: string;
  /** Repère de la visite guidée (`data-tour`). */
  tour?: string;
}) {
  const { t } = useI18n();
  const label = open ? t('layout.shell.closeLauncher') : t('layout.shell.openLauncher');
  return (
    <button
      onClick={onClick}
      data-tour={tour}
      title={label}
      aria-label={label}
      className={cn(
        'pointer-events-auto flex size-[60px] items-center justify-center rounded-[var(--ds-radius-md)] bg-[var(--ds-accent)] text-[var(--ds-accent-ink)] active:scale-95 transition-transform',
        className
      )}
    >
      {open ? <X size={28} /> : <Grip size={28} />}
    </button>
  );
}

/** L'initiale de l'utilisateur connecté, si l'appareil l'affiche (Paramètres → Disposition). */
export function UserBadge({ className }: { className?: string }) {
  const user = useUser();
  const { behaviourSettings } = useTheme();
  if (!behaviourSettings.showUser || !user?.name) return null;
  return (
    <span
      role='img'
      aria-label={user.name}
      className={cn('flex size-14 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-[22px] font-bold', className)}
    >
      {user.name.charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * Barre du haut : lanceur d'apps à gauche, météo, heure et utilisateur à droite.
 * Lisible de loin — c'est ce qu'on regarde en passant devant la tablette.
 */
export function TopBar({ launcherOpen, onToggleLauncher }: { launcherOpen: boolean; onToggleLauncher: () => void }) {
  const { formatTime } = useFormats();
  const now = useNow();
  const { temperature, Icon: WeatherIcon } = useWeatherNow();

  return (
    // Au-dessus du voile du lanceur : le bouton devient son X, comme sur l'Echo Show.
    <header
      className={`fixed inset-x-0 top-0 ${launcherOpen ? 'z-[62]' : 'z-40'} flex items-center justify-between px-6 sm:px-10 pt-6 pointer-events-none`}
    >
      <QuickHandle />
      <LauncherButton open={launcherOpen} onClick={onToggleLauncher} tour='settings' />

      <div className='flex items-center gap-6 text-[var(--ds-ink)]'>
        {temperature != null && (
          <span className='flex items-center gap-2 text-[44px] leading-none font-medium'>
            <WeatherIcon size={34} aria-hidden='true' />
            {Math.round(temperature)}°
          </span>
        )}
        <time className='text-[56px] leading-none font-semibold tracking-[-1px] tabular-nums'>{formatTime(now)}</time>
        <UserBadge />
      </div>
    </header>
  );
}
