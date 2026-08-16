import { Shield } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « alarm » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'alarm',

  component: () => import('./AlarmCard').then(m => ({ default: m.AlarmCard })),

  meta: {
    label: 'widgets.alarm.label',
    description: 'widgets.alarm.description',
    category: 'home',
    icon: Shield,
    color: '#ef4444',
    entityDomain: 'alarm_control_panel',
  },

  defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 3, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
  },

  dispositions: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
      defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },
    },
  ],

  fields: [
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

  defaults: {
    type: 'alarm',
    entityId: 'alarm_control_panel.home_alarm',
    requireCode: true,
  } satisfies WidgetDefaults<WidgetConfig>,
});
