import { useMemo, useState } from 'react';
import { useAreas, useHass } from '@hakit/core';
import { CameraFeed } from '@/components/ui/CameraFeed/components/CameraFeed';
import { useFrigateEvents } from '@/hooks/useFrigateEvents';
import { useHaUrl } from '@/hooks/useHaUrl';
import { useNow } from '@/hooks/useNow';
import { friendlyName } from '@/lib/ha-service';
import type { FrigateEvent } from '@/lib/frigate';
import { frigateOf, shownCameras } from '@/lib/phone-cameras';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { Chip } from './PhoneRooms';
import { PHONE_TOP } from './PhoneShell';
import { CAMERA_HOURS, EventRow, PhoneCamera } from './PhoneCamera';

/** Le filtre : toutes, un étage, ou la liste des événements de toutes les caméras. */
type Filter = { kind: 'all' } | { kind: 'floor'; id: string } | { kind: 'events' };

/**
 * Onglet Caméras (maquette « Caméras ») : la première en direct, en grand, les
 * autres en vignettes rafraîchies, avec l'heure de leur dernier événement
 * Frigate. Les filtres : les étages des pièces où sont les caméras (s'il y en a
 * plusieurs), et « Événements » quand Frigate en a. Un appui ouvre la caméra.
 *
 * Les caméras montrées se choisissent dans les Paramètres (Disposition) ; à
 * défaut, celles de Frigate. Un événement retrouve sa caméra par le nom Frigate
 * que l'intégration pose sur l'entité (`camera_name`), pas par son identifiant.
 */
