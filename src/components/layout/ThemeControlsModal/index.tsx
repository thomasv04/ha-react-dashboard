import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { SettingsContent } from './SettingsContent';
import { START_TOUR_EVENT } from '@/components/onboarding/TourOverlay';

/** Les réglages, en plein écran. Ils s'ouvrent depuis le lanceur d'apps. */
export function ThemeControlsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  /**
   * Une section peut avoir des modifications en attente (l'écran de veille) :
   * elle y dépose une garde qui, si elle les retient, répond `true` — on ne
   * ferme alors pas.
   */
  const guard = useRef<(() => boolean) | null>(null);
  const close = () => {
    if (!guard.current?.()) onClose();
  };

  // Le tour met en avant des éléments du dashboard : les réglages doivent
  // s'effacer, sinon ils les recouvrent.
  useEffect(() => {
    window.addEventListener(START_TOUR_EVENT, onClose);
    return () => window.removeEventListener(START_TOUR_EVENT, onClose);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `close` ne lit que des refs et `onClose`
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key='settings-modal'
          role='dialog'
          aria-modal='true'
          data-overlay
          className='fixed inset-0 z-[61] bg-[var(--ds-sheet)] text-[var(--ds-ink)]'
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: DURATION_FAST }}
        >
          <SettingsContent onClose={close} guard={guard} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
