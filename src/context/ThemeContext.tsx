import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { THEMES, HA_THEME_ID, themeTokens, isKnownTheme, type ThemeId, type ThemeTokens, type BackgroundConfig } from '@/config/themes';
import { useSettingsSync } from '@/hooks/useSettingsSync';

export interface AutoThemeConfig {
  enabled: boolean;
  lightTheme: ThemeId;
  darkTheme: ThemeId;
  /**
   * Capteur de luminosité pilotant la bascule. Vide = on suit `sun.sun`.
   *
   * Le soleil ignore un ciel couvert, des volets fermés, une pièce sans
   * fenêtre : un capteur reflète la lumière réellement présente.
   */
  illuminanceEntity?: string;
  /**
   * Seuil en lux au-dessus duquel on considère qu'il fait jour.
   *
   * Facultatif : une configuration exportée avant la 2.2.0 ne le contient pas,
   * et l'exiger ferait échouer son import.
   */
  illuminanceThreshold?: number;
}

export interface PerfSettings {
  reduceBlur: boolean;
  reduceAnimations: boolean;
  disableShadows: boolean;
  disableModalAnimation: boolean;
}

const DEFAULT_PERF_SETTINGS: PerfSettings = {
  reduceBlur: false,
  reduceAnimations: false,
  disableShadows: false,
  disableModalAnimation: false,
};

export interface LayoutSettings {
  /** Grid gap between cards in px (4–40) */
  gridGap: number;
  /** Card border radius in px (0–32) */
  cardRadius: number;
  /** Row height in px (60–160) */
  rowHeight: number;
}

const DEFAULT_LAYOUT_SETTINGS: LayoutSettings = {
  gridGap: 16,
  cardRadius: 24,
  rowHeight: 80,
};

/** Thème repris de Home Assistant, résolu à l'exécution (cf. `ha-themes.ts`). */
export interface ImportedTheme {
  name: string;
  tokens: ThemeTokens;
}

export interface SoundSettings {
  /** Enable sound feedback on user actions */
  enabled: boolean;
}

/**
 * Formats régionaux.
 *
 * `'auto'` suit la langue de l'interface — ce que faisait implicitement chaque
 * card jusqu'ici, en appelant `toLocaleString(language)`. Le réglage n'existe
 * que pour les cas où la langue ne dit pas tout : un francophone qui préfère
 * les degrés Fahrenheit, un anglophone qui veut le format 24 h.
 */
export interface RegionalSettings {
  /** `auto` = selon la langue, sinon forcé. */
  hourFormat: 'auto' | '12' | '24';
  dateStyle: 'short' | 'medium' | 'long';
  /** Unité de température. `auto` laisse Home Assistant décider. */
  tempUnit: 'auto' | 'C' | 'F';
  /** 0 = dimanche, 1 = lundi. `auto` suit la locale. */
  firstDayOfWeek: 'auto' | 0 | 1;
}

export const DEFAULT_REGIONAL_SETTINGS: RegionalSettings = {
  hourFormat: 'auto',
  dateStyle: 'medium',
  tempUnit: 'auto',
  firstDayOfWeek: 'auto',
};

/** Comportements propres à un appareil — surtout utiles en tablette murale. */
export interface BehaviourSettings {
  /** Minutes d'inactivité avant retour à la première page. 0 = jamais. */
  returnHomeAfter: number;
  /** Supprime les notifications passagères. Écran de salon. */
  doNotDisturb: boolean;
  /**
   * Code à 4 chiffres demandé avant d'entrer en mode édition. Vide = aucun.
   *
   * **Ce n'est pas une mesure de sécurité** : le code vit côté client, qui peut
   * le lire. C'est un garde-fou contre le geste involontaire sur une tablette
   * murale. La sécurité réelle, c'est `adminWrites` côté serveur.
   */
  editPin: string;
}

