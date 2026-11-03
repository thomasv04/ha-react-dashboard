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

// Nombre + unité, comme le vrai formateur pour un capteur ; les libellés par
// `device_class` viennent de HA, que le mock n'a pas.
const mockFormatter = {
  stateValue: (entity: { state: string; attributes?: Record<string, unknown> }) => {
    const unit = entity.attributes?.unit_of_measurement;
    return unit ? `${entity.state} ${unit}` : entity.state;
  },
};

// Le lieu de la maison, comme la configuration de HA le donne : la page Plan en
// 3D y calcule le soleil de n'importe quelle heure.
const mockConfig = { latitude: 48.8566, longitude: 2.3522, time_zone: 'Europe/Paris' };

// ─── Hooks ──────────────────────────────────────────────────────────────────

export function useEntity(entityId: EntityName): EntityState {
  return ENTITIES[entityId] ?? DEFAULT_ENTITY;
}

// ─── Connexion simulée ──────────────────────────────────────────────────────
// Seul `calendar.get_events` répond (des évènements autour d'aujourd'hui, pour
// voir l'agenda et le tester). Tout le reste est rejeté : les hooks qui lisent
// la connexion (historique, traductions d'états…) gèrent déjà ce refus.

const pad2 = (n: number) => String(n).padStart(2, '0');
const localIso = (d: Date, h: number, m = 0) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(h)}:${pad2(m)}:00`;
const localDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

function mockCalendarEvents(entityId: string) {
  const day = (offset: number) => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
  };
  if (entityId === 'calendar.travail') {
    return [
      { summary: 'Réunion équipe', start: localIso(day(0), 14), end: localIso(day(0), 15) },
      { summary: 'Point projet', start: localIso(day(2), 10, 30), end: localIso(day(2), 11, 30) },
      { summary: 'Séminaire', start: localDate(day(5)), end: localDate(day(7)) },
    ];
  }
  return [
    { summary: 'Rendez-vous médecin', start: localIso(day(0), 8, 15), end: localIso(day(0), 9) },
    { summary: 'Football', start: localIso(day(0), 16), end: localIso(day(0), 17) },
    { summary: 'Anniversaire de Léa', start: localDate(day(1)), end: localDate(day(2)) },
    { summary: 'Cinéma', start: localIso(day(3), 20, 30), end: localIso(day(3), 22, 30) },
    { summary: 'Poubelles', start: localIso(day(-1), 19), end: localIso(day(-1), 19, 30) },
  ];
}

const mockConnection = {
  // Aucun évènement ne circule : on rend un désabonnement inerte.
  subscribeEvents: async (_callback: unknown, _eventType?: string) => () => {},
  sendMessagePromise: async (msg: { type?: string; service?: string; domain?: string; target?: { entity_id?: string[] } }) => {
    if (msg.type === 'call_service' && msg.domain === 'calendar' && msg.service === 'get_events') {
      const response: Record<string, { events: unknown[] }> = {};
      for (const id of msg.target?.entity_id ?? []) response[id] = { events: mockCalendarEvents(id) };
      return { response };
    }
    throw new Error('mock: message non pris en charge');
  },
};

interface HassState {
  entities: typeof ENTITIES;
  connection: typeof mockConnection;
  helpers: typeof mockHelpers;
  formatter: typeof mockFormatter;
  config: typeof mockConfig;
}

const STATE: HassState = {
  entities: ENTITIES,
  connection: mockConnection,
  helpers: mockHelpers,
  formatter: mockFormatter,
  config: mockConfig,
};

export function useHass(): HassState;
export function useHass<T>(selector: (s: HassState) => T): T;
export function useHass<T>(selector?: (s: HassState) => T): HassState | T {
  return selector ? selector(STATE) : STATE;
}

// Le vrai `useHass` est un store zustand : `HAThrottlePatch` appelle
// `getState` / `setState` / `subscribe` dessus au montage. Sans ces méthodes le
// mock lève `useHass.getState is not a function` et **toute l'application**
// plante en mode mock — c'est ce qui empêchait la suite E2E de démarrer.
useHass.getState = (): HassState => STATE;
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
