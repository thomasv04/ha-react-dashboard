import type { WidgetConfigs } from './widget-types';

export interface WidgetFieldDef {
  key: string;
  label: string;
  fieldType:
    | 'entity'
    | 'text'
    | 'number'
    | 'boolean'
    | 'entity-list'
    | 'list'
    | 'icon'
    | 'gradient'
    | 'template'
    | 'select'
    | 'weather-icons'
    | 'panel-select';
  /** For entity fields: filter by domain (e.g. 'sensor', 'climate') */
  domain?: string;
  /** For list fields: sub-fields of each item */
  itemFields?: WidgetFieldDef[];
  /** For select fields: available options */
  options?: { value: string; label: string }[];
}

// â”€â”€ Default configs (mirrors current hardcoded values) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export const DEFAULT_WIDGET_CONFIGS: WidgetConfigs = {
  activity: {
    type: 'activity',
    pills: [
      { id: 'alarm', entityId: 'alarm_control_panel.home_alarm', label: 'Alarme', template: '{state}' },
      { id: 'heater', entityId: 'climate.living_room', label: 'Chauffage', template: '{state}' },
      { id: 'solar', entityId: 'sensor.battery_level', label: 'Batterie solaire', template: '{state}%' },
      { id: 'tempo', entityId: 'sensor.tempo_current_color', label: 'Tempo', template: '{state}' },
      { id: 'temp', entityId: 'sensor.bedroom_temperature', label: 'Chambre', template: '{state}Â°C' },
    ],
    persons: [],
  },
  camera: {
    type: 'camera',
    cameras: [
      { entityId: 'camera.front_door', name: 'EntrÃ©e' },
      { entityId: 'camera.kitchen', name: 'Cuisine' },
      { entityId: 'camera.living_room', name: 'Salon' },
      { entityId: 'camera.hallway', name: 'Couloir' },
    ],
    selectorEntity: 'input_select.camera_selector',
  },
  weather: {
    type: 'weather',
    entityId: 'weather.home',
  },
  energy: {
    type: 'energy',
    batteryLevelEntity: 'sensor.battery_level',
    batteryStateEntity: 'sensor.battery_state',
    gridInputPowerEntity: 'sensor.grid_power',
    homeOutputPowerEntity: 'sensor.home_power',
    solarProductionEntity: 'sensor.solar_production',
  },
  tempo: {
    type: 'tempo',
    currentColorEntity: 'sensor.tempo_current_color',
    nextColorEntity: 'sensor.tempo_next_color',
    offPeakEntity: 'binary_sensor.tempo_off_peak',
    remainingBlueEntity: 'sensor.tempo_remaining_blue',
    remainingWhiteEntity: 'sensor.tempo_remaining_white',
    remainingRedEntity: 'sensor.tempo_remaining_red',
  },
  thermostat: {
    type: 'thermostat',
    entityId: 'climate.living_room',
    minTemp: 10,
    maxTemp: 30,
  },
  rooms: {
    type: 'rooms',
    rooms: [
      {
        area: 'kitchen',
        label: 'Cuisine',
        icon: 'UtensilsCrossed',
        iconBg: 'from-red-500 to-orange-400',
        tempEntity: 'sensor.kitchen_temperature',
        lightEntities: ['light.kitchen'],
      },
      { area: 'storage', label: 'Cellier', icon: 'Package', iconBg: 'from-purple-500 to-violet-400' },
      {
        area: 'dining_room',
        label: 'Salle Ã  manger',
        icon: 'Armchair',
        iconBg: 'from-lime-500 to-green-400',
        tempEntity: 'sensor.dining_room_temperature',
      },
      { area: 'guest_room', label: 'Ch. invitÃ©s', icon: 'BedDouble', iconBg: 'from-teal-500 to-cyan-400' },
      {
        area: 'bedroom',
        label: 'Chambre',
        icon: 'Moon',
        iconBg: 'from-pink-500 to-rose-400',
        tempEntity: 'sensor.bedroom_temperature',
        lightEntities: ['light.bedroom'],
      },
      {
        area: 'living_room',
        label: 'Salon',
        icon: 'Sofa',
        iconBg: 'from-yellow-500 to-amber-400',
        lightEntities: ['light.living_room'],
        panelId: 'lumieres',
      },
      {
        area: 'office',
        label: 'Bureau',
        icon: 'BriefcaseBusiness',
        iconBg: 'from-indigo-500 to-blue-400',
        tempEntity: 'sensor.office_temperature',
      },
    ],
  },
  shortcuts: {
    type: 'shortcuts',
    shortcuts: [
      { id: 'volets', label: 'Volets', icon: 'Blinds', panelId: 'volets', color: 'from-blue-500 to-cyan-400' },
      { id: 'lumieres', label: 'LumiÃ¨res', icon: 'Lightbulb', panelId: 'lumieres', color: 'from-yellow-500 to-amber-400' },
      {
        id: 'security',
        label: 'SÃ©curitÃ©',
        icon: 'ShieldHalf',
        panelId: 'security',
        color: 'from-green-500 to-emerald-400',
        statusEntity: 'alarm_control_panel.home_alarm',
      },
      { id: 'aspirateur', label: 'Aspirateur', icon: 'Cpu', panelId: 'aspirateur', color: 'from-purple-500 to-violet-400' },
      { id: 'flowers', label: 'Plantes', icon: 'Flower2', panelId: 'flowers', color: 'from-lime-500 to-green-400' },
      { id: 'notifications', label: 'Notifs', icon: 'Bell', panelId: 'notifications', color: 'from-orange-500 to-red-400' },
      { id: 'cameras', label: 'CamÃ©ras', icon: 'Camera', panelId: 'cameras', color: 'from-slate-500 to-gray-400' },
    ],
  },
  greeting: {
    type: 'greeting',
    locale: 'fr-FR',
  },
  sensor: {
    type: 'sensor',
    entityId: 'sensor.bedroom_temperature',
    name: 'Chambre',
    variant: 'default',
  },
  light: {
    type: 'light',
    entityId: 'light.living_room',
    name: 'Salon',
  },
  person: {
    type: 'person',
    persons: [{ entityId: 'person.user_1', name: 'User 1' }],
  },
  cover: {
    type: 'cover',
    entityId: 'cover.living_room',
    name: 'Volet Salon',
  },
  template: {
    type: 'template',
    primaryInfo: 'Hello, {{user}}',
    secondaryInfo: "{{ states('sensor.bedroom_temperature') }}Â°C",
    icon: 'mdi:home',
    iconColor: 'blue',
  },
  automation: {
    type: 'automation',
    entityId: 'automation.example',
  },
  media_player: {
    type: 'media_player',
    entityId: 'media_player.salon',
    disposition: 'horizontal',
  },
};

