import { useRef, useState } from 'react';
import { Car, Cctv, Package, PawPrint, User, type LucideIcon } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useHideTitle } from '@/hooks/useHideTitle';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useFrigateEvents } from '@/hooks/useFrigateEvents';
import { JUST_NOW, relativeTime } from '@/hooks/useRelativeTime';
import { useNow } from '@/hooks/useNow';
import { useHaUrl } from '@/hooks/useHaUrl';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { countByLabel, frigateLabel, frigateMedia, type FrigateEvent } from '@/lib/frigate';
import type { CameraEventsCardConfig } from '@/types/widget-configs';
import { EventViewer } from './EventViewer';

const LABEL_ICONS: Record<string, LucideIcon> = {
  person: User,
  package: Package,
  car: Car,
  dog: PawPrint,
  cat: PawPrint,
  animal: PawPrint,
};

/** `now` vient de la card : une seule horloge pour toutes les vignettes. */
function EventTile({ event, now, onOpen }: { event: FrigateEvent; now: number; onOpen: () => void }) {
  const { t } = useI18n();
  const resolve = useHaUrl();
  const since = relativeTime(event.start_time * 1000, now);
  return (
    <button
      onClick={onOpen}
      className='relative aspect-[4/3] w-full overflow-hidden rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] text-left'
    >
      <img src={resolve(frigateMedia(event.id, 'thumbnail.jpg'))} alt='' className='absolute inset-0 size-full object-cover' />
      <span className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 text-white'>
        <span className='block truncate text-[15px] font-bold'>{frigateLabel(t, event.label)}</span>
        <span className='block truncate text-xs opacity-90'>
          {event.camera} · {since === JUST_NOW ? t('widgets.sensor.justNow') : t('widgets.sensor.updatedAgo', { value: since })}
        </span>
      </span>
    </button>
  );
}

/**
 * Les événements caméra de l'Echo Show, lus chez Frigate : les compteurs
 * (personnes, colis…), puis les dernières vignettes. Un appui ouvre la caméra
 * en plein écran, sur la chronologie.
 */
export function CameraEventsCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const hideTitle = useHideTitle();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<CameraEventsCardConfig>(widgetId || 'camera_events');
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);
  const hours = config?.hours ?? 12;
  const { events, status } = useFrigateEvents({ instanceId: config?.instanceId || 'frigate', cameras: config?.cameras ?? '', hours });
  const [openId, setOpenId] = useState<string | null>(null);
  const now = useNow().getTime();

  const counts = countByLabel(events).slice(0, 4);
  const columns = size.w === 'xl' ? 3 : size.w === 'xs' || size.w === 'sm' ? 1 : 2;

  return (
    <div
      ref={cardRef}
      className={cn(
        'flex h-full select-none flex-col overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)]',
        size.squat ? 'justify-center px-4' : 'gap-3 p-[var(--ds-space-4)]'
      )}
    >
      <div className='flex shrink-0 items-center gap-3'>
        <Cctv size={22} aria-hidden='true' className='shrink-0 text-[var(--ds-accent)]' />
        {!hideTitle && <span className='truncate text-[17px] font-semibold'>{config?.name || t('widgets.camera_events.title')}</span>}
      </div>

      {status === 'error' && events.length === 0 ? (
        <CardPlaceholder
          icon={Cctv}
          text={t('widgets.camera_events.error')}
          hint={t('widgets.camera_events.errorHint')}
          tone='error'
          compact={size.compact}
        />
      ) : status === 'loading' ? (
        <CardPlaceholder icon={Cctv} text={t('common.loading')} tone='loading' compact={size.compact} />
      ) : events.length === 0 ? (
        <CardPlaceholder icon={Cctv} text={t('widgets.camera_events.empty', { hours })} compact={size.compact} />
      ) : (
        !size.squat && (
          <>
            <div className='flex shrink-0 flex-wrap gap-2'>
              {counts.map(([label, n]) => {
                const Icon = LABEL_ICONS[label] ?? Cctv;
                return (
                  <span
                    key={label}
                    title={frigateLabel(t, label)}
                    className='flex h-10 items-center gap-2 rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-4 text-[15px] font-bold tabular-nums'
                  >
                    <Icon size={18} aria-hidden='true' className='text-[var(--ds-accent)]' />
                    {n}
                  </span>
                );
              })}
            </div>
            <div
              className='grid min-h-0 flex-1 content-start gap-2.5 overflow-y-auto'
              style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, scrollbarWidth: 'none' }}
            >
              {events.slice(0, 12).map(e => (
                <EventTile key={e.id} event={e} now={now} onOpen={() => setOpenId(e.id)} />
              ))}
            </div>
          </>
        )
      )}

      {openId && <EventViewer events={events} initialId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
