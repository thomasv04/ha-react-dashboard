import { AudioLines, ListPlus, Play, Shuffle } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { massPlay, useMassBrowse } from '@/hooks/useMusicAssistant';
import { callHAService } from '@/lib/ha-service';
import { artistLine, splitTrackTitle, type BrowseChild, type MassItem } from '@/lib/music-assistant';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { MusicCover } from './MusicCover';
import { ItemGrid, MoreButton, RowsSkeleton } from './MusicItems';

/** Un album listé sous un artiste, remis à la forme d'un élément de bibliothèque. */
function albumOf(child: BrowseChild, artist: MassItem): MassItem {
  return {
    uri: child.media_content_id,
    name: splitTrackTitle(child.title, artist.name).title,
    image: child.thumbnail,
    media_type: 'album',
    artists: [{ uri: artist.uri, name: artist.name }],
  };
}

/** Un titre de la fiche, remis à la forme d'un élément pour ses actions. */
function trackOf(child: BrowseChild, track: { artist: string; title: string }, parent: MassItem): MassItem {
  const artist = track.artist || artistLine(parent);
  return {
    uri: child.media_content_id,
    name: track.title,
    image: child.thumbnail,
    media_type: 'track',
    artists: artist ? [{ uri: '', name: artist }] : [],
  };
}

function ActionButton({
  onClick,
  primary,
  wide,
  icon: Icon,
  children,
}: {
  onClick: () => void;
  primary?: boolean;
  wide?: boolean;
  icon: typeof Play;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex h-14 items-center justify-center gap-2.5 rounded-[28px] text-[19px] font-semibold',
        primary ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)]',
        wide && 'col-span-2'
      )}
    >
      <Icon size={22} aria-hidden='true' className={cn(primary && 'fill-current')} />
      {children}
    </button>
  );
}

/**
 * La fiche d'un album, d'une playlist ou d'un artiste, comme la maquette
 * « Détail album » : la pochette et les actions dans une colonne de 380 px,
 * le contenu à droite (les titres, ou les albums de l'artiste). Le contenu
 * vient de la navigation média du lecteur.
 */
export function MusicDetail({
  entityId,
  item,
  onOpen,
  onMore,
}: {
  entityId: string;
  item: MassItem;
  onOpen: (item: MassItem) => void;
  onMore: (item: MassItem) => void;
}) {
  const { t } = useI18n();
  const helpers = useHass(s => s.helpers);
  const player = useSafeEntity(entityId);
  const { data, loading, error } = useMassBrowse(entityId, item.uri);
  const children = (data?.children ?? []).filter(c => c.can_play);
  const isArtist = item.media_type === 'artist';
  const artist = artistLine(item);
  const nowPlaying = player?.state === 'playing' ? player.attributes?.media_title : undefined;

  const play = (target: { uri: string; media_type?: MassItem['media_type'] }, enqueue?: 'play' | 'add') =>
    massPlay(helpers, entityId, target, enqueue);
  const shuffle = () => {
    callHAService(helpers, 'media_player', 'shuffle_set', { entity_id: entityId }, { shuffle: true });
    play(item);
  };

  return (
    <div className='mt-9 grid min-h-0 flex-1 gap-14 md:grid-cols-[380px_1fr]' data-testid='music-detail'>
      <aside className='flex flex-col'>
        <MusicCover
          image={item.image}
          name={item.name}
          type={item.media_type}
          className={cn('shadow-[0_24px_60px_rgba(0,0,0,0.5)]', !isArtist && 'rounded-[28px]')}
        />
        <h2 className='mt-6 text-[40px] font-bold leading-[45px]'>{item.name}</h2>
        {!isArtist && artist && <p className='mt-2 truncate text-[24px] font-semibold text-[var(--music-highlight)]'>{artist}</p>}
        {data && (
          <p className='mt-1.5 text-[18px] text-[var(--ds-ink-muted)]'>
            {t(`widgets.music.${isArtist ? 'albumCount' : 'trackCount'}_${children.length === 1 ? 'one' : 'other'}`, {
              count: children.length,
            })}
          </p>
        )}
        <div className='mt-6 grid grid-cols-2 gap-3'>
          <ActionButton primary icon={Play} onClick={() => play(item)}>
            {t('widgets.music.play')}
          </ActionButton>
          {!isArtist && (
            <>
              <ActionButton icon={Shuffle} onClick={shuffle}>
                {t('widgets.music.shuffle')}
              </ActionButton>
              <ActionButton wide icon={ListPlus} onClick={() => play(item, 'add')}>
                {t('widgets.music.addToQueue')}
              </ActionButton>
            </>
          )}
        </div>
      </aside>

      <section className='min-w-0'>
        {error ? (
          <p className='py-10 text-center text-[var(--ds-ink-muted)]'>{t('widgets.music.error')}</p>
        ) : loading || !data ? (
          <RowsSkeleton />
        ) : isArtist ? (
          <>
            <h3 className='mb-3.5 text-[22px] font-semibold'>{t('widgets.music.tabs.album')}</h3>
            <ItemGrid items={children.map(child => albumOf(child, item))} onOpen={onOpen} onMore={onMore} />
          </>
        ) : children.length === 0 ? (
          <p className='py-10 text-center text-[var(--ds-ink-muted)]'>{t('widgets.music.noTracks')}</p>
        ) : (
          <ol>
            {/* En-têtes de colonnes : le gris de l'heure, sans majuscules. */}
            <li aria-hidden='true' className='flex h-10 items-center text-[15px] text-[var(--music-dim)]'>
              <span className='w-16 text-center'>#</span>
              <span>{t('widgets.music.trackTitle')}</span>
            </li>
            {children.map((child, i) => {
              const track = splitTrackTitle(child.title, item.media_type === 'album' ? artist : undefined);
              const current = nowPlaying === track.title;
              return (
                <li
                  key={child.media_content_id}
                  className={cn('flex h-[76px] items-center rounded-[18px] pr-2', current && 'bg-[var(--music-highlight-soft)]')}
                >
                  <button
                    type='button'
                    onClick={() => play({ uri: child.media_content_id, media_type: 'track' })}
                    aria-current={current || undefined}
                    className='flex h-full min-w-0 flex-1 items-center text-left'
                  >
                    <span className='flex w-16 shrink-0 justify-center text-[20px] tabular-nums text-[var(--music-dim)]'>
                      {current ? <AudioLines size={22} aria-hidden='true' className='text-[var(--music-highlight)]' /> : i + 1}
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span className={cn('block truncate text-[21px] font-semibold', current && 'text-[var(--music-highlight)]')}>
                        {track.title}
                      </span>
                      {item.media_type === 'playlist' && track.artist && (
                        <span className='block truncate text-[16px] text-[var(--ds-ink-muted)]'>{track.artist}</span>
                      )}
                    </span>
                  </button>
                  <MoreButton label={track.title} onClick={() => onMore(trackOf(child, track, item))} />
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
