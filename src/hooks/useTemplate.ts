import { useEffect } from 'react';
import { useHass, useUser } from '@hakit/core';
import { templateEngine } from '@/lib/template-engine';
import { isTemplateValue, type TV, type TemplateValue } from '@/types/template';

/**
 * Résout un template Nunjucks de façon réactive.
 * Re-rend automatiquement quand les entités HA changent.
 */
export function useTemplate(template: string): string {
  const entities = useHass(s => s.entities);
  const user = useUser();

  useEffect(() => {
    templateEngine.bind(() => (entities ?? {}) as Record<string, { state: string; attributes: Record<string, unknown> }>);
  }, [entities]);

  useEffect(() => {
    if (user?.name) templateEngine.setUser(user.name);
  }, [user?.name]);

  return templateEngine.render(template);
}

/**
 * Résout un TV<T> (TemplateOrValue) de façon réactive.
 * Si c'est une valeur fixe → retourne directement.
 * Si c'est un template → évalue via Nunjucks.
 */
export function useResolvedField<T>(field: TV<T> | undefined, fallback: T): T {
  const entities = useHass(s => s.entities);

  useEffect(() => {
    templateEngine.bind(() => (entities ?? {}) as Record<string, { state: string; attributes: Record<string, unknown> }>);
  }, [entities]);

  if (field === undefined || field === null) return fallback;

  if (isTemplateValue(field)) {
    return templateEngine.render((field as TemplateValue).template) as unknown as T;
  }

  return field as T;
}
