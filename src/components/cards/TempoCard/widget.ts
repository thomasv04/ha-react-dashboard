import { Activity } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « tempo » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'tempo',

  component: () => import('./TempoCard').then(m => ({ default: m.TempoCard })),

  meta: {
    label: 'widgets.tempo.label',
    description: 'widgets.tempo.description',
    category: 'energy',
    icon: Activity,
    color: '#ef4444',
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
    { key: 'currentColorEntity', label: 'Couleur actuelle', fieldType: 'entity', domain: 'sensor' },
    { key: 'nextColorEntity', label: 'Prochaine couleur', fieldType: 'entity', domain: 'sensor' },
    { key: 'offPeakEntity', label: 'Heures creuses', fieldType: 'entity', domain: 'binary_sensor' },
    { key: 'remainingBlueEntity', label: 'Jours bleu restants', fieldType: 'entity', domain: 'sensor' },
    { key: 'remainingWhiteEntity', label: 'Jours blanc restants', fieldType: 'entity', domain: 'sensor' },
    { key: 'remainingRedEntity', label: 'Jours rouge restants', fieldType: 'entity', domain: 'sensor' },
  ],

  defaults: {
    type: 'tempo',
    currentColorEntity: 'sensor.tempo_current_color',
    nextColorEntity: 'sensor.tempo_next_color',
    offPeakEntity: 'binary_sensor.tempo_off_peak',
    remainingBlueEntity: 'sensor.tempo_remaining_blue',
    remainingWhiteEntity: 'sensor.tempo_remaining_white',
    remainingRedEntity: 'sensor.tempo_remaining_red',
  } satisfies WidgetDefaults<WidgetConfig>,
});
