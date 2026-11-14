import { AudioLines, ListPlus, Play, Shuffle } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { massPlay, useMassBrowse } from '@/hooks/useMusicAssistant';
import { callHAService } from '@/lib/ha-service';
import { artistLine, splitTrackTitle, type BrowseChild, type MassItem } from '@/lib/music-assistant';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { MusicCover } from './MusicCover';

const ROWS = Array.from({ length: 8 }, (_, i) => i);

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
        'flex h-12 items-center justify-center gap-2 rounded-[var(--ds-radius-pill)] px-5 text-[15px] font-semibold',
        primary ? 'bg-[var(--ds-accent)] text-[var(--ds-accent-ink)]' : 'bg-[var(--ds-surface-3)]',
        wide && 'col-span-2'
      )}
    >
      <Icon size={17} aria-hidden='true' className={cn(primary && 'fill-current')} />
      {children}
    </button>
  );
}

/**
 * La fiche d'un album, d'une playlist ou d'un artiste : la pochette et les
 * actions à gauche, le contenu à droite (les titres, ou les albums de
 * l'artiste). Le contenu vient de la navigation média du lecteur.
 */
export function MusicDetail({ entityId, item, onOpen }: { entityId: string; item: MassItem; onOpen: (item: MassItem) => void }) {
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
    <div className='grid min-h-0 flex-1 gap-8 md:grid-cols-[300px_1fr]' data-testid='music-detail'>
      <aside className='flex flex-col gap-4'>
        <MusicCover image={item.image} name={item.name} type={item.media_type} />
        <div className='min-w-0'>
          <h2 className='text-[28px] font-bold leading-tight'>{item.name}</h2>
          {!isArtist && artist && <p className='truncate text-[17px] font-semibold text-[var(--ds-accent)]'>{artist}</p>}
          {data && (
            <p className='text-sm text-[var(--ds-ink-muted)]'>
              {t(`widgets.music.${isArtist ? 'albumCount' : 'trackCount'}_${children.length === 1 ? 'one' : 'other'}`, {
                count: children.length,
              })}
            </p>
          )}
        </div>
        <div className='grid grid-cols-2 gap-3'>
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
          <div aria-busy='true' aria-label={t('common.loading')} className='flex flex-col gap-2'>
            {ROWS.map(i => (
              <span key={i} className='h-14 animate-pulse rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-2)]' />
            ))}
          </div>
        ) : isArtist ? (
          <>
            <h3 className='mb-3 text-[17px] font-semibold'>{t('widgets.music.tabs.album')}</h3>
            <div className='grid grid-cols-[repeat(auto-fill,minmax(130px,1fr))] gap-x-5 gap-y-6'>
              {children.map(child => {
                const album = albumOf(child, item);
                return (
                  <button key={album.uri} type='button' onClick={() => onOpen(album)} className='flex min-w-0 flex-col gap-2 text-left'>
                    <MusicCover image={album.image} name={album.name} type='album' />
                    <span className='truncate text-[15px] font-semibold'>{album.name}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : children.length === 0 ? (
          <p className='py-10 text-center text-[var(--ds-ink-muted)]'>{t('widgets.music.noTracks')}</p>
        ) : (
          <ol>
            <li
              aria-hidden='true'
              className='flex gap-4 px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-[var(--ds-ink-muted)]'
            >
              <span className='w-6 text-right'>#</span>
              <span>{t('widgets.music.trackTitle')}</span>
            </li>
            {children.map((child, i) => {
              const track = splitTrackTitle(child.title, item.media_type === 'album' ? artist : undefined);
              const current = nowPlaying === track.title;
              return (
                <li key={child.media_content_id}>
                  <button
                    type='button'
                    onClick={() => play({ uri: child.media_content_id, media_type: 'track' })}
                    aria-current={current || undefined}
                    className={cn(
                      'flex min-h-14 w-full items-center gap-4 rounded-[var(--ds-radius-md)] px-4 text-left',
                      current && 'bg-[var(--ds-surface-2)] text-[var(--ds-accent)]'
                    )}
                  >
                    <span className='w-6 shrink-0 text-right text-sm tabular-nums text-[var(--ds-ink-muted)]'>
                      {current ? <AudioLines size={16} aria-hidden='true' className='ml-auto text-[var(--ds-accent)]' /> : i + 1}
                    </span>
                    <span className='min-w-0 flex-1'>
                      <span className='block truncate text-[15px] font-semibold'>{track.title}</span>
                      {item.media_type === 'playlist' && track.artist && (
                        <span className='block truncate text-xs text-[var(--ds-ink-muted)]'>{track.artist}</span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
