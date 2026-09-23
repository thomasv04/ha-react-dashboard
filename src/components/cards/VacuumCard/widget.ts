import { Bot } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « vacuum » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'vacuum',

  component: () => import('./VacuumCard').then(m => ({ default: m.VacuumCard })),

  meta: {
    label: 'widgets.vacuum.label',
    description: 'widgets.vacuum.description',
    category: 'home',
    icon: Bot,
    color: '#14b8a6',
    entityDomain: 'vacuum',
  },

  defaultSize: { lg: { w: 3, h: 4 }, md: { w: 4, h: 4 }, sm: { w: 4, h: 4 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 2, h: 3 },
      { name: 'Normal', w: 3, h: 4 },
      { name: 'Large', w: 4, h: 5 },
    ],
    md: [
      { name: 'Compact', w: 3, h: 3 },
      { name: 'Normal', w: 4, h: 4 },
      { name: 'Large', w: 4, h: 5 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 3 },
      { name: 'Normal', w: 4, h: 4 },
      { name: 'Large', w: 4, h: 5 },
    ],
  },

  dispositions: [
    {
      id: 'default',
      label: 'widgets.vacuum.dispositions.default.label',
      minSize: { lg: { w: 2, h: 3 }, md: { w: 3, h: 3 }, sm: { w: 4, h: 3 } },
      defaultSize: { lg: { w: 3, h: 4 }, md: { w: 4, h: 4 }, sm: { w: 4, h: 4 } },
    },
  ],

  fields: [
    { key: 'entityId', label: 'widgets.vacuum.fields.entityId.label', fieldType: 'entity', domain: 'vacuum' },
    { key: 'name', label: 'widgets.vacuum.fields.name.label', fieldType: 'text' },
    {
      key: 'rooms',
      label: 'widgets.vacuum.fields.rooms.label',
      fieldType: 'list',
      itemFields: [
        { key: 'id', label: 'widgets.vacuum.fields.rooms.item.id.label', fieldType: 'text' },
        { key: 'name', label: 'widgets.vacuum.fields.rooms.item.name.label', fieldType: 'text' },
        { key: 'segmentId', label: 'widgets.vacuum.fields.rooms.item.segmentId.label', fieldType: 'number' },
        { key: 'icon', label: 'widgets.vacuum.fields.rooms.item.icon.label', fieldType: 'icon' },
      ],
    },
    {
      key: 'selects',
      label: 'widgets.vacuum.fields.selects.label',
      fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'widgets.vacuum.fields.selects.item.entityId.label', fieldType: 'entity', domain: 'select' },
        { key: 'label', label: 'widgets.vacuum.fields.selects.item.label.label', fieldType: 'text' },
      ],
    },
  ],

  defaults: {
    entityId: 'vacuum.robot',
    rooms: [],
  } satisfies WidgetDefaults<WidgetConfig>,
});
