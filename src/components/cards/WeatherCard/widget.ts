import { Cloud } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « weather » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'weather',

  component: () => import('./WeatherCard').then(m => ({ default: m.WeatherCard })),

  meta: {
    label: 'widgets.weather.label',
    description: 'widgets.weather.description',
    category: 'climate',
    icon: Cloud,
    color: '#0ea5e9',
    entityDomain: 'weather',
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
      { name: 'Large', w: 8, h: 2 },
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
      description: 'Température + prévisions côte à côte',
      minSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      description: 'Température au-dessus, prévisions en dessous',
      minSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
      defaultSize: { lg: { w: 2, h: 4 }, md: { w: 2, h: 4 }, sm: { w: 2, h: 4 } },
    },
  ],

  fields: [
    { key: 'entityId', label: 'Entité météo', fieldType: 'entity', domain: 'weather' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
    { key: 'customIcons', label: 'Icônes personnalisées', fieldType: 'weather-icons' },
  ],

  defaults: {
    type: 'weather',
    entityId: 'weather.home',
  } satisfies WidgetDefaults<WidgetConfig>,
});
