import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  ChevronLeft,
  Grip,
  Heart,
  ListMusic,
  Music,
  RefreshCw,
  Search,
  Speaker,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useHass } from '@hakit/core';
import { useMoreInfoOptional } from '@/context/MoreInfoContext';
import { useNow } from '@/hooks/useNow';
import { useFormats } from '@/hooks/useFormats';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useIsPhone } from '@/hooks/useIsMobile';
import { massPlay, useMassEntryId, useMassLibrary } from '@/hooks/useMusicAssistant';
import { itemSubtitle, rememberPlayer, type MassEnqueue, type MassItem, type MassMediaType, type MassOrder } from '@/lib/music-assistant';
import { friendlyName } from '@/lib/ha-service';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { MusicCover } from './MusicCover';
import { MusicActions, PlayerPicker } from './MusicActions';
import { MusicDetail } from './MusicDetail';
import { MusicMiniPlayer } from './MusicMiniPlayer';
import { EmptyAction, EmptyState, ItemGrid, LibrarySkeleton, Pill, TrackList } from './MusicItems';
import { MusicSearch } from './MusicSearch';
import { MusicQueue } from './MusicQueue';
import { MusicSpeakers } from './MusicSpeakers';

const TABS: MassMediaType[] = ['album', 'artist', 'playlist', 'track', 'radio'];
const ORDERS: MassOrder[] = ['last_played_desc', 'sort_name', 'timestamp_added_desc'];
/** Ce qui s'ouvre en fiche ; le reste (titres, radios) se lance d'un appui. */
const BROWSABLE = new Set<MassMediaType>(['album', 'playlist', 'artist']);

/**
 * L'appli Musique : la bibliothèque Music Assistant, par type (albums,
 * artistes, playlists, titres, radios), sur l'enceinte choisie.
 *
 * Le champ de l'en-tête filtre l'onglet en cours, comme la maquette ; quand
 * rien ne correspond, « Chercher dans toute la musique » ouvre la recherche
 * groupée par type.
 */
