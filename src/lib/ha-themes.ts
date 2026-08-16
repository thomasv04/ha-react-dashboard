import { THEMES, type ThemeTokens } from '@/config/themes';

/**
 * Import des thèmes définis dans Home Assistant (`themes.yaml`).
 *
 * Un thème HA est une liste de variables CSS. Il n'en existe pas de schéma :
 * chaque auteur en définit ce qu'il veut, et rien n'est obligatoire. La
 * conversion part donc du thème sombre du dashboard et n'écrase que ce que le
 * thème HA fournit réellement — un thème qui ne définirait que `primary-color`
 * donne un dashboard cohérent, avec juste l'accent changé.
 */

/** Variables HA lues, et le token qu'elles alimentent. */
const MAPPING: [string, keyof ThemeTokens][] = [
  ['primary-background-color', 'bgPrimary'],
  ['card-background-color', 'bgCard'],
  ['primary-text-color', 'textPrimary'],
  ['secondary-text-color', 'textSecondary'],
  ['disabled-text-color', 'textMuted'],
  ['primary-color', 'accent'],
  ['accent-color', 'accentHover'],
  ['divider-color', 'border'],
];

export interface HAThemeSummary {
  name: string;
  tokens: ThemeTokens;
}

/** Forme de la réponse `frontend/get_themes`. */
interface GetThemesResult {
  themes?: Record<string, Record<string, string>>;
}

/**
 * Convertit un thème HA en tokens du dashboard.
 *
 * @param vars variables du thème, telles que HA les rend (sans le `--` initial)
 */
export function haThemeToTokens(vars: Record<string, string>): ThemeTokens {
  const tokens: ThemeTokens = { ...THEMES.dark.tokens };

  for (const [haVar, token] of MAPPING) {
    const value = vars[haVar]?.trim();
    if (value) (tokens as unknown as Record<string, string>)[token] = value;
  }

  // `cardTint` recompose la surface des cards à partir du curseur d'opacité.
  // Un thème HA donne une couleur de card **opaque** : garder la teinte du
  // thème sombre rendrait le curseur incohérent avec la couleur importée. On la
  // retire, `bgCard` est alors utilisé tel quel.
  delete tokens.cardTint;

  return tokens;
}

/**
 * Liste les thèmes disponibles dans Home Assistant.
 *
 * @param connection connexion WebSocket HA (`useHass(s => s.connection)`)
 */
export async function fetchHAThemes(connection: {
  sendMessagePromise: (msg: { type: string }) => Promise<unknown>;
}): Promise<HAThemeSummary[]> {
  const result = (await connection.sendMessagePromise({ type: 'frontend/get_themes' })) as GetThemesResult;
  const themes = result?.themes ?? {};

  return Object.entries(themes)
    .map(([name, vars]) => ({ name, tokens: haThemeToTokens(vars ?? {}) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
