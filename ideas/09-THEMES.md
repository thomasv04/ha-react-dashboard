# 09 — Thèmes & Apparence

## Objectif

Ajouter un système de thèmes dynamiques avec support Dark/Light/Custom, personnalisation du fond d'écran, contrôle de transparence des cards, et choix de police. Actuellement le dashboard hérite uniquement du thème HA via `@hakit/components ThemeProvider` — on veut un contrôle fin en plus.

## Architecture

Tunet utilise des CSS custom properties (variables) injectées dynamiquement sur `:root`. On va faire pareil, tout en gardant la compatibilité avec le ThemeProvider de @hakit.

```
src/config/themes.ts       // Définitions des thèmes
src/context/ThemeContext.tsx // Context React pour le thème actif
src/components/layout/ThemeControlsModal.tsx // UI de sélection
```

---

## Étape 1 : Définir les thèmes

### `src/config/themes.ts`

```typescript
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
      glassBlur: 30, // plus de blur = plus de verre
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
```

---

## Étape 2 : ThemeContext

### `src/context/ThemeContext.tsx`

```typescript
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { THEMES, type ThemeId, type ThemeTokens, type BackgroundConfig } from '@/config/themes';

interface ThemeContextValue {
  themeId: ThemeId;
  tokens: ThemeTokens;
  setTheme: (id: ThemeId) => void;
  background: BackgroundConfig;
  setBackground: (bg: BackgroundConfig) => void;
  /** Card opacity override (0-1, défault = theme.glassOpacity) */
  cardOpacity: number;
  setCardOpacity: (v: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'ha-dashboard-theme';

function loadSettings(): { themeId: ThemeId; background: BackgroundConfig; cardOpacity: number } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {
    themeId: 'dark',
    background: { mode: 'solid' },
    cardOpacity: THEMES.dark.tokens.glassOpacity,
  };
}

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const saved = loadSettings();
  const [themeId, setThemeId] = useState<ThemeId>(saved.themeId);
  const [background, setBackgroundState] = useState<BackgroundConfig>(saved.background);
  const [cardOpacity, setCardOpacityState] = useState(saved.cardOpacity);

  const tokens = THEMES[themeId].tokens;

  // Injection CSS variables sur :root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--dash-bg-primary', tokens.bgPrimary);
    root.style.setProperty('--dash-bg-card', tokens.bgCard);
    root.style.setProperty('--dash-bg-card-hover', tokens.bgCardHover);
    root.style.setProperty('--dash-text-primary', tokens.textPrimary);
    root.style.setProperty('--dash-text-secondary', tokens.textSecondary);
    root.style.setProperty('--dash-text-muted', tokens.textMuted);
    root.style.setProperty('--dash-accent', tokens.accent);
    root.style.setProperty('--dash-border', tokens.border);
    root.style.setProperty('--dash-glass-blur', `${tokens.glassBlur}px`);
    root.style.setProperty('--dash-glass-opacity', String(cardOpacity));
    root.style.setProperty('--dash-status-success', tokens.statusSuccess);
    root.style.setProperty('--dash-status-warning', tokens.statusWarning);
    root.style.setProperty('--dash-status-error', tokens.statusError);
    root.style.setProperty('--dash-status-info', tokens.statusInfo);
  }, [tokens, cardOpacity]);

  // Persistance
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeId, background, cardOpacity }));
  }, [themeId, background, cardOpacity]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    setCardOpacityState(THEMES[id].tokens.glassOpacity);
  }, []);

  const setBackground = useCallback((bg: BackgroundConfig) => setBackgroundState(bg), []);
  const setCardOpacity = useCallback((v: number) => setCardOpacityState(v), []);

  return (
    <ThemeContext.Provider value={{
      themeId, tokens, setTheme,
      background, setBackground,
      cardOpacity, setCardOpacity,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeContextProvider');
  return ctx;
}
```

---

## Étape 3 : Modifier les glass cards pour utiliser les CSS variables

Dans `src/index.css`, remplacer les classes `.gc` hardcodées :

