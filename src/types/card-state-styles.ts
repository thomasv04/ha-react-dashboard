import { isVisible, visibilityEntityIds, type VisibilityCondition } from './card-visibility';
import type { Breakpoint } from '@/components/layout/DashboardGrid';

/**
 * Icône et couleur variables selon l'état — « si l'entité est `on`, icône X en
 * orange ».
 *
 * Réutilise l'évaluateur de conditions de la visibilité conditionnelle
 * ([card-visibility.ts](./card-visibility.ts)) : une comparaison d'état est une
 * comparaison d'état, qu'elle décide d'afficher une card ou de la colorer.
 *
 * **Ne s'applique qu'aux widgets qui exposent un champ « icône »** dans leur
 * manifeste. Les autres n'ont pas d'icône configurable à remplacer, et le
 * réglage leur est masqué plutôt que de rester sans effet — un réglage qui ne
 * fait rien est pire que pas de réglage.
 */
export interface CardStateStyle {
  /** Toutes ces conditions doivent être remplies. */
  when: VisibilityCondition[];
  /** Nom d'icône lucide, ou identifiant d'icône téléversée. */
  icon?: string;
  /** Couleur CSS appliquée à l'icône. */
  color?: string;
}

export interface CardStateStylesConfig {
  stateStyles?: CardStateStyle[];
}

/** Entités citées par les règles, pour s'y abonner. */
export function stateStyleEntityIds(styles: CardStateStyle[] | undefined): string[] {
  return (styles ?? []).flatMap(s => visibilityEntityIds(s.when));
}

/**
 * Première règle satisfaite, ou `null`.
 *
 * Première et non dernière : l'ordre de la liste est l'ordre de priorité, comme
 * dans une suite de `if`. L'utilisateur place le cas particulier en haut.
 */
export function matchStateStyle(
  styles: CardStateStyle[] | undefined,
  breakpoint: Breakpoint,
  states: Record<string, string | undefined>
): CardStateStyle | null {
  if (!styles?.length) return null;
  // Une règle sans condition s'appliquerait toujours et masquerait les
  // suivantes : on l'ignore plutôt que de figer l'affichage sur elle.
  return styles.find(s => s.when.length > 0 && isVisible(s.when, breakpoint, states)) ?? null;
}
