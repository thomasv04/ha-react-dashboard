import { Heart, LoaderCircle, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { artistLine, itemSubtitle, type MassItem } from '@/lib/music-assistant';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { MusicCover } from './MusicCover';

/** Briques partagées par la bibliothèque, la recherche et les fiches de l'appli Musique. */

/**
 * La grille des pochettes de la maquette : colonnes de 169 px à 1600 px, 24 px entre elles, 28 entre
 * les rangées. Au téléphone, deux colonnes, 12 et 14 px.
 */
const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-6 gap-y-7 max-sm:grid-cols-2 max-sm:gap-x-3 max-sm:gap-y-3.5';
const GRID_CARDS = Array.from({ length: 16 }, (_, i) => i);
const RECENT_CARDS = Array.from({ length: 5 }, (_, i) => i);
const ROWS = Array.from({ length: 8 }, (_, i) => i);

/** Pastille d'un groupe de choix (onglets, tri, filtres) : active = remplie. */
export function Pill({
  active,
  soft,
  onClick,
  children,
}: {
  active: boolean;
  /** Choix secondaire (tri) : l'actif s'éclaircit au lieu de passer au bleu. */
  soft?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-12 shrink-0 rounded-[24px] font-semibold',
        soft ? 'px-5 text-[17px]' : 'px-[26px] text-[19px]',
        !active
          ? 'text-[var(--ds-ink-muted)]'
          : soft
            ? 'bg-[var(--music-raised-2)] text-[var(--ds-ink)]'
            : 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]'
      )}
    >
      {children}
    </button>
  );
}

/**
 * Pochettes en grille ; un appui long ouvre les actions. Un appui long tactile
 * déclenche `contextmenu` dans Chrome : pas de minuterie, ni de clic parasite.
 */
