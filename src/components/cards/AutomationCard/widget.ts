import { Workflow } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { AutomationCardConfig } from '@/types/widget-configs';

/**
 * Manifeste du widget « Automatisation ».
 *
 * Sert de référence pour les autres : tout ce qui définit un widget tient ici,
 * et les registres partagés en sont dérivés (cf. `src/widgets/index.ts`).
 */
export default defineWidget({
  type: 'automation',

  component: () => import('./AutomationCard').then(m => ({ default: m.AutomationCard })),

  meta: {
    label: 'widgets.automation.label',
    description: 'widgets.automation.description',
    category: 'home',
    icon: Workflow,
    color: '#10b981',
    entityDomain: 'automation',
  },

  defaultSize: { lg: { w: 3, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
  minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 3, h: 1 },
      { name: 'Large', w: 4, h: 1 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 4, h: 1 },
      { name: 'Large', w: 6, h: 1 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 4, h: 1 },
      { name: 'Large', w: 4, h: 1 },
    ],
  },

  dispositions: [
    {
      id: 'horizontal',
      label: 'widgets.automation.dispositions.horizontal.label',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 3, h: 1 }, md: { w: 4, h: 1 }, sm: { w: 4, h: 1 } },
    },
  ],

  fields: [
    { key: 'entityId', label: 'widgets.automation.fields.entityId.label', fieldType: 'entity', domain: 'automation' },
    { key: 'name', label: 'widgets.automation.fields.name.label', fieldType: 'text' },
    { key: 'icon', label: 'widgets.automation.fields.icon.label', fieldType: 'icon' },
    { key: 'showInfoPanel', label: 'widgets.automation.fields.showInfoPanel.label', fieldType: 'boolean' },
  ],

  defaults: {
    entityId: 'automation.example',
  } satisfies WidgetDefaults<AutomationCardConfig>,
});
