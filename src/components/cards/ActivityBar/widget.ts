import { Activity } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « activity » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'activity',

  component: () => import('./ActivityBar').then(m => ({ default: m.ActivityBar })),

  meta: {
    label: 'widgets.activity.label',
    description: 'widgets.activity.description',
    category: 'system',
    icon: Activity,
    color: '#8b5cf6',
  },

  defaultSize: { lg: { w: 11, h: 1 }, md: { w: 7, h: 1 }, sm: { w: 3, h: 1 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 8, h: 1 },
      { name: 'Normal', w: 11, h: 1 },
      { name: 'Large', w: 12, h: 2 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 7, h: 1 },
      { name: 'Large', w: 8, h: 2 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 3, h: 1 },
      { name: 'Large', w: 4, h: 2 },
    ],
  },

  dispositions: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 6, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 3, h: 1 } },
      defaultSize: { lg: { w: 11, h: 1 }, md: { w: 7, h: 1 }, sm: { w: 3, h: 1 } },
    },
  ],

  fields: [
    {
      key: 'pills',
      label: 'Indicateurs',
      fieldType: 'list',
      itemFields: [
        { key: 'id', label: 'Identifiant', fieldType: 'text' },
        { key: 'entityId', label: 'Entité', fieldType: 'entity' },
        { key: 'label', label: 'Label', fieldType: 'text' },
        { key: 'template', label: 'Template ({state}, {attr.X})', fieldType: 'text' },
        { key: 'hideLabel', label: 'Icône seule (masquer le texte)', fieldType: 'boolean' },
        { key: 'icon', label: 'Icône', fieldType: 'icon' },
        { key: 'color', label: 'Couleur (#hex, template Jinja, vide = auto)', fieldType: 'text' },
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

  defaults: {
    type: 'activity',
    pills: [
      { id: 'alarm', entityId: 'alarm_control_panel.home_alarm', label: 'Alarme', template: '{state}' },
      { id: 'heater', entityId: 'climate.living_room', label: 'Chauffage', template: '{state}' },
      { id: 'solar', entityId: 'sensor.battery_level', label: 'Batterie solaire', template: '{state}%' },
      { id: 'tempo', entityId: 'sensor.tempo_current_color', label: 'Tempo', template: '{state}' },
      { id: 'temp', entityId: 'sensor.bedroom_temperature', label: 'Chambre', template: '{state}°C' },
    ],
    persons: [],
  } satisfies WidgetDefaults<WidgetConfig>,
});
