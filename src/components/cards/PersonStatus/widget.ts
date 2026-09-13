import { Users } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « person » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'person',

  component: () => import('./PersonStatusCard').then(m => ({ default: m.PersonStatusCard })),

  meta: {
    label: 'widgets.person.label',
    description: 'widgets.person.description',
    category: 'home',
    icon: Users,
    color: '#ec4899',
  },

  defaultSize: { lg: { w: 6, h: 1 }, md: { w: 8, h: 1 }, sm: { w: 4, h: 1 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 6, h: 1 },
      { name: 'Large', w: 8, h: 1 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 8, h: 1 },
      { name: 'Large', w: 8, h: 1 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 1 },
      { name: 'Large', w: 4, h: 1 },
    ],
  },

  dispositions: [
    {
      id: 'default',
      label: 'widgets.person.dispositions.default.label',
      minSize: { lg: { w: 4, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
      defaultSize: { lg: { w: 6, h: 1 }, md: { w: 8, h: 1 }, sm: { w: 4, h: 1 } },
    },
  ],

  fields: [
    {
      key: 'persons',
      label: 'widgets.person.fields.persons.label',
      fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'widgets.person.fields.persons.item.entityId.label', fieldType: 'entity', domain: 'person' },
        { key: 'name', label: 'widgets.person.fields.persons.item.name.label', fieldType: 'text' },
      ],
    },
    { key: 'showInfoPanel', label: 'widgets.person.fields.showInfoPanel.label', fieldType: 'boolean' },
  ],

  defaults: {
    persons: [{ entityId: 'person.user_1', name: 'User 1' }],
  } satisfies WidgetDefaults<WidgetConfig>,
});
