import { useHass } from '@hakit/core';
import { useRef } from 'react';
import { shallowEqualEntity } from './useEntities';

export interface SafeEntityState {
  state: string;
  attributes: Record<string, unknown>;
  /** Dernier changement d'état. Ne bouge qu'avec `state` : la comparaison l'ignore. */
  last_changed?: string;
}

/**
 * Like `useEntity`, but:
 * - returns `null` instead of throwing when the entity doesn't exist
 * - uses shallow attribute comparison to suppress re-renders when nothing changed
 */
export function useSafeEntity(entityId: string): SafeEntityState | null {
  const raw = useHass(s => s.entities?.[entityId] ?? null);
  const stableRef = useRef<SafeEntityState | null>(null);

  if (!raw) {
    if (stableRef.current !== null) stableRef.current = null;
    return null;
  }

  const next: SafeEntityState = {
    state: raw.state,
    attributes: (raw.attributes as Record<string, unknown>) ?? {},
    last_changed: raw.last_changed,
  };

  // eslint-disable-next-line react-hooks/refs
  if (!shallowEqualEntity(stableRef.current, next)) {
    // eslint-disable-next-line react-hooks/refs
    stableRef.current = next;
  }

  // eslint-disable-next-line react-hooks/refs
  return stableRef.current;
}
