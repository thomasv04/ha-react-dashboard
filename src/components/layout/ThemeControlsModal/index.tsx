import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { Settings } from 'lucide-react';
import { SettingsContent } from './SettingsContent';
import { START_TOUR_EVENT } from '@/components/onboarding/TourOverlay';

export function ThemeControlsModal() {
  const [isOpen, setIsOpen] = useState(false);

  // Le tour met en avant des éléments du dashboard : les réglages doivent
  // s'effacer, sinon le projecteur éclaire le dos de leur propre backdrop.
  useEffect(() => {
    const close = () => setIsOpen(false);
    window.addEventListener(START_TOUR_EVENT, close);
    return () => window.removeEventListener(START_TOUR_EVENT, close);
  }, []);

  return (
    <>
      {/* Trigger button – fixed top-left */}
      <motion.button
        onClick={() => setIsOpen(v => !v)}
        whileTap={{ scale: 0.92 }}
        data-tour='settings'
        title='Paramètres'
        className={`fixed top-4 left-4 z-50 p-2.5 rounded-xl border transition-colors backdrop-blur-sm ${
          isOpen
            ? 'bg-blue-500/30 border-blue-500/50 text-blue-200'
            : 'bg-white/10 border-white/20 text-white/70 hover:text-white hover:bg-white/20'
        }`}
      >
        <Settings size={17} />
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key='settings-modal-backdrop'
              className='fixed inset-0 z-[60] bg-black/60'
              style={{ backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
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
                className='gc-overlay pointer-events-auto w-full max-w-2xl rounded-2xl overflow-hidden'
                style={{ height: 'min(85vh, 560px)' }}
              >
                <SettingsContent onClose={() => setIsOpen(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
