import { Lightbulb } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « light » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'light',

  component: () => import('./LightCard').then(m => ({ default: m.LightCard })),

  meta: {
    label: 'widgets.light.label',
    description: 'widgets.light.description',
    category: 'lights',
    icon: Lightbulb,
    color: '#eab308',
    entityDomain: 'light',
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
      label: 'widgets.light.dispositions.horizontal.label',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
    },
    {
      id: 'vertical',
      label: 'widgets.light.dispositions.vertical.label',
      minSize: { lg: { w: 1, h: 2 }, md: { w: 1, h: 2 }, sm: { w: 1, h: 2 } },
      defaultSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
    },
  ],

  fields: [
    { key: 'entityId', label: 'widgets.light.fields.entityId.label', fieldType: 'entity', domain: 'light' },
    { key: 'name', label: 'widgets.light.fields.name.label', fieldType: 'text' },
    { key: 'icon', label: 'widgets.light.fields.icon.label', fieldType: 'icon' },
    { key: 'isGroup', label: 'widgets.light.fields.isGroup.label', fieldType: 'boolean' },
    { key: 'showBrightness', label: 'widgets.light.fields.showBrightness.label', fieldType: 'boolean' },
    { key: 'showColorTemp', label: 'widgets.light.fields.showColorTemp.label', fieldType: 'boolean' },
    { key: 'showColor', label: 'widgets.light.fields.showColor.label', fieldType: 'boolean' },
    { key: 'showInfoPanel', label: 'widgets.light.fields.showInfoPanel.label', fieldType: 'boolean' },
  ],

  defaults: {
    entityId: 'light.living_room',
    name: 'Salon',
  } satisfies WidgetDefaults<WidgetConfig>,
});
