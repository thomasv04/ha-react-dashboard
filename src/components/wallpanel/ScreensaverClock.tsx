import { useNow } from '@/hooks/useNow';
import { LauncherButton, UserBadge } from '@/components/shell/TopBar';
import { useWeatherNow } from '@/hooks/useWeatherNow';
import { PagerArrows } from '@/components/ds/PagerArrows';
import { useFormats } from '@/hooks/useFormats';
import { useI18n } from '@/i18n';
import type { ClockLayout } from '@/types/wallpanel';

/** Ombre légère : le texte reste lisible sur une photo claire. */
const SHADOW = '[text-shadow:0_2px_12px_rgba(0,0,0,0.35)]';

/**
 * L'heure posée sur la veille, comme sur l'Echo Show.
 *
 * `clock` : grande horloge en bas à gauche, météo et date au-dessus.
 * `photo` : cadre photo — l'heure discrète en haut à droite, la photo d'abord.
 * Les flèches font défiler les photos ; ⋮ ouvre l'édition de la veille.
 * `onLauncher` : le bouton des apps en haut à gauche, comme sur l'accueil ;
 * en cadre photo, la pastille de l'utilisateur rejoint l'heure.
 */
export function ScreensaverClock({
  layout,
  onPrev,
  onNext,
  onMore,
  onLauncher,
}: {
  layout: ClockLayout;
  onPrev?: () => void;
  onNext?: () => void;
  onMore?: () => void;
  onLauncher?: () => void;
}) {
  const { t } = useI18n();
  const { formatTime, formatDate } = useFormats();
  const now = useNow();
  const { temperature, Icon } = useWeatherNow();

  const launcher = onLauncher && (
    <LauncherButton
      onClick={e => {
        e.stopPropagation();
        onLauncher();
      }}
      className='absolute left-6 top-6 z-[201] sm:left-10'
    />
  );
  const badge = onLauncher && <UserBadge className='text-[var(--ds-ink)] [text-shadow:none]' />;

  const arrows = (onPrev || onMore) && (
    // Les gestes de la veille s'arrêtent aux boutons : un appui ne la quitte pas.
    <div onClick={e => e.stopPropagation()} className='pointer-events-auto'>
      <PagerArrows
        onPrev={onPrev}
        onNext={onNext}
        onMore={onMore}
        labels={{ prev: t('layout.wallPanel.prevPhoto'), next: t('layout.wallPanel.nextPhoto'), more: t('layout.wallPanel.editWidgets') }}
      />
    </div>
  );

  if (layout === 'photo') {
    return (
      <>
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-x-0 top-0 h-[180px] bg-gradient-to-b from-black/45 to-transparent'
        />
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-x-0 bottom-0 h-[320px] bg-gradient-to-t from-black/60 to-transparent'
        />
        <div className={`pointer-events-none absolute right-12 top-8 flex items-center gap-6 text-white ${SHADOW}`}>
          {temperature != null && (
            <span className='flex items-center gap-2.5 text-5xl font-medium leading-none'>
              <Icon size={40} aria-hidden='true' />
              {Math.round(temperature)}°
            </span>
          )}
          <time className='text-6xl font-semibold leading-none tracking-[-1px] tabular-nums'>{formatTime(now)}</time>
          {badge}
        </div>
        {launcher}
        {arrows && <div className='absolute bottom-14 left-12 z-[201]'>{arrows}</div>}
      </>
    );
  }

  return (
    <>
      <div
        aria-hidden='true'
        className='pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/45 to-transparent'
      />
      <div className={`pointer-events-none absolute bottom-14 left-[60px] z-[201] flex flex-col text-white ${SHADOW}`}>
        {temperature != null && (
          <span className='flex items-center gap-2 text-3xl font-medium'>
            <Icon size={34} aria-hidden='true' />
            {Math.round(temperature)}°
          </span>
        )}
        <span className='mt-1 text-3xl font-medium first-letter:uppercase'>{formatDate(now, 'long')}</span>
        <time className='mt-[18px] text-[clamp(96px,12vw,190px)] font-medium leading-none tracking-[-0.03em] tabular-nums'>
          {formatTime(now)}
        </time>
        {arrows && <div className='mt-[34px]'>{arrows}</div>}
      </div>
      {launcher}
    </>
  );
}