export function PhoneCameras() {
  const { t } = useI18n();
  const { behaviourSettings } = useTheme();
  // En texte : une liste neuve à chaque mise à jour de HA relancerait tout l'onglet.
  const joined = useHass(s => shownCameras(s.entities, behaviourSettings.phoneCameras).join(','));
  // `entité=instance/caméra Frigate` pour chacune de ces caméras qui vient de Frigate.
  const frigateJoined = useHass(s =>
    (joined ? joined.split(',') : [])
      .map(id => [id, frigateOf(s.entities[id])] as const)
      .filter(([, f]) => f)
      .map(([id, f]) => `${id}=${f!.instance}/${f!.camera}`)
      .join(',')
  );
  const frigate = useMemo(
    () => (frigateJoined ? frigateJoined.split(',') : []).map(pair => pair.split(/[=/]/) as [string, string, string]),
    [frigateJoined]
  );
  // ponytail: une seule instance Frigate, celle de la première caméra ; plusieurs instances
  // demanderaient une interrogation par instance.
  const instance = frigate[0]?.[1];
  const areas = useAreas();
  const now = useNow().getTime();
  // Une seule interrogation de Frigate pour l'onglet et l'écran d'une caméra, limitée à ses caméras.
  const { events: polled } = useFrigateEvents({
    instanceId: instance ?? 'frigate',
    cameras: frigate
      .filter(([, i]) => i === instance)
      .map(([, , c]) => c)
      .join(','),
    hours: CAMERA_HOURS,
    limit: 300,
  });
  const events = instance ? polled : [];
  const entityOfCamera = useMemo(() => new Map(frigate.map(([id, , camera]) => [camera, id])), [frigate]);
  const entityOf = (event: FrigateEvent) => entityOfCamera.get(event.camera) ?? `camera.${event.camera}`;
  const [filter, setFilter] = useState<Filter>({ kind: 'all' });
  const [open, setOpen] = useState<{ id: string; eventId: string | null } | null>(null);

  const all = useMemo(() => (joined ? joined.split(',') : []), [joined]);
  const floorOf = useMemo(() => {
    const map = new Map<string, { id: string; name: string; level: number }>();
    for (const a of areas) {
      if (!a.floor) continue;
      for (const e of a.entities) {
        if (e.entity_id.startsWith('camera.'))
          map.set(e.entity_id, { id: a.floor.floor_id, name: a.floor.name, level: a.floor.level ?? 0 });
      }
    }
    return map;
  }, [areas]);
  const floors = [...new Map([...floorOf.values()].map(f => [f.id, f])).values()].sort((a, b) => a.level - b.level);
  const shown = filter.kind === 'floor' ? all.filter(id => floorOf.get(id)?.id === filter.id) : all;
  const [first, ...others] = shown;
  const lastEvent = (id: string) => events.find(e => entityOf(e) === id);

  if (open)
    return (
      <PhoneCamera
        key={open.id}
        entityId={open.id}
        events={events.filter(e => entityOf(e) === open.id)}
        initialEventId={open.eventId}
        frigate={(([, instance, camera]) => (camera ? { instance, camera } : undefined))(
          frigate.find(([id]) => id === open.id) ?? ['', '', '']
        )}
        onBack={() => setOpen(null)}
      />
    );

  return (
    <div className={cn('flex flex-col gap-2.5 px-4 pb-[180px]', PHONE_TOP)}>
      <h1 className='flex h-11 items-center text-[30px] font-bold'>{t('layout.phone.tabs.cameras')}</h1>
      {(floors.length > 1 || events.length > 0) && (
        <div className='-mr-4 flex gap-2 overflow-x-auto pr-4 scrollbar-none'>
          <Chip current={filter.kind === 'all'} onClick={() => setFilter({ kind: 'all' })}>
            {t('layout.phone.rooms.all')}
          </Chip>
          {floors.length > 1 &&
            floors.map(f => (
              <Chip
                key={f.id}
                current={filter.kind === 'floor' && filter.id === f.id}
                onClick={() => setFilter({ kind: 'floor', id: f.id })}
              >
                {f.name}
              </Chip>
            ))}
          {events.length > 0 && (
            <Chip current={filter.kind === 'events'} onClick={() => setFilter({ kind: 'events' })}>
              {t('layout.phone.cameras.events')}
            </Chip>
          )}
        </div>
      )}
      {filter.kind === 'events' ? (
        <ul className='-mx-2 flex flex-col gap-1'>
          {events.map(e => (
            <li key={e.id}>
              <EventRow
                event={e}
                now={now}
                camera={<CameraName entityId={entityOf(e)} />}
                onOpen={() => setOpen({ id: entityOf(e), eventId: e.id })}
              />
            </li>
          ))}
        </ul>
      ) : !first ? (
        <p className='py-10 text-center text-[15px] text-[var(--ds-ink-muted)]'>{t('layout.phone.cameras.empty')}</p>
      ) : (
        <div className='flex flex-col gap-2'>
          <CameraTile entityId={first} live onOpen={() => setOpen({ id: first, eventId: null })} />
          {others.length > 0 && (
            <div className='grid grid-cols-2 gap-2'>
              {others.map(id => (
                <CameraTile key={id} entityId={id} now={now} last={lastEvent(id)} onOpen={() => setOpen({ id, eventId: null })} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CameraName({ entityId }: { entityId: string }) {
  return <>{useHass(s => friendlyName(s.entities[entityId]) ?? entityId.replace(/^camera\./, ''))}</>;
}

/** « il y a 3 min », « il y a 2 h », « hier » : le dernier événement d'une caméra. */
function useAgo(at: number | undefined, now: number) {
  const { t } = useI18n();
  if (at === undefined) return undefined;
  const minutes = Math.max(0, Math.round((now - at) / 60_000));
  if (minutes < 1) return t('layout.phone.rooms.justNow');
  if (minutes < 60) return t('layout.phone.rooms.minutesAgo', { count: minutes });
  if (minutes < 24 * 60) return t('layout.phone.rooms.hoursAgo', { count: Math.round(minutes / 60) });
  return t('layout.phone.cameras.yesterday');
}

/** Une caméra : le direct pour la première, une image rafraîchie toutes les 10 s pour les autres. */
function CameraTile({
  entityId,
  live = false,
  now = 0,
  last,
  onOpen,
}: {
  entityId: string;
  live?: boolean;
  now?: number;
  last?: FrigateEvent;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const resolveUrl = useHaUrl();
  const name = useHass(s => friendlyName(s.entities[entityId]) ?? entityId);
  const picture = useHass(s => s.entities[entityId]?.attributes?.entity_picture as string | undefined);
  // Le jeton de l'image change rarement : sans ce paramètre, le navigateur garderait la même.
  const tick = Math.floor(useNow(true).getTime() / 10_000);
  const src = !live && picture ? `${resolveUrl(picture)}${picture.includes('?') ? '&' : '?'}t=${tick}` : undefined;
  const ago = useAgo(last && last.start_time * 1000, now);

  return (
    <button
      onClick={onOpen}
      aria-label={ago ? `${name}, ${ago}` : name}
      className={cn(
        'relative block overflow-hidden bg-[var(--ds-surface-3)] text-left text-white',
        live ? 'h-[196px] rounded-[var(--ds-radius-lg)]' : 'h-[104px] rounded-[var(--ds-radius-md)]'
      )}
    >
      {live ? (
        <CameraFeed entityId={entityId} className='absolute inset-0 size-full' />
      ) : (
        src && <img src={src} alt='' className='absolute inset-0 size-full object-cover' />
      )}
      {/* Un voile pour que le nom se lise sur n'importe quelle image. */}
      <span
        aria-hidden='true'
        className='absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.35),transparent_40%,transparent_60%,rgba(0,0,0,0.45))]'
      />
      {live && (
        <span className='absolute left-3 top-3 flex h-7 items-center gap-1.5 rounded-full bg-[rgba(7,9,12,0.66)] px-2.5 text-[13px] font-semibold'>
          <span aria-hidden='true' className='size-2 rounded-full bg-[#ff7b93]' />
          {t('layout.phone.cameras.live')}
        </span>
      )}
      <span
        className={cn(
          'absolute max-w-[calc(100%-24px)] truncate font-bold',
          live ? 'bottom-3 left-3.5 text-[17px]' : 'left-2.5 top-2 text-sm'
        )}
      >
        {name}
      </span>
      {!live && ago && <span className='absolute bottom-2 left-2.5 text-xs text-[#e3e8ef]'>{ago}</span>}
    </button>
  );
}
