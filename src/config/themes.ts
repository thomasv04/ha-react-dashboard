export type ThemeId = 'dark' | 'light' | 'glass' | 'midnight' | 'emerald' | 'clay' | 'clay-dark';

export type ThemeMode = 'glass' | 'clay';

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
   * Les thèmes opaques (clay) l'omettent et gardent `bgCard` tel quel.
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
  /** Mode de rendu : glass (défaut) ou clay */
  mode?: ThemeMode;
  /** Couleur de l'ombre externe douce (clay) */
  shadowColor?: string;
  /** Couleur de la surbrillance interne (clay) */
  shadowHighlight?: string;
}

export const THEMES: Record<ThemeId, { label: string; tokens: ThemeTokens }> = {
  dark: {
    label: 'Sombre',
    tokens: {
      // Un fond légèrement plus sombre que les cards donne aux ombres portées
      // la marge de luminance dont elles ont besoin pour être visibles.
      bgPrimary: '#08080f',
      cardTint: '255 255 255',
      bgCard: 'rgba(255, 255, 255, 0.065)',
      bgCardHover: 'rgba(255, 255, 255, 0.10)',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.78)',
      textMuted: 'rgba(255, 255, 255, 0.52)',
      accent: '#3b82f6',
      accentHover: '#60a5fa',
      border: 'rgba(255, 255, 255, 0.12)',
      glassBlur: 20,
      glassOpacity: 0.065,
      statusSuccess: '#22c55e',
      statusWarning: '#f59e0b',
      statusError: '#ef4444',
      statusInfo: '#3b82f6',
    },
  },
  light: {
    label: 'Clair',
    tokens: {
      light: true,
      bgPrimary: '#eef1f6',
      cardTint: '255 255 255',
      bgCard: 'rgba(255, 255, 255, 0.86)',
      bgCardHover: 'rgba(255, 255, 255, 0.95)',
      textPrimary: '#141a25',
      textSecondary: 'rgba(20, 26, 37, 0.72)',
      textMuted: 'rgba(20, 26, 37, 0.48)',
      accent: '#2563eb',
      accentHover: '#3b82f6',
      border: 'rgba(15, 23, 42, 0.10)',
      glassBlur: 20,
      glassOpacity: 0.86,
      statusSuccess: '#16a34a',
      statusWarning: '#d97706',
      statusError: '#dc2626',
      statusInfo: '#2563eb',
    },
  },
  glass: {
    label: 'Verre',
    tokens: {
      bgPrimary: '#0c0c1c',
      cardTint: '255 255 255',
      bgCard: 'rgba(255, 255, 255, 0.075)',
      bgCardHover: 'rgba(255, 255, 255, 0.11)',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.76)',
      textMuted: 'rgba(255, 255, 255, 0.5)',
      accent: '#8b5cf6',
      accentHover: '#a78bfa',
      border: 'rgba(255, 255, 255, 0.14)',
      // 24px au lieu de 30 : différence visuelle nulle, coût GPU nettement
      // plus bas quand ~20 cards floutent le fond en même temps.
      glassBlur: 24,
      glassOpacity: 0.075,
      statusSuccess: '#34d399',
      statusWarning: '#fbbf24',
      statusError: '#f87171',
      statusInfo: '#818cf8',
    },
  },
  midnight: {
    label: 'Minuit',
    tokens: {
      bgPrimary: '#020617',
      cardTint: '38 52 74',
      bgCard: 'rgba(38, 52, 74, 0.62)',
      bgCardHover: 'rgba(38, 52, 74, 0.8)',
      textPrimary: '#e2e8f0',
      textSecondary: '#b6c2d3',
      textMuted: '#7d8ba1',
      accent: '#06b6d4',
      accentHover: '#22d3ee',
      border: 'rgba(148, 163, 184, 0.28)',
      glassBlur: 16,
      glassOpacity: 0.62,
      statusSuccess: '#10b981',
      statusWarning: '#f59e0b',
      statusError: '#ef4444',
      statusInfo: '#06b6d4',
    },
  },
  emerald: {
    label: 'Émeraude',
    tokens: {
      bgPrimary: '#021a14',
      cardTint: '8 92 70',
      bgCard: 'rgba(8, 92, 70, 0.45)',
      bgCardHover: 'rgba(8, 92, 70, 0.62)',
      textPrimary: '#ecfdf5',
      textSecondary: '#b6f0d8',
      textMuted: '#7fd4b4',
      accent: '#10b981',
      accentHover: '#34d399',
      border: 'rgba(52, 211, 153, 0.24)',
      glassBlur: 20,
      glassOpacity: 0.45,
      statusSuccess: '#34d399',
      statusWarning: '#fbbf24',
      statusError: '#f87171',
      statusInfo: '#67e8f9',
    },
  },
  clay: {
    label: 'Clay Clair',
    tokens: {
      mode: 'clay',
      light: true,
      bgPrimary: '#e8e4df',
      bgCard: '#f0ece7',
      bgCardHover: '#f5f1ed',
      textPrimary: '#2d2a26',
      textSecondary: 'rgba(45, 42, 38, 0.65)',
      textMuted: 'rgba(45, 42, 38, 0.4)',
      accent: '#7c6bf5',
      accentHover: '#9688f7',
      border: 'rgba(0, 0, 0, 0.06)',
      glassBlur: 0,
      glassOpacity: 1,
      shadowColor: 'rgba(0, 0, 0, 0.12)',
      shadowHighlight: 'rgba(255, 255, 255, 0.7)',
      statusSuccess: '#34d399',
      statusWarning: '#fbbf24',
      statusError: '#f87171',
      statusInfo: '#818cf8',
    },
  },
  'clay-dark': {
    label: 'Clay Sombre',
    tokens: {
      mode: 'clay',
      bgPrimary: '#1e1b2e',
      bgCard: '#2a2740',
      bgCardHover: '#322f4a',
      textPrimary: '#f0ecf9',
      textSecondary: 'rgba(240, 236, 249, 0.7)',
      textMuted: 'rgba(240, 236, 249, 0.4)',
      accent: '#9688f7',
      accentHover: '#b0a4fa',
      border: 'rgba(255, 255, 255, 0.08)',
      glassBlur: 0,
      glassOpacity: 1,
      shadowColor: 'rgba(0, 0, 0, 0.6)',
      shadowHighlight: 'rgba(255, 255, 255, 0.08)',
      statusSuccess: '#34d399',
      statusWarning: '#fbbf24',
      statusError: '#f87171',
      statusInfo: '#818cf8',
    },
  },
};

// ── Background modes ──────────────────────────────────────────────────────────
export type BackgroundMode = 'solid' | 'gradient' | 'image' | 'aurora' | 'lavaLamp';

export type EffectPalette = 'default' | 'warm' | 'cool' | 'nature' | 'mono';

export interface AuroraConfig {
  palette?: EffectPalette;
  orbCount?: number;
  speed?: number;
  size?: number;
  opacity?: number;
  /** Amplitude of sinusoidal sway (0 = straight lines, 1 = default, 3 = very wavy) */
  sway?: number;
}

export interface LavaConfig {
  palette?: EffectPalette;
  blobCount?: number;
  speed?: number;
  size?: number;
  opacity?: number;
  /** Amplitude of sinusoidal sway (0 = straight lines, 1 = default, 3 = very wavy) */
  sway?: number;
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
