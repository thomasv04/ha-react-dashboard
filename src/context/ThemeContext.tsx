import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { THEMES, HA_THEME_ID, themeTokens, normalizeThemeId, type ThemeId, type ThemeTokens } from '@/config/themes';
import { useSettingsSync } from '@/hooks/useSettingsSync';
import { accentVars, ACCENT_VAR_NAMES } from '@/lib/accent';

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
  reduceAnimations: boolean;
  disableShadows: boolean;
  disableModalAnimation: boolean;
  /** Caméras : une image fixe rafraîchie toutes les 5 s à la place du flux vidéo. */
  lowQualityCamera: boolean;
}

const DEFAULT_PERF_SETTINGS: PerfSettings = {
  reduceAnimations: false,
  disableShadows: false,
  disableModalAnimation: false,
  lowQualityCamera: false,
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
  /** Pastille de l'utilisateur connecté, en haut à droite. Une tablette partagée s'en passe. */
  showUser: boolean;
}

const DEFAULT_BEHAVIOUR_SETTINGS: BehaviourSettings = {
  returnHomeAfter: 0,
  doNotDisturb: false,
  editPin: '',
  showUser: true,
};

/** Décor de Noël : neige qui tombe, guirlandes lumineuses autour des panneaux. */
export interface ChristmasSettings {
  /** `season` : du 1er décembre au 6 janvier, sans y penser. */
  mode: 'off' | 'on' | 'season';
  snow: boolean;
  snowAmount: 'light' | 'normal' | 'heavy';
  garlands: boolean;
  /** Les ampoules des guirlandes clignotent. */
  twinkle: boolean;
  /** Un liseré de neige posé sur le haut de chaque panneau. */
  snowCaps: boolean;
}

export const DEFAULT_CHRISTMAS_SETTINGS: ChristmasSettings = {
  mode: 'off',
  snow: true,
  snowAmount: 'normal',
  garlands: true,
  twinkle: true,
  snowCaps: true,
};

/** Du 1er décembre au 6 janvier (l'Épiphanie) inclus. */
export function isChristmasSeason(d: Date): boolean {
  return d.getMonth() === 11 || (d.getMonth() === 0 && d.getDate() <= 6);
}

const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: false,
};

interface ThemeContextValue {
  themeId: ThemeId;
  tokens: ThemeTokens;
  setTheme: (id: ThemeId) => void;
  /** Couleur primaire `#rrggbb` qui remplace le bleu d'accent. Vide = celle du thème. */
  accentColor: string;
  setAccentColor: (c: string) => void;
  /** Performance settings */
  perfSettings: PerfSettings;
  setPerfSettings: (s: PerfSettings) => void;
  /** Auto day/night theme */
  autoTheme: AutoThemeConfig;
  setAutoTheme: (cfg: AutoThemeConfig) => void;
  /** Sound feedback settings */
  soundSettings: SoundSettings;
  setSoundSettings: (s: SoundSettings) => void;
  /** Formats régionaux (heure, date, température) */
  regionalSettings: RegionalSettings;
  setRegionalSettings: (s: RegionalSettings) => void;
  /** Comportements propres à l'appareil (retour accueil, ne pas déranger, PIN) */
  behaviourSettings: BehaviourSettings;
  setBehaviourSettings: (s: BehaviourSettings) => void;
  /** Décor de Noël */
  christmasSettings: ChristmasSettings;
  setChristmasSettings: (s: ChristmasSettings) => void;
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

/** Les thèmes jour/nuit enregistrés peuvent désigner un thème retiré en 4.0. */
function withKnownThemes(cfg: AutoThemeConfig): AutoThemeConfig {
  return { ...cfg, lightTheme: normalizeThemeId(cfg.lightTheme), darkTheme: normalizeThemeId(cfg.darkTheme) };
}

function loadSettings(): {
  themeId: ThemeId;
  accentColor: string;
  perfSettings: PerfSettings;
  autoTheme: AutoThemeConfig;
  soundSettings: SoundSettings;
  regionalSettings: RegionalSettings;
  behaviourSettings: BehaviourSettings;
  christmasSettings: ChristmasSettings;
  importedTheme: ImportedTheme | null;
} {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as {
        v?: number;
        themeId?: ThemeId;
        accentColor?: string;
        perfSettings?: Partial<PerfSettings>;
        autoTheme?: Partial<AutoThemeConfig>;
        soundSettings?: Partial<SoundSettings>;
        regionalSettings?: Partial<RegionalSettings>;
        behaviourSettings?: Partial<BehaviourSettings>;
        christmasSettings?: Partial<ChristmasSettings>;
        importedTheme?: ImportedTheme | null;
      };
      const themeId = normalizeThemeId(parsed.themeId);
      return {
        themeId,
        accentColor: parsed.accentColor ?? '',
        perfSettings: { ...DEFAULT_PERF_SETTINGS, ...(parsed.perfSettings ?? {}) },
        autoTheme: withKnownThemes({ ...DEFAULT_AUTO_THEME, ...(parsed.autoTheme ?? {}) }),
        soundSettings: { ...DEFAULT_SOUND_SETTINGS, ...(parsed.soundSettings ?? {}) },
        regionalSettings: { ...DEFAULT_REGIONAL_SETTINGS, ...(parsed.regionalSettings ?? {}) },
        behaviourSettings: { ...DEFAULT_BEHAVIOUR_SETTINGS, ...(parsed.behaviourSettings ?? {}) },
        christmasSettings: { ...DEFAULT_CHRISTMAS_SETTINGS, ...(parsed.christmasSettings ?? {}) },
        importedTheme: parsed.importedTheme ?? null,
      };
    }
  } catch {
    /* ignore */
  }
  return {
    themeId: 'dark',
    accentColor: '',
    perfSettings: DEFAULT_PERF_SETTINGS,
    autoTheme: DEFAULT_AUTO_THEME,
    soundSettings: DEFAULT_SOUND_SETTINGS,
    regionalSettings: DEFAULT_REGIONAL_SETTINGS,
    behaviourSettings: DEFAULT_BEHAVIOUR_SETTINGS,
    christmasSettings: DEFAULT_CHRISTMAS_SETTINGS,
    importedTheme: null,
  };
}

