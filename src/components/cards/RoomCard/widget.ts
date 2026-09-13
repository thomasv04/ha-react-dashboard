import { Home } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « room » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'room',

  component: () => import('./RoomCard').then(m => ({ default: m.RoomCard })),

  meta: {
    label: 'widgets.room.label',
    description: 'widgets.room.description',
    category: 'home',
    icon: Home,
    color: '#0ea5e9',
  },

  defaultSize: { lg: { w: 2, h: 2 }, md: { w: 3, h: 2 }, sm: { w: 4, h: 2 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 2, h: 2 },
      { name: 'Large', w: 3, h: 2 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 3, h: 2 },
      { name: 'Large', w: 4, h: 2 },
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
      label: 'widgets.room.dispositions.default.label',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 2, h: 2 }, md: { w: 3, h: 2 }, sm: { w: 4, h: 2 } },
    },
  ],

  fields: [
    { key: 'area', label: 'widgets.room.fields.area.label', fieldType: 'area-controls' },
    { key: 'label', label: 'widgets.room.fields.label.label', fieldType: 'text' },
    { key: 'icon', label: 'widgets.room.fields.icon.label', fieldType: 'icon' },
    { key: 'iconBg', label: 'widgets.room.fields.iconBg.label', fieldType: 'gradient' },
    { key: 'tempEntity', label: 'widgets.room.fields.tempEntity.label', fieldType: 'entity', domain: 'sensor' },
    { key: 'humidityEntity', label: 'widgets.room.fields.humidityEntity.label', fieldType: 'entity', domain: 'sensor' },
    { key: 'lightEntities', label: 'widgets.room.fields.lightEntities.label', fieldType: 'entity-list', domain: 'light' },
    { key: 'panelId', label: 'widgets.room.fields.panelId.label', fieldType: 'panel-select' },
    {
      key: 'controls',
      label: 'widgets.room.fields.controls.label',
      fieldType: 'list',
      itemFields: [
        { key: 'label', label: 'widgets.room.fields.controls.item.label.label', fieldType: 'text' },
        { key: 'icon', label: 'widgets.room.fields.controls.item.icon.label', fieldType: 'icon' },
        { key: 'domain', label: 'widgets.room.fields.controls.item.domain.label', fieldType: 'text' },
        { key: 'service', label: 'widgets.room.fields.controls.item.service.label', fieldType: 'text' },
        { key: 'entityId', label: 'widgets.room.fields.controls.item.entityId.label', fieldType: 'entity' },
        { key: 'stateEntity', label: 'widgets.room.fields.controls.item.stateEntity.label', fieldType: 'entity' },
        { key: 'color', label: 'widgets.room.fields.controls.item.color.label', fieldType: 'text' },
      ],
    },
  ],

  defaults: {
    label: 'Pièce',
    icon: 'Home',
    iconBg: 'from-blue-500 to-sky-400',
  } satisfies WidgetDefaults<WidgetConfig>,
});
