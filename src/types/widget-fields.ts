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
    | 'multiselect'
    | 'weather-icons'
    | 'panel-select';
  /** For entity fields: filter by domain (e.g. 'sensor', 'climate') */
  domain?: string;
  /** For list fields: sub-fields of each item */
  itemFields?: WidgetFieldDef[];
  /** For select / multiselect fields: available options */
  options?: { value: string; label: string; icon?: string }[];
}

// ── Default configs (mirrors current hardcoded values) ────────────────────────
export const LEGACY_DEFAULT_WIDGET_CONFIGS: WidgetConfigs = {
  activity: {
    type: 'activity',
    pills: [
      { id: 'alarm', entityId: 'alarm_control_panel.home_alarm', label: 'Alarme', template: '{state}' },
      { id: 'heater', entityId: 'climate.living_room', label: 'Chauffage', template: '{state}' },
      { id: 'solar', entityId: 'sensor.battery_level', label: 'Batterie solaire', template: '{state}%' },
      { id: 'tempo', entityId: 'sensor.tempo_current_color', label: 'Tempo', template: '{state}' },
      { id: 'temp', entityId: 'sensor.bedroom_temperature', label: 'Chambre', template: '{state}°C' },
    ],
    persons: [],
  },
  camera: {
    type: 'camera',
    cameras: [
      { entityId: 'camera.front_door', name: 'Entrée' },
      { entityId: 'camera.kitchen', name: 'Cuisine' },
      { entityId: 'camera.living_room', name: 'Salon' },
      { entityId: 'camera.hallway', name: 'Couloir' },
    ],
    selectorEntity: 'input_select.camera_selector',
    streamMode: 'auto',
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
  shortcuts: {
    type: 'shortcuts',
    // Vide : les raccourcis pointent vers des panneaux que l'utilisateur crée.
    shortcuts: [],
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
    secondaryInfo: "{{ states('sensor.bedroom_temperature') }}°C",
    icon: 'mdi:home',
    iconColor: 'blue',
  },
  automation: {
    type: 'automation',
    entityId: 'automation.example',
  },
  group: {
    type: 'group',
    title: '',
    columns: 2,
    children: [],
  },
  room: {
    type: 'room',
    label: 'Pièce',
    icon: 'Home',
    iconBg: 'from-blue-500 to-sky-400',
  },
  button: {
    type: 'button',
    label: 'Mon bouton',
    domain: 'script',
    service: 'turn_on',
    color: '#3b82f6',
  },
  media_player: {
    type: 'media_player',
    entityId: 'media_player.salon',
    disposition: 'horizontal',
  },
  alarm: {
    type: 'alarm',
    entityId: 'alarm_control_panel.home_alarm',
    requireCode: true,
  },
  vacuum: {
    type: 'vacuum',
    entityId: 'vacuum.robot',
    rooms: [],
  },
  pellet: {
    type: 'pellet',
    entityId: 'climate.pellet_stove',
  },
};

export const LEGACY_WIDGET_FIELD_DEFS: Record<string, WidgetFieldDef[]> = {
  weather: [
    { key: 'entityId', label: 'Entité météo', fieldType: 'entity', domain: 'weather' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
    { key: 'customIcons', label: 'Icônes personnalisées', fieldType: 'weather-icons' },
  ],
  thermostat: [
    { key: 'entityId', label: 'Entité climate', fieldType: 'entity', domain: 'climate' },
    { key: 'minTemp', label: 'Température min', fieldType: 'number' },
    { key: 'maxTemp', label: 'Température max', fieldType: 'number' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  energy: [
    { key: 'batteryLevelEntity', label: 'Niveau batterie', fieldType: 'entity', domain: 'sensor' },
    { key: 'batteryStateEntity', label: 'État batterie', fieldType: 'entity', domain: 'sensor' },
    { key: 'gridInputPowerEntity', label: 'Puissance réseau', fieldType: 'entity', domain: 'sensor' },
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
    { key: 'selectorEntity', label: 'Entité sélection', fieldType: 'entity', domain: 'input_select' },
    {
      key: 'cameras',
      label: 'Caméras',
      fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'Entité caméra', fieldType: 'entity', domain: 'camera' },
        { key: 'name', label: 'Nom', fieldType: 'text' },
        { key: 'posterEntity', label: "Image d'attente (entité instantané)", fieldType: 'entity', domain: 'camera' },
      ],
    },
    {
      key: 'streamMode',
      label: 'Mode de streaming',
      fieldType: 'select',
      options: [
        { value: 'auto', label: 'Auto (HLS si la caméra le supporte)' },
        { value: 'mjpeg', label: 'MJPEG (caméras nativement MJPEG)' },
        { value: 'hls', label: 'HLS (flux RTSP, fluide)' },
      ],
    },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  shortcuts: [
    {
      key: 'shortcuts',
      label: 'Raccourcis',
      fieldType: 'list',
      itemFields: [
        { key: 'id', label: 'Identifiant', fieldType: 'text' },
        { key: 'label', label: 'Nom affiché', fieldType: 'text' },
        { key: 'icon', label: 'Icône', fieldType: 'icon' },
        { key: 'panelId', label: 'Panneau lié', fieldType: 'panel-select' },
        { key: 'color', label: 'Couleur', fieldType: 'gradient' },
        { key: 'statusEntity', label: 'Entité statut', fieldType: 'entity' },
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
        { key: 'entityId', label: 'Entité', fieldType: 'entity' },
        { key: 'label', label: 'Label', fieldType: 'text' },
        { key: 'template', label: 'Template ({state}, {attr.X})', fieldType: 'text' },
        { key: 'icon', label: 'Icône', fieldType: 'icon' },
        { key: 'color', label: 'Couleur (#hex, vide = auto)', fieldType: 'text' },
        {
          key: 'action',
          label: 'Au clic',
          fieldType: 'select',
          options: [
            { value: 'none', label: 'Rien' },
            { value: 'more-info', label: 'Ouvrir la fiche détail' },
            { value: 'toggle', label: "Basculer l'entité" },
            { value: 'service', label: 'Appeler un service' },
          ],
        },
        { key: 'service', label: 'Service (domain.service)', fieldType: 'text' },
      ],
    },
    {
      key: 'persons',
      label: 'Utilisateurs affichés',
      fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'Entité personne', fieldType: 'entity', domain: 'person' },
        { key: 'name', label: 'Nom affiché', fieldType: 'text' },
      ],
    },
  ],
  greeting: [{ key: 'locale', label: 'Locale (fr-FR, en-US...)', fieldType: 'text' }],
  sensor: [
    { key: 'entityId', label: 'Entité', fieldType: 'entity' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'icon', label: 'Icône', fieldType: 'icon' },
    {
      key: 'variant',
      label: 'Variante',
      fieldType: 'select',
      options: [
        { value: 'default', label: 'Défaut (barre)' },
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
    { key: 'entityId', label: 'Entité lumière', fieldType: 'entity', domain: 'light' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'icon', label: 'Icône', fieldType: 'icon' },
    { key: 'isGroup', label: 'Groupe de lumières', fieldType: 'boolean' },
    { key: 'showBrightness', label: 'Contrôle luminosité', fieldType: 'boolean' },
    { key: 'showColorTemp', label: 'Contrôle température couleur', fieldType: 'boolean' },
    { key: 'showColor', label: 'Contrôle teinte (RGB)', fieldType: 'boolean' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  person: [
    {
      key: 'persons',
      label: 'Personnes',
      fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'Entité personne', fieldType: 'entity', domain: 'person' },
        { key: 'name', label: 'Nom affiché', fieldType: 'text' },
      ],
    },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  cover: [
    { key: 'entityId', label: 'Entité volet', fieldType: 'entity', domain: 'cover' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'icon', label: 'Icône', fieldType: 'icon' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  template: [
    { key: 'entityId', label: 'Entité (contexte)', fieldType: 'entity' },
    { key: 'primaryInfo', label: 'Information principale', fieldType: 'template' },
    { key: 'secondaryInfo', label: 'Information secondaire', fieldType: 'template' },
    { key: 'icon', label: 'Icône', fieldType: 'template' },
    { key: 'iconColor', label: 'Couleur icône', fieldType: 'template' },
    { key: 'image', label: 'Image (URL)', fieldType: 'template' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  automation: [
    { key: 'entityId', label: 'Automatisation', fieldType: 'entity', domain: 'automation' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'icon', label: 'Icône', fieldType: 'icon' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  group: [
    { key: 'title', label: 'Titre du groupe', fieldType: 'text' },
    {
      key: 'columns',
      label: 'Colonnes',
      fieldType: 'select',
      options: [
        { value: '1', label: '1 colonne' },
        { value: '2', label: '2 colonnes' },
        { value: '3', label: '3 colonnes' },
      ],
    },
  ],
  room: [
    { key: 'label', label: 'Nom de la pièce', fieldType: 'text' },
    { key: 'icon', label: 'Icône', fieldType: 'icon' },
    { key: 'iconBg', label: 'Dégradé icône', fieldType: 'gradient' },
    { key: 'tempEntity', label: 'Capteur température', fieldType: 'entity', domain: 'sensor' },
    { key: 'humidityEntity', label: 'Capteur humidité', fieldType: 'entity', domain: 'sensor' },
    { key: 'lightEntities', label: 'Lumières (toggle auto)', fieldType: 'entity-list', domain: 'light' },
    { key: 'panelId', label: 'Panneau lié (→)', fieldType: 'panel-select' },
    {
      key: 'controls',
      label: 'Boutons personnalisés',
      fieldType: 'list',
      itemFields: [
        { key: 'label', label: 'Libellé', fieldType: 'text' },
        { key: 'icon', label: 'Icône', fieldType: 'icon' },
        { key: 'domain', label: 'Domaine (ex: light)', fieldType: 'text' },
        { key: 'service', label: 'Service (ex: toggle)', fieldType: 'text' },
        { key: 'entityId', label: 'Entité cible', fieldType: 'entity' },
        { key: 'stateEntity', label: 'Entité état (couleur)', fieldType: 'entity' },
        { key: 'color', label: 'Couleur active (hex)', fieldType: 'text' },
      ],
    },
  ],
  button: [
    { key: 'label', label: 'Libellé du bouton', fieldType: 'text' },
    { key: 'subtitle', label: 'Sous-titre (optionnel)', fieldType: 'text' },
    { key: 'icon', label: 'Icône', fieldType: 'icon' },
    { key: 'color', label: 'Couleur accent (hex)', fieldType: 'text' },
    { key: 'domain', label: 'Domaine HA (ex: script, light)', fieldType: 'text' },
    { key: 'service', label: 'Service (ex: turn_on, toggle)', fieldType: 'text' },
    { key: 'entityId', label: 'Entité cible (optionnel)', fieldType: 'entity' },
    { key: 'serviceData', label: 'Données service (JSON)', fieldType: 'text' },
    { key: 'requireConfirm', label: 'Demander confirmation', fieldType: 'boolean' },
    { key: 'confirmText', label: 'Message de confirmation', fieldType: 'text' },
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
  alarm: [
    { key: 'entityId', label: 'Alarme', fieldType: 'entity', domain: 'alarm_control_panel' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'requireCode', label: 'Code PIN requis', fieldType: 'boolean' },
    {
      key: 'armModes',
      label: 'Boutons affichés',
      fieldType: 'multiselect',
      options: [
        { value: 'disarm', label: 'Désarmer', icon: '🔓' },
        { value: 'home', label: 'Domicile', icon: '🏠' },
        { value: 'away', label: 'Absent', icon: '🔴' },
        { value: 'night', label: 'Nuit', icon: '🌙' },
        { value: 'vacation', label: 'Vacances', icon: '✈️' },
      ],
    },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  vacuum: [
    { key: 'entityId', label: 'Aspirateur', fieldType: 'entity', domain: 'vacuum' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    {
      key: 'rooms',
      label: 'Pièces (map Roborock)',
      fieldType: 'list',
      itemFields: [
        { key: 'id', label: 'ID segment', fieldType: 'text' },
        { key: 'name', label: 'Nom de la pièce', fieldType: 'text' },
        { key: 'segmentId', label: 'Segment ID (numérique)', fieldType: 'number' },
        { key: 'icon', label: 'Icône', fieldType: 'icon' },
      ],
    },
    {
      key: 'selects',
      label: 'Contrôles select (vitesse ventilateur, intensité lavage…)',
      fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'Entité select', fieldType: 'entity', domain: 'select' },
        { key: 'label', label: 'Libellé personnalisé', fieldType: 'text' },
      ],
    },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],
  pellet: [
    { key: 'entityId', label: 'Entité climate', fieldType: 'entity', domain: 'climate' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
  ],
};
