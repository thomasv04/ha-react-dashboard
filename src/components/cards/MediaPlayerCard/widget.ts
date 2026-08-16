import { Music } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « media_player » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'media_player',

  component: () => import('./MediaPlayerCard').then(m => ({ default: m.MediaPlayerCard })),

  meta: {
    label: 'widgets.media_player.label',
    description: 'widgets.media_player.description',
    category: 'home',
    icon: Music,
    color: '#8b5cf6',
    entityDomain: 'media_player',
  },

  defaultSize: { lg: { w: 4, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 3, h: 4 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
  },

  dispositions: [
    {
      id: 'horizontal',
      label: 'Horizontale',
      description: 'Cover + infos côte à côte',
      minSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 4, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },
    },
    {
      id: 'vertical',
      label: 'Verticale',
      description: 'Cover au-dessus, contrôles en dessous',
      minSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
      defaultSize: { lg: { w: 3, h: 4 }, md: { w: 3, h: 4 }, sm: { w: 4, h: 4 } },
    },
  ],

  fields: [
    { key: 'entityId', label: 'Lecteur multimédia', fieldType: 'entity', domain: 'media_player' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    {
      key: 'disposition',
      label: 'Mise en page',
      fieldType: 'select',
      options: [
        { value: 'horizontal', label: 'Horizontale (cover + infos)' },
        { value: 'vertical', label: 'Verticale (cover en grand)' },
        { value: 'compact', label: 'Compacte (1 ligne)' },
      ],
    },
  ],

  defaults: {
    type: 'media_player',
    entityId: 'media_player.salon',
    disposition: 'horizontal',
  } satisfies WidgetDefaults<WidgetConfig>,
});
