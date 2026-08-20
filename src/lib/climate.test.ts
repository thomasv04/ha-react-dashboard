import { describe, it, expect } from 'vitest';
import { climateRange, snapTemp, CLIMATE_FALLBACK } from './climate';

/**
 * Le cas qui a motivé ce fichier : une jauge réglée 10–30 sur un thermostat qui
 * n'accepte que 16–24. Glisser au sommet envoyait 24,5, Home Assistant
 * répondait `service_validation_error` / `temp_out_of_range`, et la promesse
 * non rattrapée finissait en `Uncaught (in promise)` — invisible sur la
 * tablette murale, pendant que le thermostat ne bougeait pas.
 */

describe('climateRange', () => {
  it("borne la plage d'affichage par celle de l'entité", () => {
    const r = climateRange({ min_temp: 16, max_temp: 24 }, 10, 30);
    expect(r).toMatchObject({ min: 16, max: 24 });
  });

  it("respecte une plage d'affichage plus étroite que l'entité", () => {
    // L'utilisateur veut une jauge fine : rien ne l'en empêche, HA l'accepte.
    const r = climateRange({ min_temp: 7, max_temp: 35 }, 18, 22);
    expect(r).toMatchObject({ min: 18, max: 22 });
  });

  it("retombe sur l'entité quand les deux plages sont disjointes", () => {
    // Jauge 25–30 sur un thermostat 16–24 : l'intersection est vide, et une
    // jauge inversée serait inutilisable.
    const r = climateRange({ min_temp: 16, max_temp: 24 }, 25, 30);
    expect(r).toMatchObject({ min: 16, max: 24 });
  });

  it("lit le pas de l'entité", () => {
    expect(climateRange({ target_temp_step: 1 }).step).toBe(1);
  });

  it('ignore un pas nul — il rendrait tout arrondi infini', () => {
    expect(climateRange({ target_temp_step: 0 }).step).toBe(CLIMATE_FALLBACK.step);
  });

  it('se contente des valeurs de repli quand un thermostat ne publie rien', () => {
    expect(climateRange(undefined)).toEqual(CLIMATE_FALLBACK);
    expect(climateRange({})).toEqual(CLIMATE_FALLBACK);
  });

  it('ignore un attribut non numérique plutôt que de produire un NaN', () => {
    expect(climateRange({ min_temp: 'unknown', max_temp: null })).toEqual(CLIMATE_FALLBACK);
  });
});

describe('snapTemp', () => {
  const range = { min: 16, max: 24, step: 0.5 };

  it('arrondit au pas', () => {
    expect(snapTemp(20.3, range)).toBe(20.5);
    expect(snapTemp(20.1, range)).toBe(20);
  });

  it('ne dépasse jamais les bornes — le bug rapporté', () => {
    expect(snapTemp(24.5, range)).toBe(24);
    expect(snapTemp(99, range)).toBe(24);
    expect(snapTemp(-5, range)).toBe(16);
  });

  it("pince après l'arrondi, pas avant", () => {
    // Un maximum de 24,3 arrondi au demi-degré donnerait 24,5 : exactement la
    // valeur que HA refuse. L'ordre des deux opérations est le correctif.
    expect(snapTemp(24.3, { min: 16, max: 24.3, step: 0.5 })).toBe(24.3);
  });

  it('respecte un thermostat au degré entier', () => {
    expect(snapTemp(21.4, { min: 16, max: 24, step: 1 })).toBe(21);
    expect(snapTemp(21.6, { min: 16, max: 24, step: 1 })).toBe(22);
  });

  it('ne renvoie pas de flottant sale', () => {
    // 0,1 × 3 = 0,30000000000000004 : HA compare des nombres, autant lui en
    // envoyer un propre.
    expect(snapTemp(20.31, { min: 16, max: 24, step: 0.1 })).toBe(20.3);
  });
});
