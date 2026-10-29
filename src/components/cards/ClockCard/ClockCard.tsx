import { useEffect, useRef, useState } from 'react';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { ClockCardConfig } from '@/types/widget-configs';
import { useFormats } from '@/hooks/useFormats';

const ACCENT = 'var(--ds-accent)';

/**
 * Horloge du navigateur, recalée sur la frontière de seconde ou de minute.
 *
 * Un `setInterval` posé au montage dérive : il change d'heure à un instant
 * arbitraire hérité du moment où la card est apparue. On vise la prochaine
 * frontière, ce qui évite aussi de re-rendre chaque seconde une horloge qui
 * n'affiche que les minutes.
 */
function useNow(withSeconds: boolean): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let id: ReturnType<typeof setTimeout>;
    const period = withSeconds ? 1_000 : 60_000;
    const schedule = () => {
      id = setTimeout(
        () => {
          setNow(new Date());
          schedule();
        },
        period - (Date.now() % period)
      );
    };
    schedule();
    return () => clearTimeout(id);
  }, [withSeconds]);

  return now;
}

/** Cadran analogique — disque plein, index aux heures, trotteuse en accent. */
function AnalogFace({ date, size }: { date: Date; size: number }) {
  const seconds = date.getSeconds();
  const minutes = date.getMinutes() + seconds / 60;
  const hours = (date.getHours() % 12) + minutes / 60;

  return (
    <svg viewBox='0 0 100 100' width={size} height={size} className='shrink-0'>
      <circle cx='50' cy='50' r='47' style={{ fill: 'var(--ds-surface-3)' }} />

      {/* Index : trait long aux heures cardinales, point ailleurs */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const isCardinal = i % 3 === 0;
        const outer = 42;
        const inner = isCardinal ? 35 : 38.5;
        return (
          <line
            key={i}
            x1={50 + Math.sin(angle) * inner}
            y1={50 - Math.cos(angle) * inner}
            x2={50 + Math.sin(angle) * outer}
            y2={50 - Math.cos(angle) * outer}
            style={{ stroke: 'var(--ds-ink-muted)', opacity: isCardinal ? 1 : 0.45 }}
            strokeWidth={isCardinal ? 2 : 1.4}
            strokeLinecap='round'
          />
        );
      })}

      {/* Aiguilles — `transform` plutôt qu'un calcul de coordonnées : le
          navigateur interpole la rotation, le mouvement reste fluide. */}
      <g transform={`rotate(${hours * 30} 50 50)`}>
        <line x1='50' y1='52' x2='50' y2='27' style={{ stroke: 'var(--ds-ink)' }} strokeWidth='3.4' strokeLinecap='round' />
      </g>
      <g transform={`rotate(${minutes * 6} 50 50)`}>
        <line x1='50' y1='53' x2='50' y2='17' style={{ stroke: 'var(--ds-ink)' }} strokeWidth='2.4' strokeLinecap='round' />
      </g>
      <g transform={`rotate(${seconds * 6} 50 50)`}>
        <line x1='50' y1='58' x2='50' y2='14' style={{ stroke: ACCENT }} strokeWidth='1.2' strokeLinecap='round' />
      </g>

      <circle cx='50' cy='50' r='2.6' style={{ fill: ACCENT }} />
    </svg>
  );
}

export function ClockCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<ClockCardConfig>(widgetId || 'clock');
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);
  const formats = useFormats();

  const showSeconds = config?.showSeconds ?? false;
  const showDate = config?.showDate ?? true;
  const showAnalog = config?.showAnalog ?? true;
  // Le réglage propre à la card l'emporte ; sans lui, on suit le format
  // régional. Les cards déjà configurées gardent donc leur affichage.
  const hour12 = config?.hour12 ?? formats.hour12;

  // Le cadran a besoin de la trotteuse pour ne pas paraître arrêté.
  const now = useNow(showSeconds || showAnalog);

  /**
   * Trois paliers :
   * - `sm` — une rangée : l'heure seule, en ligne avec la date si la largeur suit.
   * - `md` — deux rangées : heure numérique centrée, date dessous.
   * - `lg` — trois rangées ou plus : cadran analogique, à côté de l'heure sur
   *   une card large, au-dessus sur une card étroite.
   */
  const tier: 'sm' | 'md' | 'lg' = size.squat || size.w === 'xs' ? 'sm' : size.h === 'short' ? 'md' : 'lg';
  const analog = showAnalog && tier === 'lg';
  const sideBySide = analog && (size.w === 'lg' || size.w === 'xl');

  const time = now.toLocaleTimeString(formats.locale, {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12,
  });
  const date = formats.formatDate(now, 'long');

  if (config?.display === 'date') {
    // « JEU. OCT. » au-dessus, le jour en très grand : la date de l'Echo Show.
    const head = [now.toLocaleDateString(formats.locale, { weekday: 'short' }), now.toLocaleDateString(formats.locale, { month: 'short' })]
      .join(' ')
      .toUpperCase();
    return (
      <div
        ref={cardRef}
        aria-label={formats.formatDate(now, 'long')}
        className={cn(
          'flex h-full select-none items-center justify-center overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] font-[family-name:var(--ds-font-display)] font-extrabold leading-none text-[var(--ds-accent)] [font-stretch:125%]',
          size.squat ? 'gap-3 px-4' : 'flex-col gap-2 p-[var(--ds-space-4)]'
        )}
      >
        <span className={cn('tracking-wide', size.squat ? 'text-xl' : size.h === 'short' ? 'text-xl' : 'text-[28px]')}>{head}</span>
        <span
          className={size.squat ? 'text-3xl' : size.h === 'short' ? 'text-[64px]' : size.h === 'normal' ? 'text-[104px]' : 'text-[140px]'}
        >
          {now.getDate()}
        </span>
      </div>
    );
  }

  const digital = (
    <div className={cn('min-w-0', sideBySide ? 'text-left' : 'text-center')}>
      {config?.name && <div className='mb-0.5 truncate text-sm font-semibold text-[var(--ds-ink-muted)]'>{config.name}</div>}
      <div
        className={cn(
          'truncate font-light leading-none tracking-tight tabular-nums text-[var(--ds-ink)]',
          tier === 'sm' ? 'text-3xl' : tier === 'md' ? 'text-5xl' : 'text-[56px]'
        )}
      >
        {time}
      </div>
      {showDate && tier !== 'sm' && <div className='mt-1.5 truncate text-sm font-medium capitalize text-[var(--ds-ink-muted)]'>{date}</div>}
    </div>
  );

  return (
    <div
      ref={cardRef}
      aria-label={`${t('widgets.clock.label')} ${time}`}
      className={cn(
        'flex h-full select-none items-center justify-center overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)]',
        tier === 'sm' ? 'gap-3 px-4' : 'p-[var(--ds-space-4)]',
        sideBySide ? 'flex-row gap-4' : 'flex-col gap-2.5'
      )}
    >
      {analog && <AnalogFace date={now} size={size.h === 'tall' ? 120 : 92} />}
      {digital}

      {/* Palier `sm` : la date se glisse à droite quand la largeur le permet */}
      {tier === 'sm' && showDate && (size.w === 'lg' || size.w === 'xl') && (
        <div className='truncate text-sm font-medium capitalize text-[var(--ds-ink-muted)]'>{date}</div>
      )}
    </div>
  );
}
