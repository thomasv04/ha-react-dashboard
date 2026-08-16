import { Code2 } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « template » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'template',

  component: () => import('./TemplateCard').then(m => ({ default: m.TemplateCard })),

  meta: {
    label: 'widgets.template.label',
    description: 'widgets.template.description',
    category: 'sensors',
    icon: Code2,
    color: '#06b6d4',
  },

  defaultSize: { lg: { w: 3, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 3, h: 1 },
      { name: 'Large', w: 4, h: 2 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 4, h: 1 },
      { name: 'Large', w: 4, h: 2 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 4, h: 1 },
      { name: 'Large', w: 4, h: 2 },
    ],
  },

  dispositions: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 3, h: 1 }, md: { w: 3, h: 1 }, sm: { w: 4, h: 1 } },
    },
  ],

  fields: [
    { key: 'entityId', label: 'Entité (contexte)', fieldType: 'entity' },
    { key: 'primaryInfo', label: 'Information principale', fieldType: 'template' },
    { key: 'secondaryInfo', label: 'Information secondaire', fieldType: 'template' },
    { key: 'icon', label: 'Icône', fieldType: 'template' },
    { key: 'iconColor', label: 'Couleur icône', fieldType: 'template' },
    { key: 'image', label: 'Image (URL)', fieldType: 'template' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],

  defaults: {
    type: 'template',
    primaryInfo: 'Hello, {{user}}',
    secondaryInfo: "{{ states('sensor.bedroom_temperature') }}°C",
    icon: 'mdi:home',
    iconColor: 'blue',
  } satisfies WidgetDefaults<WidgetConfig>,
});
