import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { RegionalSettings } from '@/context/ThemeContext';

const DEFAULTS: RegionalSettings = { hourFormat: 'auto', dateStyle: 'medium', tempUnit: 'auto', firstDayOfWeek: 'auto' };

let regionalSettings: RegionalSettings = DEFAULTS;
let language = 'fr';

vi.mock('@/i18n', () => ({ useI18n: () => ({ language }) }));

import { createElement, type ReactNode } from 'react';
import { ThemeContext } from '@/context/ThemeContext';
import { useFormats } from './useFormats';

/**
 * Vrai fournisseur, pas un mock : `useFormats` lit le contexte directement
 * pour rester utilisable hors fournisseur, et c'est ce câblage-là qu'on veut
 * vérifier.
 */
function formats(settings: Partial<RegionalSettings> = {}, lang = 'fr') {
  regionalSettings = { ...DEFAULTS, ...settings };
  language = lang;
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(ThemeContext.Provider, { value: { regionalSettings } as never }, children);
  return renderHook(() => useFormats(), { wrapper }).result.current;
}

/** 14 h 05, un mercredi. */
const AFTERNOON = new Date(2026, 7, 12, 14, 5, 30);

describe('useFormats', () => {
  describe('heure', () => {
    it('suit la locale en mode auto', () => {
      expect(formats({}, 'fr').hour12).toBe(false);
      expect(formats({}, 'en').hour12).toBe(true);
    });

    it('force le 24 h même sur une locale anglophone', () => {
      const f = formats({ hourFormat: '24' }, 'en');
      expect(f.hour12).toBe(false);
      expect(f.formatTime(AFTERNOON)).toContain('14');
    });

    it('force le 12 h même sur une locale francophone', () => {
      const f = formats({ hourFormat: '12' }, 'fr');
      expect(f.hour12).toBe(true);
      expect(f.formatTime(AFTERNOON)).toMatch(/2[:h]05/);
    });

    it("n'affiche les secondes que si on les demande", () => {
      const f = formats({ hourFormat: '24' });
      expect(f.formatTime(AFTERNOON)).not.toContain('30');
      expect(f.formatTime(AFTERNOON, { seconds: true })).toContain('30');
    });
  });

  describe('date', () => {
    it('rend un libellé de plus en plus détaillé selon le style', () => {
      const f = formats({}, 'fr');
      const court = f.formatDate(AFTERNOON, 'short');
      const long = f.formatDate(AFTERNOON, 'long');

      expect(long.length).toBeGreaterThan(court.length);
      expect(long.toLowerCase()).toContain('août');
    });

    it('utilise le style configuré quand aucun n\'est passé', () => {
      const f = formats({ dateStyle: 'long' }, 'fr');
      expect(f.formatDate(AFTERNOON)).toBe(f.formatDate(AFTERNOON, 'long'));
    });
  });

  describe('température', () => {
    it('laisse les degrés Celsius intacts par défaut', () => {
      expect(formats().formatTemperature(21.35)).toBe('21.4 °C');
    });

    it('convertit en Fahrenheit quand on le demande', () => {
      // 20 °C = 68 °F, la conversion la plus facile à vérifier de tête.
      expect(formats({ tempUnit: 'F' }).formatTemperature(20, { decimals: 0 })).toBe('68 °F');
    });

    it('respecte le nombre de décimales demandé', () => {
      expect(formats().formatTemperature(21.349, { decimals: 2 })).toBe('21.35 °C');
    });
  });

  it('fonctionne hors fournisseur de thème, aux valeurs par défaut', () => {
    // Une card montée isolément (test, Storybook, aperçu d'édition) doit
    // afficher ses dates, pas planter.
    language = 'fr';
    const f = renderHook(() => useFormats()).result.current;
    expect(f.formatTime(AFTERNOON)).toContain('14');
  });

  describe('premier jour de la semaine', () => {
    it('accepte un choix explicite', () => {
      expect(formats({ firstDayOfWeek: 0 }).firstDayOfWeek).toBe(0);
      expect(formats({ firstDayOfWeek: 1 }).firstDayOfWeek).toBe(1);
    });

    it('rend un jour valide en mode auto, même si le navigateur ne sait pas', () => {
      // `getWeekInfo` n'existe pas partout : le repli ne doit pas rendre `NaN`.
      const day = formats({}, 'fr').firstDayOfWeek;
      expect(day).toBeGreaterThanOrEqual(0);
      expect(day).toBeLessThanOrEqual(6);
    });
  });
});
