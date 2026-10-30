import { cn } from '@/lib/utils';

/**
 * Les contrôles que toutes les sections des réglages partagent — pour qu'un
 * champ ait le même dessin d'un bout à l'autre : champ de saisie, boutons, et
 * rangée de choix exclusifs.
 */

/** Champ de saisie ou liste déroulante. */
export const INPUT =
  'h-12 w-full rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-4 text-base text-[var(--ds-ink)] outline-none placeholder:text-[var(--ds-ink-muted)] focus:outline-2 focus:outline-[var(--ds-accent)]';

const BUTTON =
  'flex h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-semibold disabled:opacity-40 disabled:pointer-events-none';
export const BUTTON_PRIMARY = cn(BUTTON, 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]');
export const BUTTON_SECONDARY = cn(BUTTON, 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]');

/** Rangée de choix exclusifs : une piste arrondie, la pastille choisie en bleu. */
export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label?: string;
  className?: string;
}) {
  return (
    <div role='radiogroup' aria-label={label} className={cn('flex gap-1 rounded-full bg-[var(--ds-surface-3)] p-1', className)}>
      {options.map(o => (
        <button
          key={String(o.value)}
          role='radio'
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'h-11 flex-1 rounded-full px-3 text-[15px] font-semibold transition-colors',
            value === o.value ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'text-[var(--ds-ink-muted)]'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
