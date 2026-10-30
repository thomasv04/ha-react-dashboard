import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';
import { useNotifications } from '@/context/NotificationContext';
import { EASE_OUT, EASE_SINE, DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';

/**
 * Pastille du bord haut : une notification arrivée par événement est invisible
 * tant que personne ne balaie vers le bas. Contrairement aux poignées de bord,
 * celle-ci **reste** — c'est le seul signe qu'il y a quelque chose à lire.
 */
export function NotificationBadge({ onOpen }: { onOpen: () => void }) {
  const { notifications } = useNotifications();
  const motionAllowed = useLowPowerMotion();
  const count = notifications.length;

  if (count === 0) return null;

  return (
    <motion.button
      onClick={e => {
        // L'overlay ferme l'écran de veille au clic.
        e.stopPropagation();
        onOpen();
      }}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE, ease: EASE_OUT }}
      className='absolute left-1/2 top-4 z-[16] flex h-11 -translate-x-1/2 items-center gap-2 rounded-[var(--ds-radius-pill)] bg-[var(--ds-control)] px-4 text-[var(--ds-control-ink)]'
    >
      <motion.span
        animate={motionAllowed ? { rotate: [0, -12, 10, -6, 0] } : undefined}
        // Une sonnerie toutes les six secondes : assez pour accrocher l'œil en
        // passant devant la tablette, assez rare pour ne pas devenir un tic.
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 6, ease: EASE_SINE }}
        style={{ originY: 0 }}
      >
        <Bell size={18} />
      </motion.span>
      <span className='text-[15px] font-semibold tabular-nums'>{count}</span>
    </motion.button>
  );
}
