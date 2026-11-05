import { Cctv } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { CameraEventsCardConfig } from '@/types/widget-configs';

/**
 * Les événements caméra de l'Echo Show, lus chez Frigate par son intégration
 * Home Assistant (`frigate/events/get`) — maquettes « Maison » et « Caméra ».
 */
export default defineWidget({
  type: 'camera_events',

  component: () => import('./CameraEventsCard').then(m => ({ default: m.CameraEventsCard })),

  meta: {
    label: 'widgets.camera_events.label',
    description: 'widgets.camera_events.description',
    category: 'cameras',
    icon: Cctv,
    color: '#3b82f6',
    keywords: ['frigate', 'caméra', 'événements', 'camera', 'events'],
  },

  defaultSize: { lg: { w: 4, h: 5 }, md: { w: 4, h: 5 }, sm: { w: 4, h: 5 } },
  minSize: { lg: { w: 3, h: 1 }, md: { w: 3, h: 1 }, sm: { w: 2, h: 1 } },

  fields: [
    { key: 'name', label: 'widgets.camera_events.fields.name.label', fieldType: 'text' },
    { key: 'cameras', label: 'widgets.camera_events.fields.cameras.label', fieldType: 'text' },
    { key: 'instanceId', label: 'widgets.camera_events.fields.instanceId.label', fieldType: 'text' },
    { key: 'hours', label: 'widgets.camera_events.fields.hours.label', fieldType: 'number' },
  ],

  defaults: {
    instanceId: 'frigate',
    hours: 12,
  } satisfies WidgetDefaults<CameraEventsCardConfig>,
});
