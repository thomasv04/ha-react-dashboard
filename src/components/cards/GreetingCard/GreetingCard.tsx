import { useRef } from 'react';
import { useNow } from '@/hooks/useNow';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { cn } from '@/lib/utils';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useI18n } from '@/i18n';
import { useFormats } from '@/hooks/useFormats';
import type { GreetingCardConfig } from '@/types/widget-configs';
import { greetingKey } from '@/lib/greeting';

/** Full-width header bar: greeting on the left, big clock on the right. */
export function GreetingCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const { t } = useI18n();
  const formats = useFormats();
  const config = getWidgetConfig<GreetingCardConfig>(widgetId || 'greeting');
  // La carte laisse choisir une locale explicite ; sinon elle suit les formats
  // régionaux, plutôt qu'un `fr-FR` figé.
  const locale = config?.locale;

  const now = useNow(true);

  const hm = locale ? now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) : formats.formatTime(now);
  const sec = String(now.getSeconds()).padStart(2, '0');
  const greeting = t(greetingKey(now.getHours()));
  const date = locale
    ? now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    : formats.formatDate(now, 'long');

  return (
    <div className='flex h-full items-center justify-between gap-4 px-1 text-[var(--ds-ink)]'>
      {/* Greeting + date */}
      <div>
        <div className='text-[40px] font-semibold leading-tight tracking-[-0.5px]'>{greeting}</div>
        <div className='text-base capitalize text-[var(--ds-ink-muted)]'>{date}</div>
      </div>

      {/* Live clock */}
      <div className='flex items-baseline gap-1 tabular-nums'>
        <span className='text-[56px] font-light leading-none tracking-tight'>{hm}</span>
        <span className='text-xl font-light leading-none text-[var(--ds-ink-muted)]'>{sec}</span>
      </div>
    </div>
  );
}

/**
 * Horloge et date, alignées à droite. Une colonne (96 px) ne tient que
 * l'heure : à sa taille par défaut, la card rognait « 11:12 » en « 1:12 » et
 * faisait déborder secondes et date (#81). Les blocs secondaires s'effacent
 * donc avec la largeur, plutôt que de sortir de la case.
 */
export function ClockWidget() {
  const formats = useFormats();
  const ref = useRef<HTMLDivElement>(null);
  const { w } = useWidgetSize(ref);
  const narrow = w === 'xs';
  const showDate = w !== 'xs' && w !== 'sm';
  // Sans les secondes (une colonne), une horloge à la minute suffit.
  const now = useNow(!narrow);

  const hm = formats.formatTime(now);
  const sec = String(now.getSeconds()).padStart(2, '0');
  const date = formats.formatDate(now, 'long');

  return (
    <div ref={ref} className='flex h-full w-full min-w-0 flex-col items-end justify-center overflow-hidden'>
      <div className='flex items-baseline gap-1 tabular-nums'>
        <span
          data-testid='clock-time'
          className={cn('font-light leading-none tracking-tight text-[var(--ds-ink)]', narrow ? 'text-2xl' : 'text-4xl')}
        >
          {hm}
        </span>
        {!narrow && (
          <span data-testid='clock-seconds' className='text-base font-light leading-none text-[var(--ds-ink-muted)]'>
            {sec}
          </span>
        )}
      </div>
      {showDate && (
        <div data-testid='clock-date' className='mt-0.5 truncate text-sm font-medium capitalize text-[var(--ds-ink-muted)]'>
          {date}
        </div>
      )}
    </div>
  );
}
