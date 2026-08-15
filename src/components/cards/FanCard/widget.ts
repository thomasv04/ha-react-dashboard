import { Fan } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { FanCardConfig } from '@/types/widget-configs';

/**
 * Ventilateur — marche/arrêt, vitesse et oscillation. Les contrôles suivent
 * `supported_features` : un ventilateur simple n'affiche que son bouton.
 */
export default defineWidget({
  type: 'fan',

  component: () => import('./FanCard').then(m => ({ default: m.FanCard })),

  meta: {
    label: 'widgets.fan.label',
    description: 'widgets.fan.description',
    category: 'climate',
    icon: Fan,
    color: '#38bdf8',
    entityDomain: 'fan',
    keywords: ['ventilateur', 'vmc', 'brasseur', 'fan'],
  },

  defaultSize: { lg: { w: 2, h: 3 }, md: { w: 3, h: 3 }, sm: { w: 2, h: 3 } },
  minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 2, h: 3 },
      { name: 'Large', w: 3, h: 4 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 3, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 2, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
  },

  fields: [
    { key: 'entityId', label: 'Ventilateur', fieldType: 'entity', domain: 'fan' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'hideOscillate', label: "Masquer l'oscillation", fieldType: 'boolean' },
  ],

  defaults: {
    entityId: '',
  } satisfies WidgetDefaults<FanCardConfig>,
});
