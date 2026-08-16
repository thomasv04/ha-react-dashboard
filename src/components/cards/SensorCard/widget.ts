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
      label: 'Horizontale',
      description: 'Icône + valeur côte à côte',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 2, h: 2 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      description: 'Icône au-dessus, valeur en dessous',
      minSize: { lg: { w: 1, h: 2 }, md: { w: 1, h: 2 }, sm: { w: 1, h: 2 } },
      defaultSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
    },
  ],

  fields: [
    { key: 'entityId', label: 'Entité', fieldType: 'entity' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'icon', label: 'Icône', fieldType: 'icon' },
    {
      key: 'variant',
      label: 'Variante',
      fieldType: 'select',
      options: [
        { value: 'default', label: 'Défaut (barre)' },
        { value: 'gauge', label: 'Jauge demi-cercle' },
        { value: 'sparkline', label: 'Courbe (SparkLine)' },
        { value: 'bar', label: 'Histogramme (BarChart)' },
      ],
    },
    { key: 'min', label: 'Valeur min', fieldType: 'number' },
    { key: 'max', label: 'Valeur max', fieldType: 'number' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
    { key: 'staleBadge', label: 'Badge "dernière mise à jour"', fieldType: 'boolean' },
    { key: 'staleThresholdMinutes', label: 'Seuil périmé (minutes)', fieldType: 'number' },
  ],

  defaults: {
    type: 'sensor',
    entityId: 'sensor.bedroom_temperature',
    name: 'Chambre',
    variant: 'default',
  } satisfies WidgetDefaults<WidgetConfig>,
});
