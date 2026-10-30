/** Thèmes livrés avec le dashboard, dont les tokens sont connus au build. */
export type BuiltInThemeId = 'dark' | 'light';

/**
 * `ha` désigne le thème importé de Home Assistant. Il n'a délibérément pas
 * d'entrée dans `THEMES` : ses tokens viennent des `themes.yaml` de
 * l'installation, pas du build. D'où la distinction avec `BuiltInThemeId`, qui
 * garde `THEMES` exhaustif pour tous les autres.
 */
export type ThemeId = BuiltInThemeId | 'ha';

export const HA_THEME_ID = 'ha' satisfies ThemeId;

/**
 * Tokens d'un thème, `ha` compris.
 *
 * Le thème importé n'a pas de tokens au build : on rend ceux du thème sombre,
 * dont `haThemeToTokens` part de toute façon. L'appelant qui dispose du thème
 * importé (le fournisseur de thème) applique les siens par-dessus.
 */
export function themeTokens(id: ThemeId): ThemeTokens {
  return THEMES[id as BuiltInThemeId]?.tokens ?? THEMES.dark.tokens;
}

/** Vrai si l'identifiant désigne un thème que l'application sait rendre. */
export function isKnownTheme(id: string): id is ThemeId {
  return id === HA_THEME_ID || id in THEMES;
}

/** Thèmes clairs retirés en 4.0 : leurs utilisateurs passent au thème clair. */
const RETIRED_LIGHT_THEMES = new Set(['clay', 'sea-glass']);

/**
 * Ramène un identifiant enregistré (réglages, import, autre appareil) sur un
 * thème qui existe encore. La 4.0 n'a gardé que `dark` et `light` : les sept
 * autres thèmes basculent sur celui des deux qui leur ressemble.
 */
export function normalizeThemeId(id: string | undefined): ThemeId {
  if (id && isKnownTheme(id)) return id;
  return id && RETIRED_LIGHT_THEMES.has(id) ? 'light' : 'dark';
}

export interface ThemeTokens {
  /** Fond principal du dashboard */
  bgPrimary: string;
  /** Fond secondaire (cards) */
  bgCard: string;
  /** Fond des cards au hover */
  bgCardHover: string;
  /** Texte principal */
  textPrimary: string;
  /** Texte secondaire */
  textSecondary: string;
  /** Texte très atténué */
  textMuted: string;
  /** Couleur d'accent principale */
  accent: string;
  /** Couleur d'accent au hover */
  accentHover: string;
  /** Bordure des cards */
  border: string;
  /** Surface claire : le texte hardcodé en blanc doit être remappé en sombre */
  light?: boolean;
  /** Statut : vert */
  statusSuccess: string;
  /** Statut : orange */
  statusWarning: string;
  /** Statut : rouge */
  statusError: string;
  /** Statut : bleu */
  statusInfo: string;
}

/**
 * Valeurs reprises du design system « HA Dashboard v2 » (`src/design/tokens.json`) :
 * surfaces opaques.
 */
export const THEMES: Record<BuiltInThemeId, { label: string; tokens: ThemeTokens }> = {
  dark: {
    label: 'Sombre',
    tokens: {
      bgPrimary: '#07090c',
      bgCard: '#222833',
      bgCardHover: '#2a313d',
      textPrimary: '#eef1f5',
      textSecondary: '#c6cdd8',
      textMuted: '#aab4c3',
      accent: '#3b74e8',
      accentHover: '#5b8cf0',
      border: 'rgba(255, 255, 255, 0.08)',
      statusSuccess: '#3ecf7a',
      statusWarning: '#f28c4b',
      statusError: '#e8466b',
      statusInfo: '#3b74e8',
    },
  },
  light: {
    label: 'Clair',
    tokens: {
      light: true,
      bgPrimary: '#e8ecf2',
      bgCard: '#ffffff',
      bgCardHover: '#f6f8fb',
      textPrimary: '#1b2230',
      textSecondary: '#3a4558',
      textMuted: '#4a5568',
      accent: '#2456d6',
      accentHover: '#1d4bc0',
      border: 'rgba(27, 34, 48, 0.08)',
      statusSuccess: '#2f9e5c',
      statusWarning: '#c2571c',
      statusError: '#d6345a',
      statusInfo: '#2456d6',
    },
  },
};