export const WIDGET_FIELD_DEFS: Record<string, WidgetFieldDef[]> = {
  weather: [
    { key: 'entityId', label: 'EntitÃ© mÃ©tÃ©o', fieldType: 'entity', domain: 'weather' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
    { key: 'customIcons', label: 'Icônes personnalisées', fieldType: 'weather-icons' },
  ],
  thermostat: [
    { key: 'entityId', label: 'EntitÃ© climate', fieldType: 'entity', domain: 'climate' },
    { key: 'minTemp', label: 'TempÃ©rature min', fieldType: 'number' },
    { key: 'maxTemp', label: 'TempÃ©rature max', fieldType: 'number' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  energy: [
    { key: 'batteryLevelEntity', label: 'Niveau batterie', fieldType: 'entity', domain: 'sensor' },
    { key: 'batteryStateEntity', label: 'Ã‰tat batterie', fieldType: 'entity', domain: 'sensor' },
    { key: 'gridInputPowerEntity', label: 'Puissance rÃ©seau', fieldType: 'entity', domain: 'sensor' },
    { key: 'homeOutputPowerEntity', label: 'Puissance maison', fieldType: 'entity', domain: 'sensor' },
    { key: 'solarProductionEntity', label: 'Production solaire', fieldType: 'entity', domain: 'sensor' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
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
    { key: 'selectorEntity', label: 'EntitÃ© sÃ©lection', fieldType: 'entity', domain: 'input_select' },
    {
      key: 'cameras',
      label: 'CamÃ©ras',
      fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'EntitÃ© camÃ©ra', fieldType: 'entity', domain: 'camera' },
        { key: 'name', label: 'Nom', fieldType: 'text' },
      ],
    },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  rooms: [
    {
      key: 'rooms',
      label: 'PiÃ¨ces',
      fieldType: 'list',
      itemFields: [
        { key: 'area', label: 'Zone (area)', fieldType: 'text' },
        { key: 'label', label: 'Nom affichÃ©', fieldType: 'text' },
        { key: 'icon', label: 'IcÃ´ne', fieldType: 'icon' },
        { key: 'iconBg', label: 'DÃ©gradÃ© icÃ´ne', fieldType: 'gradient' },
        { key: 'tempEntity', label: 'Capteur tempÃ©rature', fieldType: 'entity', domain: 'sensor' },
        { key: 'lightEntities', label: 'LumiÃ¨res', fieldType: 'entity-list', domain: 'light' },
        { key: 'panelId', label: 'Panneau lié', fieldType: 'panel-select' },
      ],
    },
  ],
  shortcuts: [
    {
      key: 'shortcuts',
      label: 'Raccourcis',
      fieldType: 'list',
      itemFields: [
        { key: 'id', label: 'Identifiant', fieldType: 'text' },
        { key: 'label', label: 'Nom affichÃ©', fieldType: 'text' },
        { key: 'icon', label: 'IcÃ´ne', fieldType: 'icon' },
        { key: 'panelId', label: 'Panneau lié', fieldType: 'panel-select' },
        { key: 'color', label: 'Couleur', fieldType: 'gradient' },
        { key: 'statusEntity', label: 'EntitÃ© statut', fieldType: 'entity' },
      ],
    },
  ],
  activity: [
    {
      key: 'pills',
      label: 'Indicateurs',
      fieldType: 'list',
      itemFields: [
        { key: 'id', label: 'Identifiant', fieldType: 'text' },
        { key: 'entityId', label: 'EntitÃ©', fieldType: 'entity' },
        { key: 'label', label: 'Label', fieldType: 'text' },
        { key: 'template', label: 'Template ({state}, {attr.X})', fieldType: 'text' },
      ],
    },
    {
      key: 'persons',
      label: 'Utilisateurs affichÃ©s',
      fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'EntitÃ© personne', fieldType: 'entity', domain: 'person' },
        { key: 'name', label: 'Nom affichÃ©', fieldType: 'text' },
      ],
    },
  ],
  greeting: [{ key: 'locale', label: 'Locale (fr-FR, en-US...)', fieldType: 'text' }],
  sensor: [
    { key: 'entityId', label: 'EntitÃ©', fieldType: 'entity' },
    { key: 'name', label: 'Nom affichÃ©', fieldType: 'text' },
    { key: 'icon', label: 'IcÃ´ne', fieldType: 'icon' },
    {
      key: 'variant',
      label: 'Variante',
      fieldType: 'select',
      options: [
        { value: 'default', label: 'DÃ©faut (barre)' },
        { value: 'gauge', label: 'Jauge demi-cercle' },
        { value: 'sparkline', label: 'Courbe (SparkLine)' },
        { value: 'bar', label: 'Histogramme (BarChart)' },
      ],
    },
    { key: 'min', label: 'Valeur min', fieldType: 'number' },
    { key: 'max', label: 'Valeur max', fieldType: 'number' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
    { key: 'staleBadge', label: 'Badge "dernière mise à jour"', fieldType: 'boolean' },
    { key: 'staleThresholdMinutes', label: 'Seuil périmé (minutes)', fieldType: 'number' },
  ],
  light: [
    { key: 'entityId', label: 'EntitÃ© lumiÃ¨re', fieldType: 'entity', domain: 'light' },
    { key: 'name', label: 'Nom affichÃ©', fieldType: 'text' },
    { key: 'icon', label: 'IcÃ´ne', fieldType: 'icon' },
    { key: 'isGroup', label: 'Groupe de lumiÃ¨res', fieldType: 'text' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  person: [
    {
      key: 'persons',
      label: 'Personnes',
      fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'EntitÃ© personne', fieldType: 'entity', domain: 'person' },
        { key: 'name', label: 'Nom affichÃ©', fieldType: 'text' },
      ],
    },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  cover: [
    { key: 'entityId', label: 'EntitÃ© volet', fieldType: 'entity', domain: 'cover' },
    { key: 'name', label: 'Nom affichÃ©', fieldType: 'text' },
    { key: 'icon', label: 'IcÃ´ne', fieldType: 'icon' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  template: [
    { key: 'entityId', label: 'EntitÃ© (contexte)', fieldType: 'entity' },
    { key: 'primaryInfo', label: 'Information principale', fieldType: 'template' },
    { key: 'secondaryInfo', label: 'Information secondaire', fieldType: 'template' },
    { key: 'icon', label: 'IcÃ´ne', fieldType: 'template' },
    { key: 'iconColor', label: 'Couleur icÃ´ne', fieldType: 'template' },
    { key: 'image', label: 'Image (URL)', fieldType: 'template' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  automation: [
    { key: 'entityId', label: 'Automatisation', fieldType: 'entity', domain: 'automation' },
    { key: 'name', label: 'Nom affichÃ©', fieldType: 'text' },
    { key: 'icon', label: 'IcÃ´ne', fieldType: 'icon' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  media_player: [
    { key: 'entityId', label: 'Lecteur multimédia', fieldType: 'entity', domain: 'media_player' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    {
      key: 'disposition',
      label: 'Mise en page',
      fieldType: 'select',
      options: [
        { value: 'horizontal', label: 'Horizontale (cover + infos)' },
        { value: 'vertical', label: 'Verticale (cover en grand)' },
        { value: 'compact', label: 'Compacte (1 ligne)' },
      ],
    },
  ],
};