export default function MusicApp({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const helpers = useHass(s => s.helpers);
  const { formatTime } = useFormats();
  const moreInfo = useMoreInfoOptional();
  const clock = useNow();
  // Téléphone (maquettes « Bibliothèque » du téléphone) : l'appli est un onglet, pas une fenêtre.
  const phone = useIsPhone();
  const [sorting, setSorting] = useState(false);
  // L'enceinte de l'appli : celle de l'ouverture, puis celle qu'on choisit.
  const [player, setPlayerState] = useState(entityId);
  const setPlayer = (id: string) => {
    setPlayerState(id);
    rememberPlayer(id);
  };
  const playerName = useHass(s => friendlyName(s.entities[player]) ?? player);
  const { entryId, error: entryError } = useMassEntryId(player);
  // L'élément dont on a ouvert les actions, ou le choix de l'enceinte.
  const [actionItem, setActionItem] = useState<MassItem | null>(null);
  const [picking, setPicking] = useState(false);
  // Un écran par-dessus la bibliothèque : les enceintes et le groupe, ou la file d'attente.
  // Le lecteur plein écran ouvre l'appli directement sur un écran : `music:queue`, `music:speakers`.
  const [screen, setScreen] = useState<'speakers' | 'queue' | null>(
    widgetId === 'music:queue' ? 'queue' : widgetId === 'music:speakers' ? 'speakers' : null
  );

  const [tab, setTab] = useState<MassMediaType>('album');
  const [favorite, setFavorite] = useState(false);
  const [order, setOrder] = useState<MassOrder>('last_played_desc');
  // Ce qui est tapé, et ce qui est cherché : MA n'est interrogé qu'à la pause de frappe.
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const search = useDebouncedCallback((v: string) => setQuery(v.trim()), 300);
  // La recherche dans toute la musique, groupée par type, au lieu du filtre de l'onglet.
  const [global, setGlobal] = useState(false);
  const clearSearch = () => {
    setDraft('');
    setQuery('');
    setGlobal(false);
    search(''); // remplace une frappe encore en attente
  };
  // Les fiches ouvertes, la dernière au-dessus : artiste → album → retour à l'artiste.
  const [stack, setStack] = useState<MassItem[]>([]);
  const detail = stack.at(-1);
  // Un écran secondaire (fiche, enceintes, file) : retour à gauche, ni recherche ni enceinte dans l'en-tête.
  const sub = !!screen || !!detail;
  // Une fiche s'ouvre en haut, pas au défilement de la grille qu'on quitte.
  const rootRef = useRef<HTMLDivElement>(null);
  // Accolades : scrollIntoView peut renvoyer une promesse, que React prendrait pour un nettoyage.
  useEffect(() => {
    rootRef.current?.scrollIntoView?.({ block: 'start' });
  }, [detail, screen]);

  const showRecent = !favorite && !query;
  const recent = useMassLibrary(showRecent ? entryId : null, { mediaType: tab, orderBy: 'last_played_desc', limit: 5 });
  const library = useMassLibrary(entryId, { mediaType: tab, orderBy: order, favorite, search: query });
  const items = library.data?.items ?? [];
  const error = entryError ?? library.error;
  const loading = !error && (!library.data || library.loading);

  const play = (item: MassItem, enqueue: MassEnqueue = 'play', target = player) => massPlay(helpers, target, item, enqueue);
  const open = (item: MassItem) => (BROWSABLE.has(item.media_type) ? setStack(s => [...s, item]) : play(item));
  const more = setActionItem;
  const back = screen
    ? t(`widgets.music.${screen}`)
    : (stack.at(-2)?.name ?? (global ? t('widgets.music.searchResults') : t(`widgets.music.tabs.${tab}`)));
  const subtitle = (item: MassItem) => itemSubtitle(item, t);

  return (
    <div
      ref={rootRef}
      // `music-theme` (index.css) : les couleurs de la maquette absentes des jetons. Le bas laisse la
      // place au mini-lecteur.
      className='music-theme -mt-4 flex min-h-full flex-col bg-[var(--ds-ground)] px-10 pb-[150px] pt-8 leading-[normal] text-[var(--ds-ink)] phone:mt-0 phone:min-h-dvh phone:px-4 phone:pb-[200px] phone:pt-[calc(env(safe-area-inset-top)+16px)]'
      data-testid='music-app'
    >
      {/* En-tête de la maquette : le carré du lanceur (il ferme l'appli) et le titre ; la recherche,
          l'enceinte et l'heure à droite. */}
      {phone && !sub && !global ? (
        <PhoneLibraryHeader
          draft={draft}
          tab={tab}
          playerName={playerName}
          onDraft={v => {
            setDraft(v);
            search(v);
          }}
          onClear={clearSearch}
          onPick={() => setPicking(true)}
        />
      ) : (
        <header className='flex h-[60px] shrink-0 items-center gap-5 phone:h-11 phone:gap-3'>
          {sub ? (
            <button
              type='button'
              onClick={() => (screen ? setScreen(null) : setStack(s => s.slice(0, -1)))}
              aria-label={`${t('widgets.music.back')} — ${back}`}
              className='flex min-w-0 items-center gap-5 text-[24px] font-semibold text-[var(--ds-ink-muted)] phone:gap-3 phone:text-lg phone:text-[var(--ds-ink)]'
            >
              <span className='flex size-[60px] shrink-0 items-center justify-center rounded-[18px] bg-[var(--ds-surface-2)] text-[var(--ds-ink)] phone:size-11 phone:rounded-full'>
                <ChevronLeft size={26} aria-hidden='true' />
              </span>
              <span className='truncate'>{back}</span>
            </button>
          ) : global ? (
            <button
              type='button'
              onClick={() => setGlobal(false)}
              aria-label={t('widgets.music.closeSearch')}
              className='flex size-[60px] shrink-0 items-center justify-center rounded-[18px] bg-[var(--ds-surface-2)] phone:size-11 phone:rounded-full'
            >
              <ChevronLeft size={26} aria-hidden='true' />
            </button>
          ) : (
            <div className='flex shrink-0 items-center gap-5'>
              <button
                type='button'
                onClick={moreInfo?.closeMoreInfo}
                aria-label={t('widgets.music.closeApp')}
                className='flex size-[60px] items-center justify-center rounded-[18px] bg-[var(--ds-accent)] text-[var(--ds-accent-ink)]'
              >
                <Grip size={28} aria-hidden='true' />
              </button>
              <h2 className='text-[38px] font-semibold leading-none'>{t('widgets.music.title')}</h2>
            </div>
          )}
          {!sub && (
            <label
              className={cn(
                'flex h-[60px] min-w-0 items-center gap-3.5 rounded-[30px] bg-[var(--ds-surface-2)] pl-[22px] pr-2.5 focus-within:shadow-[inset_0_0_0_2px_var(--ds-tile-on)] phone:h-11 phone:gap-2.5 phone:pl-4 phone:pr-1.5',
                global ? 'flex-1' : 'ml-auto w-[520px] shrink'
              )}
            >
              <Search size={24} aria-hidden='true' className='shrink-0 text-[var(--ds-ink-muted)]' />
              <input
                type='search'
                value={draft}
                onChange={e => {
                  setDraft(e.target.value);
                  search(e.target.value);
                }}
                placeholder={t(global ? 'widgets.music.searchAll' : `widgets.music.searchPlaceholder.${tab}`)}
                aria-label={t('widgets.music.search')}
                // Le focus se lit sur la pilule entière ; `!` passe devant la règle globale de focus (index.css, hors couche).
                className='min-w-0 flex-1 bg-transparent text-[19px] phone:text-base outline-none! placeholder:text-[var(--ds-ink-muted)] [&::-webkit-search-cancel-button]:hidden'
              />
              {draft && (
                <button
                  type='button'
                  onClick={clearSearch}
                  aria-label={t('widgets.music.clearSearch')}
                  className='flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--music-raised-2)]'
                >
                  <X size={18} aria-hidden='true' />
                </button>
              )}
            </label>
          )}
          {!sub && !global && (
            <button
              type='button'
              onClick={() => setPicking(true)}
              aria-label={`${t('widgets.music.choosePlayer')} — ${playerName}`}
              title={playerName}
              className='flex size-[60px] shrink-0 items-center justify-center rounded-[18px] bg-[var(--ds-surface-2)]'
            >
              <Speaker size={26} aria-hidden='true' />
            </button>
          )}
          {!sub && !global && (
            <button
              type='button'
              onClick={() => setScreen('queue')}
              aria-label={t('widgets.music.queue')}
              className='flex size-[60px] shrink-0 items-center justify-center rounded-[18px] bg-[var(--ds-surface-2)]'
            >
              <ListMusic size={26} aria-hidden='true' />
            </button>
          )}
          {!phone && (
            <time className={cn('shrink-0 text-[38px] font-medium text-[var(--music-dim)]', sub && 'ml-auto')}>{formatTime(clock)}</time>
          )}
        </header>
      )}

      {screen === 'speakers' ? (
        <MusicSpeakers player={player} onDone={() => setScreen(null)} />
      ) : screen === 'queue' ? (
        <MusicQueue player={player} />
      ) : detail ? (
        <MusicDetail key={detail.uri} entityId={player} item={detail} onOpen={item => setStack(s => [...s, item])} onMore={more} />
      ) : global ? (
        <MusicSearch entryId={entryId} query={query} onOpen={open} onPlay={item => play(item)} onMore={more} />
      ) : (
        <>
          {phone ? (
            <div className='mb-3.5 mt-2 flex flex-col gap-2'>
              <div
                role='group'
                aria-label={t('widgets.music.typesLabel')}
                className='-mr-4 flex gap-1.5 overflow-x-auto pr-4 scrollbar-none'
              >
                {TABS.map(type => (
                  <button
                    key={type}
                    type='button'
                    onClick={() => setTab(type)}
                    aria-pressed={tab === type}
                    className={cn(
                      'h-11 shrink-0 rounded-full px-[18px] text-[15px] font-semibold',
                      tab === type ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-2)]'
                    )}
                  >
                    {t(`widgets.music.tabs.${type}`)}
                  </button>
                ))}
              </div>
              <div className='flex gap-2'>
                <button
                  type='button'
                  onClick={() => setFavorite(f => !f)}
                  aria-pressed={favorite}
                  className={cn(
                    'flex h-10 shrink-0 items-center gap-2 rounded-full px-4 text-[15px] font-semibold',
                    favorite ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-2)]'
                  )}
                >
                  <Heart size={18} aria-hidden='true' className={cn(favorite && 'fill-current')} />
                  {t('widgets.music.favorites')}
                </button>
                <button
                  type='button'
                  onClick={() => setSorting(true)}
                  aria-label={`${t('widgets.music.sort')} : ${t(`widgets.music.order.${order}`)}`}
                  className='flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-[var(--ds-surface-2)] px-3.5 text-[15px] font-semibold'
                >
                  <ArrowDownUp size={16} aria-hidden='true' className='shrink-0' />
                  <span className='min-w-0 flex-1 truncate text-left'>{t(`widgets.music.order.${order}`)}</span>
                  <ChevronDown size={16} aria-hidden='true' className='shrink-0' />
                </button>
              </div>
            </div>
          ) : (
            <div className='mb-8 mt-6 flex flex-wrap items-center justify-between gap-4'>
              <div
                role='group'
                aria-label={t('widgets.music.typesLabel')}
                className='flex gap-1 rounded-[32px] bg-[var(--ds-surface-2)] p-1'
              >
                {TABS.map(type => (
                  <Pill key={type} active={tab === type} onClick={() => setTab(type)}>
                    {t(`widgets.music.tabs.${type}`)}
                  </Pill>
                ))}
              </div>
              <div className='flex items-center gap-4'>
                <button
                  type='button'
                  onClick={() => setFavorite(f => !f)}
                  aria-pressed={favorite}
                  className={cn(
                    'flex h-14 items-center gap-2.5 rounded-[28px] px-6 text-[19px] font-semibold',
                    favorite ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-2)]'
                  )}
                >
                  <Heart size={22} aria-hidden='true' className={cn(favorite && 'fill-current')} />
                  {t('widgets.music.favorites')}
                </button>
                <span className='text-base text-[var(--music-dim)]'>{t('widgets.music.sort')}</span>
                <div
                  role='group'
                  aria-label={t('widgets.music.sort')}
                  className='flex items-center gap-1 rounded-[32px] bg-[var(--ds-surface-2)] p-1'
                >
                  {ORDERS.map(o => (
                    <Pill key={o} soft active={order === o} onClick={() => setOrder(o)}>
                      {t(`widgets.music.order.${o}`)}
                    </Pill>
                  ))}
                </div>
              </div>
            </div>
          )}

          {error ? (
            <EmptyState icon={TriangleAlert} title={t('widgets.music.error')} hint={error}>
              <EmptyAction primary icon={RefreshCw} onClick={library.refresh}>
                {t('widgets.music.refresh')}
              </EmptyAction>
            </EmptyState>
          ) : loading ? (
            <LibrarySkeleton recent={showRecent} tracks={tab === 'track'} />
          ) : items.length === 0 && query ? (
            <EmptyState
              icon={Search}
              title={t('widgets.music.noResults', { query })}
              hint={t(`widgets.music.${favorite ? 'noMatchFavorites' : 'noMatch'}.${tab}`)}
            >
              {favorite && <EmptyAction onClick={() => setFavorite(false)}>{t('widgets.music.removeFavorites')}</EmptyAction>}
              <EmptyAction primary icon={Search} onClick={() => setGlobal(true)}>
                {t('widgets.music.searchEverywhere')}
              </EmptyAction>
            </EmptyState>
          ) : items.length === 0 && favorite ? (
            <EmptyState icon={Heart} title={t('widgets.music.noFavorites')}>
              <EmptyAction onClick={() => setFavorite(false)}>{t('widgets.music.removeFavorites')}</EmptyAction>
            </EmptyState>
          ) : items.length === 0 ? (
            <EmptyState icon={Music} title={t(`widgets.music.empty.${tab}`)} hint={t('widgets.music.emptyHint')}>
              <EmptyAction primary icon={RefreshCw} onClick={library.refresh}>
                {t('widgets.music.refresh')}
              </EmptyAction>
            </EmptyState>
          ) : (
            <>
              {showRecent && (recent.data?.items.length ?? 0) > 0 && (
                <section className='mb-[30px] phone:mb-4'>
                  <h3 className='mb-3.5 text-[22px] font-semibold phone:mb-2.5 phone:text-xl phone:font-bold'>
                    {t('widgets.music.recent')}
                  </h3>
                  {phone ? (
                    <div className='-mr-4 flex gap-3 overflow-x-auto pr-4 scrollbar-none'>
                      {recent.data!.items.map(item => (
                        <button
                          key={item.uri}
                          type='button'
                          onClick={() => open(item)}
                          onContextMenu={e => {
                            e.preventDefault();
                            more(item);
                          }}
                          className='flex w-[104px] shrink-0 flex-col gap-1.5 text-left'
                        >
                          <MusicCover image={item.image} name={item.name} type={item.media_type} small className='rounded-[16px]' />
                          <span className='min-w-0'>
                            <span className='block truncate text-sm font-semibold'>{item.name}</span>
                            <span className='block truncate text-xs text-[var(--ds-ink-muted)]'>{subtitle(item)}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className='grid grid-cols-5 gap-5'>
                      {recent.data!.items.map(item => (
                        <button
                          key={item.uri}
                          type='button'
                          onClick={() => open(item)}
                          onContextMenu={e => {
                            e.preventDefault();
                            more(item);
                          }}
                          className='flex h-[88px] min-w-0 items-center gap-4 overflow-hidden rounded-[20px] bg-[var(--ds-surface-2)] pr-4 text-left'
                        >
                          <MusicCover
                            image={item.image}
                            name={item.name}
                            type={item.media_type}
                            small
                            className={cn('w-[88px] rounded-none', item.media_type === 'artist' && 'ml-3 w-16 rounded-full')}
                          />
                          <span className='min-w-0'>
                            <span className='block truncate text-[19px] font-semibold'>{item.name}</span>
                            <span className='mt-[3px] block truncate text-[15px] text-[var(--ds-ink-muted)]'>{subtitle(item)}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              )}

              <section>
                <h3 className='mb-3.5 text-[22px] font-semibold phone:sr-only'>{t(`widgets.music.tabs.${tab}`)}</h3>
                {tab === 'track' ? (
                  <TrackList items={items} onPlay={item => play(item)} onMore={more} />
                ) : (
                  <ItemGrid items={items} onOpen={open} onMore={more} />
                )}
              </section>
            </>
          )}
        </>
      )}

      <MusicMiniPlayer entityId={player} />

      {actionItem && (
        <MusicActions
          item={actionItem}
          player={player}
          onPlay={play}
          onPlayerChange={setPlayer}
          onGroup={() => setScreen('speakers')}
          onClose={() => setActionItem(null)}
        />
      )}
      {sorting && (
        <SortSheet
          order={order}
          onPick={o => {
            setOrder(o);
            setSorting(false);
          }}
          onClose={() => setSorting(false)}
        />
      )}
      {picking && (
        <PlayerPicker current={player} onPick={setPlayer} onGroup={() => setScreen('speakers')} onClose={() => setPicking(false)} />
      )}
    </div>
  );
}

/** En-tête de la bibliothèque au téléphone : « Musique » et l'enceinte, puis la recherche. */
function PhoneLibraryHeader({
  draft,
  tab,
  playerName,
  onDraft,
  onClear,
  onPick,
}: {
  draft: string;
  tab: MassMediaType;
  playerName: string;
  onDraft: (value: string) => void;
  onClear: () => void;
  onPick: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className='flex shrink-0 flex-col gap-2'>
      <div className='flex h-11 items-center gap-2.5'>
        <h1 className='flex-1 text-[30px] font-bold'>{t('widgets.music.title')}</h1>
        <button
          type='button'
          onClick={onPick}
          aria-label={`${t('widgets.music.choosePlayer')} — ${playerName}`}
          title={playerName}
          className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-2)]'
        >
          <Speaker size={20} aria-hidden='true' />
        </button>
      </div>
      <label className='flex h-11 min-w-0 items-center gap-2.5 rounded-full bg-[var(--ds-surface-2)] pl-4 pr-1.5 focus-within:shadow-[inset_0_0_0_2px_var(--ds-tile-on)]'>
        <Search size={18} aria-hidden='true' className='shrink-0 text-[var(--ds-ink-muted)]' />
        <input
          type='search'
          value={draft}
          onChange={e => onDraft(e.target.value)}
          placeholder={t(`widgets.music.searchPlaceholder.${tab}`)}
          aria-label={t('widgets.music.search')}
          className='min-w-0 flex-1 bg-transparent text-base outline-none! placeholder:text-[var(--ds-ink-muted)] [&::-webkit-search-cancel-button]:hidden'
        />
        {draft && (
          <button
            type='button'
            onClick={onClear}
            aria-label={t('widgets.music.clearSearch')}
            className='flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--music-raised-2)]'
          >
            <X size={16} aria-hidden='true' />
          </button>
        )}
      </label>
    </div>
  );
}

/** « Trier par » (maquette « Bibliothèque — tri » du téléphone) : une feuille montée du bas. */
function SortSheet({ order, onPick, onClose }: { order: MassOrder; onPick: (order: MassOrder) => void; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <div className='fixed inset-0 z-[70] flex items-end bg-black/50' onClick={onClose}>
      <div
        role='dialog'
        aria-modal='true'
        aria-label={t('widgets.music.sortBy')}
        onClick={e => e.stopPropagation()}
        className='w-full rounded-t-[28px] bg-[var(--music-raised)] px-3 pb-[calc(env(safe-area-inset-bottom)+24px)] pt-2.5'
      >
        <span aria-hidden='true' className='mx-auto mb-3 block h-1 w-10 rounded-full bg-white/25' />
        <h2 className='mb-2 px-3 text-xl font-bold'>{t('widgets.music.sortBy')}</h2>
        {ORDERS.map(o => (
          <button
            key={o}
            type='button'
            onClick={() => onPick(o)}
            aria-pressed={order === o}
            className={cn(
              'flex h-14 w-full items-center rounded-[16px] px-3 text-left text-[17px] font-semibold',
              order === o && 'bg-[var(--music-raised-2)]'
            )}
          >
            <span className='flex-1'>{t(`widgets.music.order.${o}`)}</span>
            {order === o && <Check size={20} aria-hidden='true' className='text-[var(--music-highlight)]' />}
          </button>
        ))}
      </div>
    </div>
  );
}
