import { ListX, Speaker } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useNow } from '@/hooks/useNow';
import { useServiceResponse } from '@/hooks/useServiceResponse';
import { callHAService, friendlyName } from '@/lib/ha-service';
import { formatMediaTime, interpolatePosition } from '@/lib/media-player';
import { artistLine, type MassItem } from '@/lib/music-assistant';
import { useI18n } from '@/i18n';
import { MusicCover } from './MusicCover';
import { EmptyState, RowsSkeleton } from './MusicItems';

/** Un titre de la file, tel que `music_assistant.get_queue` le décrit. */
interface QueueItem {
  name: string;
  duration?: number | null;
  media_item?: Partial<MassItem> | null;
}

/** Réponse de `music_assistant.get_queue` : HA ne donne que le titre en cours, le suivant, et le compte. */
interface QueueResponse {
  items: number;
  current_index: number | null;
  current_item: QueueItem | null;
  next_item: QueueItem | null;
}

const text = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

/**
 * La file d'attente (maquette « File d'attente »), réduite à ce que HA expose :
 * le titre en cours à gauche, le suivant à droite, le nombre de titres à venir
 * et « Vider la file ». La liste complète, son ordre et le retrait d'un titre
 * ne passent que par l'API de Music Assistant lui-même, hors de portée ici.
 */
export function MusicQueue({ player }: { player: string }) {
  const { t } = useI18n();
  const helpers = useHass(s => s.helpers);
  const entity = useSafeEntity(player);
  const attrs = (entity?.attributes ?? {}) as Record<string, unknown>;
  const playing = entity?.state === 'playing';
  const now = useNow(playing).getTime();
  // La file change avec le titre en cours : c'est lui qui relance la lecture de get_queue.
  const { data, error } = useServiceResponse<QueueResponse>({
    domain: 'music_assistant',
    service: 'get_queue',
    entityId: player,
    revision: `${entity?.state}|${text(attrs.media_title) ?? ''}`,
  });
  const queue = data?.[player];

  const current = queue?.current_item;
  const title = current?.media_item?.name ?? current?.name ?? text(attrs.media_title);
  const artist = (current?.media_item && artistLine(current.media_item)) || text(attrs.media_artist);
  const cover = current?.media_item?.image ?? text(attrs.entity_picture);
  const duration = typeof attrs.media_duration === 'number' ? attrs.media_duration : 0;
  const position = interpolatePosition(attrs, playing, now);
  const upcoming = queue ? Math.max(0, queue.items - ((queue.current_index ?? -1) + 1)) : 0;
  const next = queue?.next_item;

  if (error) return <EmptyState icon={ListX} title={t('widgets.music.error')} hint={error} />;
  if (!queue) return <RowsSkeleton />;
  if (!title && !next) return <EmptyState icon={ListX} title={t('widgets.music.queueEmpty')} hint={t('widgets.music.queueEmptyHint')} />;

  return (
    <div className='mt-9 grid items-start gap-14 md:grid-cols-[420px_1fr]' data-testid='music-queue'>
      <section className='flex flex-col'>
        <span className='text-[15px] font-semibold uppercase text-[var(--music-dim)]'>{t('widgets.music.nowPlaying')}</span>
        <MusicCover image={cover} name={title ?? ''} type='track' className='mt-3 rounded-[28px]' />
        <p className='mt-[22px] truncate text-[32px] font-bold'>{title}</p>
        {artist && <p className='mt-1.5 truncate text-[22px] text-[var(--ds-ink-muted)]'>{artist}</p>}
        <span className='mt-4 inline-flex h-11 w-fit items-center gap-2.5 rounded-[22px] bg-[var(--ds-surface-3)] px-[18px] text-[17px] font-semibold'>
          <Speaker size={20} aria-hidden='true' />
          {friendlyName(entity) ?? player}
        </span>
        {duration > 0 && (
          <>
            <div aria-hidden='true' className='mt-6 h-1.5 overflow-hidden rounded-[3px] bg-white/20'>
              <div
                className='h-full rounded-[3px] bg-[var(--music-highlight)]'
                style={{ width: `${Math.min(100, (position / duration) * 100)}%` }}
              />
            </div>
            <div className='mt-2.5 flex justify-between text-[15px] tabular-nums text-[var(--ds-ink-muted)]'>
              <span>{formatMediaTime(position)}</span>
              <span>{formatMediaTime(duration)}</span>
            </div>
          </>
        )}
      </section>

      {/* Remontée de 8 px : l'en-tête de 56 px se centre sur l'étiquette « En cours ». */}
      <section className='-mt-2 min-w-0'>
        <div className='flex h-14 items-center gap-3.5'>
          <h3 className='text-[24px] font-semibold'>{t('widgets.music.upNext')}</h3>
          <span className='text-[17px] text-[var(--music-dim)]'>
            {t(`widgets.music.trackCount_${upcoming === 1 ? 'one' : 'other'}`, { count: upcoming })}
          </span>
          <button
            type='button'
            onClick={() => callHAService(helpers, 'media_player', 'clear_playlist', { entity_id: player })}
            disabled={upcoming === 0}
            className='ml-auto flex h-[52px] items-center gap-2.5 rounded-[26px] bg-[var(--ds-surface-3)] px-[22px] text-[18px] font-semibold disabled:opacity-40'
          >
            <ListX size={20} aria-hidden='true' />
            {t('widgets.music.clearQueue')}
          </button>
        </div>
        {next ? (
          <div className='mt-1.5 flex h-[76px] items-center gap-3.5 rounded-[18px] px-2'>
            <MusicCover image={next.media_item?.image} name={next.name} type='track' small className='w-14 rounded-[12px]' />
            <span className='min-w-0 flex-1'>
              <span className='block truncate text-[20px] font-semibold'>{next.media_item?.name ?? next.name}</span>
              {next.media_item && (
                <span className='mt-0.5 block truncate text-[16px] text-[var(--ds-ink-muted)]'>{artistLine(next.media_item)}</span>
              )}
            </span>
            {typeof next.duration === 'number' && next.duration > 0 && (
              <span className='w-14 text-right text-[17px] tabular-nums text-[var(--ds-ink-muted)]'>{formatMediaTime(next.duration)}</span>
            )}
          </div>
        ) : (
          <p className='mt-4 text-[17px] text-[var(--ds-ink-muted)]'>{t('widgets.music.queueEnds')}</p>
        )}
        {upcoming > 1 && (
          <p className='mt-4 px-2 text-[17px] text-[var(--ds-ink-muted)]'>
            {t(`widgets.music.queueMore_${upcoming - 1 === 1 ? 'one' : 'other'}`, { count: upcoming - 1 })}
          </p>
        )}
      </section>
    </div>
  );
}
