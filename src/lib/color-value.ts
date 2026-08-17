import { templateEngine } from './template-engine';

/** Noms de couleurs Home Assistant / Mushroom → hex. */
export const COLOR_MAP: Record<string, string> = {
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  red: '#ef4444',
  purple: '#a855f7',
  yellow: '#eab308',
  cyan: '#06b6d4',
  pink: '#ec4899',
  amber: '#f59e0b',
  grey: '#6b7280',
  gray: '#6b7280',
  white: '#f1f5f9',
};

/**
 * Un champ couleur accepte deux formes : une couleur littérale (`#3b82f6`) ou
 * un template Nunjucks qui en produit une. Le `#` initial tranche — même
 * convention que les badges Mushroom, où `color:` est tantôt un nom, tantôt un
 * bloc `{% if %}`.
 *
 * Le résultat du template passe par [COLOR_MAP] : HA renvoie des noms
 * (`red`, `green`), le CSS veut des couleurs.
 *
 * @returns `undefined` si le champ est vide ou si le template a échoué — la
 * card garde alors sa couleur par défaut plutôt que d'afficher une erreur.
 */
export function resolveColorValue(raw?: string): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (value.startsWith('#')) return value;
  const rendered = templateEngine.render(value).trim();
  if (!rendered || rendered.startsWith('[Erreur')) return undefined;
  return COLOR_MAP[rendered.toLowerCase()] ?? rendered;
}

/** Fond translucide dérivé d'une couleur — `color-mix` accepte les noms CSS, `${c}1a` non. */
export function colorAlpha(color: string, percent = 10): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
