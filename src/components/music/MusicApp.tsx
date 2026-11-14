import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, Grip, Heart, Music, RefreshCw, Search, Speaker, TriangleAlert, X } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useMoreInfoOptional } from '@/context/MoreInfoContext';
import { useNow } from '@/hooks/useNow';
import { useFormats } from '@/hooks/useFormats';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
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
export default function MusicApp({ entityId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const helpers = useHass(s => s.helpers);
  const { formatTime } = useFormats();
  const moreInfo = useMoreInfoOptional();
  const clock = useNow();
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
  // L'écran des enceintes et du groupe, par-dessus la bibliothèque.
  const [speakers, setSpeakers] = useState(false);

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
  // Un écran secondaire (fiche, enceintes) : retour à gauche, ni recherche ni enceinte dans l'en-tête.
  const sub = speakers || !!detail;
  // Une fiche s'ouvre en haut, pas au défilement de la grille qu'on quitte.
  const rootRef = useRef<HTMLDivElement>(null);
  // Accolades : scrollIntoView peut renvoyer une promesse, que React prendrait pour un nettoyage.
  useEffect(() => {
    rootRef.current?.scrollIntoView?.({ block: 'start' });
  }, [detail, speakers]);

  const showRecent = !favorite && !query;
  const recent = useMassLibrary(showRecent ? entryId : null, { mediaType: tab, orderBy: 'last_played_desc', limit: 5 });
  const library = useMassLibrary(entryId, { mediaType: tab, orderBy: order, favorite, search: query });
  const items = library.data?.items ?? [];
  const error = entryError ?? library.error;
  const loading = !error && (!library.data || library.loading);

  const play = (item: MassItem, enqueue: MassEnqueue = 'play', target = player) => massPlay(helpers, target, item, enqueue);
  const open = (item: MassItem) => (BROWSABLE.has(item.media_type) ? setStack(s => [...s, item]) : play(item));
  const more = setActionItem;
  const back = speakers
    ? t('widgets.music.speakers')
    : (stack.at(-2)?.name ?? (global ? t('widgets.music.searchResults') : t(`widgets.music.tabs.${tab}`)));
  const subtitle = (item: MassItem) => itemSubtitle(item, t);

  return (
    <div
      ref={rootRef}
      // Couleurs de la maquette absentes des jetons, posées une fois pour l'appli et ses fenêtres :
      // surface surélevée (fenêtres, mini-lecteur), bouton posé dessus, bleu clair du titre en cours,
      // reflet des squelettes, filet des listes, rose des favoris et du direct, et le gris de l'heure
      // (ink-muted à 80 %, #8b95a5). Le bas laisse la place au mini-lecteur.
      className='-mt-4 flex min-h-full flex-col bg-[var(--ds-ground)] px-10 pb-[150px] pt-8 leading-[normal] text-[var(--ds-ink)] [--music-dim:color-mix(in_srgb,var(--ds-ink-muted)_80%,var(--ds-ground))] [--music-highlight-soft:rgba(143,184,245,0.14)] [--music-highlight:#8fb8f5] [--music-line:#1a212b] [--music-love:#ff7b93] [--music-track:#1e3354] [--music-raised-2:#3a4352] [--music-raised:#2a3240] [--music-shine:#2c3544]'
      data-testid='music-app'
    >
      {/* En-tête de la maquette : le carré du lanceur (il ferme l'appli) et le titre ; la recherche,
          l'enceinte et l'heure à droite. */}
      <header className='flex h-[60px] shrink-0 items-center gap-5'>
        {sub ? (
          <button
            type='button'
            onClick={() => (speakers ? setSpeakers(false) : setStack(s => s.slice(0, -1)))}
            aria-label={`${t('widgets.music.back')} — ${back}`}
            className='flex items-center gap-5 text-[24px] font-semibold text-[var(--ds-ink-muted)]'
          >
            <span className='flex size-[60px] items-center justify-center rounded-[18px] bg-[var(--ds-surface-2)] text-[var(--ds-ink)]'>
              <ChevronLeft size={26} aria-hidden='true' />
            </span>
            {back}
          </button>
        ) : global ? (
          <button
            type='button'
            onClick={() => setGlobal(false)}
            aria-label={t('widgets.music.closeSearch')}
            className='flex size-[60px] shrink-0 items-center justify-center rounded-[18px] bg-[var(--ds-surface-2)]'
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
              'flex h-[60px] min-w-0 items-center gap-3.5 rounded-[30px] bg-[var(--ds-surface-2)] pl-[22px] pr-2.5',
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
              className='min-w-0 flex-1 bg-transparent text-[19px] outline-none placeholder:text-[var(--ds-ink-muted)] [&::-webkit-search-cancel-button]:hidden'
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
        <time className={cn('shrink-0 text-[38px] font-medium text-[var(--music-dim)]', sub && 'ml-auto')}>{formatTime(clock)}</time>
      </header>

      {speakers ? (
        <MusicSpeakers player={player} onDone={() => setSpeakers(false)} />
      ) : detail ? (
        <MusicDetail key={detail.uri} entityId={player} item={detail} onOpen={item => setStack(s => [...s, item])} onMore={more} />
      ) : global ? (
        <MusicSearch entryId={entryId} query={query} onOpen={open} onPlay={item => play(item)} onMore={more} />
      ) : (
        <>
          <div className='mb-8 mt-6 flex flex-wrap items-center justify-between gap-4'>
            <div role='group' aria-label={t('widgets.music.typesLabel')} className='flex gap-1 rounded-[32px] bg-[var(--ds-surface-2)] p-1'>
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
                <section className='mb-[30px]'>
                  <h3 className='mb-3.5 text-[22px] font-semibold'>{t('widgets.music.recent')}</h3>
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
                </section>
              )}

              <section>
                <h3 className='mb-3.5 text-[22px] font-semibold'>{t(`widgets.music.tabs.${tab}`)}</h3>
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
          onGroup={() => setSpeakers(true)}
          onClose={() => setActionItem(null)}
        />
      )}
      {picking && <PlayerPicker current={player} onPick={setPlayer} onGroup={() => setSpeakers(true)} onClose={() => setPicking(false)} />}
    </div>
  );
}
