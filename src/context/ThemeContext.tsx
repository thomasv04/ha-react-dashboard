import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { THEMES, type ThemeId, type ThemeTokens, type BackgroundConfig } from '@/config/themes';

interface ThemeContextValue {
  themeId: ThemeId;
  tokens: ThemeTokens;
  setTheme: (id: ThemeId) => void;
  background: BackgroundConfig;
  setBackground: (bg: BackgroundConfig) => void;
  /** Card opacity override (0-1, défaut = theme.glassOpacity) */
  cardOpacity: number;
  setCardOpacity: (v: number) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'ha-dashboard-theme';

function loadSettings(): { themeId: ThemeId; background: BackgroundConfig; cardOpacity: number } {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored) as { themeId: ThemeId; background: BackgroundConfig; cardOpacity: number };
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
