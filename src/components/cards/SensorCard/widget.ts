import { Gauge } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « sensor » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'sensor',

  component: () => import('./SensorCard').then(m => ({ default: m.SensorCard })),

  meta: {
    label: 'widgets.sensor.label',
    description: 'widgets.sensor.description',
    category: 'sensors',
    icon: Gauge,
    color: '#3b82f6',
    entityDomain: 'sensor',
  },

  defaultSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 3, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },

  dispositions: [
    {
      id: 'horizontal',
      label: 'widgets.sensor.dispositions.horizontal.label',
      description: 'widgets.sensor.dispositions.horizontal.description',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
    },
    {
      id: 'vertical',
      label: 'widgets.sensor.dispositions.vertical.label',
      description: 'widgets.sensor.dispositions.vertical.description',
      minSize: { lg: { w: 1, h: 2 }, md: { w: 1, h: 2 }, sm: { w: 1, h: 2 } },
      defaultSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
    },
  ],

  fields: [
    { key: 'entityId', label: 'widgets.sensor.fields.entityId.label', fieldType: 'entity' },
    { key: 'name', label: 'widgets.sensor.fields.name.label', fieldType: 'text' },
    { key: 'icon', label: 'widgets.sensor.fields.icon.label', fieldType: 'icon' },
    {
      key: 'variant',
      label: 'widgets.sensor.fields.variant.label',
      fieldType: 'select',
      options: [
        { value: 'default', label: 'widgets.sensor.fields.variant.options.default' },
        { value: 'gauge', label: 'widgets.sensor.fields.variant.options.gauge' },
        { value: 'sparkline', label: 'widgets.sensor.fields.variant.options.sparkline' },
        { value: 'bar', label: 'widgets.sensor.fields.variant.options.bar' },
      ],
    },
    { key: 'min', label: 'widgets.sensor.fields.min.label', fieldType: 'number' },
    { key: 'max', label: 'widgets.sensor.fields.max.label', fieldType: 'number' },
    { key: 'showInfoPanel', label: 'widgets.sensor.fields.showInfoPanel.label', fieldType: 'boolean' },
    { key: 'staleBadge', label: 'widgets.sensor.fields.staleBadge.label', fieldType: 'boolean' },
    { key: 'staleThresholdMinutes', label: 'widgets.sensor.fields.staleThresholdMinutes.label', fieldType: 'number' },
  ],

  defaults: {
    entityId: 'sensor.bedroom_temperature',
    name: 'Chambre',
    variant: 'default',
  } satisfies WidgetDefaults<WidgetConfig>,
});
