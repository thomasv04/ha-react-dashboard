import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HassEntity } from 'home-assistant-js-websocket';

let entityStore: Record<string, HassEntity> = {};
vi.mock('@hakit/core', () => ({
  useHass: (sel: (s: { entities: typeof entityStore }) => unknown) => sel({ entities: entityStore }),
}));

import { useEntitiesByDomain } from './useEntities';

const person = (overrides: Partial<HassEntity> = {}, attributes: Record<string, unknown> = {}): HassEntity =>
  ({
    entity_id: 'person.alice',
    state: 'home',
    last_changed: '2026-11-01T08:00:00Z',
    last_updated: '2026-11-01T08:00:00Z',
    context: { id: '1', parent_id: null, user_id: null },
    attributes: { friendly_name: 'Alice', entity_picture: '/a.png', ...attributes },
    ...overrides,
  }) as HassEntity;

describe('useEntitiesByDomain', () => {
  beforeEach(() => {
    entityStore = { 'person.alice': person(), 'light.salon': { ...person(), entity_id: 'light.salon' } };
  });

  it('ne garde que le domaine demandé', () => {
    const { result } = renderHook(() => useEntitiesByDomain('person'));
    expect(result.current.map(e => e.entity_id)).toEqual(['person.alice']);
  });

  it('un changement d’attribut seul (last_updated avance) renvoie un nouveau tableau', () => {
    const { result, rerender } = renderHook(() => useEntitiesByDomain('person'));
    const before = result.current;

    entityStore = {
      ...entityStore,
      'person.alice': person({ last_updated: '2026-11-01T09:00:00Z' }, { entity_picture: '/b.png' }),
    };
    rerender();

    expect(result.current).not.toBe(before);
    expect(result.current[0].attributes.entity_picture).toBe('/b.png');
  });

  it('un nouvel objet identique (même last_updated) garde le tableau précédent : pas de re-rendu', () => {
    const { result, rerender } = renderHook(() => useEntitiesByDomain('person'));
    const before = result.current;

    entityStore = { ...entityStore, 'person.alice': person({ last_reported: '2026-11-01T09:00:00Z' } as Partial<HassEntity>) };
    rerender();

    expect(result.current).toBe(before);
  });

  it('sans last_updated, retombe sur la comparaison des attributs', () => {
    entityStore = { 'person.alice': person({ last_updated: undefined }) };
    const { result, rerender } = renderHook(() => useEntitiesByDomain('person'));
    const before = result.current;

    entityStore = { 'person.alice': person({ last_updated: undefined }) };
    rerender();
    expect(result.current).toBe(before);

    entityStore = { 'person.alice': person({ last_updated: undefined }, { friendly_name: 'Alice B.' }) };
    rerender();
    expect(result.current).not.toBe(before);
    expect(result.current[0].attributes.friendly_name).toBe('Alice B.');
  });
});
