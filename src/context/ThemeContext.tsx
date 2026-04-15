import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { THEMES, type ThemeId, type ThemeTokens, type BackgroundConfig } from '@/config/themes';

export interface PerfSettings {
  reduceBlur: boolean;
  reduceAnimations: boolean;
  disableShadows: boolean;
}

const DEFAULT_PERF_SETTINGS: PerfSettings = {
  reduceBlur: false,
  reduceAnimations: false,
  disableShadows: false,
};

interface ThemeContextValue {
  themeId: ThemeId;
  tokens: ThemeTokens;
  setTheme: (id: ThemeId) => void;
  background: BackgroundConfig;
  setBackground: (bg: BackgroundConfig) => void;
  /** Card opacity override (0-1, défaut = theme.glassOpacity) */
  cardOpacity: number;
  setCardOpacity: (v: number) => void;
  /** Performance settings */
  perfSettings: PerfSettings;
  setPerfSettings: (s: PerfSettings) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'ha-dashboard-theme';

function loadSettings(): {
  themeId: ThemeId;
  background: BackgroundConfig;
  cardOpacity: number;
  perfSettings: PerfSettings;
} {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as {
        themeId?: ThemeId;
        background?: BackgroundConfig;
        cardOpacity?: number;
        perfSettings?: Partial<PerfSettings>;
      };
      return {
        themeId: parsed.themeId ?? 'dark',
        background: parsed.background ?? { mode: 'solid' },
        cardOpacity: parsed.cardOpacity ?? THEMES.dark.tokens.glassOpacity,
        perfSettings: { ...DEFAULT_PERF_SETTINGS, ...(parsed.perfSettings ?? {}) },
      };
    }
  } catch { /* ignore */ }
  return {
    themeId: 'dark',
    background: { mode: 'solid' },
    cardOpacity: THEMES.dark.tokens.glassOpacity,
    perfSettings: DEFAULT_PERF_SETTINGS,
  };
}

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const saved = loadSettings();
  const [themeId, setThemeId] = useState<ThemeId>(saved.themeId);
  const [background, setBackgroundState] = useState<BackgroundConfig>(saved.background);
  const [cardOpacity, setCardOpacityState] = useState(saved.cardOpacity);
  const [perfSettings, setPerfSettingsState] = useState<PerfSettings>(saved.perfSettings);

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

  // Performance CSS classes on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('perf-reduce-blur', perfSettings.reduceBlur);
    root.classList.toggle('perf-no-animations', perfSettings.reduceAnimations);
    root.classList.toggle('perf-no-shadows', perfSettings.disableShadows);
  }, [perfSettings]);

  // Persistance
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeId, background, cardOpacity, perfSettings }));
  }, [themeId, background, cardOpacity, perfSettings]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    setCardOpacityState(THEMES[id].tokens.glassOpacity);
  }, []);

  const setBackground = useCallback((bg: BackgroundConfig) => setBackgroundState(bg), []);
  const setCardOpacity = useCallback((v: number) => setCardOpacityState(v), []);
  const setPerfSettings = useCallback((s: PerfSettings) => setPerfSettingsState(s), []);

  return (
    <ThemeContext.Provider value={{
      themeId, tokens, setTheme,
      background, setBackground,
      cardOpacity, setCardOpacity,
      perfSettings, setPerfSettings,
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
