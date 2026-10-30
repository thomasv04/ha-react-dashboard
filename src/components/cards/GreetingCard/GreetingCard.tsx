import { useState, useEffect } from 'react';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useI18n } from '@/i18n';
import { useFormats } from '@/hooks/useFormats';
import type { GreetingCardConfig } from '@/types/widget-configs';

/** Clé i18n de la salutation correspondant à l'heure. */
function greetingKey(h: number): string {
  if (h >= 18) return 'widgets.greeting.goodEvening';
  if (h >= 12) return 'widgets.greeting.goodAfternoon';
  if (h >= 5) return 'widgets.greeting.goodMorning';
  return 'widgets.greeting.goodNight';
}

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

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

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

/** Compact inline clock + date used in the top header row. */
export function ClockWidget() {
  const [now, setNow] = useState(new Date());
  const formats = useFormats();

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hm = formats.formatTime(now);
  const sec = String(now.getSeconds()).padStart(2, '0');
  const date = formats.formatDate(now, 'long');

  return (
    <div className='flex flex-col items-end shrink-0'>
      <div className='flex items-baseline gap-1 tabular-nums'>
        <span className='text-4xl font-light leading-none tracking-tight text-[var(--ds-ink)]'>{hm}</span>
        <span className='text-base font-light leading-none text-[var(--ds-ink-muted)]'>{sec}</span>
      </div>
      <div className='mt-0.5 text-sm font-medium capitalize text-[var(--ds-ink-muted)]'>{date}</div>
    </div>
  );
}
