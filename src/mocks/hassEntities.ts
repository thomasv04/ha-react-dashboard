/**
 * Shared mock entity registry.
 * Used by Storybook and the AddWidgetModal preview to render widgets without
 * a live Home Assistant connection.
 */

export interface MockEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

function entity(entity_id: string, state: string, attributes: Record<string, unknown> = {}): MockEntityState {
  return { entity_id, state, attributes };
}

export const MOCK_ENTITIES: Record<string, MockEntityState> = {
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
  'cover.volet_cuisine': entity('cover.volet_cuisine', 'open', { current_position: 100, friendly_name: 'Cuisine' }),
  'cover.volet_cellier': entity('cover.volet_cellier', 'closed', { current_position: 0, friendly_name: 'Cellier' }),
  'cover.volet_sam_1': entity('cover.volet_sam_1', 'open', { current_position: 75, friendly_name: 'SAM 1' }),
  'cover.volet_sam_2': entity('cover.volet_sam_2', 'open', { current_position: 75, friendly_name: 'SAM 2' }),
  'cover.volet_salon': entity('cover.volet_salon', 'closed', { current_position: 0, friendly_name: 'Salon' }),
  'cover.volet_baie_salon': entity('cover.volet_baie_salon', 'open', { current_position: 50, friendly_name: 'Baie salon' }),
  'cover.volet_chambre_invites': entity('cover.volet_chambre_invites', 'closed', { current_position: 0, friendly_name: 'Chambre invités' }),
  'cover.volet_chambre': entity('cover.volet_chambre', 'open', { current_position: 100, friendly_name: 'Chambre' }),
  'cover.volet_bureau': entity('cover.volet_bureau', 'closed', { current_position: 0, friendly_name: 'Bureau' }),
  'cover.volet_salle_de_bain': entity('cover.volet_salle_de_bain', 'open', { current_position: 60, friendly_name: 'Salle de bain' }),

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

  // ─── Aliases for default widget configs (fallback entity IDs) ──────────────
  'alarm_control_panel.home_alarm': entity('alarm_control_panel.home_alarm', 'disarmed', {}),
  'weather.home': entity('weather.home', 'partly-cloudy', {
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
  'climate.living_room': entity('climate.living_room', 'heat', {
    current_temperature: 19.5,
    temperature: 21,
    hvac_action: 'heating',
    preset_mode: 'comfort',
    hvac_modes: ['off', 'heat'],
  }),
  'sensor.battery_level': entity('sensor.battery_level', '78', { unit_of_measurement: '%' }),
  'sensor.battery_state': entity('sensor.battery_state', 'charging', {}),
  'sensor.grid_power': entity('sensor.grid_power', '320', { unit_of_measurement: 'W' }),
  'sensor.home_power': entity('sensor.home_power', '185', { unit_of_measurement: 'W' }),
  'sensor.solar_production': entity('sensor.solar_production', '420', { unit_of_measurement: 'W' }),
  'sensor.tempo_current_color': entity('sensor.tempo_current_color', 'Bleu', {}),
  'sensor.tempo_next_color': entity('sensor.tempo_next_color', 'Bleu', {}),
  'binary_sensor.tempo_off_peak': entity('binary_sensor.tempo_off_peak', 'on', {}),
  'sensor.tempo_remaining_blue': entity('sensor.tempo_remaining_blue', '142', {}),
  'sensor.tempo_remaining_white': entity('sensor.tempo_remaining_white', '20', {}),
  'sensor.tempo_remaining_red': entity('sensor.tempo_remaining_red', '0', {}),
  'camera.front_door': entity('camera.front_door', 'idle', {}),
  'camera.kitchen': entity('camera.kitchen', 'idle', {}),
  'camera.living_room': entity('camera.living_room', 'idle', {}),
  'camera.hallway': entity('camera.hallway', 'idle', {}),

  // Persons
  'person.thomas': entity('person.thomas', 'home', { friendly_name: 'Thomas', entity_picture: '' }),
  'person.marie': entity('person.marie', 'not_home', { friendly_name: 'Marie', entity_picture: '' }),

  // Media player
  'media_player.salon': entity('media_player.salon', 'playing', {
    friendly_name: 'Salon',
    media_title: 'Bohemian Rhapsody',
    media_artist: 'Queen',
    volume_level: 0.4,
    is_volume_muted: false,
    supported_features: 152639,
  }),

  // Automations
  'automation.lumieres_soiree': entity('automation.lumieres_soiree', 'on', { friendly_name: 'Lumières soirée' }),
  'automation.volets_matin': entity('automation.volets_matin', 'on', { friendly_name: 'Volets matin' }),
  'automation.alarme_nuit': entity('automation.alarme_nuit', 'off', { friendly_name: 'Alarme nuit' }),

  // ─── Aliases matching default widget config entity IDs ─────────────────────
  // These ensure every widget renders in the AddWidgetModal preview even when
  // the user's HA instance doesn't have the generic fallback entity IDs.
  'sensor.bedroom_temperature': entity('sensor.bedroom_temperature', '20.4', { unit_of_measurement: '°C', friendly_name: 'Chambre' }),
  'light.living_room': entity('light.living_room', 'on', { brightness: 180, color_mode: 'brightness', friendly_name: 'Salon' }),
  'cover.living_room': entity('cover.living_room', 'open', { current_position: 60, friendly_name: 'Volet Salon' }),
  'person.user_1': entity('person.user_1', 'home', { friendly_name: 'Utilisateur', entity_picture: '' }),
  'automation.example': entity('automation.example', 'on', { friendly_name: "Exemple d'automatisation" }),
  'vacuum.robot': entity('vacuum.robot', 'docked', { battery_level: 85, status: 'Charging', friendly_name: 'Aspirateur' }),

  // ─── Domaines sans échantillon : leurs cards n'avaient rien à montrer ───────
  // Serrure, ventilateur, agenda, liste de tâches… L'aperçu du catalogue tombait
  // sur « Entité introuvable » là où l'utilisateur attend un exemple.
  'lock.front_door': entity('lock.front_door', 'locked', { friendly_name: "Porte d'entrée" }),
  'lock.garage': entity('lock.garage', 'unlocked', { friendly_name: 'Garage' }),
  'fan.bedroom': entity('fan.bedroom', 'on', {
    percentage: 66,
    preset_modes: ['eco', 'auto'],
    supported_features: 1,
    friendly_name: 'Chambre',
  }),
  'fan.living_room': entity('fan.living_room', 'off', { percentage: 0, supported_features: 1, friendly_name: 'Salon' }),
  'calendar.famille': entity('calendar.famille', 'on', {
    friendly_name: 'Famille',
    message: 'Rendez-vous médecin',
    start_time: new Date(Date.now() + 3600000).toISOString(),
    end_time: new Date(Date.now() + 7200000).toISOString(),
  }),
  'calendar.travail': entity('calendar.travail', 'off', {
    friendly_name: 'Travail',
    message: 'Réunion équipe',
    start_time: new Date(Date.now() + 86400000).toISOString(),
    end_time: new Date(Date.now() + 90000000).toISOString(),
  }),
  'todo.courses': entity('todo.courses', '3', { friendly_name: 'Courses' }),
  'todo.maison': entity('todo.maison', '1', { friendly_name: 'Maison' }),
  'select.mode_maison': entity('select.mode_maison', 'Jour', { options: ['Jour', 'Nuit', 'Absent'], friendly_name: 'Mode maison' }),
  'script.bonne_nuit': entity('script.bonne_nuit', 'off', { friendly_name: 'Bonne nuit' }),
};
