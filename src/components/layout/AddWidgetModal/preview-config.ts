import { DEFAULT_WIDGET_CONFIGS, WIDGET_FIELD_DEFS } from '@/widgets';
import { MOCK_ENTITIES } from '@/mocks/hassEntities';
import type { WidgetFieldDef } from '@/types/widget-configs';

const MOCK_IDS = Object.keys(MOCK_ENTITIES);

/** Entités d'exemple du domaine demandé, dans l'ordre où elles sont déclarées. */
function mockIds(domain: string | undefined, limit: number): string[] {
  if (!domain) return [];
  return MOCK_IDS.filter(id => id.startsWith(`${domain}.`)).slice(0, limit);
}

const isEmpty = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * Config d'aperçu d'une card du catalogue.
 *
 * L'aperçu rendait la card avec sa config par défaut, qui ne désigne aucune
 * entité : la moitié du catalogue affichait « Entité introuvable » ou « aucune
 * automatisation configurée » au lieu d'un exemple. On remplit ici les champs
 * d'entité laissés vides avec les entités factices du domaine attendu.
 *
 * Dérivé des champs déclarés par le manifeste, donc valable pour un widget qui
 * n'existe pas encore — rien à tenir en phase à la main.
 */
export function previewConfig(type: string, fallbackDomain?: string): Record<string, unknown> {
  const cfg = { ...((DEFAULT_WIDGET_CONFIGS[type as keyof typeof DEFAULT_WIDGET_CONFIGS] ?? {}) as unknown as Record<string, unknown>) };

  for (const field of (WIDGET_FIELD_DEFS[type] ?? []) as WidgetFieldDef[]) {
    if (!isEmpty(cfg[field.key])) continue;
    const domain = field.domain ?? fallbackDomain;

    if (field.fieldType === 'entity') {
      const [id] = mockIds(domain, 1);
      if (id) cfg[field.key] = id;
    } else if (field.fieldType === 'entity-list') {
      const ids = mockIds(domain, 4);
      if (ids.length) cfg[field.key] = ids;
    } else if (field.fieldType === 'list' && field.itemFields) {
      // Une liste d'objets : seul le champ entité est rempli, le reste garde
      // ses valeurs par défaut — un nom d'exemple inventé mentirait sur la card.
      const entityField = field.itemFields.find(f => f.fieldType === 'entity');
      const ids = mockIds(entityField?.domain ?? fallbackDomain, 3);
      if (entityField && ids.length) cfg[field.key] = ids.map(id => ({ [entityField.key]: id }));
    }
  }

  return cfg;
}
