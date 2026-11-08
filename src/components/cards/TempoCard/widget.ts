import { Activity } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { TempoCardConfig } from '@/types/widget-configs';

/** EJP : ni heures creuses, ni jours bleus ou blancs. */
const tempoOnly = (c: Record<string, unknown>) => c.mode !== 'ejp';
const ejpOnly = (c: Record<string, unknown>) => c.mode === 'ejp';
const MONTHS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];

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
      label: 'widgets.tempo.dispositions.default.label',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
      defaultSize: { lg: { w: 4, h: 2 }, md: { w: 8, h: 2 }, sm: { w: 4, h: 2 } },
    },
  ],

  // Jour actuel / demain : binary_sensor accepté (EJP on/off, ex. binary_sensor.ejp_aujourd_hui_stable).
  fields: [
    {
      key: 'mode',
      label: 'widgets.tempo.fields.mode.label',
      fieldType: 'select',
      options: [
        { value: 'tempo', label: 'widgets.tempo.fields.mode.options.tempo' },
        { value: 'ejp', label: 'widgets.tempo.fields.mode.options.ejp' },
      ],
    },
    {
      key: 'currentColorEntity',
      label: 'widgets.tempo.fields.currentColorEntity.label',
      fieldType: 'entity',
      domain: 'sensor,binary_sensor',
    },
    { key: 'nextColorEntity', label: 'widgets.tempo.fields.nextColorEntity.label', fieldType: 'entity', domain: 'sensor,binary_sensor' },
    {
      key: 'offPeakEntity',
      label: 'widgets.tempo.fields.offPeakEntity.label',
      fieldType: 'entity',
      domain: 'binary_sensor',
      showIf: tempoOnly,
    },
    {
      key: 'remainingBlueEntity',
      label: 'widgets.tempo.fields.remainingBlueEntity.label',
      fieldType: 'entity',
      domain: 'sensor',
      showIf: tempoOnly,
    },
    {
      key: 'remainingWhiteEntity',
      label: 'widgets.tempo.fields.remainingWhiteEntity.label',
      fieldType: 'entity',
      domain: 'sensor',
      showIf: tempoOnly,
    },
    { key: 'remainingRedEntity', label: 'widgets.tempo.fields.remainingRedEntity.label', fieldType: 'entity', domain: 'sensor' },
    {
      key: 'ejpMonths',
      label: 'widgets.tempo.fields.ejpMonths.label',
      fieldType: 'multiselect',
      options: MONTHS.map(m => ({ value: m, label: `widgets.tempo.fields.ejpMonths.options.${m}` })),
      showIf: ejpOnly,
    },
    { key: 'ejpAnnounceHour', label: 'widgets.tempo.fields.ejpAnnounceHour.label', fieldType: 'number', showIf: ejpOnly },
  ],

  defaults: {
    mode: 'tempo',
    currentColorEntity: 'sensor.tempo_current_color',
    nextColorEntity: 'sensor.tempo_next_color',
    offPeakEntity: 'binary_sensor.tempo_off_peak',
    remainingBlueEntity: 'sensor.tempo_remaining_blue',
    remainingWhiteEntity: 'sensor.tempo_remaining_white',
    remainingRedEntity: 'sensor.tempo_remaining_red',
    ejpMonths: ['11', '12', '1', '2', '3'],
    ejpAnnounceHour: 14,
  } satisfies WidgetDefaults<TempoCardConfig>,
});
