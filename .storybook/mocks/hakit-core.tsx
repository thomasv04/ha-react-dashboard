/**
 * Mock for @hakit/core — used exclusively in Storybook.
 * Provides realistic placeholder data so every component renders without
 * a live Home Assistant connection.
 */

export type EntityName = string;

// ─── Shared entity factory ──────────────────────────────────────────────────

interface EntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

function entity(entity_id: string, state: string, attributes: Record<string, unknown> = {}): EntityState {
  return { entity_id, state, attributes };
}

// ─── Mock entity registry ───────────────────────────────────────────────────

export const ENTITIES: Record<string, EntityState> = {
  // Climate — pellet stove
  'climate.pellet': entity('climate.pellet', 'heat', {
    current_temperature: 19.5,
    temperature: 21,
    hvac_action: 'heating',
    preset_mode: 'comfort',
    hvac_modes: ['off', 'heat'],
  }),

  // Weather
  'weather.menneville': entity('weather.menneville', 'partly-cloudy', {
    temperature: 12,
    wind_speed: 18,
    wind_speed_unit: 'km/h',
    forecast: [
      { datetime: new Date().toISOString(), condition: 'partly-cloudy', temperature: 14, templow: 8 },
      { datetime: new Date(Date.now() + 86400000).toISOString(), condition: 'sunny', temperature: 17, templow: 9 },
      { datetime: new Date(Date.now() + 172800000).toISOString(), condition: 'cloudy', temperature: 13, templow: 7 },
      { datetime: new Date(Date.now() + 259200000).toISOString(), condition: 'rainy', temperature: 11, templow: 6 },
      { datetime: new Date(Date.now() + 345600000).toISOString(), condition: 'sunny', temperature: 16, templow: 8 },
    ],
  }),

  // Alarm
  'alarm_control_panel.alarmo': entity('alarm_control_panel.alarmo', 'disarmed', {}),

  // Solar battery
  'sensor.solarflow_2400_ac_electric_level': entity('sensor.solarflow_2400_ac_electric_level', '78', { unit_of_measurement: '%' }),
  'sensor.solarflow_2400_ac_pack_state': entity('sensor.solarflow_2400_ac_pack_state', 'charging', {}),
  'sensor.solarflow_2400_ac_grid_input_power': entity('sensor.solarflow_2400_ac_grid_input_power', '320', { unit_of_measurement: 'W' }),
  'sensor.solarflow_2400_ac_output_home_power': entity('sensor.solarflow_2400_ac_output_home_power', '185', { unit_of_measurement: 'W' }),
  'sensor.din_panneaux_solaire_puissance': entity('sensor.din_panneaux_solaire_puissance', '420', { unit_of_measurement: 'W' }),

  // Tempo EDF
  'sensor.rte_tempo_couleur_actuelle': entity('sensor.rte_tempo_couleur_actuelle', 'Bleu', {}),
  'sensor.rte_tempo_prochaine_couleur': entity('sensor.rte_tempo_prochaine_couleur', 'Bleu', {}),
  'binary_sensor.rte_tempo_heures_creuses': entity('binary_sensor.rte_tempo_heures_creuses', 'on', {}),
  'sensor.rte_tempo_cycle_jours_restants_bleu': entity('sensor.rte_tempo_cycle_jours_restants_bleu', '142', {}),
  'sensor.rte_tempo_cycle_jours_restants_blanc': entity('sensor.rte_tempo_cycle_jours_restants_blanc', '20', {}),
  'sensor.rte_tempo_cycle_jours_restants_rouge': entity('sensor.rte_tempo_cycle_jours_restants_rouge', '0', {}),

  // Room temperatures
  'sensor.temperature_chambre_temperature': entity('sensor.temperature_chambre_temperature', '20.4', { unit_of_measurement: '°C' }),
  'sensor.temperature_chambre_humidity': entity('sensor.temperature_chambre_humidity', '55', { unit_of_measurement: '%' }),

  // Camera selector
  'input_select.camera_selecter': entity('input_select.camera_selecter', 'Sonnette', {}),

  // Lights
  'light.bandeau_led_cuisine': entity('light.bandeau_led_cuisine', 'on', { brightness: 180, color_mode: 'brightness' }),
  'light.salon': entity('light.salon', 'off', {}),
  'light.chambre': entity('light.chambre', 'on', { brightness: 100 }),

  // Covers
  'cover.volet_cuisine': entity('cover.volet_cuisine', 'open', { current_position: 100 }),
  'cover.volet_cellier': entity('cover.volet_cellier', 'closed', { current_position: 0 }),
  'cover.volet_sam_1': entity('cover.volet_sam_1', 'open', { current_position: 75 }),
  'cover.volet_sam_2': entity('cover.volet_sam_2', 'open', { current_position: 75 }),
  'cover.volet_salon': entity('cover.volet_salon', 'closed', { current_position: 0 }),
  'cover.volet_baie_salon': entity('cover.volet_baie_salon', 'open', { current_position: 50 }),
  'cover.volet_chambre_invites': entity('cover.volet_chambre_invites', 'closed', { current_position: 0 }),
  'cover.volet_chambre': entity('cover.volet_chambre', 'open', { current_position: 100 }),
  'cover.volet_bureau': entity('cover.volet_bureau', 'closed', { current_position: 0 }),
  'cover.volet_salle_de_bain': entity('cover.volet_salle_de_bain', 'open', { current_position: 60 }),

  // Vacuum
  'vacuum.roborock': entity('vacuum.roborock', 'docked', { battery_level: 100 }),
  'vacuum.roborock_qrevo_maxv': entity('vacuum.roborock_qrevo_maxv', 'docked', { battery_level: 100, status: 'Charging' }),

  // Vacuum room toggles
  'input_boolean.laver_cuisine': entity('input_boolean.laver_cuisine', 'on', {}),
  'input_boolean.laver_cellier': entity('input_boolean.laver_cellier', 'off', {}),
  'input_boolean.laver_salle_a_manger': entity('input_boolean.laver_salle_a_manger', 'on', {}),
  'input_boolean.laver_salon': entity('input_boolean.laver_salon', 'off', {}),
  'input_boolean.laver_chambre_amis': entity('input_boolean.laver_chambre_amis', 'off', {}),
  'input_boolean.laver_salle_de_bain': entity('input_boolean.laver_salle_de_bain', 'on', {}),
  'input_boolean.laver_chambre': entity('input_boolean.laver_chambre', 'off', {}),
  'input_boolean.laver_bureau': entity('input_boolean.laver_bureau', 'off', {}),
  'input_boolean.laver_repos': entity('input_boolean.laver_repos', 'off', {}),

  // Plant sensors
  'sensor.plante_moisture': entity('sensor.plante_moisture', '45', { unit_of_measurement: '%' }),
  'sensor.plante_temperature': entity('sensor.plante_temperature', '22.5', { unit_of_measurement: '°C' }),
  'sensor.plante_illuminance': entity('sensor.plante_illuminance', '3200', { unit_of_measurement: 'lux' }),
  'sensor.plante_humidity': entity('sensor.plante_humidity', '58', { unit_of_measurement: '%' }),
  'sensor.plante_battery': entity('sensor.plante_battery', '82', { unit_of_measurement: '%' }),

  // Notifications
  'input_boolean.display_notification_trash': entity('input_boolean.display_notification_trash', 'on', {}),
  'input_boolean.display_notification_washing_machine': entity('input_boolean.display_notification_washing_machine', 'off', {}),

  // Camera panel
  'camera.sonnette_frigate': entity('camera.sonnette_frigate', 'idle', {}),
  'camera.cuisine': entity('camera.cuisine', 'idle', {}),
  'camera.salon_frigate': entity('camera.salon_frigate', 'idle', {}),
  'camera.couloir_frigate': entity('camera.couloir_frigate', 'idle', {}),
};

const DEFAULT_ENTITY = entity('unknown', 'unavailable', {});

// ─── Mock helpers ───────────────────────────────────────────────────────────

export const mockHelpers = {
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
