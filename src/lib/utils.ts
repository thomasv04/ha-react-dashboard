import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Ramène `value` dans `[min, max]`.
 *
 * Écrit `Math.max(min, Math.min(max, value))` : c'est la borne **basse** qui
 * gagne quand `min > max` (une grille plus étroite que le widget qu'on y
 * pose). L'écriture miroir `Math.min(max, Math.max(min, value))` rend `max`
 * dans ce cas — les deux traînaient dans le code, ce qui n'est pas la même
 * chose.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * L'événement clavier vient-il d'un champ où l'utilisateur est en train d'écrire ?
 *
 * `e.target` ne suffit pas : sous Home Assistant le dashboard vit dans une
 * shadow root, et un écouteur posé sur `window` ne reçoit plus l'`<input>` mais
 * l'élément hôte qui l'englobe — le garde laissait donc passer chaque lettre
 * tapée dans une modale, et « c » ouvrait la barre de commande au lieu de
 * s'écrire. `composedPath()[0]` traverse la frontière et rend la vraie cible.
 */
export function isTypingTarget(e: Event): boolean {
  const el = (e.composedPath()[0] ?? e.target) as HTMLElement | null;
  return el?.isContentEditable === true || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName ?? '');
}
