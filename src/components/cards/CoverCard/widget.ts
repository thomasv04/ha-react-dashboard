import { ArrowUpDown } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « cover » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'cover',

  component: () => import('./CoverCard').then(m => ({ default: m.CoverCard })),

  meta: {
    label: 'widgets.cover.label',
    description: 'widgets.cover.description',
    category: 'home',
    icon: ArrowUpDown,
    color: '#64748b',
    entityDomain: 'cover',
  },

  defaultSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 2, h: 3 },
      { name: 'Large', w: 3, h: 4 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 2, h: 3 },
      { name: 'Large', w: 4, h: 3 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 2, h: 3 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },

  dispositions: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
      defaultSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
    },
  ],

  fields: [
    { key: 'entityId', label: 'Entité volet', fieldType: 'entity', domain: 'cover' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'icon', label: 'Icône', fieldType: 'icon' },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],

  defaults: {
    type: 'cover',
    entityId: 'cover.living_room',
    name: 'Volet Salon',
  } satisfies WidgetDefaults<WidgetConfig>,
});
