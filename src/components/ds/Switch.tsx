import { cn } from '@/lib/utils';

/**
 * Interrupteur visuel : pastille blanche qui glisse sur une piste `tile-on`.
 * Purement décoratif — c'est l'élément qui le contient qui porte le rôle
 * `switch` et `aria-checked`, pour que toute la tuile réponde au doigt.
 */
export function SwitchTrack({ on, className }: { on: boolean; className?: string }) {
  return (
    <span
      aria-hidden='true'
      className={cn(
        'flex h-9 w-16 shrink-0 items-center rounded-[var(--ds-radius-pill)] p-1 transition-colors',
        on ? 'justify-end bg-[var(--ds-tile-on)]' : 'justify-start bg-[var(--ds-surface-3)]',
        className
      )}
    >
      <span className={cn('size-7 rounded-full transition-colors', on ? 'bg-white' : 'bg-[var(--ds-ink-muted)]')} />
    </span>
  );
}
