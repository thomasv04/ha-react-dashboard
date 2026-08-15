/**
 * Per-widget configuration types.
 * Each widget type has its own config interface with the entity_ids and options
 * that the user can customize via the edit modal.
 */

import type { SoundPreset } from '@/lib/sounds';

/** Optional sound overrides — per-action map of custom sound presets */
export interface WidgetSoundOverrides {
  soundOverrides?: Record<string, SoundPreset>;
}

// ── Activity Bar ──────────────────────────────────────────────────────────────
export interface ActivityPill {
  id: string;
  entityId: string;
  label: string;
  icon?: string; // lucide icon name
  /** Template: {state} is replaced by entity state, {attr.X} by attribute X */
  template?: string;
  /** Accent colour (hex) — overrides the state-derived colour */
  color?: string;
  /** Click behaviour: nothing, detail sheet, entity toggle, or a HA service */
  action?: 'none' | 'more-info' | 'toggle' | 'service';
  /** action === 'service': 'domain.service', called on the pill entity */
  service?: string;
}

export interface ActivityBarConfig {
  type: 'activity';
  pills: ActivityPill[];
  persons?: PersonEntry[];
}

// ── Camera ────────────────────────────────────────────────────────────────────
export interface CameraEntry {
  entityId: string;
  name: string;
  /** Camera entity whose still image is shown while the stream loads */
  posterEntity?: string;
}

export type CameraStreamMode = 'auto' | 'mjpeg' | 'hls';

export interface CameraCardConfig extends WidgetSoundOverrides {
  type: 'camera';
  cameras: CameraEntry[];
  selectorEntity?: string; // input_select for remembering selection
  streamMode?: CameraStreamMode; // 'auto' (default) | 'mjpeg' (caméras nativement MJPEG) | 'hls'
  showInfoPanel?: boolean;
}

// ── Weather ───────────────────────────────────────────────────────────────────

/** All HA weather conditions that can have custom icons */
export type WeatherCondition =
  | 'clear-night'
  | 'cloudy'
  | 'exceptional'
  | 'fog'
  | 'hail'
  | 'lightning'
  | 'lightning-rainy'
  | 'partlycloudy'
  | 'pouring'
  | 'rainy'
  | 'snowy'
  | 'snowy-rainy'
  | 'sunny'
  | 'windy'
  | 'windy-variant';

export interface WeatherCardConfig {
  type: 'weather';
  entityId: string; // weather.xxx
  showInfoPanel?: boolean;
  /** Advanced: override default icons per weather condition.
   *  Value is a Lucide icon name or "custom:/uploads/icons/{file}" */
  customIcons?: Partial<Record<WeatherCondition, string>>;
}

// ── Energy ────────────────────────────────────────────────────────────────────
export interface EnergyCardConfig {
  type: 'energy';
  name?: string;
  batteryLevelEntity: string;
  batteryStateEntity: string;
  gridInputPowerEntity: string;
  homeOutputPowerEntity: string;
  solarProductionEntity: string;
  showInfoPanel?: boolean;
}

