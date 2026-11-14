import { useState } from 'react';
import { Heart, Music, RefreshCw } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useNow } from '@/hooks/useNow';
import { useFormats } from '@/hooks/useFormats';
import { massPlay, useMassEntryId, useMassLibrary } from '@/hooks/useMusicAssistant';
import { artistLine, type MassItem, type MassMediaType, type MassOrder } from '@/lib/music-assistant';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { MusicCover } from './MusicCover';

const TABS: MassMediaType[] = ['album', 'artist', 'playlist', 'track', 'radio'];
const ORDERS: MassOrder[] = ['last_played_desc', 'sort_name', 'timestamp_added_desc'];
const SKELETONS = Array.from({ length: 16 }, (_, i) => i);

/** Pastille d'un groupe de choix (onglets, tri) : active = remplie. */
function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-11 shrink-0 rounded-[var(--ds-radius-pill)] px-5 text-[15px] font-semibold',
        active ? 'bg-[var(--ds-accent)] text-[var(--ds-accent-ink)]' : 'text-[var(--ds-ink-muted)]'
      )}
    >
      {children}
    </button>
  );
}

/**
 * L'appli Musique : la bibliothèque Music Assistant du lecteur ouvert, par
 * type (albums, artistes, playlists, titres, radios). Un appui lance l'élément
 * sur ce lecteur.
 */
