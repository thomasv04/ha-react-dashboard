import { AnimatePresence, motion } from 'framer-motion';
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
      initial={{ opacity: 0, y: 40, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 40, scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
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
            className='w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors'
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 z-40 bg-black/60 backdrop-blur-sm'
          />
          {/* Wrapper — clicking here (outside panel card) closes it */}
          <div className='fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pb-24 sm:pb-4' onClick={closePanel}>
            {children}
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
