import { Zap } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « energy » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'energy',

  component: () => import('./EnergyCard').then(m => ({ default: m.EnergyCard })),

  meta: {
    label: 'widgets.energy.label',
    description: 'widgets.energy.description',
    category: 'energy',
    icon: Zap,
    color: '#22c55e',
  },

  defaultSize: { lg: { w: 4, h: 2 }, md: { w: 8, h: 2 }, sm: { w: 4, h: 2 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 3, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 6, h: 3 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 8, h: 2 },
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
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
      defaultSize: { lg: { w: 4, h: 2 }, md: { w: 8, h: 2 }, sm: { w: 4, h: 2 } },
    },
  ],

  fields: [
    { key: 'batteryLevelEntity', label: 'Niveau batterie', fieldType: 'entity', domain: 'sensor' },
    { key: 'batteryStateEntity', label: 'État batterie', fieldType: 'entity', domain: 'sensor' },
    { key: 'gridInputPowerEntity', label: 'Puissance réseau', fieldType: 'entity', domain: 'sensor' },
    { key: 'homeOutputPowerEntity', label: 'Puissance maison', fieldType: 'entity', domain: 'sensor' },
    { key: 'solarProductionEntity', label: 'Production solaire', fieldType: 'entity', domain: 'sensor' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],

  defaults: {
    type: 'energy',
    batteryLevelEntity: 'sensor.battery_level',
    batteryStateEntity: 'sensor.battery_state',
    gridInputPowerEntity: 'sensor.grid_power',
    homeOutputPowerEntity: 'sensor.home_power',
    solarProductionEntity: 'sensor.solar_production',
  } satisfies WidgetDefaults<WidgetConfig>,
});
