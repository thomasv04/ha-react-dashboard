import { useHass } from '@hakit/core';
import { useRef } from 'react';
import type { HassEntity } from 'home-assistant-js-websocket';

type PickedEntities<K extends string> = Record<K, HassEntity | undefined>;

function shallowEqualEntity(a: HassEntity | undefined, b: HassEntity | undefined): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.state !== b.state) return false;
  const aAttr = a.attributes as Record<string, unknown>;
  const bAttr = b.attributes as Record<string, unknown>;
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
  idsRef.current = entityIds;

  // Stable cache ref — we return the same object reference as long as
  // none of the watched entities changed, satisfying Zustand's snapshot rule.
  const cacheRef = useRef<PickedEntities<K> | null>(null);

  return useHass(
    s => {
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
    },
    // Zustand equality: always return true — we manage identity ourselves above.
    () => true
  );
}

/**
 * Subscribe to all entities whose entity_id matches a domain prefix.
 * Only re-renders when the set of entities or their states change.
 */
export function useEntitiesByDomain(domain: string): HassEntity[] {
  const cacheRef = useRef<HassEntity[] | null>(null);

  return useHass(
    s => {
      const next = Object.values(s.entities ?? {}).filter(e => e.entity_id.startsWith(`${domain}.`));
      const prev = cacheRef.current;
      if (
        prev !== null &&
        prev.length === next.length &&
        prev.every((e, i) => e.state === next[i].state && e.entity_id === next[i].entity_id)
      ) {
        return prev;
      }
      cacheRef.current = next;
      return next;
    },
    () => true
  );
}
