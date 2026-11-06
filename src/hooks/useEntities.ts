import { useHass } from '@hakit/core';
import { useRef } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';

type PickedEntities<K extends string> = Record<K, HassEntity | undefined>;

/** Même état, mêmes attributs (comparaison superficielle) : de quoi éviter un rendu. */
export function shallowEqualEntity<E extends { state: string; attributes?: unknown }>(
  a: E | null | undefined,
  b: E | null | undefined
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.state !== b.state) return false;
  // `?? {}` : une entité partiellement hydratée (ou un mock) peut arriver sans
  // `attributes`, et `Object.keys(undefined)` faisait tomber toute la card.
  const aAttr = (a.attributes ?? {}) as Record<string, unknown>;
  const bAttr = (b.attributes ?? {}) as Record<string, unknown>;
  const ak = Object.keys(aAttr);
  const bk = Object.keys(bAttr);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (aAttr[k] !== bAttr[k]) return false;
  }
  return true;
}

/**
 * Subscribe to a fixed list of entity IDs from the HA store.
 * Only re-renders when one of the watched entities actually changes state
 * or attributes — not on every WebSocket message for unrelated entities.
 *
 * The returned object reference is stable across renders when no watched
 * entity changed (Zustand equality comparison handles this).
 *
 * Usage:
 *   const entities = useEntities(['light.salon', 'sensor.temp']);
 *   entities['light.salon']?.state
 */
export function useEntities<K extends string>(entityIds: K[]): PickedEntities<K> {
  // Stable ref so the selector closure always sees the latest ids
  // without the selector function itself changing identity each render.
  const idsRef = useRef(entityIds);
  // eslint-disable-next-line react-hooks/refs
  idsRef.current = entityIds;

  // Stable cache ref — we return the same object reference as long as
  // none of the watched entities changed, satisfying Zustand's snapshot rule.
  const cacheRef = useRef<PickedEntities<K> | null>(null);

  // Pas de second argument d'égalité : le store @hakit est un `UseBoundStore`
  // zustand v5, qui n'en accepte plus. Il était ignoré — l'identité stable est
  // assurée par `cacheRef` ci-dessus, comparée par `Object.is`.
  return useHass(s => {
    const prev = cacheRef.current;
    let changed = prev === null;

    const next = {} as PickedEntities<K>;
    for (const id of idsRef.current) {
      next[id] = s.entities?.[id] as HassEntity | undefined;
      if (!changed && !shallowEqualEntity(prev![id], next[id])) {
        changed = true;
      }
    }

    if (!changed) return prev!;
    cacheRef.current = next;
    return next;
  });
}

/**
 * Même entité, inchangée depuis le dernier passage ?
 *
 * Home Assistant fait avancer `last_updated` à chaque changement d'état **ou
 * d'attribut** (`entity_picture`, `friendly_name`…), mais pas pour un simple
 * relevé identique (c'est `last_reported` qui bouge alors) : le comparer suffit
 * à suivre les attributs sans re-rendre à chaque message du WebSocket.
 * Une entité sans `last_updated` (mock, entrée partiellement hydratée) retombe
 * sur la comparaison superficielle des attributs.
 */
function sameDomainEntity(a: HassEntity, b: HassEntity): boolean {
  if (a === b) return true;
  if (a.entity_id !== b.entity_id || a.state !== b.state) return false;
  if (a.last_updated && b.last_updated) return a.last_updated === b.last_updated;
  return shallowEqualEntity(a, b);
}

/**
 * Subscribe to all entities whose entity_id matches a domain prefix.
 * Re-renders when the set of entities, their states or their attributes change
 * (cf. `sameDomainEntity`).
 */
export function useEntitiesByDomain(domain: string): HassEntity[] {
  const cacheRef = useRef<HassEntity[] | null>(null);

  const prefix = `${domain}.`;

  return useHass(s => {
    // Le filtrage porte sur la **clé** du store, pas sur `entity.entity_id` :
    // le store est indexé par identifiant, et une entrée partiellement hydratée
    // sans `entity_id` faisait planter tout le composant appelant.
    const next: HassEntity[] = [];
    for (const [id, entity] of Object.entries(s.entities ?? {})) {
      if (!entity || !id.startsWith(prefix)) continue;
      next.push(entity.entity_id ? entity : ({ ...entity, entity_id: id } as HassEntity));
    }

    const prev = cacheRef.current;
    if (prev !== null && prev.length === next.length && prev.every((e, i) => sameDomainEntity(e, next[i]))) {
      return prev;
    }
    cacheRef.current = next;
    return next;
  });
}
