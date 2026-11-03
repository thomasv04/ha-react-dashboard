import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Rows3, LayoutGrid } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useServiceResponse } from '@/hooks/useServiceResponse';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useFormats } from '@/hooks/useFormats';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { friendlyName } from '@/lib/ha-service';
import type { CalendarCardConfig } from '@/types/widget-configs';
import {
  addMonths,
  cursorOf,
  dayKey,
  fromDayKey,
  groupByDay,
  gridRange,
  isAllDayValue,
  monthGrid,
  parseEventDate,
  shiftDay,
  weekdayOrder,
} from '@/lib/calendar-month';

/** Forme d'un évènement renvoyé par `calendar.get_events`. */
interface CalendarEvent {
  start: string;
  end: string;
  summary?: string;
  location?: string;
}

type EventsResponse = { events?: CalendarEvent[] };

/** Un évènement, avec l'agenda dont il vient (la barre de couleur en dépend). */
interface TaggedEvent extends CalendarEvent {
  calendarId: string;
  color: string;
}

type View = 'month' | 'day';

/** Une couleur par agenda, dans l'ordre de la configuration — uniquement des tokens. */
const CALENDAR_COLORS = [
  'var(--ds-accent)',
  'var(--ds-app-calendar)',
  'var(--ds-good)',
  'var(--ds-heat)',
  'var(--ds-cool)',
  'var(--ds-alert)',
  'var(--ds-mint)',
];

const colorForCalendar = (index: number) => CALENDAR_COLORS[index % CALENDAR_COLORS.length];

/** Au plus trois points sous un jour : au-delà, la case est de toute façon « chargée ». */
const MAX_DOTS = 3;

/** Recharger toutes les 15 min, comme la card. */
const REFRESH_MS = 15 * 60 * 1000;

/** Format attendu par `calendar.get_events` : une date-heure locale à l'instance HA. */
const asHaDateTime = (key: string) => `${key} 00:00:00`;

/**
 * Fiche plein écran du calendrier : le mois à gauche, la liste du jour
 * sélectionné à droite (vue « mois »), ou la liste seule (vue « jour »).
 *
 * Les évènements viennent du même service que la card (`calendar.get_events`).
 * La création d'évènement n'est pas branchée dans ce lot : le bouton « + » est
 * présent mais désactivé.
 */
