import { EASE_IN_OUT } from '@/lib/motion-tokens';

/** Sens d'une flèche de commande de volet. */
export type CoverDirection = 'up' | 'down';

/**
 * Animation d'une flèche pendant que le volet bouge.
 *
 * Un volet met une trentaine de secondes à descendre, et Home Assistant ne
 * publie pas de position intermédiaire sur tous les modèles : sans ce
 * balancement, rien à l'écran ne dit qu'un ordre est en cours d'exécution.
 * La flèche part dans le sens du mouvement, donc vers le haut à l'ouverture.
 *
 * Renvoie `undefined` quand il n'y a rien à animer — le résultat s'étale
 * directement sur un `motion.button`, sans props parasites le reste du temps.
 */
export function coverArrowMotion(state: string | undefined, direction: CoverDirection, motionAllowed = true) {
  const moving = direction === 'up' ? state === 'opening' : state === 'closing';
  if (!moving || !motionAllowed) return undefined;

  return {
    animate: { y: direction === 'up' ? [0, -3, 0] : [0, 3, 0] },
    transition: { duration: 0.9, repeat: Infinity, ease: EASE_IN_OUT },
  };
}
