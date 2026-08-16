import type { Breakpoint } from '@/components/layout/DashboardGrid';

/**
 * Conditions d'affichage d'une card — l'équivalent du `visibility:` de Home
 * Assistant (2023.11).
 *
 * Comme chez HA, **toutes** les conditions doivent être remplies pour que la
 * card s'affiche : elles se cumulent, elles ne s'additionnent pas. Un « ou »
 * s'obtient en dupliquant la card, ce qui reste plus lisible qu'un éditeur de
 * booléens imbriqués.
 *
 * Ces champs sont communs à toutes les cards et lus par `GridItem`, comme
 * `tapAction` — cf. [card-actions.ts](./card-actions.ts).
 */
export type VisibilityCondition =
  | {
      condition: 'state';
      entityId: string;
      /** Affiche si l'état vaut ceci. */
      state?: string;
      /** Affiche si l'état ne vaut **pas** ceci. */
      stateNot?: string;
    }
  | {
      condition: 'screen';
      /** Breakpoints où la card est visible. Vide = partout. */
      breakpoints: Breakpoint[];
    };

export interface CardVisibilityConfig {
  visibility?: VisibilityCondition[];
}

/** Entités dont dépendent des conditions, pour s'y abonner. */
export function visibilityEntityIds(conditions: VisibilityCondition[] | undefined): string[] {
  if (!conditions?.length) return [];
  return conditions.filter(c => c.condition === 'state' && c.entityId).map(c => (c as { entityId: string }).entityId);
}

/**
 * Évalue les conditions. Sans condition, la card est visible — c'est le cas de
 * toutes celles déjà en place.
 *
 * @param states état courant des entités citées, par identifiant
 */
export function isVisible(
  conditions: VisibilityCondition[] | undefined,
  breakpoint: Breakpoint,
  states: Record<string, string | undefined>
): boolean {
  if (!conditions?.length) return true;

  return conditions.every(c => {
    if (c.condition === 'screen') {
      return c.breakpoints.length === 0 || c.breakpoints.includes(breakpoint);
    }

    // Une entité absente du store n'a pas d'état à comparer. On masque plutôt
    // que d'afficher : la condition portait sur une donnée qu'on n'a pas, la
    // supposer vraie ferait apparaître la card au mauvais moment.
    const state = states[c.entityId];
    if (state === undefined) return false;
    if (c.state !== undefined && c.state !== '') return state === c.state;
    if (c.stateNot !== undefined && c.stateNot !== '') return state !== c.stateNot;
    return true;
  });
}
