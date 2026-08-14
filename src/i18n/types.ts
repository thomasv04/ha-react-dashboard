import type commonEn from './locales/en/common.json';
import type dashboardEn from './locales/en/dashboard.json';
import type widgetsEn from './locales/en/widgets.json';
import type panelsEn from './locales/en/panels.json';
import type settingsEn from './locales/en/settings.json';
import type layoutEn from './locales/en/layout.json';
import type activityBarEn from './locales/en/activityBar.json';
import type tourEn from './locales/en/tour.json';
import type helpEn from './locales/en/help.json';
import type releaseNotesEn from './locales/en/releaseNotes.json';

export interface TranslationKeys {
  common: typeof commonEn;
  dashboard: typeof dashboardEn;
  widgets: typeof widgetsEn;
  panels: typeof panelsEn;
  settings: typeof settingsEn;
  layout: typeof layoutEn;
  activityBar: typeof activityBarEn;
  tour: typeof tourEn;
  help: typeof helpEn;
  releaseNotes: typeof releaseNotesEn;
}

export type SupportedLanguage = 'en' | 'fr';

export const SUPPORTED_LANGUAGES: { code: SupportedLanguage; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
];

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';
