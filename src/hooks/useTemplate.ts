import { useEffect, useMemo } from 'react';
import { useHass, useUser } from '@hakit/core';
import { useEntities } from '@/hooks/useEntities';
import { templateEngine, templateEntityIds } from '@/lib/template-engine';
import { isTemplateValue, type TV, type TemplateValue } from '@/types/template';

type Entities = Record<string, { state: string; attributes: Record<string, unknown> }>;

/** Constantes de module : leur identité stable évite un rendu inutile. */
const NO_IDS: string[] = [];
const EMPTY: Entities = {};

/**
 * Abonne au strict nécessaire pour résoudre un template.
 *
 * `useHass(s => s.entities)` renvoie un objet neuf dès qu'une entité bouge :
 * chaque card à template se re-rendait donc à chaque changement d'état de la
 * maison. On ne s'abonne qu'aux entités que le template cite réellement.
 *
 * Le repli complet reste nécessaire quand les identifiants sont calculés
 * (`templateEntityIds` renvoie alors `null`) : mieux vaut trop écouter que
 * rendre une valeur périmée.
 */
function useTemplateEntities(template: string): Entities {
  const ids = useMemo(() => templateEntityIds(template), [template]);
  const narrow = useEntities(ids ?? NO_IDS);
  const all = useHass(s => (ids === null ? (s.entities as Entities) : EMPTY));
  return ids === null ? all : (narrow as Entities);
}

/**
 * Lie le moteur puis résout, **pendant** le rendu.
 *
 * `templateEngine` est un singleton partagé. Poser la liaison dans un
 * `useEffect` — qui s'exécute après le rendu — faisait lire à `render()` la
 * liaison laissée par le rendu précédent, ou par une autre card. Ici les deux
 * appels sont dans le même bloc synchrone : il n'y a plus d'intervalle où la
 * liaison ne correspond pas au template qu'on résout.
 */
function renderWith(entities: Entities, template: string): string {
  templateEngine.bind(() => entities);
  return templateEngine.render(template);
}

/**
 * Résout un template Nunjucks de façon réactive.
 * Re-rend quand — et seulement quand — une entité citée par le template change.
 */
export function useTemplate(template: string): string {
  const entities = useTemplateEntities(template);
  const user = useUser();

  useEffect(() => {
    if (user?.name) templateEngine.setUser(user.name);
  }, [user?.name]);

  return renderWith(entities, template);
}

/**
 * Résout un TV<T> (TemplateOrValue) de façon réactive.
 * Si c'est une valeur fixe → retourne directement.
 * Si c'est un template → évalue via Nunjucks.
 */
export function useResolvedField<T>(field: TV<T> | undefined, fallback: T): T {
  // Calculé avant tout appel de hook : un `return` anticipé en rendrait le
  // nombre variable d'un rendu à l'autre.
  const template = isTemplateValue(field) ? (field as TemplateValue).template : '';
  const entities = useTemplateEntities(template);

  if (field === undefined || field === null) return fallback;
  if (isTemplateValue(field)) return renderWith(entities, template) as unknown as T;

  return field as T;
}
