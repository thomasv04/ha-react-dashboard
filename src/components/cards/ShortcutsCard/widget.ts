import { Grip } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « shortcuts » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'shortcuts',

  component: () => import('./ShortcutsCard').then(m => ({ default: m.ShortcutsCard })),

  meta: {
    label: 'widgets.shortcuts.label',
    description: 'widgets.shortcuts.description',
    category: 'home',
    icon: Grip,
    color: '#14b8a6',
  },

  defaultSize: { lg: { w: 4, h: 3 }, md: { w: 8, h: 3 }, sm: { w: 4, h: 3 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 3, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 6, h: 4 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 8, h: 3 },
      { name: 'Large', w: 8, h: 4 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 4 },
    ],
  },

  dispositions: [
    {
      id: 'default',
      label: 'widgets.shortcuts.dispositions.default.label',
      minSize: { lg: { w: 2, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 4, h: 3 }, md: { w: 8, h: 3 }, sm: { w: 4, h: 3 } },
    },
  ],

  fields: [
    {
      key: 'shortcuts',
      label: 'widgets.shortcuts.fields.shortcuts.label',
      fieldType: 'list',
      itemFields: [
        { key: 'id', label: 'widgets.shortcuts.fields.shortcuts.item.id.label', fieldType: 'text' },
        { key: 'label', label: 'widgets.shortcuts.fields.shortcuts.item.label.label', fieldType: 'text' },
        { key: 'icon', label: 'widgets.shortcuts.fields.shortcuts.item.icon.label', fieldType: 'icon' },
        { key: 'panelId', label: 'widgets.shortcuts.fields.shortcuts.item.panelId.label', fieldType: 'panel-select' },
        { key: 'color', label: 'widgets.shortcuts.fields.shortcuts.item.color.label', fieldType: 'gradient' },
        { key: 'statusEntity', label: 'widgets.shortcuts.fields.shortcuts.item.statusEntity.label', fieldType: 'entity' },
      ],
    },
  ],

  defaults: {
    // Vide : les raccourcis pointent vers des panneaux que l'utilisateur crée.
    shortcuts: [],
  } satisfies WidgetDefaults<WidgetConfig>,
});
