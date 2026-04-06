/**
 * Per-widget configuration types.
 * Each widget type has its own config interface with the entity_ids and options
 * that the user can customize via the edit modal.
 */

// ── Activity Bar ──────────────────────────────────────────────────────────────
export interface ActivityPill {
  id: string;
  entityId: string;
  label: string;
  icon?: string; // lucide icon name
  /** Template: {state} is replaced by entity state, {attr.X} by attribute X */
  template?: string;
}

export interface ActivityBarConfig {
  type: 'activity';
  pills: ActivityPill[];
}

// ── Camera ────────────────────────────────────────────────────────────────────
export interface CameraEntry {
  entityId: string;
  name: string;
}

export interface CameraCardConfig {
  type: 'camera';
  cameras: CameraEntry[];
  selectorEntity?: string; // input_select for remembering selection
}

// ── Weather ───────────────────────────────────────────────────────────────────
export interface WeatherCardConfig {
  type: 'weather';
  entityId: string; // weather.xxx
}

// ── Energy ────────────────────────────────────────────────────────────────────
export interface EnergyCardConfig {
  type: 'energy';
  batteryLevelEntity: string;
  batteryStateEntity: string;
  gridInputPowerEntity: string;
  homeOutputPowerEntity: string;
  solarProductionEntity: string;
}

// ── Tempo EDF ─────────────────────────────────────────────────────────────────
export interface TempoCardConfig {
  type: 'tempo';
  currentColorEntity: string;
  nextColorEntity: string;
  offPeakEntity: string;
  remainingBlueEntity: string;
  remainingWhiteEntity: string;
  remainingRedEntity: string;
}

// ── Thermostat ────────────────────────────────────────────────────────────────
export interface ThermostatCardConfig {
  type: 'thermostat';
  entityId: string; // climate.xxx
  minTemp?: number;
  maxTemp?: number;
}

// ── Rooms ─────────────────────────────────────────────────────────────────────
export interface RoomEntry {
  area: string;
  label: string;
  icon: string; // lucide icon name
  iconBg: string; // tailwind gradient classes
  tempEntity?: string;
  lightEntities?: string[];
  panelId?: string;
}

export interface RoomsGridConfig {
  type: 'rooms';
  rooms: RoomEntry[];
}

// ── Shortcuts ─────────────────────────────────────────────────────────────────
export interface ShortcutEntry {
  id: string;
  label: string;
  icon: string; // lucide icon name
  panelId: string;
  color: string; // tailwind gradient classes
  statusEntity?: string; // optional entity for status display
}

export interface ShortcutsCardConfig {
  type: 'shortcuts';
  shortcuts: ShortcutEntry[];
}

// ── Greeting / Clock ──────────────────────────────────────────────────────────
export interface GreetingCardConfig {
  type: 'greeting';
  locale?: string;
}

// ── Sensor ────────────────────────────────────────────────────────────────────
export type SensorVariant = 'default' | 'gauge' | 'sparkline';

export interface SensorCardConfig {
  type: 'sensor';
  entityId: string;
  name?: string;
  icon?: string;
  variant?: SensorVariant;
  min?: number;
  max?: number;
  thresholds?: { value: number; color: string }[];
  onText?: string;
  offText?: string;
}

// ── Light ─────────────────────────────────────────────────────────────────────
export interface LightCardConfig {
  type: 'light';
  entityId: string;          // light.xxx ou light.group_xxx
  name?: string;             // Nom affiché (sinon friendly_name)
  icon?: string;             // Icône lucide custom
  /** Si true, c'est un groupe : affiche "X/Y allumées" */
  isGroup?: boolean;
  /** Entity IDs des sous-lumières du groupe (pour compter les actives) */
  groupEntities?: string[];
}

// ── Person Status ─────────────────────────────────────────────────────────────
export interface PersonEntry {
  entityId: string;       // person.thomas, person.marie
  name?: string;          // Nom custom (sinon friendly_name)
}

export interface PersonStatusConfig {
  type: 'person';
  persons: PersonEntry[];
}

// ── Cover (volets/stores) ─────────────────────────────────────────────────────
export interface CoverCardConfig {
  type: 'cover';
  entityId: string;        // cover.volet_salon
  name?: string;           // Nom custom
  icon?: string;           // Icône lucide (sinon Blinds par défaut)
  /** Afficher le contrôle de tilt (inclinaison) si supporté */
  showTilt?: boolean;
}

