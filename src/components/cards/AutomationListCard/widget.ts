import { ListChecks } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { AutomationListCardConfig } from '@/types/widget-configs';

/**
 * Liste d'automatisations — plusieurs bascules dans une seule card.
 *
 * Le composant existait déjà mais n'était enregistré nulle part : ses types de
 * config n'existaient pas et aucun registre ne le référençait. Ce manifeste le
 * rend disponible dans le catalogue.
 */
export default defineWidget({
  type: 'automation_list',

  component: () => import('./AutomationListCard').then(m => ({ default: m.AutomationListCard })),

  meta: {
    label: 'widgets.automation_list.label',
    description: 'widgets.automation_list.description',
    category: 'home',
    icon: ListChecks,
    color: '#10b981',
  },

  // Une liste veut de la hauteur, pas de la largeur : elle défile.
  defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },
  minSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 3, h: 2 },
      { name: 'Normal', w: 3, h: 3 },
      { name: 'Large', w: 4, h: 5 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 8, h: 5 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 5 },
    ],
  },

  fields: [
    { key: 'name', label: 'Titre', fieldType: 'text' },
    {
      key: 'automations',
      label: 'Automatisations',
      fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'Automatisation', fieldType: 'entity', domain: 'automation' },
        { key: 'name', label: 'Nom affiché', fieldType: 'text' },
        { key: 'icon', label: 'Icône', fieldType: 'icon' },
      ],
    },
  ],

  defaults: {
    automations: [],
  } satisfies WidgetDefaults<AutomationListCardConfig>,
});