export default function MusicApp({ entityId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const helpers = useHass(s => s.helpers);
  const { formatTime } = useFormats();
  const clock = useNow();
  const { entryId, error: entryError } = useMassEntryId(entityId);

  const [tab, setTab] = useState<MassMediaType>('album');
  const [favorite, setFavorite] = useState(false);
  const [order, setOrder] = useState<MassOrder>('last_played_desc');

  const recent = useMassLibrary(entryId, { mediaType: tab, orderBy: 'last_played_desc', limit: 5 });
  const library = useMassLibrary(entryId, { mediaType: tab, orderBy: order, favorite });
  const items = library.data?.items ?? [];
  const error = entryError ?? library.error;
  const loading = !error && (!library.data || library.loading);

  const play = (item: MassItem) => massPlay(helpers, entityId, item);
  const subtitle = (item: MassItem) =>
    item.media_type === 'playlist'
      ? t('widgets.music.types.playlist')
      : item.media_type === 'radio'
        ? t('widgets.music.types.radio')
        : artistLine(item);

  return (
    <div className='-mt-4 flex min-h-full flex-col px-6 pb-8 pt-6 sm:px-10' data-testid='music-app'>
      {/* En-tête : l'appli à gauche, l'heure à droite — la croix de la fiche est tout à droite. */}
      <header className='mb-5 flex items-center justify-between gap-4 pr-16'>
        <h2 className='flex items-center gap-3 text-[26px] font-bold'>
          <span className='flex size-11 items-center justify-center rounded-[var(--ds-radius-sm)] bg-[var(--ds-app-music)] text-white'>
            <Music size={22} aria-hidden='true' />
          </span>
          {t('widgets.music.title')}
        </h2>
        <time className='text-[32px] font-medium leading-none tabular-nums'>{formatTime(clock)}</time>
      </header>

      <div className='mb-6 flex flex-wrap items-center justify-between gap-3'>
        <div
          role='group'
          aria-label={t('widgets.music.typesLabel')}
          className='flex rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-2)] p-1'
        >
          {TABS.map(type => (
            <Pill key={type} active={tab === type} onClick={() => setTab(type)}>
              {t(`widgets.music.tabs.${type}`)}
            </Pill>
          ))}
        </div>
        <div className='flex items-center gap-3'>
          <button
            type='button'
            onClick={() => setFavorite(f => !f)}
            aria-pressed={favorite}
            className={cn(
              'flex h-11 items-center gap-2 rounded-[var(--ds-radius-pill)] px-5 text-[15px] font-semibold',
              favorite ? 'bg-[var(--ds-accent)] text-[var(--ds-accent-ink)]' : 'bg-[var(--ds-surface-2)]'
            )}
          >
            <Heart size={16} aria-hidden='true' className={cn(favorite && 'fill-current')} />
            {t('widgets.music.favorites')}
          </button>
          <div
            role='group'
            aria-label={t('widgets.music.sort')}
            className='flex items-center rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-2)] p-1'
          >
            <span className='px-3 text-sm text-[var(--ds-ink-muted)]'>{t('widgets.music.sort')}</span>
            {ORDERS.map(o => (
              <Pill key={o} active={order === o} onClick={() => setOrder(o)}>
                {t(`widgets.music.order.${o}`)}
              </Pill>
            ))}
          </div>
        </div>
      </div>

      {error ? (
        <EmptyState title={t('widgets.music.error')} hint={error} onRefresh={library.refresh} refreshLabel={t('widgets.music.refresh')} />
      ) : loading ? (
        <div className='grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-5' aria-busy='true' aria-label={t('common.loading')}>
          {SKELETONS.map(i => (
            <span key={i} className='aspect-square animate-pulse rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)]' />
          ))}
        </div>
      ) : items.length === 0 ? (
        favorite ? (
          <EmptyState title={t('widgets.music.noFavorites')} />
        ) : (
          <EmptyState
            title={t(`widgets.music.empty.${tab}`)}
            hint={t('widgets.music.emptyHint')}
            onRefresh={library.refresh}
            refreshLabel={t('widgets.music.refresh')}
          />
        )
      ) : (
        <>
          {!favorite && (recent.data?.items.length ?? 0) > 0 && (
            <section className='mb-7'>
              <h3 className='mb-3 text-[17px] font-semibold'>{t('widgets.music.recent')}</h3>
              <div className='grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3'>
                {recent.data!.items.map(item => (
                  <button
                    key={item.uri}
                    type='button'
                    onClick={() => play(item)}
                    className='flex h-16 min-w-0 items-center gap-3 overflow-hidden rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-2)] pr-3 text-left'
                  >
                    <MusicCover
                      image={item.image}
                      name={item.name}
                      type={item.media_type}
                      small
                      className={cn('w-16 rounded-none', item.media_type === 'artist' && 'ml-2 w-12 rounded-full')}
                    />
                    <span className='min-w-0'>
                      <span className='block truncate text-[15px] font-semibold'>{item.name}</span>
                      <span className='block truncate text-xs text-[var(--ds-ink-muted)]'>{subtitle(item)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className='mb-3 text-[17px] font-semibold'>{t(`widgets.music.tabs.${tab}`)}</h3>
            {tab === 'track' ? (
              <ul className='grid gap-x-8 sm:grid-cols-2'>
                {items.map(item => (
                  <li key={item.uri} className='border-b border-[var(--ds-surface-2)]'>
                    <button type='button' onClick={() => play(item)} className='flex min-h-14 w-full items-center gap-3 py-1.5 text-left'>
                      <MusicCover image={item.image} name={item.name} type='track' small className='w-11 rounded-[var(--ds-radius-sm)]' />
                      <span className='min-w-0 flex-1'>
                        <span className='block truncate text-[15px] font-semibold'>{item.name}</span>
                        <span className='block truncate text-xs text-[var(--ds-ink-muted)]'>{artistLine(item)}</span>
                      </span>
                      {item.favorite && (
                        <Heart size={15} aria-label={t('widgets.music.favorite')} className='shrink-0 fill-[#ff6b8b] text-[#ff6b8b]' />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className='grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-x-5 gap-y-6'>
                {items.map(item => (
                  <button key={item.uri} type='button' onClick={() => play(item)} className='flex min-w-0 flex-col gap-2 text-left'>
                    <MusicCover image={item.image} name={item.name} type={item.media_type} favorite={item.favorite} />
                    <span className={cn('min-w-0', tab === 'artist' && 'text-center')}>
                      <span className='block truncate text-[15px] font-semibold'>{item.name}</span>
                      {tab !== 'artist' && <span className='block truncate text-xs text-[var(--ds-ink-muted)]'>{subtitle(item)}</span>}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function EmptyState({
  title,
  hint,
  onRefresh,
  refreshLabel,
}: {
  title: string;
  hint?: string;
  onRefresh?: () => void;
  refreshLabel?: string;
}) {
  return (
    <div className='flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center'>
      <span className='flex size-14 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'>
        <Music size={24} aria-hidden='true' />
      </span>
      <p className='text-lg font-bold'>{title}</p>
      {hint && <p className='max-w-md text-[15px] text-[var(--ds-ink-muted)]'>{hint}</p>}
      {onRefresh && (
        <button
          type='button'
          onClick={onRefresh}
          className='mt-2 flex h-11 items-center gap-2 rounded-[var(--ds-radius-pill)] bg-[var(--ds-accent)] px-5 text-[15px] font-semibold text-[var(--ds-accent-ink)]'
        >
          <RefreshCw size={16} aria-hidden='true' />
          {refreshLabel}
        </button>
      )}
    </div>
  );
}