// ── Template (Mushroom-style) ─────────────────────────────────────────────────
export interface TemplateCardConfig {
  type: 'template';
  entityId?: string;         // Entité contextuelle (optionnelle)
  primaryInfo: string;       // Template Nunjucks — info principale
  secondaryInfo?: string;    // Template Nunjucks — info secondaire
  icon?: string;             // Template Nunjucks — icône (mdi:xxx ou lucide)
  iconColor?: string;        // Template Nunjucks — couleur icône
  image?: string;            // Template Nunjucks — URL image
}

// ── Union type ────────────────────────────────────────────────────────────────
export type WidgetConfig =
  | ActivityBarConfig
  | CameraCardConfig
  | WeatherCardConfig
  | EnergyCardConfig
  | TempoCardConfig
  | ThermostatCardConfig
  | RoomsGridConfig
  | ShortcutsCardConfig
  | GreetingCardConfig
  | SensorCardConfig
  | LightCardConfig
  | PersonStatusConfig
  | CoverCardConfig
  | TemplateCardConfig;

/** Map of widget id → its config */
export type WidgetConfigs = Record<string, WidgetConfig>;

// ── Default configs (mirrors current hardcoded values) ────────────────────────
export const DEFAULT_WIDGET_CONFIGS: WidgetConfigs = {
  activity: {
    type: 'activity',
    pills: [
      { id: 'alarm', entityId: 'alarm_control_panel.alarmo', label: 'Alarme', template: '{state}' },
      { id: 'pellet', entityId: 'climate.pellet', label: 'Poêle', template: '{state}' },
      { id: 'solar', entityId: 'sensor.solarflow_2400_ac_electric_level', label: 'Batterie solaire', template: '{state}%' },
      { id: 'tempo', entityId: 'sensor.rte_tempo_couleur_actuelle', label: 'Tempo', template: '{state}' },
      { id: 'temp', entityId: 'sensor.temperature_chambre_temperature', label: 'Chambre', template: '{state}°C' },
    ],
  },
  camera: {
    type: 'camera',
    cameras: [
      { entityId: 'camera.sonnette_frigate', name: 'Sonnette' },
      { entityId: 'camera.cuisine', name: 'Cuisine' },
      { entityId: 'camera.salon_frigate', name: 'Salon' },
      { entityId: 'camera.couloir_frigate', name: 'Couloir' },
    ],
    selectorEntity: 'input_select.camera_selecter',
  },
  weather: {
    type: 'weather',
    entityId: 'weather.menneville',
  },
  energy: {
    type: 'energy',
    batteryLevelEntity: 'sensor.solarflow_2400_ac_electric_level',
    batteryStateEntity: 'sensor.solarflow_2400_ac_pack_state',
    gridInputPowerEntity: 'sensor.solarflow_2400_ac_grid_input_power',
    homeOutputPowerEntity: 'sensor.solarflow_2400_ac_output_home_power',
    solarProductionEntity: 'sensor.din_panneaux_solaire_puissance',
  },
  tempo: {
    type: 'tempo',
    currentColorEntity: 'sensor.rte_tempo_couleur_actuelle',
    nextColorEntity: 'sensor.rte_tempo_prochaine_couleur',
    offPeakEntity: 'binary_sensor.rte_tempo_heures_creuses',
    remainingBlueEntity: 'sensor.rte_tempo_cycle_jours_restants_bleu',
    remainingWhiteEntity: 'sensor.rte_tempo_cycle_jours_restants_blanc',
    remainingRedEntity: 'sensor.rte_tempo_cycle_jours_restants_rouge',
  },
  thermostat: {
    type: 'thermostat',
    entityId: 'climate.pellet',
    minTemp: 10,
    maxTemp: 30,
  },
  rooms: {
    type: 'rooms',
    rooms: [
      { area: 'cuisine', label: 'Cuisine', icon: 'UtensilsCrossed', iconBg: 'from-red-500 to-orange-400', tempEntity: 'sensor.detecteur_chaleur_temperature', lightEntities: ['light.bandeau_led_cuisine'] },
      { area: 'celier', label: 'Cellier', icon: 'Package', iconBg: 'from-purple-500 to-violet-400' },
      { area: 'salle_de_sejour', label: 'Salle à manger', icon: 'Armchair', iconBg: 'from-lime-500 to-green-400', tempEntity: 'sensor.temperature_pellet_temperature' },
      { area: 'chambre_invites', label: 'Ch. invités', icon: 'BedDouble', iconBg: 'from-teal-500 to-cyan-400' },
      { area: 'chambre', label: 'Chambre', icon: 'Moon', iconBg: 'from-pink-500 to-rose-400', tempEntity: 'sensor.temperature_chambre_temperature', lightEntities: ['light.chambre'] },
      { area: 'salon', label: 'Salon', icon: 'Sofa', iconBg: 'from-yellow-500 to-amber-400', lightEntities: ['light.salon'], panelId: 'lumieres' },
      { area: 'bureau', label: 'Bureau', icon: 'BriefcaseBusiness', iconBg: 'from-indigo-500 to-blue-400', tempEntity: 'sensor.ble_temperature_capteur_temperature_salon' },
    ],
  },
  shortcuts: {
    type: 'shortcuts',
    shortcuts: [
      { id: 'volets', label: 'Volets', icon: 'Blinds', panelId: 'volets', color: 'from-blue-500 to-cyan-400' },
      { id: 'lumieres', label: 'Lumières', icon: 'Lightbulb', panelId: 'lumieres', color: 'from-yellow-500 to-amber-400' },
      { id: 'security', label: 'Sécurité', icon: 'ShieldHalf', panelId: 'security', color: 'from-green-500 to-emerald-400', statusEntity: 'alarm_control_panel.alarmo' },
      { id: 'aspirateur', label: 'Aspirateur', icon: 'Cpu', panelId: 'aspirateur', color: 'from-purple-500 to-violet-400' },
      { id: 'flowers', label: 'Plantes', icon: 'Flower2', panelId: 'flowers', color: 'from-lime-500 to-green-400' },
      { id: 'notifications', label: 'Notifs', icon: 'Bell', panelId: 'notifications', color: 'from-orange-500 to-red-400' },
      { id: 'cameras', label: 'Caméras', icon: 'Camera', panelId: 'cameras', color: 'from-slate-500 to-gray-400' },
    ],
  },
  greeting: {
    type: 'greeting',
    locale: 'fr-FR',
  },
  sensor: {
    type: 'sensor',
    entityId: 'sensor.temperature_chambre_temperature',
    name: 'Chambre',
    variant: 'default',
  },
  light: {
    type: 'light',
    entityId: 'light.salon',
    name: 'Salon',
  },
  person: {
    type: 'person',
    persons: [
      { entityId: 'person.thomas', name: 'Thomas' },
    ],
  },
  cover: {
    type: 'cover',
    entityId: 'cover.volet_salon',
    name: 'Volet Salon',
  },
  template: {
    type: 'template',
    primaryInfo: "Hello, {{user}}",
    secondaryInfo: "{{ states('sensor.temperature_chambre_temperature') }}°C",
    icon: 'mdi:home',
    iconColor: 'blue',
  },
};

