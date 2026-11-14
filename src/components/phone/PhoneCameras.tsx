import { useMemo, useState } from 'react';
import { useAreas, useHass } from '@hakit/core';
import { CameraFeed } from '@/components/ui/CameraFeed/components/CameraFeed';
import { useHaUrl } from '@/hooks/useHaUrl';
import { useNow } from '@/hooks/useNow';
import { friendlyName } from '@/lib/ha-service';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { Chip } from './PhoneRooms';
import { PHONE_TOP } from './PhoneShell';
import { PhoneCamera } from './PhoneCamera';

/** Les caméras de Home Assistant, dans l'ordre de leur identifiant ; une caméra indisponible n'apparaît pas. */
const cameraIds = (entities: Record<string, { state: string }>) =>
  Object.keys(entities)
    .filter(id => id.startsWith('camera.') && entities[id].state !== 'unavailable')
    .sort()
    .join(',');

/**
 * Onglet Caméras (maquette « Caméras ») : la première en direct, en grand, les
 * autres en vignettes rafraîchies. Un appui ouvre la caméra en plein écran.
 * Les filtres sont les étages des pièces où sont les caméras, s'il y en a plusieurs.
 */
export function PhoneCameras() {
  const { t } = useI18n();
  const joined = useHass(s => cameraIds(s.entities));
  const areas = useAreas();
  const [floor, setFloor] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

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
  const shown = floor ? all.filter(id => floorOf.get(id)?.id === floor) : all;
  const [first, ...others] = shown;

  if (openId) return <PhoneCamera entityId={openId} onBack={() => setOpenId(null)} />;

  return (
    <div className={cn('flex flex-col gap-2.5 px-4 pb-[180px]', PHONE_TOP)}>
      <h1 className='flex h-11 items-center text-[30px] font-bold'>{t('layout.phone.tabs.cameras')}</h1>
      {floors.length > 1 && (
        <div className='-mr-4 flex gap-2 overflow-x-auto pr-4 scrollbar-none'>
          <Chip current={!floor} onClick={() => setFloor(null)}>
            {t('layout.phone.rooms.all')}
          </Chip>
          {floors.map(f => (
            <Chip key={f.id} current={floor === f.id} onClick={() => setFloor(f.id)}>
              {f.name}
            </Chip>
          ))}
        </div>
      )}
      {!first ? (
        <p className='py-10 text-center text-[15px] text-[var(--ds-ink-muted)]'>{t('layout.phone.cameras.empty')}</p>
      ) : (
        <div className='flex flex-col gap-2'>
          <CameraTile entityId={first} live onOpen={setOpenId} />
          {others.length > 0 && (
            <div className='grid grid-cols-2 gap-2'>
              {others.map(id => (
                <CameraTile key={id} entityId={id} onOpen={setOpenId} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Une caméra : le direct pour la première, une image rafraîchie toutes les 10 s pour les autres. */
function CameraTile({ entityId, live = false, onOpen }: { entityId: string; live?: boolean; onOpen: (id: string) => void }) {
  const { t } = useI18n();
  const resolveUrl = useHaUrl();
  const name = useHass(s => friendlyName(s.entities[entityId]) ?? entityId);
  const picture = useHass(s => s.entities[entityId]?.attributes?.entity_picture as string | undefined);
  // Le jeton de l'image change rarement : sans ce paramètre, le navigateur garderait la même.
  const tick = Math.floor(useNow(true).getTime() / 10_000);
  const src = !live && picture ? `${resolveUrl(picture)}${picture.includes('?') ? '&' : '?'}t=${tick}` : undefined;

  return (
    <button
      onClick={() => onOpen(entityId)}
      aria-label={name}
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
    </button>
  );
}