export function ThemeContextProvider({ children }: { children: ReactNode }) {
  // Lu une fois : à chaque rendu, c'était une lecture et un `JSON.parse` du localStorage pour rien.
  const [saved] = useState(loadSettings);
  const [themeId, setThemeId] = useState<ThemeId>(saved.themeId);
  const [accentColor, setAccentColor] = useState(saved.accentColor);
  const [perfSettings, setPerfSettingsState] = useState<PerfSettings>(saved.perfSettings);
  const [autoTheme, setAutoThemeState] = useState<AutoThemeConfig>(saved.autoTheme);
  const [soundSettings, setSoundSettingsState] = useState<SoundSettings>(saved.soundSettings);
  const [regionalSettings, setRegionalSettingsState] = useState<RegionalSettings>(saved.regionalSettings);
  const [behaviourSettings, setBehaviourSettingsState] = useState<BehaviourSettings>(saved.behaviourSettings);
  const [christmasSettings, setChristmasSettingsState] = useState<ChristmasSettings>(saved.christmasSettings);
  const [importedTheme, setImportedThemeState] = useState<ImportedTheme | null>(saved.importedTheme);

  // Le thème importé de Home Assistant n'a pas d'entrée dans `THEMES` : ses
  // tokens viennent de l'installation, pas du build. Repli sur le thème sombre
  // si l'import a été supprimé alors qu'il était sélectionné.
  const tokens = themeId === HA_THEME_ID ? (importedTheme?.tokens ?? THEMES.dark.tokens) : themeTokens(themeId);

  // Sync settings with server (multi-device)
  const syncedSettings = useMemo(
    () => ({
      v: SETTINGS_VERSION,
      themeId,
      accentColor,
      perfSettings,
      autoTheme,
      soundSettings,
      regionalSettings,
      behaviourSettings,
      christmasSettings,
      importedTheme,
    }),
    [themeId, accentColor, perfSettings, autoTheme, soundSettings, regionalSettings, behaviourSettings, christmasSettings, importedTheme]
  );
  const handleRemoteUpdate = useCallback((remote: typeof syncedSettings) => {
    if (remote.themeId) {
      const id = normalizeThemeId(remote.themeId);
      setThemeId(id);
    }
    if (remote.accentColor !== undefined) setAccentColor(remote.accentColor);
    if (remote.perfSettings) setPerfSettingsState({ ...DEFAULT_PERF_SETTINGS, ...remote.perfSettings });
    if (remote.autoTheme) setAutoThemeState(withKnownThemes({ ...DEFAULT_AUTO_THEME, ...remote.autoTheme }));
    if (remote.soundSettings) setSoundSettingsState({ ...DEFAULT_SOUND_SETTINGS, ...remote.soundSettings });
    if (remote.regionalSettings) setRegionalSettingsState({ ...DEFAULT_REGIONAL_SETTINGS, ...remote.regionalSettings });
    if (remote.behaviourSettings) setBehaviourSettingsState({ ...DEFAULT_BEHAVIOUR_SETTINGS, ...remote.behaviourSettings });
    if (remote.christmasSettings) setChristmasSettingsState({ ...DEFAULT_CHRISTMAS_SETTINGS, ...remote.christmasSettings });
    if (remote.importedTheme !== undefined) setImportedThemeState(remote.importedTheme);
  }, []);
  useSettingsSync(syncedSettings, handleRemoteUpdate);

  // Injection CSS variables sur :root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--dash-bg-primary', tokens.bgPrimary);
    root.style.setProperty('--dash-bg-card', tokens.bgCard);
    root.style.setProperty('--dash-bg-card-hover', tokens.bgCardHover);
    root.style.setProperty('--dash-text-primary', tokens.textPrimary);
    root.style.setProperty('--dash-text-secondary', tokens.textSecondary);
    root.style.setProperty('--dash-text-muted', tokens.textMuted);
    root.style.setProperty('--dash-accent', accentVars(accentColor)?.['--ds-user-accent'] ?? tokens.accent);
    root.style.setProperty('--dash-border', tokens.border);
    root.style.setProperty('--dash-status-success', tokens.statusSuccess);
    root.style.setProperty('--dash-status-warning', tokens.statusWarning);
    root.style.setProperty('--dash-status-error', tokens.statusError);
    root.style.setProperty('--dash-status-info', tokens.statusInfo);

    // `theme-light-surface` : les barres de défilement claires (index.css).
    root.classList.toggle('theme-light-surface', !!tokens.light);
    root.dataset.theme = tokens.light ? 'light' : 'dark';
  }, [tokens, accentColor]);

  // Couleur primaire : les `--ds-user-*` et la classe qui les branche sur les jetons (index.css).
  useEffect(() => {
    const root = document.documentElement;
    const vars = accentVars(accentColor);
    for (const name of ACCENT_VAR_NAMES) {
      if (vars) root.style.setProperty(name, vars[name]);
      else root.style.removeProperty(name);
    }
    root.classList.toggle('theme-custom-accent', !!vars);
  }, [accentColor]);

  // Performance CSS classes on <html>
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('perf-no-animations', perfSettings.reduceAnimations);
    root.classList.toggle('perf-no-shadows', perfSettings.disableShadows);
  }, [perfSettings]);

  // Persistance : le même instantané que celui synchronisé avec le serveur.
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(syncedSettings));
  }, [syncedSettings]);

  const setTheme = useCallback((requested: ThemeId) => {
    // Un import de configuration peut encore porter un thème retiré en 4.0.
    const id = normalizeThemeId(requested);
    setThemeId(id);
  }, []);

  // Les setters de `useState` sont déjà stables : passés tels quels.
  const value = useMemo(
    () => ({
      themeId,
      tokens,
      setTheme,
      accentColor,
      setAccentColor,
      perfSettings,
      setPerfSettings: setPerfSettingsState,
      autoTheme,
      setAutoTheme: setAutoThemeState,
      soundSettings,
      setSoundSettings: setSoundSettingsState,
      regionalSettings,
      setRegionalSettings: setRegionalSettingsState,
      behaviourSettings,
      setBehaviourSettings: setBehaviourSettingsState,
      christmasSettings,
      setChristmasSettings: setChristmasSettingsState,
      importedTheme,
      setImportedTheme: setImportedThemeState,
    }),
    [
      themeId,
      tokens,
      accentColor,
      perfSettings,
      autoTheme,
      soundSettings,
      regionalSettings,
      behaviourSettings,
      christmasSettings,
      importedTheme,
      setTheme,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeContextProvider');
  return ctx;
}
