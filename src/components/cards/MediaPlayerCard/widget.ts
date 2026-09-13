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
      label: 'widgets.media_player.dispositions.horizontal.label',
      description: 'widgets.media_player.dispositions.horizontal.description',
      minSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 4, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },
    },
    {
      id: 'vertical',
      label: 'widgets.media_player.dispositions.vertical.label',
      description: 'widgets.media_player.dispositions.vertical.description',
      minSize: { lg: { w: 2, h: 3 }, md: { w: 2, h: 3 }, sm: { w: 2, h: 3 } },
      defaultSize: { lg: { w: 3, h: 4 }, md: { w: 3, h: 4 }, sm: { w: 4, h: 4 } },
    },
  ],

  fields: [
    { key: 'entityId', label: 'widgets.media_player.fields.entityId.label', fieldType: 'entity', domain: 'media_player' },
    { key: 'name', label: 'widgets.media_player.fields.name.label', fieldType: 'text' },
    {
      key: 'disposition',
      label: 'widgets.media_player.fields.disposition.label',
      fieldType: 'select',
      options: [
        { value: 'horizontal', label: 'widgets.media_player.fields.disposition.options.horizontal' },
        { value: 'vertical', label: 'widgets.media_player.fields.disposition.options.vertical' },
        { value: 'compact', label: 'widgets.media_player.fields.disposition.options.compact' },
      ],
    },
  ],

  defaults: {
    entityId: 'media_player.salon',
    disposition: 'horizontal',
  } satisfies WidgetDefaults<WidgetConfig>,
});
