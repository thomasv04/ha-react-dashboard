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
      label: 'Standard',
      minSize: { lg: { w: 2, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
      defaultSize: { lg: { w: 4, h: 3 }, md: { w: 8, h: 3 }, sm: { w: 4, h: 3 } },
    },
  ],

  fields: [
    {
      key: 'shortcuts',
      label: 'Raccourcis',
      fieldType: 'list',
      itemFields: [
        { key: 'id', label: 'Identifiant', fieldType: 'text' },
        { key: 'label', label: 'Nom affiché', fieldType: 'text' },
        { key: 'icon', label: 'Icône', fieldType: 'icon' },
        { key: 'panelId', label: 'Panneau lié', fieldType: 'panel-select' },
        { key: 'color', label: 'Couleur', fieldType: 'gradient' },
        { key: 'statusEntity', label: 'Entité statut', fieldType: 'entity' },
      ],
    },
  ],

  defaults: {
    type: 'shortcuts',
    // Vide : les raccourcis pointent vers des panneaux que l'utilisateur crée.
    shortcuts: [],
  } satisfies WidgetDefaults<WidgetConfig>,
});
