import { useContext, useMemo } from 'react';
import { useI18n } from '@/i18n';
import { ThemeContext, DEFAULT_REGIONAL_SETTINGS } from '@/context/ThemeContext';
import type { RegionalSettings } from '@/context/ThemeContext';

/**
 * Formatage de l'heure, des dates et des températures.
 *
 * Chaque card appelait `toLocaleTimeString(language, …)` de son côté, avec ses
 * propres options. Résultat : aucun moyen de choisir le format 12 h, et un
 * `'fr-FR'` codé en dur avait pu s'y glisser sans que rien ne le signale.
 *
 * Un seul endroit lit les réglages régionaux — les cards ne connaissent que ces
 * fonctions.
 */

/** Options de date par niveau de détail choisi. */
const DATE_OPTIONS: Record<RegionalSettings['dateStyle'], Intl.DateTimeFormatOptions> = {
  short: { day: 'numeric', month: 'numeric' },
  medium: { weekday: 'short', day: 'numeric', month: 'short' },
  long: { weekday: 'long', day: 'numeric', month: 'long' },
};

export interface Formats {
  /** Locale effective — à passer à `Intl` pour tout ce qui n'est pas couvert ici. */
  locale: string;
  /** `true` si l'affichage doit être en 12 h. */
  hour12: boolean;
  /** 0 = dimanche, 1 = lundi. */
  firstDayOfWeek: number;
  formatTime: (date: Date, opts?: { seconds?: boolean }) => string;
  formatDate: (date: Date, style?: RegionalSettings['dateStyle']) => string;
  /** Convertit et suffixe une température exprimée en °C. */
  formatTemperature: (celsius: number, opts?: { decimals?: number }) => string;
}

/** Premier jour de la semaine de la locale, avec repli sur lundi. */
function localeFirstDay(locale: string): number {
  // `getWeekInfo` n'existe pas partout (Firefox à ce jour). Le repli sur lundi
  // vaut pour l'Europe, d'où vient l'essentiel des utilisateurs de HA ; les
  // locales anglophones passent par la branche du dessus quand elle existe.
  const info = (new Intl.Locale(locale) as unknown as { getWeekInfo?: () => { firstDay: number } }).getWeekInfo?.();
  // `Intl` numérote 1 = lundi … 7 = dimanche ; on rend 0 = dimanche.
  return info ? info.firstDay % 7 : 1;
}

export function useFormats(): Formats {
  const { language } = useI18n();
  // `useContext` plutôt que `useTheme`, qui lève hors fournisseur : formater
  // une date ne devrait pas exiger tout le contexte de thème. Une card montée
  // isolément — test, Storybook, aperçu de la modale d'édition — affiche ses
  // dates au format par défaut au lieu de planter.
  const regionalSettings = useContext(ThemeContext)?.regionalSettings ?? DEFAULT_REGIONAL_SETTINGS;

  return useMemo(() => {
    const locale = language;
    const hour12 = regionalSettings.hourFormat === 'auto' ? undefined : regionalSettings.hourFormat === '12';

    const resolvedHour12 =
      hour12 ??
      // `hourCycle` de la locale : `h11`/`h12` = matin/après-midi, `h23`/`h24` = 24 h.
      new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 ??
      false;

    return {
      locale,
      hour12: resolvedHour12,
      firstDayOfWeek: regionalSettings.firstDayOfWeek === 'auto' ? localeFirstDay(locale) : regionalSettings.firstDayOfWeek,

      formatTime: (date, opts) =>
        date.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
          ...(opts?.seconds ? { second: '2-digit' } : {}),
          hour12: resolvedHour12,
        }),

      formatDate: (date, style) => date.toLocaleDateString(locale, DATE_OPTIONS[style ?? regionalSettings.dateStyle]),

      formatTemperature: (celsius, opts) => {
        const decimals = opts?.decimals ?? 1;
        if (regionalSettings.tempUnit === 'F') {
          return `${((celsius * 9) / 5 + 32).toFixed(decimals)} °F`;
        }
        // `auto` conserve l'unité telle que Home Assistant la fournit — c'est
        // lui qui fait autorité sur le système d'unités de l'installation.
        return `${celsius.toFixed(decimals)} °C`;
      },
    };
  }, [language, regionalSettings]);
}
