import type { CSSProperties, ReactNode } from 'react';
import { Trash2, X, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

/**
 * Ce qu'on pose ou dessine sur la maquette — pastilles, pièces, portes et
 * volets, câbles — partage sa fenêtre, sa grille de sortes et sa liste.
 */

/** Fenêtre de ce qu'on pose ou vient de dessiner : son titre, de quoi l'abandonner, ses réglages. */
export function DraftPopover({
  title,
  style,
  onCancel,
  children,
}: {
  title: string;
  /** Où l'ouvrir, sur le plan. */
  style: CSSProperties;
  onCancel: () => void;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div
      role='dialog'
      aria-label={title}
      onClick={e => e.stopPropagation()}
      className='absolute z-40 w-64 p-2 rounded-xl gc-overlay cursor-default flex flex-col gap-2'
      style={style}
    >
      <div className='flex items-center justify-between px-1'>
        <span className='text-[11px] text-white/50'>{title}</span>
        <button onClick={onCancel} aria-label={t('common.cancel')} className='p-0.5 rounded text-white/40 hover:text-white'>
          <X size={12} />
        </button>
      </div>
      {children}
    </div>
  );
}

/** Les sortes d'un élément, en boutons : celle qu'on a devinée, qu'on peut changer. */
export function KindGrid<K extends string>({
  kinds,
  value,
  onChange,
  icons,
  colors,
  label,
}: {
  kinds: readonly K[];
  value: K;
  onChange: (kind: K) => void;
  icons: Record<K, LucideIcon>;
  colors?: Record<K, string>;
  label: (kind: K) => string;
}) {
  return (
    <div className='grid grid-cols-4 gap-1'>
      {kinds.map(kind => {
        const Icon: LucideIcon = icons[kind];
        return (
          <button
            key={kind}
            onClick={() => onChange(kind)}
            aria-pressed={value === kind}
            className={cn(
              'flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] border transition-colors',
              value === kind ? 'bg-white/12 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
            )}
          >
            <Icon size={14} style={colors ? { color: colors[kind] } : undefined} />
            {label(kind)}
          </button>
        );
      })}
    </div>
  );
}

/** Ce qu'on a dessiné sur la maquette, pour le retirer. */
export function DrawnList({
  title,
  removeLabel,
  items,
  onRemove,
}: {
  title: string;
  removeLabel: string;
  items: { id: string; label: string; icon: LucideIcon; color?: string }[];
  onRemove: (id: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className='flex flex-col gap-1'>
      <span className='text-[11px] text-white/40 px-0.5'>{title}</span>
      {items.map(({ id, label, icon: Icon, color }) => (
        <div key={id} className='flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 text-xs text-white/70'>
          <Icon size={13} className={cn('shrink-0', !color && 'text-white/40')} style={color ? { color } : undefined} />
          <span className='flex-1 truncate'>{label}</span>
          <button onClick={() => onRemove(id)} title={removeLabel} aria-label={removeLabel} className='text-red-400/70 hover:text-red-400'>
            <Trash2 size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}
