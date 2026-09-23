import { Layers } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « group » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'group',

  component: () => import('./GroupCard').then(m => ({ default: m.GroupCard })),

  meta: {
    label: 'widgets.group.label',
    description: 'widgets.group.description',
    category: 'home',
    icon: Layers,
    color: '#6366f1',
  },

  defaultSize: { lg: { w: 4, h: 4 }, md: { w: 6, h: 4 }, sm: { w: 4, h: 4 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 3, h: 3 },
      { name: 'Normal', w: 4, h: 4 },
      { name: 'Large', w: 6, h: 5 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 3 },
      { name: 'Normal', w: 6, h: 4 },
      { name: 'Large', w: 8, h: 5 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 3 },
      { name: 'Normal', w: 4, h: 4 },
      { name: 'Large', w: 4, h: 6 },
    ],
  },

  dispositions: [
    {
      id: 'default',
      label: 'widgets.group.dispositions.default.label',
      minSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
      defaultSize: { lg: { w: 4, h: 4 }, md: { w: 6, h: 4 }, sm: { w: 4, h: 4 } },
    },
  ],

  fields: [
    { key: 'title', label: 'widgets.group.fields.title.label', fieldType: 'text' },
    {
      key: 'columns',
      label: 'widgets.group.fields.columns.label',
      fieldType: 'select',
      options: [
        { value: '1', label: 'widgets.group.fields.columns.options.1' },
        { value: '2', label: 'widgets.group.fields.columns.options.2' },
        { value: '3', label: 'widgets.group.fields.columns.options.3' },
      ],
    },
  ],

  defaults: {
    title: '',
    columns: 2,
    children: [],
  } satisfies WidgetDefaults<WidgetConfig>,
});
