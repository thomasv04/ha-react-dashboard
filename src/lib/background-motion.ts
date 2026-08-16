/**
 * Comportement des particules de fond (orbes Aurora, bulles Lave) quand elles
 * atteignent le bord de l'écran.
 *
 * Les deux effets avaient la même ligne : la particule était **téléportée** du
 * bord opposé, à pleine opacité. Une bulle disparaissait donc d'un coup à
 * gauche et réapparaissait d'un coup à droite — un saut visible, d'autant plus
 * que les orbes sont larges et lents.
 *
 * Le calcul est ici, partagé par les deux effets et testable sans canvas.
 */

/** Bornes du trajet, en coordonnées normalisées. Débordent de l'écran : une particule est large. */
export const TRACK_MIN = -0.2;
export const TRACK_MAX = 1.2;

/** Largeur de la bande où l'opacité s'éteint, en mode `fade`. */
const FADE_BAND = 0.3;

export type EdgeBehaviour =
  /** Disparaît en fondu au bord, réapparaît en fondu de l'autre côté. */
  | 'fade'
  /** Repart en sens inverse — le trajet fait des allers-retours sans fin. */
  | 'bounce'
  /** Réapparaît instantanément de l'autre côté (comportement d'origine). */
  | 'wrap';

export const DEFAULT_EDGE_BEHAVIOUR: EdgeBehaviour = 'fade';

/** Une particule animée, vue par le moteur de déplacement. */
export interface Particle {
  nx: number;
  ny: number;
  /** Sens de parcours, inversé par `bounce`. Toujours 1 ou -1. */
  dirX: number;
  dirY: number;
}

/** Ramène une valeur dans les bornes du trajet. */
const clamp = (n: number) => Math.min(TRACK_MAX, Math.max(TRACK_MIN, n));

/**
 * Opacité due à la proximité du bord, entre 0 et 1.
 *
 * Elle vaut 0 exactement là où `wrap` téléporte : le saut a donc lieu alors que
 * la particule est déjà invisible, et personne ne le voit.
 */
function edgeAlpha(n: number): number {
  const distance = Math.min(n - TRACK_MIN, TRACK_MAX - n);
  return Math.min(1, Math.max(0, distance / FADE_BAND));
}

/**
 * Avance une particule d'un pas et applique le comportement de bord.
 *
 * @param stepX déplacement horizontal normalisé pour cette image
 * @param stepY déplacement vertical normalisé
 * @returns le facteur d'opacité à appliquer (1 sauf en `fade` près d'un bord)
 */
export function advanceParticle(p: Particle, stepX: number, stepY: number, behaviour: EdgeBehaviour): number {
  p.nx += stepX * p.dirX;
  p.ny += stepY * p.dirY;

  if (behaviour === 'bounce') {
    // Le sens s'inverse *et* la position est ramenée dans les bornes : sans le
    // recadrage, une particule plus rapide que la bande resterait coincée
    // dehors à osciller entre deux inversions.
    if (p.nx < TRACK_MIN || p.nx > TRACK_MAX) {
      p.dirX *= -1;
      p.nx = clamp(p.nx);
    }
    if (p.ny < TRACK_MIN || p.ny > TRACK_MAX) {
      p.dirY *= -1;
      p.ny = clamp(p.ny);
    }
    return 1;
  }

  if (p.nx < TRACK_MIN) p.nx = TRACK_MAX;
  else if (p.nx > TRACK_MAX) p.nx = TRACK_MIN;
  if (p.ny < TRACK_MIN) p.ny = TRACK_MAX;
  else if (p.ny > TRACK_MAX) p.ny = TRACK_MIN;

  return behaviour === 'fade' ? Math.min(edgeAlpha(p.nx), edgeAlpha(p.ny)) : 1;
}
