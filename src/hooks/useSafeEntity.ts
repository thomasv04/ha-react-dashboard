import { useHass } from '@hakit/core';
import { useRef } from 'react';

export interface SafeEntityState {
  state: string;
  attributes: Record<string, unknown>;
}

function shallowEqualEntity(a: SafeEntityState | null, b: SafeEntityState | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  if (a.state !== b.state) return false;
  const ak = Object.keys(a.attributes);
  const bk = Object.keys(b.attributes);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (a.attributes[k] !== b.attributes[k]) return false;
  }
  return true;
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
    // eslint-disable-next-line react-hooks/refs
    if (stableRef.current !== null) stableRef.current = null;
    return null;
  }

  const next: SafeEntityState = {
    state: raw.state,
    attributes: (raw.attributes as Record<string, unknown>) ?? {},
  };

  // eslint-disable-next-line react-hooks/refs
  if (!shallowEqualEntity(stableRef.current, next)) {
    // eslint-disable-next-line react-hooks/refs
    stableRef.current = next;
  }

  // eslint-disable-next-line react-hooks/refs
  return stableRef.current;
}
