/**
 * Mock for @hakit/core — used for Playwright dashboard E2E tests.
 * Re-exports the Storybook mock and adds missing hooks: useUser, useCamera, useAreas.
 *
 * Tout ce que le dashboard importe de `@hakit/core` doit exister ici : cet
 * alias remplace le paquet entier, et un export manquant fait échouer le
 * module — donc la page entière, sans le moindre widget.
 */
export { useEntity, useHass, useWeather, HassConnect, useAreas } from '../../.storybook/mocks/hakit-core';
export type { EntityName, Area } from '../../.storybook/mocks/hakit-core';

// ─── Types used by CameraFeed ───────────────────────────────────────────────
export type FilterByDomain<T, _D extends string> = T;

// ─── useUser (EditButton checks is_admin) ───────────────────────────────────
export function useUser() {
  return { id: 'mock-user', name: 'Test User', is_admin: true, is_owner: true };
}

// ─── useCamera (CameraFeed component) ───────────────────────────────────────
export function useCamera(_entityId: string, _options?: { poster?: boolean }) {
  return {
    entity_id: _entityId,
    state: 'idle',
    attributes: {},
    stream: { url: '' },
    mjpeg: { url: '', shouldRenderMJPEG: false },
  };
}