/**
 * Returns fields metadata for the edit modal of each widget type.
 * Each field defines: key, label, type (entity/text/number/list), and optionally a domain filter.
 */
export interface WidgetFieldDef {
  key: string;
  label: string;
  fieldType: 'entity' | 'text' | 'number' | 'entity-list' | 'list' | 'icon' | 'gradient' | 'template';
  /** For entity fields: filter by domain (e.g. 'sensor', 'climate') */
  domain?: string;
  /** For list fields: sub-fields of each item */
  itemFields?: WidgetFieldDef[];
}

export const WIDGET_FIELD_DEFS: Record<string, WidgetFieldDef[]> = {
  weather: [
    { key: 'entityId', label: 'Entité météo', fieldType: 'entity', domain: 'weather' },
  ],
  thermostat: [
    { key: 'entityId', label: 'Entité climate', fieldType: 'entity', domain: 'climate' },
    { key: 'minTemp', label: 'Température min', fieldType: 'number' },
    { key: 'maxTemp', label: 'Température max', fieldType: 'number' },
  ],
  energy: [
    { key: 'batteryLevelEntity', label: 'Niveau batterie', fieldType: 'entity', domain: 'sensor' },
    { key: 'batteryStateEntity', label: 'État batterie', fieldType: 'entity', domain: 'sensor' },
    { key: 'gridInputPowerEntity', label: 'Puissance réseau', fieldType: 'entity', domain: 'sensor' },
    { key: 'homeOutputPowerEntity', label: 'Puissance maison', fieldType: 'entity', domain: 'sensor' },
    { key: 'solarProductionEntity', label: 'Production solaire', fieldType: 'entity', domain: 'sensor' },
  ],
  tempo: [
    { key: 'currentColorEntity', label: 'Couleur actuelle', fieldType: 'entity', domain: 'sensor' },
    { key: 'nextColorEntity', label: 'Prochaine couleur', fieldType: 'entity', domain: 'sensor' },
    { key: 'offPeakEntity', label: 'Heures creuses', fieldType: 'entity', domain: 'binary_sensor' },
    { key: 'remainingBlueEntity', label: 'Jours bleu restants', fieldType: 'entity', domain: 'sensor' },
    { key: 'remainingWhiteEntity', label: 'Jours blanc restants', fieldType: 'entity', domain: 'sensor' },
    { key: 'remainingRedEntity', label: 'Jours rouge restants', fieldType: 'entity', domain: 'sensor' },
  ],
  camera: [
    { key: 'selectorEntity', label: 'Entité sélection', fieldType: 'entity', domain: 'input_select' },
    {
      key: 'cameras', label: 'Caméras', fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'Entité caméra', fieldType: 'entity', domain: 'camera' },
        { key: 'name', label: 'Nom', fieldType: 'text' },
      ],
    },
  ],
  rooms: [
    {
      key: 'rooms', label: 'Pièces', fieldType: 'list',
      itemFields: [
        { key: 'area', label: 'Zone (area)', fieldType: 'text' },
        { key: 'label', label: 'Nom affiché', fieldType: 'text' },
        { key: 'icon', label: 'Icône', fieldType: 'icon' },
        { key: 'iconBg', label: 'Dégradé icône', fieldType: 'gradient' },
        { key: 'tempEntity', label: 'Capteur température', fieldType: 'entity', domain: 'sensor' },
        { key: 'lightEntities', label: 'Lumières', fieldType: 'entity-list', domain: 'light' },
        { key: 'panelId', label: 'Panel lié', fieldType: 'text' },
      ],
    },
  ],
  shortcuts: [
    {
      key: 'shortcuts', label: 'Raccourcis', fieldType: 'list',
      itemFields: [
        { key: 'id', label: 'Identifiant', fieldType: 'text' },
        { key: 'label', label: 'Nom affiché', fieldType: 'text' },
        { key: 'icon', label: 'Icône', fieldType: 'icon' },
        { key: 'panelId', label: 'Panel lié', fieldType: 'text' },
        { key: 'color', label: 'Couleur', fieldType: 'gradient' },
        { key: 'statusEntity', label: 'Entité statut', fieldType: 'entity' },
      ],
    },
  ],
  activity: [
    {
      key: 'pills', label: 'Indicateurs', fieldType: 'list',
      itemFields: [
        { key: 'id', label: 'Identifiant', fieldType: 'text' },
        { key: 'entityId', label: 'Entité', fieldType: 'entity' },
        { key: 'label', label: 'Label', fieldType: 'text' },
        { key: 'template', label: 'Template ({state}, {attr.X})', fieldType: 'text' },
      ],
    },
  ],
  greeting: [
    { key: 'locale', label: 'Locale (fr-FR, en-US...)', fieldType: 'text' },
  ],
  sensor: [
    { key: 'entityId', label: 'Entité', fieldType: 'entity' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'icon', label: 'Icône', fieldType: 'icon' },
  ],
  light: [
    { key: 'entityId', label: 'Entité lumière', fieldType: 'entity', domain: 'light' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'icon', label: 'Icône', fieldType: 'icon' },
    { key: 'isGroup', label: 'Groupe de lumières', fieldType: 'text' },
  ],
  person: [
    {
      key: 'persons', label: 'Personnes', fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'Entité personne', fieldType: 'entity', domain: 'person' },
        { key: 'name', label: 'Nom affiché', fieldType: 'text' },
      ],
    },
  ],
  cover: [
    { key: 'entityId', label: 'Entité volet', fieldType: 'entity', domain: 'cover' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'icon', label: 'Icône', fieldType: 'icon' },
  ],
  template: [
    { key: 'entityId', label: 'Entité (contexte)', fieldType: 'entity' },
    { key: 'primaryInfo', label: 'Information principale', fieldType: 'template' },
    { key: 'secondaryInfo', label: 'Information secondaire', fieldType: 'template' },
    { key: 'icon', label: 'Icône', fieldType: 'template' },
    { key: 'iconColor', label: 'Couleur icône', fieldType: 'template' },
    { key: 'image', label: 'Image (URL)', fieldType: 'template' },
  ],
};
