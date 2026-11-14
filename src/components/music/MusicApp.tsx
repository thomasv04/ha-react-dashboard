import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Heart, Music, Search, X } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useNow } from '@/hooks/useNow';
import { useFormats } from '@/hooks/useFormats';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { massPlay, useMassEntryId, useMassLibrary } from '@/hooks/useMusicAssistant';
import { itemSubtitle, type MassItem, type MassMediaType, type MassOrder } from '@/lib/music-assistant';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { MusicCover } from './MusicCover';
import { MusicDetail } from './MusicDetail';
import { EmptyState, GridSkeleton, ItemGrid, Pill, TrackList } from './MusicItems';
import { MusicSearch } from './MusicSearch';

const TABS: MassMediaType[] = ['album', 'artist', 'playlist', 'track', 'radio'];
const ORDERS: MassOrder[] = ['last_played_desc', 'sort_name', 'timestamp_added_desc'];
/** Ce qui s'ouvre en fiche ; le reste (titres, radios) se lance d'un appui. */
const BROWSABLE = new Set<MassMediaType>(['album', 'playlist', 'artist']);
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
  // Ce qui est tapé, et ce qui est cherché : MA n'est interrogé qu'à la pause de frappe.
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const search = useDebouncedCallback((v: string) => setQuery(v.trim()), 300);
  const clearSearch = () => {
    setDraft('');
    setQuery('');
    search(''); // remplace une frappe encore en attente
  };
  // Les fiches ouvertes, la dernière au-dessus : artiste → album → retour à l'artiste.
  const [stack, setStack] = useState<MassItem[]>([]);
  const detail = stack.at(-1);
  // Une fiche s'ouvre en haut, pas au défilement de la grille qu'on quitte.
  const rootRef = useRef<HTMLDivElement>(null);
  // Accolades : scrollIntoView peut renvoyer une promesse, que React prendrait pour un nettoyage.
  useEffect(() => {
    rootRef.current?.scrollIntoView?.({ block: 'start' });
  }, [detail]);

  const recent = useMassLibrary(entryId, { mediaType: tab, orderBy: 'last_played_desc', limit: 5 });
  const library = useMassLibrary(entryId, { mediaType: tab, orderBy: order, favorite });
  const items = library.data?.items ?? [];
  const error = entryError ?? library.error;
  const loading = !error && (!library.data || library.loading);

  const play = (item: MassItem) => massPlay(helpers, entityId, item);
  const open = (item: MassItem) => (BROWSABLE.has(item.media_type) ? setStack(s => [...s, item]) : play(item));
  const back = stack.at(-2)?.name ?? (query ? t('widgets.music.searchResults') : t(`widgets.music.tabs.${tab}`));
  const subtitle = (item: MassItem) => itemSubtitle(item, t);

  return (
    <div ref={rootRef} className='-mt-4 flex min-h-full flex-col px-6 pb-8 pt-6 sm:px-10' data-testid='music-app'>
      {/* En-tête : l'appli à gauche, l'heure à droite — la croix de la fiche est tout à droite. */}
      <header className='mb-5 flex items-center justify-between gap-4 pr-16'>
        {detail ? (
          <button
            type='button'
            onClick={() => setStack(s => s.slice(0, -1))}
            aria-label={`${t('widgets.music.back')} — ${back}`}
            className='flex items-center gap-3 text-[17px] font-semibold'
          >
            <span className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'>
              <ChevronLeft size={22} aria-hidden='true' />
            </span>
            {back}
          </button>
        ) : query ? (
          <button
            type='button'
            onClick={clearSearch}
            aria-label={t('widgets.music.closeSearch')}
            className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
          >
            <ChevronLeft size={22} aria-hidden='true' />
          </button>
        ) : (
          <h2 className='flex shrink-0 items-center gap-3 text-[26px] font-bold'>
            <span className='flex size-11 items-center justify-center rounded-[var(--ds-radius-sm)] bg-[var(--ds-app-music)] text-white'>
              <Music size={22} aria-hidden='true' />
            </span>
            {t('widgets.music.title')}
          </h2>
        )}
        {!detail && (
          <label className='flex h-12 min-w-0 max-w-xl flex-1 items-center gap-3 rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-2)] px-5'>
            <Search size={18} aria-hidden='true' className='shrink-0 text-[var(--ds-ink-muted)]' />
            <input
              type='search'
              value={draft}
              onChange={e => {
                setDraft(e.target.value);
                search(e.target.value);
              }}
              placeholder={t(`widgets.music.searchPlaceholder.${tab}`)}
              aria-label={t('widgets.music.search')}
              className='min-w-0 flex-1 bg-transparent text-[16px] outline-none placeholder:text-[var(--ds-ink-muted)] [&::-webkit-search-cancel-button]:hidden'
            />
            {draft && (
              <button
                type='button'
                onClick={clearSearch}
                aria-label={t('widgets.music.clearSearch')}
                className='-mr-2 flex size-9 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
              >
                <X size={16} aria-hidden='true' />
              </button>
            )}
          </label>
        )}
        <time className='shrink-0 text-[32px] font-medium leading-none tabular-nums'>{formatTime(clock)}</time>
      </header>

      {detail ? (
        <MusicDetail key={detail.uri} entityId={entityId} item={detail} onOpen={item => setStack(s => [...s, item])} />
      ) : query ? (
        <MusicSearch entryId={entryId} query={query} onOpen={open} onPlay={play} />
      ) : (
        <>
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
            <EmptyState title={t('widgets.music.error')} hint={error} onRefresh={library.refresh} />
          ) : loading ? (
            <GridSkeleton />
          ) : items.length === 0 ? (
            favorite ? (
              <EmptyState title={t('widgets.music.noFavorites')} />
            ) : (
              <EmptyState title={t(`widgets.music.empty.${tab}`)} hint={t('widgets.music.emptyHint')} onRefresh={library.refresh} />
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
                        onClick={() => open(item)}
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
                {tab === 'track' ? <TrackList items={items} onPlay={play} /> : <ItemGrid items={items} onOpen={open} />}
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
