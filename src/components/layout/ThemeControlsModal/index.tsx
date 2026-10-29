import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { SettingsContent } from './SettingsContent';
import { START_TOUR_EVENT } from '@/components/onboarding/TourOverlay';

/** Fenêtre des réglages. Elle s'ouvre depuis le lanceur d'apps. */
export function ThemeControlsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  // Le tour met en avant des éléments du dashboard : les réglages doivent
  // s'effacer, sinon le projecteur éclaire le dos de leur propre backdrop.
  useEffect(() => {
    window.addEventListener(START_TOUR_EVENT, onClose);
    return () => window.removeEventListener(START_TOUR_EVENT, onClose);
  }, [onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key='settings-modal-backdrop'
            data-overlay
            className='fixed inset-0 z-[60] bg-black/60'
            style={{ backdropFilter: 'blur(4px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            key='settings-modal'
            className='fixed inset-0 z-[61] flex items-center justify-center pointer-events-none p-4'
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: DURATION_FAST }}
          >
            <div
              className='gc-overlay pointer-events-auto w-full max-w-3xl rounded-2xl overflow-hidden'
              style={{ height: 'min(88vh, 640px)' }}
            >
              <SettingsContent onClose={onClose} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
