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

/** `#rrggbb` → teinte au format de `cardTint` (`'r g b'`). */
export function hexToTint(hex: string): string {
  return [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(' ');
}

/** Teinte au format de `cardTint` (`'r g b'`) → `#rrggbb`, pour `<input type="color">`. */
export function tintToHex(tint: string): string {
  return (
    '#' +
    tint
      .split(' ')
      .map(n => Number(n).toString(16).padStart(2, '0'))
      .join('')
  );
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
  /** Backdrop blur pour les glass cards (en px) */
  glassBlur: number;
  /** Opacité du fond des glass cards (0-1) */
  glassOpacity: number;
  /**
   * Teinte de la surface des cards, en composantes RGB brutes (`'255 255 255'`).
   * Quand elle est définie, `--dash-bg-card` est recomposé à partir de cette
   * teinte et du curseur d'opacité — c'est ce qui rend le curseur fonctionnel.
   */
  cardTint?: string;
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
 * surfaces opaques, d'où un flou nul et une opacité pleine.
 */
export const THEMES: Record<BuiltInThemeId, { label: string; tokens: ThemeTokens }> = {
  dark: {
    label: 'Sombre',
    tokens: {
      bgPrimary: '#07090c',
      cardTint: '34 40 51',
      bgCard: '#222833',
      bgCardHover: '#2a313d',
      textPrimary: '#eef1f5',
      textSecondary: '#c6cdd8',
      textMuted: '#aab4c3',
      accent: '#3b74e8',
      accentHover: '#5b8cf0',
      border: 'rgba(255, 255, 255, 0.08)',
      glassBlur: 0,
      glassOpacity: 1,
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
      cardTint: '255 255 255',
      bgCard: '#ffffff',
      bgCardHover: '#f6f8fb',
      textPrimary: '#1b2230',
      textSecondary: '#3a4558',
      textMuted: '#4a5568',
      accent: '#2456d6',
      accentHover: '#1d4bc0',
      border: 'rgba(27, 34, 48, 0.08)',
      glassBlur: 0,
      glassOpacity: 1,
      statusSuccess: '#2f9e5c',
      statusWarning: '#c2571c',
      statusError: '#d6345a',
      statusInfo: '#2456d6',
    },
  },
};

// ── Background modes ──────────────────────────────────────────────────────────
export type BackgroundMode = 'solid' | 'gradient' | 'image' | 'aurora' | 'lavaLamp';

export type EffectPalette = 'default' | 'warm' | 'cool' | 'nature' | 'mono';

import type { EdgeBehaviour } from '@/lib/background-motion';

export interface AuroraConfig {
  palette?: EffectPalette;
  orbCount?: number;
  speed?: number;
  size?: number;
  opacity?: number;
  /** Amplitude of sinusoidal sway (0 = straight lines, 1 = default, 3 = very wavy) */
  sway?: number;
  /** Ce qui arrive à une particule au bord de l'écran (cf. `background-motion.ts`). */
  edgeBehaviour?: EdgeBehaviour;
}

export interface LavaConfig {
  palette?: EffectPalette;
  blobCount?: number;
  speed?: number;
  size?: number;
  opacity?: number;
  /** Amplitude of sinusoidal sway (0 = straight lines, 1 = default, 3 = very wavy) */
  sway?: number;
  /** Ce qui arrive à une particule au bord de l'écran (cf. `background-motion.ts`). */
  edgeBehaviour?: EdgeBehaviour;
}

export interface BackgroundConfig {
  mode: BackgroundMode;
  /** Pour solid/gradient : couleurs CSS */
  color?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  /** Pour image : URL de l'image de fond */
  imageUrl?: string;
  /** Opacité de l'overlay sombre (0-1) */
  overlayOpacity?: number;
  /** Config pour aurora */
  aurora?: AuroraConfig;
  /** Config pour lava lamp */
  lava?: LavaConfig;
}