export function ItemGrid({
  items,
  onOpen,
  onMore,
}: {
  items: MassItem[];
  onOpen: (item: MassItem) => void;
  onMore?: (item: MassItem) => void;
}) {
  const { t } = useI18n();
  return (
    <div className={GRID}>
      {items.map(item => {
        const isArtist = item.media_type === 'artist';
        return (
          <button
            key={item.uri}
            type='button'
            onClick={() => onOpen(item)}
            onContextMenu={
              onMore &&
              (e => {
                e.preventDefault();
                onMore(item);
              })
            }
            className='flex min-w-0 flex-col gap-2.5 text-left max-sm:gap-2'
          >
            <MusicCover image={item.image} name={item.name} type={item.media_type} favorite={item.favorite} />
            <span className={cn('min-w-0', isArtist && 'text-center')}>
              <span className='block truncate text-[18px] font-semibold max-sm:text-[15px]'>{item.name}</span>
              {!isArtist && (
                <span className='mt-0.5 block truncate text-[15px] text-[var(--ds-ink-muted)] max-sm:mt-0 max-sm:text-[13px]'>
                  {itemSubtitle(item, t)}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Titres sur deux colonnes (maquette « Bibliothèque — titres ») : vignette, nom, artistes, cœur s'il est en favori. */
export function TrackList({
  items,
  onPlay,
  onMore,
}: {
  items: MassItem[];
  onPlay: (item: MassItem) => void;
  onMore?: (item: MassItem) => void;
}) {
  const { t } = useI18n();
  return (
    <ul className='grid gap-x-12 sm:grid-cols-2'>
      {items.map(item => (
        <li
          key={item.uri}
          className='flex h-[73px] items-center gap-3.5 border-b border-[var(--music-line)] max-sm:h-[60px] max-sm:gap-1 max-sm:border-0'
        >
          <button type='button' onClick={() => onPlay(item)} className='flex min-w-0 flex-1 items-center gap-4 text-left max-sm:gap-3'>
            <MusicCover
              image={item.image}
              name={item.name}
              type='track'
              small
              className='w-14 rounded-[12px] max-sm:w-11 max-sm:rounded-[10px]'
            />
            <span className='min-w-0 flex-1'>
              <span className='block truncate text-[20px] font-semibold max-sm:text-base'>{item.name}</span>
              <span className='mt-0.5 block truncate text-[16px] text-[var(--ds-ink-muted)] max-sm:mt-0 max-sm:text-[13px]'>
                {artistLine(item)}
              </span>
            </span>
          </button>
          {item.favorite && (
            <Heart
              size={22}
              aria-label={t('widgets.music.favorite')}
              className='shrink-0 fill-[var(--music-love)] text-[var(--music-love)] max-sm:size-[18px]'
            />
          )}
          {onMore && <MoreButton label={item.name} onClick={() => onMore(item)} />}
        </li>
      ))}
    </ul>
  );
}

/** Le « ⋯ » d'une ligne : les actions de cet élément. */
export function MoreButton({ label, onClick }: { label: string; onClick: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={`${t('widgets.music.more')} — ${label}`}
      className='flex size-[52px] shrink-0 items-center justify-center rounded-full text-[var(--ds-ink-muted)] max-sm:size-10'
    >
      <MoreHorizontal size={24} aria-hidden='true' className='max-sm:size-5' />
    </button>
  );
}

/** Un bloc de squelette, avec le reflet qui passe (`.music-shine`, index.css). */
function Bone({ className }: { className: string }) {
  return <span aria-hidden='true' className={cn('music-shine block', className)} />;
}

/** « Chargement de la bibliothèque… » et son anneau, à côté d'un titre de section. */
function LoadingLabel() {
  const { t } = useI18n();
  return (
    <span className='flex items-center gap-2.5 text-[17px] text-[var(--ds-ink-muted)]'>
      <LoaderCircle size={22} strokeWidth={2.5} aria-hidden='true' className='animate-spin text-[var(--music-highlight)]' />
      {t('widgets.music.loadingLibrary')}
    </span>
  );
}

/**
 * La bibliothèque en chargement, section par section, comme la maquette
 * « Bibliothèque — chargement » : la rangée récente, puis la grille de
 * pochettes (ou la liste, pour les titres).
 */
export function LibrarySkeleton({ recent, tracks }: { recent?: boolean; tracks?: boolean }) {
  const { t } = useI18n();
  return (
    <div role='status' aria-busy='true' aria-label={t('widgets.music.loadingLibrary')}>
      {recent && (
        <div className='mb-[30px]'>
          <Bone className='h-[26px] w-[210px] rounded-[8px]' />
          <div className='mt-3.5 grid grid-cols-5 gap-5 max-sm:-mr-4 max-sm:flex max-sm:gap-3 max-sm:overflow-hidden'>
            {RECENT_CARDS.map(i => (
              <Bone key={i} className='h-[88px] rounded-[20px] max-sm:h-[104px] max-sm:w-[104px] max-sm:shrink-0 max-sm:rounded-[16px]' />
            ))}
          </div>
        </div>
      )}
      <div className='mb-3.5 flex items-center gap-4'>
        <Bone className='h-[26px] w-[110px] rounded-[8px]' />
        <LoadingLabel />
      </div>
      {tracks ? (
        <div className='grid gap-x-12 sm:grid-cols-2'>
          {ROWS.map(i => (
            <span key={i} className='flex h-[73px] items-center gap-4 border-b border-[var(--music-line)]'>
              <Bone className='size-14 shrink-0 rounded-[12px]' />
              <span className='flex flex-1 flex-col gap-2.5'>
                <Bone className='h-4 w-[45%] rounded-[8px]' />
                <Bone className='h-[13px] w-[28%] rounded-[7px]' />
              </span>
            </span>
          ))}
        </div>
      ) : (
        <div className={GRID}>
          {GRID_CARDS.map(i => (
            <span key={i} className='flex flex-col gap-2.5'>
              <Bone className='aspect-square rounded-[18px]' />
              <Bone className='h-4 w-[78%] rounded-[8px]' />
              <Bone className='h-[13px] w-[52%] rounded-[7px]' />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** Les titres d'une fiche en chargement : lignes de 76 px, numéro et nom. */
export function RowsSkeleton() {
  const { t } = useI18n();
  return (
    <div role='status' aria-busy='true' aria-label={t('common.loading')}>
      <div className='flex h-10 items-center'>
        <span className='w-16' />
        <LoadingLabel />
      </div>
      {ROWS.map(i => (
        <span key={i} className='flex h-[76px] items-center'>
          <span className='flex w-16 justify-center'>
            <Bone className='h-4 w-4 rounded-[6px]' />
          </span>
          <Bone className='h-[18px] w-[42%] rounded-[8px]' />
        </span>
      ))}
    </div>
  );
}

/**
 * État vide ou sans résultat (maquettes « Bibliothèque — vide » et « aucun
 * résultat ») : pastille de 112 px, titre, explication, puis les actions.
 */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  children,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className='flex flex-1 flex-col items-center justify-center pb-20 pt-[140px] text-center max-sm:px-2 max-sm:pb-8 max-sm:pt-12'>
      <span className='flex size-28 items-center justify-center rounded-full bg-[var(--ds-surface-2)] max-sm:size-[88px]'>
        <Icon size={48} aria-hidden='true' className='max-sm:size-9' />
      </span>
      <p className='mt-6 text-[32px] font-semibold max-sm:mt-5 max-sm:text-[22px] max-sm:font-bold'>{title}</p>
      {hint && <p className='mt-3 max-w-[560px] text-[20px] text-[var(--ds-ink-muted)] max-sm:mt-2 max-sm:text-[15px]'>{hint}</p>}
      {children && <div className='mt-[30px] flex gap-4 max-sm:mt-6 max-sm:w-full max-sm:flex-col max-sm:gap-3'>{children}</div>}
    </div>
  );
}

/** Bouton d'un état vide : 60 px, plein (action principale) ou discret. */
export function EmptyAction({
  icon: Icon,
  primary,
  onClick,
  children,
}: {
  icon?: LucideIcon;
  primary?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      className={cn(
        'flex h-[60px] items-center gap-2.5 rounded-[30px] px-7 text-[20px] font-semibold max-sm:h-[52px] max-sm:justify-center max-sm:px-5 max-sm:text-base',
        primary ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)]'
      )}
    >
      {Icon && <Icon size={22} aria-hidden='true' />}
      {children}
    </button>
  );
}