```css
/* Glass cards avec CSS variables dynamiques */
.gc {
  background: var(--dash-bg-card);
  backdrop-filter: blur(var(--dash-glass-blur));
  -webkit-backdrop-filter: blur(var(--dash-glass-blur));
  border: 1px solid var(--dash-border);
  color: var(--dash-text-primary);
}

.gc:hover {
  background: var(--dash-bg-card-hover);
}

body {
  background-color: var(--dash-bg-primary);
  color: var(--dash-text-primary);
}
```

---

## Étape 4 : Background Layer

### `src/components/layout/BackgroundLayer.tsx`

```typescript
import { useTheme } from '@/context/ThemeContext';

export function BackgroundLayer() {
  const { background, tokens } = useTheme();

  if (background.mode === 'solid') {
    return null; // Le body background-color suffit
  }

  if (background.mode === 'gradient') {
    return (
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `linear-gradient(${background.gradientAngle ?? 135}deg, ${background.gradientFrom ?? tokens.bgPrimary}, ${background.gradientTo ?? '#1a1a2e'})`,
        }}
      />
    );
  }

  if (background.mode === 'image' && background.imageUrl) {
    return (
      <>
        <div
          className="fixed inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url(${background.imageUrl})` }}
        />
        <div
          className="fixed inset-0 -z-10"
          style={{ backgroundColor: `rgba(0,0,0,${background.overlayOpacity ?? 0.5})` }}
        />
      </>
    );
  }

  return null;
}
```

---

## Étape 5 : Modal de sélection de thème

### `src/components/layout/ThemeControlsModal.tsx`

```typescript
import { Palette, Image, Sliders } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { THEMES, type ThemeId } from '@/config/themes';

export function ThemeControlsModal() {
  const { themeId, setTheme, background, setBackground, cardOpacity, setCardOpacity } = useTheme();

  return (
    <div className="flex flex-col gap-6 p-6 max-w-md">
      {/* Theme selector */}
      <div>
        <h3 className="text-white/60 text-sm mb-3 flex items-center gap-2">
          <Palette size={16} /> Thème
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(THEMES) as [ThemeId, typeof THEMES[ThemeId]][]).map(([id, theme]) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                themeId === id
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <div
                className="w-full h-6 rounded-lg mb-2"
                style={{ backgroundColor: theme.tokens.bgPrimary, border: `1px solid ${theme.tokens.border}` }}
              />
              {theme.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card opacity */}
      <div>
        <h3 className="text-white/60 text-sm mb-3 flex items-center gap-2">
          <Sliders size={16} /> Opacité des cards — {Math.round(cardOpacity * 100)}%
        </h3>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(cardOpacity * 100)}
          onChange={(e) => setCardOpacity(parseInt(e.target.value) / 100)}
          className="w-full"
        />
      </div>

      {/* Background mode */}
      <div>
        <h3 className="text-white/60 text-sm mb-3 flex items-center gap-2">
          <Image size={16} /> Fond d'écran
        </h3>
        <div className="flex gap-2">
          {(['solid', 'gradient', 'image'] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setBackground({ ...background, mode })}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                background.mode === mode
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                  : 'bg-white/5 text-white/50 border border-white/10'
              }`}
            >
              {mode === 'solid' ? 'Couleur' : mode === 'gradient' ? 'Gradient' : 'Image'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Étape 6 : Intégrer dans App.tsx

```typescript
import { ThemeContextProvider } from '@/context/ThemeContext';
import { BackgroundLayer } from '@/components/layout/BackgroundLayer';

function App() {
  return (
    <HassConnect ...>
      <ThemeProvider />
      <ThemeContextProvider>
        <BackgroundLayer />
        <I18nProvider>
          {/* ... */}
        </I18nProvider>
      </ThemeContextProvider>
    </HassConnect>
  );
}
```

---

## Vérification

- [ ] Le changement de thème modifie instantanément toutes les CSS variables
- [ ] Les glass cards utilisent `var(--dash-bg-card)` et `var(--dash-glass-blur)`
- [ ] Le fond d'écran gradient fonctionne
- [ ] Le slider d'opacité des cards change la transparence en live
- [ ] Le thème choisi est persisté dans localStorage
- [ ] Le thème Light affiche correctement des tons clairs
