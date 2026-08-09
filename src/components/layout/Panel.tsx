import { AnimatePresence, motion } from 'framer-motion';
import { bottomSheet, modalScrim } from '@/lib/motion-variants';
import { X } from 'lucide-react';
import { useEffect, useRef, useCallback } from 'react';
import { usePanel } from '@/context/PanelContext';
import type { ReactNode } from 'react';

interface PanelProps {
  children: ReactNode;
  title: string;
  icon?: ReactNode;
  wide?: boolean;
}

export function Panel({ children, title, icon, wide = false }: PanelProps) {
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
      className={`w-full gc rounded-3xl overflow-hidden flex flex-col max-h-[85vh] ${wide ? 'max-w-4xl' : 'max-w-2xl'}`}
    >
      {/* Header */}
      <div className='flex items-center justify-between px-6 py-4 border-b border-white/8'>
        <div className='flex items-center gap-3 text-white'>
          {icon && <span className='text-white/70'>{icon}</span>}
          <h2 className='text-lg font-semibold'>{title}</h2>
        </div>
        <div className='flex items-center gap-2'>
          {/* Auto-close progress bar */}
          {autoCloseMs && (
            <div className='w-16 h-1 bg-white/10 rounded-full overflow-hidden'>
              <motion.div
                key={autoCloseMs}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: autoCloseMs / 1000, ease: 'linear' }}
                className='h-full bg-white/40 rounded-full'
              />
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={closePanel}
            aria-label='Fermer'
            // `touch-target` : la pastille reste à 32 px visuellement, mais sa
            // zone de contact monte à 44 px — elle est isolée, aucun risque de
            // chevauchement avec un contrôle voisin.
            className='touch-target w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors'
          >
            <X size={16} />
          </motion.button>
        </div>
      </div>

      {/* Content */}
      <div className={`overflow-y-auto p-4 flex flex-col gap-3 ${wide ? 'flex-1 min-h-0' : ''}`}>{children}</div>
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
            className='fixed inset-0 z-40 bg-black/45 backdrop-blur-sm'
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
