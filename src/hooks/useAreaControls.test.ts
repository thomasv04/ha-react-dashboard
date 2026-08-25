import { describe, it, expect } from 'vitest';
import type { Area } from '@hakit/core';
import { buildAreaControls, areaDomains, areaEntityIds, areaSensor } from './useAreaControls';

const entity = (id: string, state: string, name?: string, deviceClass?: string) =>
  ({
    entity_id: id,
    state,
    attributes: { ...(name ? { friendly_name: name } : {}), ...(deviceClass ? { device_class: deviceClass } : {}) },
  }) as unknown as Area['entities'][number];

const AREA = {
  area_id: 'cuisine',
  name: 'Cuisine',
  entities: [
    entity('light.bandeau_led', 'off', 'Bandeau LED'),
    entity('light.plafond', 'on'),
    entity('cover.volet', 'open'),
    entity('sensor.temperature', '24', undefined, 'temperature'),
    entity('sensor.humidite', '52', undefined, 'humidity'),
  ],
} as unknown as Area;

const label = (d: string) => `[${d}]`;

describe('buildAreaControls', () => {
  it('ne rend rien sans zone ni jetons', () => {
    expect(buildAreaControls(undefined, ['light'], label)).toEqual([]);
    expect(buildAreaControls(AREA, [], label)).toEqual([]);
  });

  it('un jeton de domaine regroupe les entités de ce domaine, et elles seules', () => {
    const [ctrl] = buildAreaControls(AREA, ['light'], label);
    expect(ctrl).toMatchObject({
      label: '[light]',
      domain: 'homeassistant',
      service: 'toggle',
      entityIds: ['light.bandeau_led', 'light.plafond'],
    });
    // Pas de cible `area_id` : `homeassistant.toggle` y basculerait aussi le volet.
    expect(ctrl.entityIds).not.toContain('cover.volet');
    expect(ctrl.entityId).toBeUndefined();
  });

  it('un volet ouvert se ferme, il ne se bascule pas', () => {
    const [ctrl] = buildAreaControls(AREA, ['cover'], label);
    expect(ctrl).toMatchObject({ domain: 'cover', service: 'close_cover' });
  });

  it('un jeton d’entité vise cette entité et porte son nom', () => {
    const [ctrl] = buildAreaControls(AREA, ['light.bandeau_led'], label);
    expect(ctrl).toMatchObject({ label: 'Bandeau LED', entityId: 'light.bandeau_led', stateEntity: 'light.bandeau_led' });
  });

  it('ignore un jeton absent de la zone', () => {
    expect(buildAreaControls(AREA, ['light.ailleurs', 'fan'], label)).toEqual([]);
  });
});

describe('areaDomains', () => {
  it('ne liste que les domaines pilotables présents', () => {
    expect(areaDomains(AREA)).toEqual(['light', 'cover']);
  });
});

describe('areaEntityIds', () => {
  // La card Pièce n'en dérivait pas ses lumières : il fallait les désigner une
  // à une alors qu'elles étaient déjà rangées dans la zone côté HA.
  it("liste les entités d'un domaine dans la zone", () => {
    expect(areaEntityIds(AREA, 'light')).toEqual(['light.bandeau_led', 'light.plafond']);
    expect(areaEntityIds(AREA, 'fan')).toEqual([]);
    expect(areaEntityIds(undefined, 'light')).toEqual([]);
  });
});

describe('areaSensor', () => {
  // Repli quand la zone ne désigne pas explicitement son capteur : sans lui,
  // une zone équipée n'affichait rien tant que personne ne l'avait renseigné
  // des deux côtés.
  it('trouve le capteur par sa classe', () => {
    expect(areaSensor(AREA, 'temperature')).toBe('sensor.temperature');
    expect(areaSensor(AREA, 'humidity')).toBe('sensor.humidite');
  });

  it('ne rend rien pour une classe absente', () => {
    expect(areaSensor(AREA, 'illuminance')).toBeUndefined();
    expect(areaSensor(undefined, 'temperature')).toBeUndefined();
  });
});
