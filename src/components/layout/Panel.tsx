import { AnimatePresence, motion } from 'framer-motion';
import { bottomSheet, modalScrim } from '@/lib/motion-variants';
import { X } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';
import { usePanel } from '@/context/PanelContext';
import type { ReactNode } from 'react';
import { useI18n } from '@/i18n';

interface PanelProps {
  children: ReactNode;
  title: string;
  icon?: ReactNode;
  wide?: boolean;
  /** Boutons de l'en-tête, posés avant la fermeture. */
  actions?: ReactNode;
}

export function Panel({ children, title, icon, wide = false, actions }: PanelProps) {
  const { t } = useI18n();
  const { closePanel, autoCloseMs } = usePanel();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (!autoCloseMs) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(closePanel, autoCloseMs);
  }, [autoCloseMs, closePanel]);

  // Start timer when panel mounts (or autoCloseMs changes)
  useEffect(() => {
    resetTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  return (
    <motion.div
      variants={bottomSheet}
      initial='hidden'
      animate='visible'
      exit='exit'
      onClick={e => {
        e.stopPropagation();
        resetTimer();
      }}
      className={`flex max-h-[85vh] w-full flex-col overflow-hidden rounded-[var(--ds-radius-2xl)] bg-[var(--ds-sheet)] text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)] ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}
    >
      {/* Header */}
      <div className='flex items-center justify-between gap-3 px-6 pb-3 pt-6'>
        <div className='flex min-w-0 items-center gap-3'>
          {icon && <span className='shrink-0 text-[var(--ds-ink-muted)]'>{icon}</span>}
          <h2 className='truncate text-[22px] font-bold'>{title}</h2>
        </div>
        <div className='flex items-center gap-2'>
          {actions}
          {/* Auto-close progress bar */}
          {autoCloseMs && (
            <div className='h-1.5 w-16 overflow-hidden rounded-full bg-[var(--ds-surface-3)]'>
              <motion.div
                key={autoCloseMs}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: autoCloseMs / 1000, ease: 'linear' }}
                className='h-full rounded-full bg-[var(--ds-ink-muted)]'
              />
            </div>
          )}
          <button
            onClick={closePanel}
            aria-label={t('common.close')}
            title={t('common.close')}
            className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className={`flex flex-col gap-3 overflow-y-auto px-6 pb-6 pt-1 ${wide ? 'min-h-0 flex-1' : ''}`}>{children}</div>
    </motion.div>
  );
}

export function PanelOverlay({ children }: { children: ReactNode }) {
  const { activePanel, closePanel } = usePanel();

  return (
    <AnimatePresence>
      {activePanel !== null && (
        <>
          {/* Backdrop — visual only */}
          <motion.div
            key='backdrop'
            variants={modalScrim}
            initial='hidden'
            animate='visible'
            exit='exit'
            className='fixed inset-0 z-40 bg-black/50'
          />
          {/* Wrapper — clicking here (outside panel card) closes it.
              `pb-28` à toutes les tailles : le dock flotte au-dessus de cette
              couche (cf. son z-index), la feuille ne doit donc jamais passer
              dessous — sinon le dock masquerait le bas du panneau. */}
          <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pb-28' onClick={closePanel}>
            {/* Clé sur le panneau actif : passer d'un panneau à l'autre depuis
                le dock joue la sortie puis l'entrée au lieu d'échanger le
                contenu d'un coup. `mode='wait'` séquence les deux. */}
            <AnimatePresence mode='wait' initial={false}>
              <motion.div key={activePanel} className='contents'>
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
