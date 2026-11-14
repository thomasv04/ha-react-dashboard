import { Heart, LoaderCircle, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { artistLine, itemSubtitle, type MassItem } from '@/lib/music-assistant';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { MusicCover } from './MusicCover';

/** Briques partagées par la bibliothèque, la recherche et les fiches de l'appli Musique. */

/** La grille des pochettes de la maquette : colonnes de 169 px à 1600 px, 24 px entre elles, 28 entre les rangées. */
const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-x-6 gap-y-7';
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
            className='flex min-w-0 flex-col gap-2.5 text-left'
          >
            <MusicCover image={item.image} name={item.name} type={item.media_type} favorite={item.favorite} />
            <span className={cn('min-w-0', isArtist && 'text-center')}>
              <span className='block truncate text-[18px] font-semibold'>{item.name}</span>
              {!isArtist && <span className='mt-0.5 block truncate text-[15px] text-[var(--ds-ink-muted)]'>{itemSubtitle(item, t)}</span>}
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
        <li key={item.uri} className='flex h-[73px] items-center gap-3.5 border-b border-[var(--music-line)]'>
          <button type='button' onClick={() => onPlay(item)} className='flex min-w-0 flex-1 items-center gap-4 text-left'>
            <MusicCover image={item.image} name={item.name} type='track' small className='w-14 rounded-[12px]' />
            <span className='min-w-0 flex-1'>
              <span className='block truncate text-[20px] font-semibold'>{item.name}</span>
              <span className='mt-0.5 block truncate text-[16px] text-[var(--ds-ink-muted)]'>{artistLine(item)}</span>
            </span>
          </button>
          {item.favorite && (
            <Heart
              size={22}
              aria-label={t('widgets.music.favorite')}
              className='shrink-0 fill-[var(--music-love)] text-[var(--music-love)]'
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
      className='flex size-[52px] shrink-0 items-center justify-center rounded-full text-[var(--ds-ink-muted)]'
    >
      <MoreHorizontal size={24} aria-hidden='true' />
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
          <div className='mt-3.5 grid grid-cols-5 gap-5'>
            {RECENT_CARDS.map(i => (
              <Bone key={i} className='h-[88px] rounded-[20px]' />
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
    <div className='flex flex-1 flex-col items-center justify-center pb-20 pt-[140px] text-center'>
      <span className='flex size-28 items-center justify-center rounded-full bg-[var(--ds-surface-2)]'>
        <Icon size={48} aria-hidden='true' />
      </span>
      <p className='mt-6 text-[32px] font-semibold'>{title}</p>
      {hint && <p className='mt-3 max-w-[560px] text-[20px] text-[var(--ds-ink-muted)]'>{hint}</p>}
      {children && <div className='mt-[30px] flex gap-4'>{children}</div>}
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
        'flex h-[60px] items-center gap-2.5 rounded-[30px] px-7 text-[20px] font-semibold',
        primary ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)]'
      )}
    >
      {Icon && <Icon size={22} aria-hidden='true' />}
      {children}
    </button>
  );
}
