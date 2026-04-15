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
  entityId: string;       // person.user_1, person.user_2
  name?: string;          // Nom custom (sinon friendly_name)
}

export interface PersonStatusConfig {
  type: 'person';
  persons: PersonEntry[];
}

// ── Cover (volets/stores) ─────────────────────────────────────────────────────
export interface CoverCardConfig {
  type: 'cover';
  entityId: string;        // cover.living_room
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