export default function CalendarMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const formats = useFormats();
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<CalendarCardConfig>(widgetId);

  const entityIds = useMemo(() => {
    if (config?.entityIds?.length) return config.entityIds;
    const single = config?.entityId || entityId;
    return single ? [single] : [];
  }, [config?.entityIds, config?.entityId, entityId]);

  const todayKey = dayKey(new Date());
  const [selected, setSelected] = useState(todayKey);
  const [cursor, setCursor] = useState(() => cursorOf(todayKey));
  const [view, setView] = useState<View>('month');

  const entities = useHass(s => s.entities);
  const revision = entityIds.map(id => entities?.[id]?.state ?? '').join('|');

  // La plage visible de la grille (jours voisins compris) : un point sous le 1er
  // du mois suivant, affiché en grisé, doit exister lui aussi.
  const range = gridRange(cursor, formats.firstDayOfWeek);
  const { data, loading, error } = useServiceResponse<EventsResponse>({
    domain: 'calendar',
    service: 'get_events',
    entityId: entityIds,
    serviceData: { start_date_time: asHaDateTime(range.first), end_date_time: asHaDateTime(shiftDay(range.last, 1)) },
    revision,
    refreshInterval: REFRESH_MS,
  });

  const byDay = useMemo(() => {
    if (!data) return new Map<string, TaggedEvent[]>();
    const all: TaggedEvent[] = entityIds.flatMap((id, i) =>
      (data[id]?.events ?? []).map(e => ({ ...e, calendarId: id, color: colorForCalendar(i) }))
    );
    const map = groupByDay(all);
    for (const list of map.values()) {
      // Les évènements « journée » d'abord, puis par heure.
      list.sort(
        (a, b) =>
          Number(isAllDayValue(b.start)) - Number(isAllDayValue(a.start)) ||
          parseEventDate(a.start).getTime() - parseEventDate(b.start).getTime()
      );
    }
    return map;
  }, [data, entityIds]);

  const weeks = monthGrid(cursor, formats.firstDayOfWeek);
  const dayEvents = byDay.get(selected) ?? [];

  const monthLabel = new Intl.DateTimeFormat(formats.locale, { month: 'long', year: 'numeric' }).format(
    new Date(cursor.year, cursor.month, 1)
  );
  const dayLabel = new Intl.DateTimeFormat(formats.locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(fromDayKey(selected));
  // 7 janvier 2024 était un dimanche : de quoi nommer les jours dans la langue courante.
  const weekdayLabel = (wd: number) => new Intl.DateTimeFormat(formats.locale, { weekday: 'short' }).format(new Date(2024, 0, 7 + wd));

  const select = (key: string) => {
    setSelected(key);
    // Toucher un jour grisé du mois voisin y emmène aussi la grille.
    const c = cursorOf(key);
    if (c.year !== cursor.year || c.month !== cursor.month) setCursor(c);
  };

  const goToday = () => {
    setSelected(todayKey);
    setCursor(cursorOf(todayKey));
  };

  const shiftMonth = (delta: number) => setCursor(addMonths(cursor, delta));
  const shiftSelected = (delta: number) => select(shiftDay(selected, delta));

  const navBtn = 'flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-[var(--ds-ink)]';
  const pillBtn =
    'flex h-10 items-center gap-2 rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-4 text-sm font-semibold text-[var(--ds-ink)]';

  const monthPane = (
    <section
      data-testid='calendar-month'
      className='flex min-h-0 flex-col gap-3 self-start rounded-[var(--ds-radius-xl)] bg-[var(--ds-sheet-section)] p-[var(--ds-space-4)]'
    >
      <header className='flex items-center justify-between gap-2'>
        <button type='button' className={navBtn} onClick={() => shiftMonth(-1)} aria-label={t('widgets.calendar.moreInfo.prevMonth')}>
          <ChevronLeft size={18} />
        </button>
        <h3 className='truncate text-xl font-bold text-[var(--ds-accent)] first-letter:uppercase'>{monthLabel}</h3>
        <button type='button' className={navBtn} onClick={() => shiftMonth(1)} aria-label={t('widgets.calendar.moreInfo.nextMonth')}>
          <ChevronRight size={18} />
        </button>
      </header>

      <div role='grid' className='grid grid-cols-7 gap-y-1 text-center'>
        {weekdayOrder(formats.firstDayOfWeek).map(wd => (
          <div key={wd} role='columnheader' className='pb-1 text-xs font-semibold uppercase text-[var(--ds-ink-muted)]'>
            {weekdayLabel(wd)}
          </div>
        ))}
        {weeks.flat().map(day => {
          const events = byDay.get(day.key) ?? [];
          const colors = [...new Set(events.map(e => e.color))].slice(0, MAX_DOTS);
          const isToday = day.key === todayKey;
          const isSelected = day.key === selected;
          return (
            <button
              key={day.key}
              type='button'
              role='gridcell'
              data-day={day.key}
              aria-selected={isSelected}
              aria-current={isToday ? 'date' : undefined}
              aria-label={
                events.length
                  ? `${fromDayKey(day.key).toLocaleDateString(formats.locale, { dateStyle: 'full' })}, ${t('widgets.calendar.moreInfo.hasEvents', { count: events.length })}`
                  : undefined
              }
              onClick={() => select(day.key)}
              className='flex h-12 flex-col items-center justify-center gap-0.5'
            >
              <span
                className={cn(
                  'flex size-9 items-center justify-center rounded-full text-[15px] font-semibold',
                  !day.inMonth && 'text-[var(--ds-ink-muted)] opacity-50',
                  isSelected && 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]',
                  !isSelected && isToday && 'ring-2 ring-[var(--ds-accent)]'
                )}
              >
                {day.date}
              </span>
              <span className='flex h-1.5 gap-0.5' aria-hidden='true'>
                {colors.map(c => (
                  <span key={c} className='size-1.5 rounded-full' style={{ background: c }} />
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );

  const dayPane = (
    <section data-testid='calendar-day' className='flex min-h-0 flex-1 flex-col gap-3'>
      <header className='flex items-center justify-between gap-2'>
        <h3 className='truncate text-lg font-bold first-letter:uppercase'>{dayLabel}</h3>
        {view === 'day' && (
          <div className='flex gap-2'>
            <button type='button' className={navBtn} onClick={() => shiftSelected(-1)} aria-label={t('widgets.calendar.moreInfo.prevDay')}>
              <ChevronLeft size={18} />
            </button>
            <button type='button' className={navBtn} onClick={() => shiftSelected(1)} aria-label={t('widgets.calendar.moreInfo.nextDay')}>
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </header>

      <ul className='flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto' style={{ scrollbarWidth: 'none' }}>
        {entityIds.length === 0 ? (
          <li className='py-8 text-center text-[var(--ds-ink-muted)]'>{t('widgets.calendar.noCalendar')}</li>
        ) : error ? (
          <li className='py-8 text-center text-[var(--ds-alert)]'>{t('widgets.calendar.error')}</li>
        ) : loading && !data ? (
          <li className='py-8 text-center text-[var(--ds-ink-muted)]'>{t('common.loading')}</li>
        ) : dayEvents.length === 0 ? (
          <li className='py-8 text-center text-[var(--ds-ink-muted)]'>{t('widgets.calendar.moreInfo.noEvents')}</li>
        ) : (
          dayEvents.map((e, i) => (
            <li
              key={`${e.calendarId}-${e.start}-${i}`}
              data-testid='calendar-event'
              className='flex shrink-0 gap-3 rounded-[var(--ds-radius-lg)] bg-[var(--ds-sheet-section)] px-4 py-3'
            >
              <span aria-hidden='true' className='w-1.5 shrink-0 rounded-full' style={{ background: e.color }} />
              <div className='flex min-w-0 flex-1 flex-col'>
                <span className='text-sm font-bold'>
                  {isAllDayValue(e.start) ? t('widgets.calendar.moreInfo.allDay') : formats.formatTime(parseEventDate(e.start))}
                  {e.location && <span className='font-normal text-[var(--ds-ink-muted)]'> · {e.location}</span>}
                </span>
                <span className='truncate text-[17px] leading-tight'>{e.summary || t('widgets.calendar.moreInfo.untitled')}</span>
                {entityIds.length > 1 && (
                  <span className='truncate text-xs text-[var(--ds-ink-muted)]'>
                    {friendlyName(entities?.[e.calendarId]) ?? e.calendarId}
                  </span>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );

  return (
    <div className='flex h-full flex-col gap-4 p-6'>
      <header className='flex flex-wrap items-center justify-between gap-3 pr-14'>
        <h2 className='flex items-center gap-3 text-[22px] font-bold'>
          <CalendarDays size={26} aria-hidden='true' className='text-[var(--ds-app-calendar)]' />
          {config?.name ?? t('widgets.calendar.moreInfo.title')}
        </h2>
        <div className='flex flex-wrap items-center gap-2'>
          <button type='button' className={pillBtn} onClick={goToday}>
            {t('widgets.calendar.moreInfo.today')}
          </button>
          <button type='button' className={pillBtn} onClick={() => setView(v => (v === 'month' ? 'day' : 'month'))}>
            {view === 'month' ? <Rows3 size={16} aria-hidden='true' /> : <LayoutGrid size={16} aria-hidden='true' />}
            {t('widgets.calendar.moreInfo.changeView')}
          </button>
          <button
            type='button'
            disabled
            aria-label={t('widgets.calendar.moreInfo.add')}
            title={t('widgets.calendar.moreInfo.add')}
            className={cn(navBtn, 'cursor-not-allowed opacity-40')}
          >
            <Plus size={18} />
          </button>
        </div>
      </header>

      {view === 'month' ? (
        <div className='grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto md:grid-cols-[minmax(320px,420px)_1fr] md:overflow-visible'>
          {monthPane}
          {dayPane}
        </div>
      ) : (
        dayPane
      )}
    </div>
  );
}
