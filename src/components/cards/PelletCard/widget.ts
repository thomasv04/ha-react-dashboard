import { Flame } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « pellet » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'pellet',

  component: () => import('./PelletCard').then(m => ({ default: m.PelletCard })),

  meta: {
    label: 'widgets.pellet.label',
    description: 'widgets.pellet.description',
    category: 'climate',
    icon: Flame,
    color: '#f97316',
    entityDomain: 'climate',
  },

  defaultSize: { lg: { w: 2, h: 3 }, md: { w: 3, h: 3 }, sm: { w: 4, h: 3 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 2, h: 3 },
      { name: 'Large', w: 3, h: 3 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 3, h: 3 },
      { name: 'Large', w: 4, h: 3 },
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
      defaultSize: { lg: { w: 2, h: 3 }, md: { w: 3, h: 3 }, sm: { w: 4, h: 3 } },
    },
  ],

  fields: [
    { key: 'entityId', label: 'Entité climate', fieldType: 'entity', domain: 'climate' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
  ],

  defaults: {
    type: 'pellet',
    entityId: 'climate.pellet_stove',
  } satisfies WidgetDefaults<WidgetConfig>,
});
