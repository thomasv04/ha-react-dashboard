import { Video } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « camera » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'camera',

  component: () => import('./CameraCard').then(m => ({ default: m.CameraCard })),

  meta: {
    label: 'widgets.camera.label',
    description: 'widgets.camera.description',
    category: 'cameras',
    icon: Video,
    color: '#a855f7',
  },

  defaultSize: { lg: { w: 6, h: 3 }, md: { w: 8, h: 3 }, sm: { w: 4, h: 2 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 6, h: 3 },
      { name: 'Large', w: 8, h: 4 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 8, h: 3 },
      { name: 'Large', w: 8, h: 4 },
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
      label: 'widgets.camera.dispositions.default.label',
      minSize: { lg: { w: 3, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 6, h: 3 }, md: { w: 8, h: 3 }, sm: { w: 4, h: 2 } },
    },
  ],

  fields: [
    { key: 'selectorEntity', label: 'widgets.camera.fields.selectorEntity.label', fieldType: 'entity', domain: 'input_select' },
    {
      key: 'cameras',
      label: 'widgets.camera.fields.cameras.label',
      fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'widgets.camera.fields.cameras.item.entityId.label', fieldType: 'entity', domain: 'camera' },
        { key: 'name', label: 'widgets.camera.fields.cameras.item.name.label', fieldType: 'text' },
        { key: 'posterEntity', label: 'widgets.camera.fields.cameras.item.posterEntity.label', fieldType: 'entity', domain: 'camera' },
      ],
    },
    {
      key: 'streamMode',
      label: 'widgets.camera.fields.streamMode.label',
      fieldType: 'select',
      options: [
        { value: 'auto', label: 'widgets.camera.fields.streamMode.options.auto' },
        { value: 'mjpeg', label: 'widgets.camera.fields.streamMode.options.mjpeg' },
        { value: 'hls', label: 'widgets.camera.fields.streamMode.options.hls' },
      ],
    },
  ],

  defaults: {
    cameras: [
      { entityId: 'camera.front_door', name: 'Entrée' },
      { entityId: 'camera.kitchen', name: 'Cuisine' },
      { entityId: 'camera.living_room', name: 'Salon' },
      { entityId: 'camera.hallway', name: 'Couloir' },
    ],
    selectorEntity: 'input_select.camera_selector',
    streamMode: 'auto',
  } satisfies WidgetDefaults<WidgetConfig>,
});
