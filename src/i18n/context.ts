import { createContext } from 'react';
import type { SupportedLanguage } from './types';

// Contexte isolé dans un module qui n'importe aucun JSON de traduction : il
// n'est ainsi jamais réexécuté par le rechargement à chaud quand un fichier de
// `locales/` change (sinon le Provider monté et les composants rechargés
// ne partageraient plus le même contexte).
export interface I18nContextValue {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  tArray: (key: string) => string[];
  overrides: Record<string, string>;
  setOverride: (key: string, value: string) => void;
  removeOverride: (key: string) => void;
}

export const I18nContext = createContext<I18nContextValue | null>(null);
