import { describe, it, expect } from 'vitest';
import type { Area } from '@hakit/core';
import { buildAreaControls, areaDomains } from './useAreaControls';

const entity = (id: string, state: string, name?: string) =>
  ({ entity_id: id, state, attributes: name ? { friendly_name: name } : {} }) as unknown as Area['entities'][number];

const AREA = {
  area_id: 'cuisine',
  name: 'Cuisine',
  entities: [
    entity('light.bandeau_led', 'off', 'Bandeau LED'),
    entity('light.plafond', 'on'),
    entity('cover.volet', 'open'),
    entity('sensor.temperature', '24'),
  ],
} as unknown as Area;

const label = (d: string) => `[${d}]`;

describe('buildAreaControls', () => {
  it('ne rend rien sans zone ni jetons', () => {
    expect(buildAreaControls(undefined, ['light'], label)).toEqual([]);
    expect(buildAreaControls(AREA, [], label)).toEqual([]);
  });

  it('un jeton de domaine vise la zone entière et regroupe ses entités', () => {
    const [ctrl] = buildAreaControls(AREA, ['light'], label);
    expect(ctrl).toMatchObject({
      label: '[light]',
      domain: 'homeassistant',
      service: 'toggle',
      areaId: 'cuisine',
      stateEntities: ['light.bandeau_led', 'light.plafond'],
    });
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
