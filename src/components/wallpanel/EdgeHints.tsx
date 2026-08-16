import { motion } from 'framer-motion';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { EASE_OUT } from '@/lib/motion-tokens';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import { cn } from '@/lib/utils';

/** Durée totale de l'apparition, en secondes. */
const VISIBLE_FOR = 4;

type Edge = 'left' | 'right' | 'top' | 'bottom';

const EDGES: Record<Edge, { position: string; chevron: typeof ChevronUp; nudge: 'x' | 'y'; toward: number }> = {
  left: { position: 'left-3 top-1/2 -translate-y-1/2', chevron: ChevronRight, nudge: 'x', toward: 5 },
  right: { position: 'right-3 top-1/2 -translate-y-1/2', chevron: ChevronLeft, nudge: 'x', toward: -5 },
  top: { position: 'top-3 left-1/2 -translate-x-1/2', chevron: ChevronDown, nudge: 'y', toward: 5 },
  bottom: { position: 'bottom-3 left-1/2 -translate-x-1/2', chevron: ChevronUp, nudge: 'y', toward: -5 },
};

function Hint({ edge, delay }: { edge: Edge; delay: number }) {
  const { position, chevron: Chevron, nudge, toward } = EDGES[edge];

  return (
    <motion.div
      className={cn(
        'absolute flex items-center justify-center w-9 h-9 rounded-full',
        'bg-white/10 border border-white/15 text-white/70 backdrop-blur-sm',
        position
      )}
      initial={{ opacity: 0, scale: 0.9 }}
      // Apparition, maintien, effacement en une seule piste : les temps
      // relatifs de `times` évitent trois animations à séquencer à la main.
      animate={{ opacity: [0, 0.85, 0.85, 0], scale: [0.9, 1, 1, 0.96] }}
      transition={{ duration: VISIBLE_FOR, times: [0, 0.12, 0.75, 1], delay, ease: EASE_OUT }}
    >
      <motion.span animate={{ [nudge]: [0, toward, 0] }} transition={{ duration: 1.1, repeat: 2, delay: delay + 0.4, ease: EASE_OUT }}>
        <Chevron size={16} />
      </motion.span>
    </motion.div>
  );
}

/**
 * Poignées de bord : sans indice visuel, personne ne devine qu'un écran de
 * veille se balaie. Elles s'effacent seules — une tablette murale ne doit pas
 * garder d'ornement permanent à l'écran.
 */
export function EdgeHints({ horizontal, up, down }: { horizontal: boolean; up: boolean; down: boolean }) {
  const motionAllowed = useLowPowerMotion();
  if (!motionAllowed) return null;

  return (
    <div className='absolute inset-0 z-[15] pointer-events-none'>
      {horizontal && <Hint edge='left' delay={0.6} />}
      {horizontal && <Hint edge='right' delay={0.6} />}
      {up && <Hint edge='bottom' delay={0.9} />}
      {down && <Hint edge='top' delay={0.9} />}
    </div>
  );
}
