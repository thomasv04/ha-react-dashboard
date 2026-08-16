import { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { CalendarDays, CalendarCheck, CalendarX } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useHass } from '@hakit/core';
import { useServiceResponse } from '@/hooks/useServiceResponse';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { CalendarCardConfig } from '@/types/widget-configs';
import { useFormats } from '@/hooks/useFormats';

/** Forme d'un évènement renvoyé par `calendar.get_events` */
interface CalendarEvent {
  /** ISO datetime, ou `YYYY-MM-DD` pour un évènement sur la journée */
  start: string;
  end: string;
  summary: string;
  location?: string;
}

type EventsResponse = { events?: CalendarEvent[] };

/** Un évènement sans heure occupe la journée entière. */
const isAllDay = (event: CalendarEvent) => !event.start.includes('T');

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/** Recharger toutes les 15 min : un agenda ne bouge pas à la seconde. */
const REFRESH_MS = 15 * 60 * 1000;

export function CalendarCard() {
  const { t } = useI18n();
  const formats = useFormats();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<CalendarCardConfig>(widgetId || 'calendar');
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);

  const entityIds = config?.entityIds ?? [];
  const days = config?.days ?? 7;
  const max = config?.max ?? 5;

  // Les agendas publient `on`/`off` selon qu'un évènement est en cours : c'est
  // le signal le moins cher pour recharger dès qu'il s'en passe un.
  const revision = useHass(s => entityIds.map(id => s.entities?.[id]?.state ?? '').join('|'));

  const { data, loading, error } = useServiceResponse<EventsResponse>({
    domain: 'calendar',
    service: 'get_events',
    entityId: entityIds,
    serviceData: { duration: { days } },
    revision,
    refreshInterval: REFRESH_MS,
  });

  const events = useMemo(() => {
    if (!data) return [];
    return Object.values(data)
      .flatMap(r => r?.events ?? [])
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, max);
  }, [data, max]);

  const name = config?.name ?? t('widgets.calendar.label');
  const today = startOfDay(new Date());

  const formatWhen = (event: CalendarEvent) => {
    const start = new Date(event.start);
    const dayDiff = Math.round((startOfDay(start) - today) / 86_400_000);
    const day =
      dayDiff === 0
        ? t('widgets.calendar.today')
        : dayDiff === 1
          ? t('widgets.calendar.tomorrow')
          : formats.formatDate(start, 'medium');
    if (isAllDay(event)) return day;
    return `${day} ${formats.formatTime(start)}`;
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      className={cn('gc rounded-3xl h-full overflow-hidden select-none flex flex-col', size.squat ? 'px-3 py-2' : 'p-3.5')}
    >
      {/* En-tête */}
      <div className='flex items-center gap-2 shrink-0'>
        <div
          className='w-7 h-7 rounded-xl flex items-center justify-center border shrink-0'
          style={{ background: 'rgba(167,139,250,0.12)', borderColor: 'rgba(167,139,250,0.25)' }}
        >
          <CalendarDays size={13} className='text-violet-400' />
        </div>
        <span className='text-white/40 text-xs font-medium truncate'>{name}</span>
      </div>

      {/* Liste */}
      <div className='flex-1 min-h-0 mt-2'>
        {entityIds.length === 0 ? (
          <CardPlaceholder
            icon={CalendarDays}
            text={t('widgets.calendar.noCalendar')}
            hint={t('widgets.calendar.noCalendarHint')}
            compact={size.compact}
          />
        ) : error ? (
          <CardPlaceholder icon={CalendarX} text={t('widgets.calendar.error')} tone='error' compact={size.compact} />
        ) : loading && events.length === 0 ? (
          <CardPlaceholder icon={CalendarDays} text={t('common.loading')} tone='loading' compact={size.compact} />
        ) : events.length === 0 ? (
          <CardPlaceholder icon={CalendarCheck} text={t('widgets.calendar.empty')} compact={size.compact} />
        ) : (
          <div className='flex flex-col gap-1.5 h-full overflow-y-auto scrollbar-none' style={{ scrollbarWidth: 'none' }}>
            {events.map((event, i) => (
              <div key={`${event.start}-${i}`} className='flex items-center gap-2.5 shrink-0'>
                <span className='w-1 h-7 rounded-full shrink-0' style={{ background: 'rgba(167,139,250,0.6)' }} />
                <div className='flex flex-col min-w-0 flex-1'>
                  <span className='text-white/85 text-sm font-medium truncate leading-tight'>{event.summary}</span>
                  <span className='text-white/35 text-[10px] font-medium truncate'>
                    {formatWhen(event)}
                    {event.location && ` · ${event.location}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
