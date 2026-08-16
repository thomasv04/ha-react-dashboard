import { Thermometer } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « thermostat » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'thermostat',

  component: () => import('./ThermostatCard').then(m => ({ default: m.ThermostatCard })),

  meta: {
    label: 'widgets.thermostat.label',
    description: 'widgets.thermostat.description',
    category: 'climate',
    icon: Thermometer,
    color: '#f97316',
    entityDomain: 'climate',
  },

  defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 3, h: 3 },
      { name: 'Large', w: 4, h: 3 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 8, h: 3 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },

  dispositions: [
    {
      id: 'horizontal',
      label: 'Horizontale',
      minSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      minSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
      defaultSize: { lg: { w: 2, h: 4 }, md: { w: 2, h: 4 }, sm: { w: 2, h: 4 } },
    },
  ],

  fields: [
    { key: 'entityId', label: 'Entité climate', fieldType: 'entity', domain: 'climate' },
    { key: 'minTemp', label: 'Température min', fieldType: 'number' },
    { key: 'maxTemp', label: 'Température max', fieldType: 'number' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],

  defaults: {
    type: 'thermostat',
    entityId: 'climate.living_room',
    minTemp: 10,
    maxTemp: 30,
  } satisfies WidgetDefaults<WidgetConfig>,
});
