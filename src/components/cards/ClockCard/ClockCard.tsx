import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { ClockCardConfig } from '@/types/widget-configs';

const ACCENT = '#a78bfa';

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

/** Cadran analogique — verre creusé, index aux heures, aiguilles en accent. */
function AnalogFace({ date, size, id }: { date: Date; size: number; id: string }) {
  const seconds = date.getSeconds();
  const minutes = date.getMinutes() + seconds / 60;
  const hours = (date.getHours() % 12) + minutes / 60;

  return (
    <svg viewBox='0 0 100 100' width={size} height={size} className='shrink-0'>
      <defs>
        {/* Id dérivé du widget : deux horloges sur la même page se
            partageraient sinon le même dégradé. Même parade que `SparkLine`. */}
        <radialGradient id={`${id}-face`} cx='50%' cy='35%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.10)' />
          <stop offset='100%' stopColor='rgba(255,255,255,0.02)' />
        </radialGradient>
      </defs>

      <circle cx='50' cy='50' r='47' fill={`url(#${id}-face)`} stroke='rgba(255,255,255,0.10)' strokeWidth='1' />

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
            stroke={isCardinal ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.16)'}
            strokeWidth={isCardinal ? 2 : 1.4}
            strokeLinecap='round'
          />
        );
      })}

      {/* Aiguilles — `transform` plutôt qu'un calcul de coordonnées : le
          navigateur interpole la rotation, le mouvement reste fluide. */}
      <g transform={`rotate(${hours * 30} 50 50)`}>
        <line x1='50' y1='52' x2='50' y2='27' stroke='rgba(255,255,255,0.92)' strokeWidth='3.4' strokeLinecap='round' />
      </g>
      <g transform={`rotate(${minutes * 6} 50 50)`}>
        <line x1='50' y1='53' x2='50' y2='17' stroke='rgba(255,255,255,0.75)' strokeWidth='2.4' strokeLinecap='round' />
      </g>
      <g transform={`rotate(${seconds * 6} 50 50)`}>
        <line x1='50' y1='58' x2='50' y2='14' stroke={ACCENT} strokeWidth='1.2' strokeLinecap='round' />
      </g>

      <circle cx='50' cy='50' r='2.6' fill={ACCENT} />
      <circle cx='50' cy='50' r='1' fill='rgba(255,255,255,0.9)' />
    </svg>
  );
}

export function ClockCard() {
  const { t, language } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<ClockCardConfig>(widgetId || 'clock');
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);

  const showSeconds = config?.showSeconds ?? false;
  const showDate = config?.showDate ?? true;
  const showAnalog = config?.showAnalog ?? true;
  const hour12 = config?.hour12 ?? false;

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

  const time = now.toLocaleTimeString(language, {
    hour: '2-digit',
    minute: '2-digit',
    ...(showSeconds ? { second: '2-digit' } : {}),
    hour12,
  });
  const date = now.toLocaleDateString(language, { weekday: 'long', day: 'numeric', month: 'long' });

  const digital = (
    <div className={cn('min-w-0', sideBySide ? 'text-left' : 'text-center')}>
      {config?.name && <div className='text-white/35 text-xs font-medium truncate mb-0.5'>{config.name}</div>}
      <div
        className={cn(
          'text-white font-light tracking-tight leading-none tabular-nums truncate',
          tier === 'sm' ? 'text-2xl' : tier === 'md' ? 'text-4xl' : 'text-3xl'
        )}
      >
        {time}
      </div>
      {showDate && tier !== 'sm' && <div className='text-white/35 text-xs font-medium capitalize truncate mt-1.5'>{date}</div>}
    </div>
  );

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      aria-label={`${t('widgets.clock.label')} ${time}`}
      className={cn(
        'gc rounded-3xl h-full overflow-hidden select-none flex items-center justify-center',
        tier === 'sm' ? 'px-3.5 py-2 gap-3' : 'p-3.5',
        sideBySide ? 'flex-row gap-4' : 'flex-col gap-2.5'
      )}
    >
      {/* Halo d'accent — `position` en inline : `.gc > *` force `relative` sur
          les enfants directs et bat l'utilitaire Tailwind. */}
      <span
        aria-hidden
        className='-top-12 -right-10 w-36 h-36 rounded-full pointer-events-none'
        style={{ position: 'absolute', background: `radial-gradient(circle, ${ACCENT}1f 0%, transparent 70%)` }}
      />

      {analog && <AnalogFace date={now} size={size.h === 'tall' ? 120 : 92} id={`clock-${widgetId ?? 'default'}`} />}
      {digital}

      {/* Palier `sm` : la date se glisse à droite quand la largeur le permet */}
      {tier === 'sm' && showDate && (size.w === 'lg' || size.w === 'xl') && (
        <div className='text-white/30 text-[11px] font-medium capitalize truncate'>{date}</div>
      )}
    </motion.div>
  );
}