const DEFAULT_BEHAVIOUR_SETTINGS: BehaviourSettings = {
  returnHomeAfter: 0,
  doNotDisturb: false,
  editPin: '',
};

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: false,
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
  /** Auto day/night theme */
  autoTheme: AutoThemeConfig;
  setAutoTheme: (cfg: AutoThemeConfig) => void;
  /** Layout settings (gap, radius, row height) */
  layoutSettings: LayoutSettings;
  setLayoutSettings: (s: LayoutSettings) => void;
  /** Sound feedback settings */
  soundSettings: SoundSettings;
  setSoundSettings: (s: SoundSettings) => void;
  /** Formats régionaux (heure, date, température) */
  regionalSettings: RegionalSettings;
  setRegionalSettings: (s: RegionalSettings) => void;
  /** Comportements propres à l'appareil (retour accueil, ne pas déranger, PIN) */
  behaviourSettings: BehaviourSettings;
  setBehaviourSettings: (s: BehaviourSettings) => void;
  /** Thème importé de Home Assistant, `null` si aucun */
  importedTheme: ImportedTheme | null;
  setImportedTheme: (t: ImportedTheme | null) => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'ha-dashboard-theme';
/** Bumped when a stored field changes meaning — see `loadSettings`. */
const SETTINGS_VERSION = 2;

/**
 * Vrai si l'appareil est en « ne pas déranger ».
 *
 * Lu depuis le localStorage et non par un hook, comme `isSoundEnabled` : le
 * fournisseur de notifications est monté **au-dessus** de `ThemeContext` et ne
 * peut donc pas l'interroger.
 */
export function isDoNotDisturb(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored).behaviourSettings?.doNotDisturb === true;
  } catch {
    /* ignore */
  }
  return false;
}

/** Check if sound is enabled by reading localStorage directly (no hook needed) */
export function isSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.soundSettings?.enabled ?? false;
    }
  } catch {
    /* ignore */
  }
  return false;
}

const DEFAULT_AUTO_THEME: AutoThemeConfig = {
  enabled: false,
  lightTheme: 'light',
  darkTheme: 'dark',
  illuminanceEntity: '',
  // ~50 lux : la frontière habituelle entre un intérieur éclairé le jour et une
  // pièce à l'éclairage artificiel du soir.
  illuminanceThreshold: 50,
};

