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
      label: 'widgets.activity.dispositions.default.label',
      minSize: { lg: { w: 6, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 3, h: 1 } },
      defaultSize: { lg: { w: 11, h: 1 }, md: { w: 7, h: 1 }, sm: { w: 3, h: 1 } },
    },
  ],

  fields: [
    {
      key: 'pills',
      label: 'widgets.activity.fields.pills.label',
      fieldType: 'list',
      itemFields: [
        { key: 'id', label: 'widgets.activity.fields.pills.item.id.label', fieldType: 'text' },
        { key: 'entityId', label: 'widgets.activity.fields.pills.item.entityId.label', fieldType: 'entity' },
        { key: 'label', label: 'widgets.activity.fields.pills.item.label.label', fieldType: 'text' },
        { key: 'template', label: 'widgets.activity.fields.pills.item.template.label', fieldType: 'text' },
        { key: 'hideLabel', label: 'widgets.activity.fields.pills.item.hideLabel.label', fieldType: 'boolean' },
        { key: 'icon', label: 'widgets.activity.fields.pills.item.icon.label', fieldType: 'icon' },
        { key: 'color', label: 'widgets.activity.fields.pills.item.color.label', fieldType: 'text' },
        {
          key: 'action',
          label: 'widgets.activity.fields.pills.item.action.label',
          fieldType: 'select',
          options: [
            { value: 'none', label: 'widgets.activity.fields.pills.item.action.options.none' },
            { value: 'more-info', label: 'widgets.activity.fields.pills.item.action.options.more-info' },
            { value: 'toggle', label: 'widgets.activity.fields.pills.item.action.options.toggle' },
            { value: 'service', label: 'widgets.activity.fields.pills.item.action.options.service' },
          ],
        },
        { key: 'service', label: 'widgets.activity.fields.pills.item.service.label', fieldType: 'text' },
      ],
    },
    {
      key: 'persons',
      label: 'widgets.activity.fields.persons.label',
      fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'widgets.activity.fields.persons.item.entityId.label', fieldType: 'entity', domain: 'person' },
        { key: 'name', label: 'widgets.activity.fields.persons.item.name.label', fieldType: 'text' },
      ],
    },
  ],

  defaults: {
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
