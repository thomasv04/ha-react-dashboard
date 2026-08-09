import { useEffect, useRef } from 'react';
import { useHass } from '@hakit/core';
import type { HassEntities } from 'home-assistant-js-websocket';

const CACHE_KEY = 'ha_dashboard_entity_snapshot';
const CACHE_TTL_MS = 5 * 60_000;
const CACHE_WRITE_INTERVAL_MS = 30_000;

function loadCache(): HassEntities | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw) as { ts: number; data: HassEntities };
    if (Date.now() - ts > CACHE_TTL_MS) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveEntityCache(entities: HassEntities): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: entities }));
  } catch {
    // Storage full / private mode
  }
}

export function loadEntityCache(): HassEntities | null {
  return loadCache();
}

/**
 * Saves entity snapshots to sessionStorage in a debounced way so the
 * dashboard can hydrate instantly on the next page load.
 *
 * On mount, pre-populates the Zustand store from the cached snapshot so
 * cards render immediately while the WebSocket connection is establishing.
 */
export function HAThrottlePatch() {
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Hydrate from cache so cards render instantly before WS arrives
    const cached = loadCache();
    if (cached && Object.keys(cached).length > 0) {
      useHass.setState({ entities: cached });
    }

    // Write cache on first load with whatever is already in the store
    const initial = useHass.getState().entities;
    if (initial && Object.keys(initial).length > 0) {
      saveEntityCache(initial);
    }

    // Throttle — *pas* un debounce. Le store reçoit des updates en continu :
    // un debounce voyait son timer réarmé à chaque message et n'écrivait donc
    // jamais le cache. Ici : au plus une écriture par CACHE_WRITE_INTERVAL_MS.
    // (La forme `subscribe(selector, listener)` utilisée avant nécessite le
    // middleware `subscribeWithSelector`, absent du store @hakit : le second
    // argument était ignoré et le listener recevait le state complet.)
    let lastWrite = Date.now();
    const unsubscribe = useHass.subscribe(state => {
      if (!state.entities || Object.keys(state.entities).length === 0) return;
      if (saveTimerRef.current != null) return; // écriture déjà programmée
      saveTimerRef.current = setTimeout(
        () => {
          saveTimerRef.current = null;
          lastWrite = Date.now();
          // La sérialisation de toutes les entités bloque le thread principal :
          // on la repousse dans un créneau d'inactivité pour éviter le à-coup.
          const write = () => saveEntityCache(useHass.getState().entities);
          if (typeof requestIdleCallback === 'function') requestIdleCallback(write, { timeout: 2_000 });
          else write();
        },
        Math.max(0, CACHE_WRITE_INTERVAL_MS - (Date.now() - lastWrite))
      );
    });

    return () => {
      unsubscribe();
      if (saveTimerRef.current != null) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return null;
}
