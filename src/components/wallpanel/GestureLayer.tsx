import { useRef } from 'react';
import { motion, animate, type MotionValue, type PanInfo } from 'framer-motion';
import { EASE_SPRING } from '@/lib/motion-tokens';

/** Distance minimale pour valider un balayage lent. */
const SWIPE_DISTANCE = 90;
/** Vitesse minimale pour valider un balayage court et vif. */
const SWIPE_VELOCITY = 500;
/** En deçà, le geste est un appui : ni axe verrouillé, ni suivi du doigt. */
const TAP_TOLERANCE = 12;
/** Le fond ne suit le doigt qu'au tiers — la résistance annonce une limite. */
const RUBBER = 0.35;

type Axis = 'x' | 'y';

interface GestureLayerProps {
  /** Décalage du fond, piloté ici et consommé par l'appelant. */
  x: MotionValue<number>;
  y: MotionValue<number>;
  /** Balayage horizontal validé : 1 = image suivante, -1 = précédente. */
  onSwipeX?: (direction: 1 | -1) => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  /**
   * Passé à vrai dès qu'un geste dépasse `TAP_TOLERANCE`. L'appelant le lit
   * pour ignorer le `click` qui suit un balayage — sans quoi chaque geste
   * fermerait l'écran de veille.
   */
  movedRef: React.RefObject<boolean>;
}

/**
 * Routeur de gestes plein écran de l'écran de veille.
 *
 * Posé **sous** les widgets : une card garde ainsi la priorité sur le geste,
 * et l'espace entre les cards reste balayable.
 */
export function GestureLayer({ x, y, onSwipeX, onSwipeUp, onSwipeDown, movedRef }: GestureLayerProps) {
  const axis = useRef<Axis | null>(null);

  const handlePan = (_: PointerEvent, info: PanInfo) => {
    const { x: dx, y: dy } = info.offset;
    if (Math.hypot(dx, dy) <= TAP_TOLERANCE) return;
    movedRef.current = true;
    // L'axe est verrouillé au premier mouvement franc : un balayage horizontal
    // légèrement oblique ne doit pas commencer à ouvrir une feuille.
    axis.current ??= Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    if (axis.current === 'x') x.set(dx * RUBBER);
    else y.set(dy * RUBBER);
  };

  const handlePanEnd = (_: PointerEvent, info: PanInfo) => {
    const current = axis.current;
    axis.current = null;
    animate(x, 0, EASE_SPRING);
    animate(y, 0, EASE_SPRING);
    if (!current) return;

    const distance = current === 'x' ? info.offset.x : info.offset.y;
    const velocity = current === 'x' ? info.velocity.x : info.velocity.y;
    if (Math.abs(distance) <= SWIPE_DISTANCE && Math.abs(velocity) <= SWIPE_VELOCITY) return;

    // Vers la gauche = image suivante, comme feuilleter une pile de photos.
    if (current === 'x') onSwipeX?.(distance < 0 ? 1 : -1);
    else if (distance < 0) onSwipeUp?.();
    else onSwipeDown?.();
  };

  return (
    <motion.div
      // `touch-action: none` : sans ça, le navigateur préempte le geste
      // vertical pour son propre défilement et `onPan` ne reçoit plus rien.
      className='absolute inset-0 z-[5] touch-none'
      onPan={handlePan}
      onPanEnd={handlePanEnd}
    />
  );
}
