import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlaceholderTone = 'empty' | 'error' | 'loading';

/** Teinte RVB par ton — sert au halo, à la tuile et au texte. */
const TONE_RGB: Record<PlaceholderTone, string> = {
  empty: '255,255,255',
  error: '248,113,113',
  loading: '255,255,255',
};

interface CardPlaceholderProps {
  icon: LucideIcon;
  text: string;
  tone?: PlaceholderTone;
  /** Sous-titre optionnel : ce que l'utilisateur peut faire pour remplir la card. */
  hint?: string;
  /** Card écrasée : on ne garde que le texte, la tuile ne rentre plus. */
  compact?: boolean;
}

/**
 * État vide partagé par toutes les cards liste/agenda/entité manquante.
 * Une tuile de verre avec l'icône du widget en filigrane, sur un halo radial —
 * même vocabulaire que les tuiles d'icône des cards remplies, pour qu'un vide
 * ressemble à une card en attente et non à une card cassée.
 */
export function CardPlaceholder({ icon: Icon, text, tone = 'empty', hint, compact = false }: CardPlaceholderProps) {
  const rgb = TONE_RGB[tone];

  if (compact) {
    return (
      <div className='h-full flex items-center justify-center gap-2 px-2'>
        <Icon size={13} style={{ color: `rgba(${rgb},0.3)` }} className={cn('shrink-0', tone === 'loading' && 'animate-pulse')} />
        <span className='text-xs truncate' style={{ color: `rgba(${rgb},0.35)` }}>
          {text}
        </span>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col items-center justify-center gap-2.5 px-3 text-center'>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className='relative w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0'
        style={{
          background: `rgba(${rgb},0.05)`,
          borderColor: `rgba(${rgb},0.10)`,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 24px -6px rgba(${rgb},0.35)`,
        }}
      >
        {/* Halo radial — donne au vide la même profondeur que les cards pleines */}
        <span
          aria-hidden
          className='absolute -inset-4 rounded-full pointer-events-none'
          style={{ background: `radial-gradient(circle, rgba(${rgb},0.10) 0%, transparent 70%)` }}
        />
        <Icon
          size={19}
          strokeWidth={1.6}
          className={cn('relative', tone === 'loading' && 'animate-pulse')}
          style={{ color: `rgba(${rgb},0.4)` }}
        />
      </motion.div>

      <div className='flex flex-col gap-0.5 min-w-0'>
        <span className='text-sm font-medium leading-tight' style={{ color: `rgba(${rgb},0.45)` }}>
          {text}
        </span>
        {hint && <span className='text-[10px] leading-tight text-white/25'>{hint}</span>}
      </div>
    </div>
  );
}
