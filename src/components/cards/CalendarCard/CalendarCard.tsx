import { useMemo, useRef } from 'react';
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

  // `entityId` en repli : cf. `CalendarCardConfig`. Pas de mémo — `revision` et
  // `useServiceResponse` ne dépendent que du *contenu* sérialisé de la liste,
  // jamais de son identité.
  const entityIds = config?.entityIds?.length ? config.entityIds : config?.entityId ? [config.entityId] : [];
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
      dayDiff === 0 ? t('widgets.calendar.today') : dayDiff === 1 ? t('widgets.calendar.tomorrow') : formats.formatDate(start, 'medium');
    if (isAllDay(event)) return day;
    return `${day} ${formats.formatTime(start)}`;
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        'flex h-full select-none flex-col overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)]',
        size.squat ? 'justify-center gap-1 px-4' : 'gap-3 p-[var(--ds-space-4)]'
      )}
    >
      {/* En-tête */}
      <div className='flex shrink-0 items-center gap-3'>
        <CalendarDays size={22} aria-hidden='true' className='shrink-0 text-[var(--ds-app-calendar)]' />
        <span className='truncate text-[17px] font-semibold'>{name}</span>
      </div>

      {/* Liste */}
      <div className='min-h-0 flex-1'>
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
          <ul className='flex h-full flex-col gap-2 overflow-y-auto' style={{ scrollbarWidth: 'none' }}>
            {events.map((event, i) => (
              <li
                key={`${event.start}-${i}`}
                className='flex shrink-0 gap-3 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-3 py-2.5'
              >
                <span aria-hidden='true' className='w-1.5 shrink-0 rounded-full bg-[var(--ds-accent)]' />
                <div className='flex min-w-0 flex-1 flex-col'>
                  <span className='truncate text-sm font-bold'>
                    {formatWhen(event)}
                    {event.location && <span className='font-normal text-[var(--ds-ink-muted)]'> · {event.location}</span>}
                  </span>
                  <span className='truncate text-[17px] leading-tight'>{event.summary}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
