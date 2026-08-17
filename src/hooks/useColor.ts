import { useCallback } from 'react';
import { useHass } from '@hakit/core';
import { templateEngine } from '@/lib/template-engine';
import { resolveColorValue } from '@/lib/color-value';

type Entities = Record<string, { state: string; attributes: Record<string, unknown> }>;

/**
 * Résolveur de champ couleur (`#hex` ou template), réévalué quand les entités
 * changent. Rend une fonction et non une valeur : une liste — pastilles,
 * contrôles de pièce — ne peut pas appeler un hook par élément.
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

/** Un seul champ couleur. */
export function useColor(raw?: string): string | undefined {
  return useColorResolver()(raw);
}
