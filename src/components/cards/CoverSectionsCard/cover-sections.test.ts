import { describe, expect, it } from 'vitest';
import type { Area } from '@hakit/core';
import { allTargets, isCoverOpen, resolveSections } from './cover-sections';

const area = (area_id: string, name: string, ids: string[]) =>
  ({ area_id, name, entities: ids.map(entity_id => ({ entity_id, state: 'open', attributes: {} })) }) as unknown as Area;

const areas = [area('cuisine', 'Cuisine', ['cover.cuisine_sud', 'light.plafond', 'cover.cuisine_est']), area('garage', 'Garage', [])];

describe('resolveSections', () => {
  it('prend les volets de la zone, et son nom comme titre', () => {
    expect(resolveSections([{ area: 'cuisine' }], areas)).toEqual([
      { name: 'Cuisine', covers: ['cover.cuisine_sud', 'cover.cuisine_est'] },
    ]);
  });

  it('les volets choisis à la main et le nom saisi l’emportent sur la zone', () => {
    expect(resolveSections([{ name: 'Sud', area: 'cuisine', covers: ['cover.cuisine_sud', ''] }], areas)).toEqual([
      { name: 'Sud', covers: ['cover.cuisine_sud'] },
    ]);
  });

  it('écarte une section sans volet', () => {
    expect(resolveSections([{ area: 'garage' }, { name: 'Vide', covers: [] }, { area: 'inconnue' }], areas)).toEqual([]);
    expect(resolveSections(undefined, areas)).toEqual([]);
  });
});

describe('allTargets', () => {
  const sections = [
    { name: 'A', covers: ['cover.a', 'cover.b'] },
    { name: 'B', covers: ['cover.b', 'cover.c'] },
  ];

  it('vise tous les volets de la card, sans doublon, quand rien n’est choisi', () => {
    expect(allTargets(undefined, sections)).toEqual(['cover.a', 'cover.b', 'cover.c']);
    expect(allTargets([''], sections)).toEqual(['cover.a', 'cover.b', 'cover.c']);
  });

  it('vise seulement les volets choisis', () => {
    expect(allTargets(['cover.z'], sections)).toEqual(['cover.z']);
  });
});

describe('isCoverOpen', () => {
  it('lit la position, sinon l’état', () => {
    expect(isCoverOpen({ state: 'open', attributes: { current_position: 0 } })).toBe(false);
    expect(isCoverOpen({ state: 'closed', attributes: { current_position: 5 } })).toBe(true);
    expect(isCoverOpen({ state: 'open', attributes: {} })).toBe(true);
    expect(isCoverOpen({ state: 'closed', attributes: {} })).toBe(false);
    expect(isCoverOpen(undefined)).toBe(false);
  });
});
