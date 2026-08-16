import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AutoThemeConfig } from '@/context/ThemeContext';

const setTheme = vi.fn();
let autoTheme: AutoThemeConfig;
let themeId = 'dark';
let entities: Record<string, { state?: string }> = {};

vi.mock('@hakit/core', () => ({ useHass: () => ({ entities }) }));
vi.mock('@/context/ThemeContext', () => ({ useTheme: () => ({ autoTheme, setTheme, themeId }) }));

import { useAutoTheme } from './useAutoTheme';

const BASE: AutoThemeConfig = { enabled: true, lightTheme: 'light', darkTheme: 'dark' };

function run(cfg: Partial<AutoThemeConfig>, state: Record<string, { state?: string }>, current = 'dark') {
  autoTheme = { ...BASE, ...cfg };
  entities = state;
  themeId = current;
  renderHook(() => useAutoTheme());
}

beforeEach(() => vi.clearAllMocks());

describe('useAutoTheme', () => {
  it('ne fait rien quand la bascule est désactivée', () => {
    run({ enabled: false }, { 'sun.sun': { state: 'above_horizon' } });
    expect(setTheme).not.toHaveBeenCalled();
  });

  describe('via le soleil', () => {
    it('passe au thème de jour au lever', () => {
      run({}, { 'sun.sun': { state: 'above_horizon' } });
      expect(setTheme).toHaveBeenCalledWith('light');
    });

    it('reste sur le thème de nuit sous l\'horizon', () => {
      run({}, { 'sun.sun': { state: 'below_horizon' } });
      expect(setTheme).not.toHaveBeenCalled(); // déjà en 'dark'
    });

    it('ne fait rien sans entité soleil', () => {
      run({}, {});
      expect(setTheme).not.toHaveBeenCalled();
    });
  });

  describe('via un capteur de luminosité', () => {
    it("l'emporte sur le soleil — c'est un choix explicite, et plus précis", () => {
      // Il fait jour astronomiquement, mais la pièce est sombre (volets fermés).
      run({ illuminanceEntity: 'sensor.lux', illuminanceThreshold: 50 }, { 'sun.sun': { state: 'above_horizon' }, 'sensor.lux': { state: '5' } }, 'light');
      expect(setTheme).toHaveBeenCalledWith('dark');
    });

    it('bascule en jour au-dessus du seuil', () => {
      run({ illuminanceEntity: 'sensor.lux', illuminanceThreshold: 50 }, { 'sensor.lux': { state: '120' } });
      expect(setTheme).toHaveBeenCalledWith('light');
    });

    it('respecte un seuil personnalisé', () => {
      run({ illuminanceEntity: 'sensor.lux', illuminanceThreshold: 300 }, { 'sensor.lux': { state: '120' } }, 'light');
      expect(setTheme).toHaveBeenCalledWith('dark');
    });

    it('utilise le seuil par défaut quand la config n\'en a pas', () => {
      // Cas d'une configuration exportée avant la 2.2.0.
      run({ illuminanceEntity: 'sensor.lux' }, { 'sensor.lux': { state: '120' } });
      expect(setTheme).toHaveBeenCalledWith('light');
    });

    it('ne bascule pas sur une valeur illisible', () => {
      // `unavailable` au démarrage de HA ne doit pas faire changer l'écran sous
      // les yeux de l'utilisateur.
      run({ illuminanceEntity: 'sensor.lux' }, { 'sensor.lux': { state: 'unavailable' } }, 'light');
      expect(setTheme).not.toHaveBeenCalled();

      run({ illuminanceEntity: 'sensor.absent' }, {}, 'light');
      expect(setTheme).not.toHaveBeenCalled();
    });
  });
});
