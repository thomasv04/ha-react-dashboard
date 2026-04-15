import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings } from 'lucide-react';
import { SettingsContent } from './SettingsContent';

export function ThemeControlsModal() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Trigger button – fixed top-left */}
      <motion.button
        onClick={() => setIsOpen((v) => !v)}
        whileTap={{ scale: 0.92 }}
        title="Paramètres"
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
              key="settings-modal-backdrop"
              className="fixed inset-0 z-[60] bg-black/60"
              style={{ backdropFilter: 'blur(4px)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            {/* Panel */}
            <motion.div
              key="settings-modal"
              className="fixed inset-0 z-[61] flex items-center justify-center pointer-events-none p-4"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
            >
              <div
                className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden"
                style={{
                  background: 'rgba(12, 16, 40, 0.97)',
                  backdropFilter: 'blur(20px)',
                  height: 'min(85vh, 560px)',
                }}
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
