export type ThemeId = 'dark' | 'light' | 'glass' | 'midnight' | 'emerald';

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
  /** Statut : vert */
  statusSuccess: string;
  /** Statut : orange */
  statusWarning: string;
  /** Statut : rouge */
  statusError: string;
  /** Statut : bleu */
  statusInfo: string;
}

export const THEMES: Record<ThemeId, { label: string; tokens: ThemeTokens }> = {
  dark: {
    label: 'Sombre',
    tokens: {
      bgPrimary: '#0a0a14',
      bgCard: 'rgba(255, 255, 255, 0.04)',
      bgCardHover: 'rgba(255, 255, 255, 0.06)',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      accent: '#3b82f6',
      accentHover: '#60a5fa',
      border: 'rgba(255, 255, 255, 0.08)',
      glassBlur: 20,
      glassOpacity: 0.04,
      statusSuccess: '#22c55e',
      statusWarning: '#f59e0b',
      statusError: '#ef4444',
      statusInfo: '#3b82f6',
    },
  },
  light: {
    label: 'Clair',
    tokens: {
      bgPrimary: '#f5f5f5',
      bgCard: 'rgba(255, 255, 255, 0.8)',
      bgCardHover: 'rgba(255, 255, 255, 0.9)',
      textPrimary: '#1a1a2e',
      textSecondary: 'rgba(26, 26, 46, 0.7)',
      textMuted: 'rgba(26, 26, 46, 0.4)',
      accent: '#2563eb',
      accentHover: '#3b82f6',
      border: 'rgba(0, 0, 0, 0.08)',
      glassBlur: 20,
      glassOpacity: 0.8,
      statusSuccess: '#16a34a',
      statusWarning: '#d97706',
      statusError: '#dc2626',
      statusInfo: '#2563eb',
    },
  },
  glass: {
    label: 'Verre',
    tokens: {
      bgPrimary: '#0f0f23',
      bgCard: 'rgba(255, 255, 255, 0.05)',
      bgCardHover: 'rgba(255, 255, 255, 0.08)',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.65)',
      textMuted: 'rgba(255, 255, 255, 0.35)',
      accent: '#8b5cf6',
      accentHover: '#a78bfa',
      border: 'rgba(255, 255, 255, 0.10)',
      glassBlur: 30,
      glassOpacity: 0.05,
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
      bgCard: 'rgba(30, 41, 59, 0.5)',
      bgCardHover: 'rgba(30, 41, 59, 0.7)',
      textPrimary: '#e2e8f0',
      textSecondary: '#94a3b8',
      textMuted: '#475569',
      accent: '#06b6d4',
      accentHover: '#22d3ee',
      border: 'rgba(100, 116, 139, 0.2)',
      glassBlur: 16,
      glassOpacity: 0.3,
      statusSuccess: '#10b981',
      statusWarning: '#f59e0b',
      statusError: '#ef4444',
      statusInfo: '#06b6d4',
    },
  },
  emerald: {
    label: 'Émeraude',
    tokens: {
      bgPrimary: '#022c22',
      bgCard: 'rgba(6, 78, 59, 0.3)',
      bgCardHover: 'rgba(6, 78, 59, 0.5)',
      textPrimary: '#ecfdf5',
      textSecondary: '#a7f3d0',
      textMuted: '#6ee7b7',
      accent: '#10b981',
      accentHover: '#34d399',
      border: 'rgba(16, 185, 129, 0.15)',
      glassBlur: 20,
      glassOpacity: 0.15,
      statusSuccess: '#34d399',
      statusWarning: '#fbbf24',
      statusError: '#f87171',
      statusInfo: '#67e8f9',
    },
  },
};

// ── Background modes ──────────────────────────────────────────────────────────
export type BackgroundMode = 'solid' | 'gradient' | 'image';

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
}
