/**
 * Un champ qui peut être une valeur fixe OU un template Nunjucks.
 *
 * Utilisation :
 *   icon: TV<string>  (peut être "mdi:home" ou un template Jinja2)
 *
 * Rétrocompat : si le champ vaut directement une string/number/boolean,
 * il est traité comme une valeur fixe (mode 'value' implicite).
 */
export interface TemplateValue {
  _tv: 'template';
  template: string;
}

/**
 * TV = TemplateOrValue.
 * T est le type de la valeur fixe (string, number, boolean...).
 * Le field peut être soit T (valeur directe, rétrocompat) soit TemplateValue.
 */
export type TV<T> = T | TemplateValue;

/** Type guard : vrai si la valeur est un template, pas une valeur brute */
export function isTemplateValue(v: unknown): v is TemplateValue {
  return typeof v === 'object' && v !== null && '_tv' in v && (v as TemplateValue)._tv === 'template';
}

/** Crée un TemplateValue depuis une string de template */
export function tv(template: string): TemplateValue {
  return { _tv: 'template', template };
}

/** Crée une valeur fixe (pour la symétrie avec tv()) */
export function val<T>(value: T): T {
  return value;
}
