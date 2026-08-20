import { useCallback, useMemo } from 'react';
import { useHass } from '@hakit/core';
import { templateEngine, templateEntityIds } from '@/lib/template-engine';
import { useEntities } from '@/hooks/useEntities';
import { resolveColorValue } from '@/lib/color-value';

type Entities = Record<string, { state: string; attributes: Record<string, unknown> }>;

const NO_IDS: string[] = [];

/**
 * Résolveur de champ couleur (`#hex` ou template), réévalué quand les entités
 * changent. Rend une fonction et non une valeur : une liste — pastilles,
 * contrôles de pièce — ne peut pas appeler un hook par élément.
 *
 * ponytail: s'abonne à la carte complète des entités, faute de connaître les
 * templates à l'avance. Seul `ActivityBar` en dépend ; le jour où une autre
 * liste s'y branche, lui faire déclarer ses champs couleur et passer par
 * `templateEntityIds` comme {@link useColor}.
 */
export function useColorResolver(): (raw?: string) => string | undefined {
  const entities = useHass(s => s.entities);
  return useCallback(
    (raw?: string) => {
      templateEngine.bind(() => (entities ?? {}) as Entities);
      return resolveColorValue(raw);
    },
    [entities]
  );
}

/**
 * Un seul champ couleur.
 *
 * Contrairement au résolveur, la valeur est connue : une couleur littérale
 * n'écoute rien, et un template n'écoute que les entités qu'il cite. C'est le
 * cas courant — la plupart des champs couleur sont un `#hex` figé.
 */
export function useColor(raw?: string): string | undefined {
  const value = raw?.trim();
  // Un `#hex` n'a aucune entité à consulter ; `templateEntityIds` renvoie `null`
  // pour un template à identifiants calculés, qu'il faut alors écouter en entier.
  const ids = useMemo(() => (!value || value.startsWith('#') ? NO_IDS : templateEntityIds(value)), [value]);

  const narrow = useEntities(ids ?? NO_IDS);
  const all = useHass(s => (ids === null ? (s.entities as Entities) : undefined));

  templateEngine.bind(() => (all ?? narrow) as Entities);
  return resolveColorValue(raw);
}
