/**
 * Mock for @hakit/core — used exclusively in Storybook.
 * Provides realistic placeholder data so every component renders without
 * a live Home Assistant connection.
 */

import { MOCK_ENTITIES as _MOCK_ENTITIES } from '../../src/mocks/hassEntities';

export type EntityName = string;

type EntityState = (typeof _MOCK_ENTITIES)[string];

const ENTITIES: Record<string, EntityState> = _MOCK_ENTITIES;

const DEFAULT_ENTITY: EntityState = { entity_id: 'unknown', state: 'unavailable', attributes: {} };

// ─── Mock helpers ───────────────────────────────────────────────────────────

const mockHelpers = {
  callService: (_params: unknown) => {
    // no-op in Storybook
  },
};

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useEntity(entityId: EntityName): EntityState {
  return ENTITIES[entityId] ?? DEFAULT_ENTITY;
}

interface HassState {
  entities: typeof ENTITIES;
  helpers: typeof mockHelpers;
}

export function useHass(): HassState;
export function useHass<T>(selector: (s: HassState) => T): T;
export function useHass<T>(selector?: (s: HassState) => T): HassState | T {
  const state: HassState = { entities: ENTITIES, helpers: mockHelpers };
  return selector ? selector(state) : state;
}

// Le vrai `useHass` est un store zustand : `HAThrottlePatch` appelle
// `getState` / `setState` / `subscribe` dessus au montage. Sans ces méthodes le
// mock lève `useHass.getState is not a function` et **toute l'application**
// plante en mode mock — c'est ce qui empêchait la suite E2E de démarrer.
useHass.getState = (): HassState => ({ entities: ENTITIES, helpers: mockHelpers });
useHass.setState = (_partial: Partial<HassState>): void => {
  /* le jeu d'entités du mock est figé */
};
useHass.subscribe = (_listener: (s: HassState) => void): (() => void) => {
  // Rien n'évolue dans le mock : on rend un désabonnement inerte.
  return () => {};
};

// ─── useWeather ──────────────────────────────────────────────────────────────

interface ForecastEntry {
  datetime: string;
  condition?: string;
  temperature: number;
  templow?: number;
}

interface WeatherEntity extends EntityState {
  forecast?: { forecast: ForecastEntry[] };
}

export function useWeather(entityId: EntityName, _options?: { type?: 'daily' | 'hourly' }): WeatherEntity {
  const e = ENTITIES[entityId] ?? DEFAULT_ENTITY;
  return {
    ...e,
    forecast: {
      forecast: (e.attributes.forecast as ForecastEntry[] | undefined) ?? [],
    },
  };
}

// ─── Re-exports expected by consumers ───────────────────────────────────────

export function HassConnect({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// ─── Types used by CameraFeed ───────────────────────────────────────────────
export type FilterByDomain<T, _D extends string> = T;

// ─── useUser (EditButton checks is_admin) ───────────────────────────────────
export function useUser() {
  return { id: 'mock-user', name: 'Test User', is_admin: true, is_owner: true };
}

// ─── useAreas (RoomCard, AreaControlsField) ─────────────────────────────────
// Le registre des zones n'a pas d'équivalent côté mock : aucune zone, donc
// aucune commande dérivée. Les widgets configurés à la main restent intacts.
export interface Area {
  area_id: string;
  name: string;
  picture: string | null;
  icon: string | null;
  floor_id: string | null;
  temperature_entity_id: string | null;
  humidity_entity_id: string | null;
  entities: { entity_id: string; state: string; attributes: Record<string, unknown> }[];
}

export function useAreas(): Area[] {
  return [];
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
