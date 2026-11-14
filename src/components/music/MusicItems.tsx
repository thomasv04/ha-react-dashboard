import { Heart, Music, RefreshCw } from 'lucide-react';
import { artistLine, itemSubtitle, type MassItem } from '@/lib/music-assistant';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { MusicCover } from './MusicCover';

/** Briques partagées par la bibliothèque et la recherche de l'appli Musique. */

const SKELETONS = Array.from({ length: 16 }, (_, i) => i);
const GRID = 'grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))]';

/** Pastille d'un groupe de choix (onglets, tri, filtres) : active = remplie. */
export function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
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

/** Pochettes en grille ; les artistes en rond, sans sous-titre. */
export function ItemGrid({ items, onOpen }: { items: MassItem[]; onOpen: (item: MassItem) => void }) {
  const { t } = useI18n();
  return (
    <div className={cn(GRID, 'gap-x-5 gap-y-6')}>
      {items.map(item => {
        const isArtist = item.media_type === 'artist';
        return (
          <button key={item.uri} type='button' onClick={() => onOpen(item)} className='flex min-w-0 flex-col gap-2 text-left'>
            <MusicCover image={item.image} name={item.name} type={item.media_type} favorite={item.favorite} />
            <span className={cn('min-w-0', isArtist && 'text-center')}>
              <span className='block truncate text-[15px] font-semibold'>{item.name}</span>
              {!isArtist && <span className='block truncate text-xs text-[var(--ds-ink-muted)]'>{itemSubtitle(item, t)}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Titres sur deux colonnes : vignette, nom, artistes, cœur s'il est en favori. */
export function TrackList({ items, onPlay }: { items: MassItem[]; onPlay: (item: MassItem) => void }) {
  const { t } = useI18n();
  return (
    <ul className='grid gap-x-8 sm:grid-cols-2'>
      {items.map(item => (
        <li key={item.uri} className='border-b border-[var(--ds-surface-2)]'>
          <button type='button' onClick={() => onPlay(item)} className='flex min-h-14 w-full items-center gap-3 py-1.5 text-left'>
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
  );
}

export function GridSkeleton() {
  const { t } = useI18n();
  return (
    <div className={cn(GRID, 'gap-5')} aria-busy='true' aria-label={t('common.loading')}>
      {SKELETONS.map(i => (
        <span key={i} className='aspect-square animate-pulse rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)]' />
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, onRefresh }: { title: string; hint?: string; onRefresh?: () => void }) {
  const { t } = useI18n();
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
          {t('widgets.music.refresh')}
        </button>
      )}
    </div>
  );
}
