import { BatteryLow } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { BatteriesCardConfig } from '@/types/widget-configs';

/**
 * Batteries — toutes les entités `device_class: battery`, la plus faible en
 * tête. Aucune entité à saisir : la card se remplit seule, c'est ce qui évite
 * le capteur mort en silence.
 */
export default defineWidget({
  type: 'batteries',

  component: () => import('./BatteriesCard').then(m => ({ default: m.BatteriesCard })),

  meta: {
    label: 'widgets.batteries.label',
    description: 'widgets.batteries.description',
    category: 'system',
    icon: BatteryLow,
    color: '#f87171',
    keywords: ['batterie', 'pile', 'battery', 'maintenance'],
  },

  defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },
  minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 3, h: 3 },
      { name: 'Large', w: 4, h: 5 },
    ],
    md: [
      { name: 'Compact', w: 3, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 6, h: 5 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 5 },
    ],
  },

  fields: [
    { key: 'name', label: 'Titre', fieldType: 'text' },
    { key: 'threshold', label: "Seuil d'alerte (%)", fieldType: 'number' },
    { key: 'onlyLow', label: 'Afficher seulement les batteries faibles', fieldType: 'boolean' },
    { key: 'exclude', label: 'Entités à ignorer', fieldType: 'entity-list' },
  ],

  defaults: {
    threshold: 20,
  } satisfies WidgetDefaults<BatteriesCardConfig>,
});
