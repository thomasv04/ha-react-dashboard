import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tuile d'appareil : nom, état, icône. Un appui bascule l'appareil ; allumé,
 * verrouillé ou en marche, la tuile passe en `tile-on`. Le menu ⋮ ouvre le
 * réglage détaillé quand `onMore` est fourni ; `children` porte les réglages
 * secondaires (vitesse, oscillation…) sous la zone d'appui.
 *
 * `layout="row"` : icône à gauche, texte à droite — pour une case d'une seule
 * rangée, où l'empilement déborderait.
 */
export function DeviceTile({
  name,
  state,
  icon: Icon,
  active,
  onToggle,
  onMore,
  moreLabel,
  layout = 'stack',
  children,
  className,
}: {
  name: string;
  state?: string;
  icon: LucideIcon;
  active: boolean;
  onToggle: () => void;
  onMore?: () => void;
  moreLabel?: string;
  layout?: 'stack' | 'row';
  children?: ReactNode;
  className?: string;
}) {
  const row = layout === 'row';
  return (
    <div
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-[var(--ds-radius-lg)] transition-colors select-none',
        active ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-2)] text-[var(--ds-ink)]',
        className
      )}
    >
      <button
        onClick={onToggle}
        aria-pressed={active}
        className={cn(
          'flex min-h-0 flex-1 text-left transition-transform active:scale-[0.98]',
          row ? 'flex-row-reverse items-center justify-end gap-3 px-4' : 'flex-col justify-between p-[var(--ds-space-4)]'
        )}
      >
        <span className='min-w-0'>
          <span className='block truncate text-[17px] font-semibold leading-tight'>{name}</span>
          {state && (
            <span className={cn('block truncate text-sm', active ? 'text-[var(--ds-tile-on-muted)]' : 'text-[var(--ds-ink-muted)]')}>
              {state}
            </span>
          )}
        </span>
        <Icon size={22} aria-hidden='true' className='shrink-0' />
      </button>
      {children && <div className='flex shrink-0 flex-col gap-2 px-[var(--ds-space-4)] pb-[var(--ds-space-4)]'>{children}</div>}
      {onMore && moreLabel && (
        <button
          onClick={onMore}
          aria-label={moreLabel}
          title={moreLabel}
          className='absolute right-1 top-1 flex size-11 items-center justify-center rounded-full'
        >
          <MoreVertical size={18} />
        </button>
      )}
    </div>
  );
}
