import { useHass } from '@hakit/core';

interface SafeEntityState {
  state: string;
  attributes: Record<string, unknown>;
}

/**
 * Like `useEntity`, but returns `null` instead of throwing when the entity
 * does not exist in Home Assistant (unavailable, removed, typo in entity_id…).
 */
export function useSafeEntity(entityId: string): SafeEntityState | null {
  const entity = useHass(s => s.entities?.[entityId] ?? null);
  if (!entity) return null;
  return {
    state: entity.state,
    attributes: (entity.attributes as Record<string, unknown>) ?? {},
  };
}