function loadSettings(): {
  themeId: ThemeId;
  background: BackgroundConfig;
  cardOpacity: number;
  perfSettings: PerfSettings;
  autoTheme: AutoThemeConfig;
  layoutSettings: LayoutSettings;
  soundSettings: SoundSettings;
  regionalSettings: RegionalSettings;
  behaviourSettings: BehaviourSettings;
  importedTheme: ImportedTheme | null;
} {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as {
        v?: number;
        themeId?: ThemeId;
        background?: BackgroundConfig;
        cardOpacity?: number;
        perfSettings?: Partial<PerfSettings>;
        autoTheme?: Partial<AutoThemeConfig>;
        layoutSettings?: Partial<LayoutSettings>;
        soundSettings?: Partial<SoundSettings>;
        regionalSettings?: Partial<RegionalSettings>;
        behaviourSettings?: Partial<BehaviourSettings>;
        importedTheme?: ImportedTheme | null;
      };
      const themeId = parsed.themeId ?? 'dark';
      // Avant la v2 le curseur d'opacité n'était branché sur rien : la valeur
      // stockée n'a jamais reflété un choix visible. On repart du défaut du
      // thème une fois, sinon tout le monde hériterait d'une card à 4 %.
      const cardOpacity =
        parsed.v === SETTINGS_VERSION && parsed.cardOpacity != null
          ? parsed.cardOpacity
          : themeTokens(themeId).glassOpacity;
      return {
        themeId,
        background: parsed.background ?? { mode: 'solid' },
        cardOpacity,
        perfSettings: { ...DEFAULT_PERF_SETTINGS, ...(parsed.perfSettings ?? {}) },
        autoTheme: { ...DEFAULT_AUTO_THEME, ...(parsed.autoTheme ?? {}) },
        layoutSettings: { ...DEFAULT_LAYOUT_SETTINGS, ...(parsed.layoutSettings ?? {}) },
        soundSettings: { ...DEFAULT_SOUND_SETTINGS, ...(parsed.soundSettings ?? {}) },
        regionalSettings: { ...DEFAULT_REGIONAL_SETTINGS, ...(parsed.regionalSettings ?? {}) },
        behaviourSettings: { ...DEFAULT_BEHAVIOUR_SETTINGS, ...(parsed.behaviourSettings ?? {}) },
        importedTheme: parsed.importedTheme ?? null,
      };
    }
  } catch {
    /* ignore */
  }
  return {
    themeId: 'dark',
    background: { mode: 'solid' },
    cardOpacity: THEMES.dark.tokens.glassOpacity,
    perfSettings: DEFAULT_PERF_SETTINGS,
    autoTheme: DEFAULT_AUTO_THEME,
    layoutSettings: DEFAULT_LAYOUT_SETTINGS,
    soundSettings: DEFAULT_SOUND_SETTINGS,
    regionalSettings: DEFAULT_REGIONAL_SETTINGS,
    behaviourSettings: DEFAULT_BEHAVIOUR_SETTINGS,
    importedTheme: null,
  };
}

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  const saved = loadSettings();
  const [themeId, setThemeId] = useState<ThemeId>(saved.themeId);
  const [background, setBackgroundState] = useState<BackgroundConfig>(saved.background);
  const [cardOpacity, setCardOpacityState] = useState(saved.cardOpacity);
  const [perfSettings, setPerfSettingsState] = useState<PerfSettings>(saved.perfSettings);
  const [autoTheme, setAutoThemeState] = useState<AutoThemeConfig>(saved.autoTheme);
  const [layoutSettings, setLayoutSettingsState] = useState<LayoutSettings>(saved.layoutSettings);
  const [soundSettings, setSoundSettingsState] = useState<SoundSettings>(saved.soundSettings);
  const [regionalSettings, setRegionalSettingsState] = useState<RegionalSettings>(saved.regionalSettings);
  const [behaviourSettings, setBehaviourSettingsState] = useState<BehaviourSettings>(saved.behaviourSettings);
  const [importedTheme, setImportedThemeState] = useState<ImportedTheme | null>(saved.importedTheme);

  // Le thème importé de Home Assistant n'a pas d'entrée dans `THEMES` : ses
  // tokens viennent de l'installation, pas du build. Repli sur le thème sombre
  // si l'import a été supprimé alors qu'il était sélectionné.
  const tokens = themeId === HA_THEME_ID ? (importedTheme?.tokens ?? THEMES.dark.tokens) : themeTokens(themeId);

  // Sync settings with server (multi-device)
  const syncedSettings = useMemo(
    () => ({ v: SETTINGS_VERSION, themeId, background, cardOpacity, perfSettings, autoTheme, layoutSettings, soundSettings, regionalSettings, behaviourSettings, importedTheme }),
    [themeId, background, cardOpacity, perfSettings, autoTheme, layoutSettings, soundSettings, regionalSettings, behaviourSettings, importedTheme]
  );
  const handleRemoteUpdate = useCallback((remote: typeof syncedSettings) => {
    if (remote.themeId && isKnownTheme(remote.themeId)) {
      setThemeId(remote.themeId);
      // Même migration que dans `loadSettings` : une opacité venue d'un
      // enregistrement pré-v2 n'a jamais été appliquée, on ne la ressuscite pas.
      setCardOpacityState(
        remote.v === SETTINGS_VERSION && remote.cardOpacity != null ? remote.cardOpacity : themeTokens(remote.themeId).glassOpacity
      );
    }
    if (remote.background) setBackgroundState(remote.background);
    if (remote.perfSettings) setPerfSettingsState({ ...DEFAULT_PERF_SETTINGS, ...remote.perfSettings });
    if (remote.autoTheme) setAutoThemeState({ ...DEFAULT_AUTO_THEME, ...remote.autoTheme });
    if (remote.layoutSettings) setLayoutSettingsState({ ...DEFAULT_LAYOUT_SETTINGS, ...remote.layoutSettings });
    if (remote.soundSettings) setSoundSettingsState({ ...DEFAULT_SOUND_SETTINGS, ...remote.soundSettings });
    if (remote.regionalSettings) setRegionalSettingsState({ ...DEFAULT_REGIONAL_SETTINGS, ...remote.regionalSettings });
    if (remote.behaviourSettings) setBehaviourSettingsState({ ...DEFAULT_BEHAVIOUR_SETTINGS, ...remote.behaviourSettings });
    if (remote.importedTheme !== undefined) setImportedThemeState(remote.importedTheme);
  }, []);
  useSettingsSync(syncedSettings, handleRemoteUpdate);

  // Injection CSS variables sur :root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--dash-bg-primary', tokens.bgPrimary);
    // Le curseur d'opacité ne pilotait rien : il écrivait `--dash-glass-opacity`,
    // qu'aucune règle CSS ne lisait. On recompose la surface à partir de la
    // teinte du thème pour que le curseur agisse réellement sur les cards.
    if (tokens.cardTint) {
      root.style.setProperty('--dash-bg-card', `rgba(${tokens.cardTint} / ${cardOpacity})`);
      root.style.setProperty('--dash-bg-card-hover', `rgba(${tokens.cardTint} / ${Math.min(1, cardOpacity * 1.5 + 0.02)})`);
    } else {
      root.style.setProperty('--dash-bg-card', tokens.bgCard);
      root.style.setProperty('--dash-bg-card-hover', tokens.bgCardHover);
    }
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

    // Clay-specific variables & class
    const isClay = tokens.mode === 'clay';
    root.classList.toggle('theme-clay', isClay);
    root.classList.toggle('theme-clay-dark', isClay && themeId === 'clay-dark');
    // Any light-surface theme (clay light *and* the plain light theme) needs the
    // hardcoded `text-white/*` utilities remapped to dark text, otherwise the
    // cards turn white and the text stays invisible.
    root.classList.toggle('theme-light-surface', !!tokens.light);
    root.dataset.theme = tokens.light ? 'light' : 'dark';
    root.style.setProperty('--dash-shadow-color', tokens.shadowColor ?? '');
    root.style.setProperty('--dash-shadow-highlight', tokens.shadowHighlight ?? '');
  }, [tokens, cardOpacity, themeId]);

  // Layout CSS variables
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--dash-grid-gap', `${layoutSettings.gridGap}px`);
    root.style.setProperty('--dash-card-radius', `${layoutSettings.cardRadius}px`);
    root.style.setProperty('--dash-row-height', `${layoutSettings.rowHeight}px`);
  }, [layoutSettings]);

  // Performance CSS classes on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('perf-reduce-blur', perfSettings.reduceBlur);
    root.classList.toggle('perf-no-animations', perfSettings.reduceAnimations);
    root.classList.toggle('perf-no-shadows', perfSettings.disableShadows);
  }, [perfSettings]);

  // Persistance
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ v: SETTINGS_VERSION, themeId, background, cardOpacity, perfSettings, autoTheme, layoutSettings, soundSettings, regionalSettings, behaviourSettings, importedTheme })
    );
  }, [themeId, background, cardOpacity, perfSettings, autoTheme, layoutSettings, soundSettings, regionalSettings, behaviourSettings, importedTheme]);

  const setTheme = useCallback((id: ThemeId) => {
    setThemeId(id);
    setCardOpacityState(themeTokens(id).glassOpacity);
  }, []);

  const setBackground = useCallback((bg: BackgroundConfig) => setBackgroundState(bg), []);
  const setCardOpacity = useCallback((v: number) => setCardOpacityState(v), []);
  const setPerfSettings = useCallback((s: PerfSettings) => setPerfSettingsState(s), []);
  const setAutoTheme = useCallback((cfg: AutoThemeConfig) => setAutoThemeState(cfg), []);
  const setLayoutSettings = useCallback((s: LayoutSettings) => setLayoutSettingsState(s), []);
  const setSoundSettings = useCallback((s: SoundSettings) => setSoundSettingsState(s), []);
  const setRegionalSettings = useCallback((s: RegionalSettings) => setRegionalSettingsState(s), []);
  const setBehaviourSettings = useCallback((s: BehaviourSettings) => setBehaviourSettingsState(s), []);
  const setImportedTheme = useCallback((t: ImportedTheme | null) => setImportedThemeState(t), []);

  const value = useMemo(
    () => ({
      themeId,
      tokens,
      setTheme,
      background,
      setBackground,
      cardOpacity,
      setCardOpacity,
      perfSettings,
      setPerfSettings,
      autoTheme,
      setAutoTheme,
      layoutSettings,
      setLayoutSettings,
      soundSettings,
      setSoundSettings,
      regionalSettings,
      setRegionalSettings,
      behaviourSettings,
      setBehaviourSettings,
      importedTheme,
      setImportedTheme,
    }),
    [
      themeId,
      tokens,
      background,
      cardOpacity,
      perfSettings,
      autoTheme,
      layoutSettings,
      soundSettings,
      regionalSettings,
      behaviourSettings,
      importedTheme,
      setTheme,
      setBackground,
      setCardOpacity,
      setPerfSettings,
      setAutoTheme,
      setLayoutSettings,
      setSoundSettings,
      setRegionalSettings,
      setBehaviourSettings,
      setImportedTheme,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeContextProvider');
  return ctx;
}
