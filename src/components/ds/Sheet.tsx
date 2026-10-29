import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { DURATION_FAST } from '@/lib/motion-tokens';

/**
 * Feuille superposée sur le côté droit : le réglage détaillé d'un appareil
 * (lumière, thermostat…) sans quitter l'écran. Échap et un appui hors de la
 * feuille la referment.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  closeLabel,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  closeLabel: string;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key='sheet-backdrop'
            data-overlay
            className='fixed inset-0 z-[60] bg-black/40'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.section
            key='sheet'
            role='dialog'
            aria-modal='true'
            aria-label={title}
            className='fixed z-[61] right-4 top-4 bottom-4 w-[min(440px,calc(100vw-32px))] overflow-y-auto rounded-[var(--ds-radius-2xl)] bg-[var(--ds-sheet)] p-[26px] text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)] flex flex-col gap-4'
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: DURATION_FAST }}
          >
            <header className='flex items-start'>
              <div className='flex-1 text-center pl-11'>
                <h2 className='text-[22px] font-bold'>{title}</h2>
                {subtitle && <p className='text-[15px] font-semibold text-[var(--ds-ink-muted)]'>{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label={closeLabel}
                title={closeLabel}
                className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
              >
                <X size={18} />
              </button>
            </header>
            {children}
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
