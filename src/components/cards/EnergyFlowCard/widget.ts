import { Waypoints } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { EnergyFlowCardConfig } from '@/types/widget-configs';

/**
 * Flux d'énergie — solaire, maison, batterie et réseau reliés au point de
 * couplage, avec le sens de circulation et le taux d'autoconsommation.
 *
 * Les valeurs par défaut ciblent une Zendure SolarFlow 2400 AC ; elles restent
 * modifiables depuis la modale d'édition.
 */
export default defineWidget({
  type: 'energy_flow',

  component: () => import('./EnergyFlowCard').then(m => ({ default: m.EnergyFlowCard })),

  meta: {
    label: 'widgets.energy_flow.label',
    description: 'widgets.energy_flow.description',
    category: 'energy',
    icon: Waypoints,
    color: '#34d399',
  },

  // Le schéma demande de la place : deux rangées suffisent, trois sont à l'aise.
  defaultSize: { lg: { w: 4, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },
  minSize: { lg: { w: 3, h: 2 }, md: { w: 3, h: 2 }, sm: { w: 4, h: 2 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 3, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 6, h: 4 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 8, h: 4 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
  },

  fields: [
    { key: 'name', label: 'Titre', fieldType: 'text' },
    { key: 'solarProductionEntity', label: 'Production solaire', fieldType: 'entity', domain: 'sensor' },
    { key: 'homeOutputPowerEntity', label: 'Puissance maison', fieldType: 'entity', domain: 'sensor' },
    { key: 'gridInputPowerEntity', label: 'Puissance réseau', fieldType: 'entity', domain: 'sensor' },
    { key: 'batteryLevelEntity', label: 'Niveau batterie', fieldType: 'entity', domain: 'sensor' },
    { key: 'batteryStateEntity', label: 'État batterie', fieldType: 'entity', domain: 'sensor' },
    { key: 'gridInvert', label: 'Inverser le signe du réseau', fieldType: 'boolean' },
  ],

  defaults: {
    solarProductionEntity: 'sensor.din_panneaux_solaire_puissance',
    homeOutputPowerEntity: 'sensor.solarflow_2400_ac_output_home_power',
    gridInputPowerEntity: 'sensor.solarflow_2400_ac_grid_input_power',
    batteryLevelEntity: 'sensor.solarflow_2400_ac_electric_level',
    batteryStateEntity: 'sensor.solarflow_2400_ac_pack_state',
  } satisfies WidgetDefaults<EnergyFlowCardConfig>,
});
