import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { registerSheet } from '@/lib/sheet-open';

/**
 * Feuille superposée sur le côté droit : le réglage détaillé d'un appareil
 * (lumière, thermostat…) sans quitter l'écran. Échap et un appui hors de la
 * feuille la referment. Rendue dans `document.body`, comme les autres
 * superpositions des cards : une case de la grille la rognerait.
 *
 * Sur un téléphone (maquette « Assist »), elle prend tout l'écran sur le fond
 * de l'appli, fermeture à gauche ; ses sections passent au gris des cards.
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
  // Les toasts se rangent à gauche tant que la feuille est ouverte.
  useEffect(() => (open ? registerSheet() : undefined), [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
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
            className='fixed z-[61] right-4 top-4 bottom-4 w-[min(440px,calc(100vw-32px))] overflow-y-auto rounded-[var(--ds-radius-2xl)] bg-[var(--ds-sheet)] p-[26px] text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)] flex flex-col gap-4 max-sm:inset-0 max-sm:w-full max-sm:rounded-none max-sm:bg-[var(--ds-ground)] max-sm:px-4 max-sm:pb-[calc(env(safe-area-inset-bottom)+16px)] max-sm:pt-[calc(env(safe-area-inset-top)+16px)] max-sm:[--ds-sheet-section:var(--ds-surface-2)]'
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: DURATION_FAST }}
          >
            <header className='flex items-start max-sm:items-center'>
              <div className='flex-1 text-center pl-11 max-sm:pl-0 max-sm:pr-11'>
                <h2 className='text-[22px] font-bold max-sm:text-xl'>{title}</h2>
                {subtitle && <p className='text-[15px] font-semibold text-[var(--ds-ink-muted)] max-sm:hidden'>{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                aria-label={closeLabel}
                title={closeLabel}
                className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)] max-sm:order-first max-sm:bg-[var(--ds-surface-2)]'
              >
                <X size={18} />
              </button>
            </header>
            {children}
          </motion.section>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
