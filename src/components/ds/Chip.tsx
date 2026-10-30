import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Pastille : un compteur ou un état court (« 12 », « Allumées »).
 * Cliquable quand `onClick` est fourni, sinon simple étiquette.
 */
export function Chip({ icon: Icon, label, active, onClick }: { icon?: LucideIcon; label: string; active?: boolean; onClick?: () => void }) {
  const className = cn(
    'inline-flex h-11 items-center gap-2 rounded-[var(--ds-radius-pill)] px-5 text-[15px] font-semibold',
    active ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]'
  );
  const content = (
    <>
      {Icon && <Icon size={18} aria-hidden='true' />}
      {label}
    </>
  );
  return onClick ? (
    <button onClick={onClick} aria-pressed={active} className={className}>
      {content}
    </button>
  ) : (
    <span className={className}>{content}</span>
  );
}
