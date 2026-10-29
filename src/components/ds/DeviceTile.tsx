import type { LucideIcon } from 'lucide-react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tuile d'appareil : nom, état, icône. Un appui bascule l'appareil ; allumé,
 * verrouillé ou en marche, la tuile passe en `tile-on`. Le menu ⋮ ouvre le
 * réglage détaillé quand `onMore` est fourni.
 */
export function DeviceTile({
  name,
  state,
  icon: Icon,
  active,
  onToggle,
  onMore,
  moreLabel,
  className,
}: {
  name: string;
  state?: string;
  icon: LucideIcon;
  active: boolean;
  onToggle: () => void;
  onMore?: () => void;
  moreLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex h-full min-h-[120px] rounded-[var(--ds-radius-lg)] transition-colors',
        active ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-2)] text-[var(--ds-ink)]',
        className
      )}
    >
      <button
        onClick={onToggle}
        aria-pressed={active}
        className='flex flex-1 flex-col justify-between p-[var(--ds-space-4)] text-left active:scale-[0.98] transition-transform'
      >
        <span>
          <span className='block text-[17px] font-semibold leading-tight'>{name}</span>
          {state && (
            <span className={cn('block text-sm', active ? 'text-[var(--ds-tile-on-muted)]' : 'text-[var(--ds-ink-muted)]')}>{state}</span>
          )}
        </span>
        <Icon size={22} aria-hidden='true' fill={active ? 'currentColor' : 'none'} />
      </button>
      {onMore && moreLabel && (
        <button
          onClick={onMore}
          aria-label={moreLabel}
          title={moreLabel}
          className='absolute bottom-2 right-2 flex size-11 items-center justify-center rounded-full'
        >
          <MoreVertical size={18} />
        </button>
      )}
    </div>
  );
}
