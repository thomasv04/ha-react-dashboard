import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { apiUrl } from '@/lib/api-base';

// EN
import enCommon from './locales/en/common.json';
import enDashboard from './locales/en/dashboard.json';
import enWidgets from './locales/en/widgets.json';
import enPanels from './locales/en/panels.json';
import enSettings from './locales/en/settings.json';
import enLayout from './locales/en/layout.json';
import enActivityBar from './locales/en/activityBar.json';

// FR
import frCommon from './locales/fr/common.json';
import frDashboard from './locales/fr/dashboard.json';
import frWidgets from './locales/fr/widgets.json';
import frPanels from './locales/fr/panels.json';
import frSettings from './locales/fr/settings.json';
import frLayout from './locales/fr/layout.json';
import frActivityBar from './locales/fr/activityBar.json';

import type { SupportedLanguage, TranslationKeys } from './types';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './types';

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from './types';
export type { SupportedLanguage } from './types';

const translations: Record<SupportedLanguage, TranslationKeys> = {
  en: {
    common: enCommon,
    dashboard: enDashboard,
    widgets: enWidgets as unknown as TranslationKeys['widgets'],
    panels: enPanels as unknown as TranslationKeys['panels'],
    settings: enSettings,
    layout: enLayout,
    activityBar: enActivityBar,
  },
  fr: {
    common: frCommon as unknown as TranslationKeys['common'],
    dashboard: frDashboard as unknown as TranslationKeys['dashboard'],
    widgets: frWidgets as unknown as TranslationKeys['widgets'],
    panels: frPanels as unknown as TranslationKeys['panels'],
    settings: frSettings as unknown as TranslationKeys['settings'],
    layout: frLayout as unknown as TranslationKeys['layout'],
    activityBar: frActivityBar,
  },
};

function detectLanguage(): SupportedLanguage {
  const stored = localStorage.getItem('ha-dashboard-lang');
  if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) {
    return stored as SupportedLanguage;
  }
  const browserLang = navigator.language.split('-')[0].toLowerCase();
  if (SUPPORTED_LANGUAGES.some(l => l.code === browserLang)) {
    return browserLang as SupportedLanguage;
  }
  return DEFAULT_LANGUAGE;
}

function resolve(obj: Record<string, unknown>, path: string): string | string[] {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  if (Array.isArray(current)) return current as string[];
  return typeof current === 'string' ? current : path;
}

interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  tArray: (key: string) => string[];
  overrides: Record<string, string>;
  setOverride: (key: string, value: string) => void;
  removeOverride: (key: string) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<SupportedLanguage>(detectLanguage);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch(apiUrl('/api/translations/overrides'))
      .then(r => r.json())
      .then((data: { overrides?: Record<string, string> }) => {
        if (data.overrides && typeof data.overrides === 'object') {
          setOverrides(data.overrides);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const setLanguage = useCallback((lang: SupportedLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('ha-dashboard-lang', lang);
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      if (overrides[key] !== undefined) {
        let text = overrides[key];
        if (params) {
          for (const [k, v] of Object.entries(params)) text = text.replace(`{${k}}`, String(v));
        }
        return text;
      }

      const dict = translations[language] as unknown as Record<string, unknown>;
      let result = resolve(dict, key);

      if (typeof result === 'string' && result === key && language !== DEFAULT_LANGUAGE) {
        result = resolve(translations[DEFAULT_LANGUAGE] as unknown as Record<string, unknown>, key);
      }

      const str = typeof result === 'string' ? result : key;
      if (!params) return str;

      let out = str;
      for (const [k, v] of Object.entries(params)) out = out.replace(`{${k}}`, String(v));
      return out;
    },
    [language, overrides]
  );

  const tArray = useCallback(
    (key: string): string[] => {
      const dict = translations[language] as unknown as Record<string, unknown>;
      const result = resolve(dict, key);
      if (Array.isArray(result)) return result;
      const fallback = resolve(translations[DEFAULT_LANGUAGE] as unknown as Record<string, unknown>, key);
      return Array.isArray(fallback) ? fallback : [];
    },
    [language]
  );

  const persistOverrides = useCallback((next: Record<string, string>) => {
    fetch(apiUrl('/api/translations/overrides'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ overrides: next }),
    }).catch(() => {});
  }, []);

  const setOverride = useCallback(
    (key: string, value: string) => {
      setOverrides(prev => {
        const next = { ...prev, [key]: value };
        persistOverrides(next);
        return next;
      });
    },
    [persistOverrides]
  );

  const removeOverride = useCallback(
    (key: string) => {
      setOverrides(prev => {
        const next = { ...prev };
        delete next[key];
        persistOverrides(next);
        return next;
      });
    },
    [persistOverrides]
  );

  if (!ready) return null;

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, tArray, overrides, setOverride, removeOverride }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

/** Flatten a translation object into dot-notation key/value pairs */
export function flattenTranslations(obj: Record<string, unknown>, prefix = ''): { key: string; value: string }[] {
  const result: { key: string; value: string }[] = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      result.push({ key: fullKey, value: (v as string[]).join(', ') });
    } else if (typeof v === 'object' && v !== null) {
      result.push(...flattenTranslations(v as Record<string, unknown>, fullKey));
    } else if (typeof v === 'string') {
      result.push({ key: fullKey, value: v });
    }
  }
  return result;
}

/** Get all default translations for the current language as flat key/value */
export function getDefaultTranslations(language: SupportedLanguage): { key: string; value: string }[] {
  return flattenTranslations(translations[language] as unknown as Record<string, unknown>);
}