// ── Energy flow ───────────────────────────────────────────────────────────────
export interface EnergyFlowCardConfig {
  type: 'energy_flow';
  name?: string;
  solarProductionEntity: string;
  homeOutputPowerEntity: string;
  gridInputPowerEntity: string;
  batteryLevelEntity: string;
  batteryStateEntity: string;
  /** Inverse la convention de signe du capteur réseau (positif = soutirage) */
  gridInvert?: boolean;
  showInfoPanel?: boolean;
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
export interface ThermostatCardConfig extends WidgetSoundOverrides {
  type: 'thermostat';
  entityId: string; // climate.xxx
  minTemp?: number;
  maxTemp?: number;
  showInfoPanel?: boolean;
}

// ── Room Control ──────────────────────────────────────────────────────────────
/** A single control button shown inside a room card */
export interface RoomControl {
  /** Label shown under the icon */
  label: string;
  /** Lucide icon or custom:// */
  icon: string;
  /** HA domain (light, cover, script, …) */
  domain: string;
  /** Service to call (toggle, turn_on, open_cover, …) */
  service: string;
  /** Target entity id */
  entityId?: string;
  /** If set, the button color reflects this entity's state (on/off) */
  stateEntity?: string;
  /** Accent color when the entity is on (hex) */
  color?: string;
}

export interface RoomEntry {
  area: string;
  label: string;
  icon: string;
  iconBg: string;
  tempEntity?: string;
  humidityEntity?: string;
  lightEntities?: string[];
  panelId?: string;
  controls?: RoomControl[];
}

export interface RoomsGridConfig extends WidgetSoundOverrides {
  type: 'rooms';
  rooms: RoomEntry[];
  columns?: number;
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
export type SensorVariant = 'default' | 'gauge' | 'sparkline' | 'bar';

export interface SensorCardConfig extends WidgetSoundOverrides {
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
  showInfoPanel?: boolean;
  staleBadge?: boolean;
  staleThresholdMinutes?: number;
}

// ── Light ─────────────────────────────────────────────────────────────────────
export interface LightCardConfig extends WidgetSoundOverrides {
  type: 'light';
  entityId: string; // light.xxx ou light.group_xxx
  name?: string; // Nom affiché (sinon friendly_name)
  icon?: string; // Icône lucide custom
  /** Si true, c'est un groupe : affiche "X/Y allumées" */
  isGroup?: boolean;
  /** Entity IDs des sous-lumières du groupe (pour compter les actives) */
  groupEntities?: string[];
  showInfoPanel?: boolean;
  /** Afficher le slider de luminosité (défaut: true) */
  showBrightness?: boolean;
  /** Afficher le slider de température de couleur (défaut: true) */
  showColorTemp?: boolean;
  /** Afficher le slider de teinte couleur (défaut: true) */
  showColor?: boolean;
}

// ── Person Status ─────────────────────────────────────────────────────────────
export interface PersonEntry {
  entityId: string; // person.user_1, person.user_2
  name?: string; // Nom custom (sinon friendly_name)
}

export interface PersonStatusConfig {
  type: 'person';
  persons: PersonEntry[];
  showInfoPanel?: boolean;
}

// ── Cover (volets/stores) ─────────────────────────────────────────────────────
export interface CoverCardConfig extends WidgetSoundOverrides {
  type: 'cover';
  entityId: string; // cover.living_room
  name?: string; // Nom custom
  icon?: string; // Icône lucide (sinon Blinds par défaut)
  /** Afficher le contrôle de tilt (inclinaison) si supporté */
  showTilt?: boolean;
  showInfoPanel?: boolean;
}

// ── Automation ───────────────────────────────────────────────────────────────
export interface AutomationCardConfig extends WidgetSoundOverrides {
  type: 'automation';
  /** Entity ID de l'automatisation (domain: automation) */
  entityId: string;
  /** Nom affiché (override du friendly_name) */
  name?: string;
  /** Icône Lucide personnalisée */
  icon?: string;
  showInfoPanel?: boolean;
}

// ── Automation list ───────────────────────────────────────────────────────────

/** Une ligne de la liste d'automatisations */
export interface AutomationItem {
  /** Entity ID de l'automatisation (domain: automation) */
  entityId: string;
  /** Nom affiché (override du friendly_name) */
  name?: string;
  /** Icône Lucide personnalisée */
  icon?: string;
}

export interface AutomationListCardConfig extends WidgetSoundOverrides {
  type: 'automation_list';
  /** Titre de la card */
  name?: string;
  /** Automatisations listées, dans l'ordre d'affichage */
  automations: AutomationItem[];
}

// ── Button ────────────────────────────────────────────────────────────────────
export interface ButtonCardConfig extends WidgetSoundOverrides {
  type: 'button';
  /** Label displayed on the button */
  label: string;
  /** Lucide icon name or custom:// URL */
  icon?: string;
  /** Accent color (hex or css color) */
  color?: string;
  /** HA domain to call (e.g. 'script', 'homeassistant', 'light') */
  domain: string;
  /** Service to call (e.g. 'turn_on', 'toggle') */
  service: string;
  /** Target entity_id (optional) */
  entityId?: string;
  /** Extra service data (JSON string) */
  serviceData?: string;
  /** Show a confirmation dialog before calling (default: false) */
  requireConfirm?: boolean;
  /** Confirmation message shown in dialog */
  confirmText?: string;
  /** Optional subtitle / description shown under the label */
  subtitle?: string;
}

// ── Alarm ─────────────────────────────────────────────────────────────────────
export type ArmMode = 'disarm' | 'home' | 'away' | 'night' | 'vacation';

export interface AlarmCardConfig {
  type: 'alarm';
  entityId: string; // alarm_control_panel.xxx
  name?: string;
  /** Whether a PIN code is required to arm/disarm (default: true) */
  requireCode?: boolean;
  showInfoPanel?: boolean;
  /** Which arm mode buttons to show in the card (default: all) */
  armModes?: ArmMode[];
}

// ── Vacuum ────────────────────────────────────────────────────────────────────
export interface VacuumRoom {
  /** Unique ID for this room (e.g. "16") */
  id: string;
  /** Display name */
  name: string;
  /** Roborock segment ID (numeric) for app_segment_clean */
  segmentId?: number;
  /** Optional icon name (lucide) */
  icon?: string;
}

/** A select entity to display as a dropdown control on the vacuum card */
export interface VacuumSelectEntity {
  /** Entity ID (e.g. select.roborock_qrevo_maxv_fan_speed) */
  entityId: string;
  /** Custom label override (falls back to friendly_name) */
  label?: string;
}

export interface VacuumCardConfig extends WidgetSoundOverrides {
  type: 'vacuum';
  entityId: string; // vacuum.xxx
  name?: string;
  /** Room/segment definitions from Roborock map */
  rooms?: VacuumRoom[];
  /** Select entities to show as controls (fan speed, scrub intensity, mop route…) */
  selects?: VacuumSelectEntity[];
  showInfoPanel?: boolean;
}

// ── Media Player ──────────────────────────────────────────────────────────────
export interface MediaPlayerCardConfig extends WidgetSoundOverrides {
  type: 'media_player';
  entityId: string; // media_player.xxx
  name?: string;
  /** Layout variant: 'horizontal' (default), 'vertical', 'compact' */
  disposition?: 'horizontal' | 'vertical' | 'compact';
  /** Force compact single-row layout regardless of disposition */
  compact?: boolean;
}

// ── Template (Mushroom-style) ─────────────────────────────────────────────────
export interface TemplateCardConfig {
  type: 'template';
  entityId?: string; // Entité contextuelle (optionnelle)
  primaryInfo: string; // Template Nunjucks — info principale
  secondaryInfo?: string; // Template Nunjucks — info secondaire
  icon?: string; // Template Nunjucks — icône (mdi:xxx ou lucide)
  iconColor?: string; // Template Nunjucks — couleur icône
  image?: string; // Template Nunjucks — URL image
  showInfoPanel?: boolean;
}

// ── Pellet stove ─────────────────────────────────────────────────────────────
export interface PelletCardConfig {
  type: 'pellet';
  entityId: string; // climate.xxx
  name?: string;
}

// ── Group ─────────────────────────────────────────────────────────────────────
/** A child widget entry stored inside a GroupCard */
export interface GroupChild {
  /** Unique ID — also used as key in allWidgetConfigs[pageId] */
  id: string;
  /** Widget type — drives which component is rendered */
  type: Exclude<WidgetType, 'group'>;
}

/** Pseudo-type used before WidgetType is defined — resolved via the union below */
type WidgetType =
  | 'camera'
  | 'weather'
  | 'thermostat'
  | 'shortcuts'
  | 'tempo'
  | 'energy'
  | 'greeting'
  | 'activity'
  | 'sensor'
  | 'light'
  | 'person'
  | 'cover'
  | 'template'
  | 'automation'
  | 'button'
  | 'media_player'
  | 'alarm'
  | 'vacuum'
  | 'pellet'
  | 'room'
  | 'group';

export interface GroupCardConfig extends WidgetSoundOverrides {
  type: 'group';
  /** Optional title shown at the top */
  title?: string;
  /** Number of columns in the internal mini-grid (default: 2) */
  columns?: 1 | 2 | 3;
  /** Gap between children in px (default: 8) */
  gap?: number;
  /** Ordered list of child widgets */
  children: GroupChild[];
}

// ── Room (standalone) ─────────────────────────────────────────────────────────
export interface RoomCardConfig extends WidgetSoundOverrides {
  type: 'room';
  label: string;
  icon: string;
  iconBg: string;
  tempEntity?: string;
  humidityEntity?: string;
  lightEntities?: string[];
  controls?: RoomControl[];
  panelId?: string;
}

// ── Union type ────────────────────────────────────────────────────────────────
/** Rendu du graphique : courbe pour du numérique, frise pour du binaire */
export type ChartVariant = 'line' | 'timeline';

export interface ChartCardConfig {
  type: 'chart';
  entityId?: string;
  name?: string;
  /** Fenêtre d'historique, en heures */
  hours?: number;
  variant?: ChartVariant;
  color?: string;
}

export interface BatteriesCardConfig {
  type: 'batteries';
  name?: string;
  /** Seuil d'alerte, en % */
  threshold?: number;
  /** N'afficher que les batteries sous le seuil */
  onlyLow?: boolean;
  /** Entités à ignorer (faux positifs du filtre par device_class) */
  exclude?: string[];
}

export interface LockCardConfig {
  type: 'lock';
  entityId?: string;
  name?: string;
  /** Demander une confirmation avant de déverrouiller */
  confirmUnlock?: boolean;
}

export interface CalendarCardConfig {
  type: 'calendar';
  /** Agendas agrégés dans la card */
  entityIds?: string[];
  name?: string;
  /** Horizon en jours */
  days?: number;
  /** Nombre maximum d'évènements listés */
  max?: number;
}

export interface TodoCardConfig {
  type: 'todo';
  entityId?: string;
  name?: string;
  /** Afficher aussi les tâches terminées */
  showCompleted?: boolean;
  /** Champ de saisie pour ajouter une tâche */
  allowAdd?: boolean;
}

export interface FanCardConfig {
  type: 'fan';
  entityId?: string;
  name?: string;
  /** Masquer le bouton d'oscillation même si l'entité le gère */
  hideOscillate?: boolean;
}

export interface ClockCardConfig {
  type: 'clock';
  name?: string;
  /** Cadran analogique quand la card est assez haute */
  showAnalog?: boolean;
  showDate?: boolean;
  showSeconds?: boolean;
  /** Format 12 h avec AM/PM, sinon 24 h */
  hour12?: boolean;
}

export type WidgetConfig =
  | ActivityBarConfig
  | CameraCardConfig
  | WeatherCardConfig
  | EnergyCardConfig
  | EnergyFlowCardConfig
  | TempoCardConfig
  | ThermostatCardConfig
  | ShortcutsCardConfig
  | GreetingCardConfig
  | SensorCardConfig
  | LightCardConfig
  | PersonStatusConfig
  | CoverCardConfig
  | TemplateCardConfig
  | AutomationCardConfig
  | AutomationListCardConfig
  | ButtonCardConfig
  | MediaPlayerCardConfig
  | AlarmCardConfig
  | VacuumCardConfig
  | PelletCardConfig
  | GroupCardConfig
  | RoomCardConfig
  | ChartCardConfig
  | BatteriesCardConfig
  | LockCardConfig
  | CalendarCardConfig
  | TodoCardConfig
  | FanCardConfig
  | ClockCardConfig
  | RoomsGridConfig;

/** Map of widget id → its config */
export type WidgetConfigs = Record<string, WidgetConfig>;
