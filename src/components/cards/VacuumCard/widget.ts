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
      label: 'Standard',
      minSize: { lg: { w: 2, h: 3 }, md: { w: 3, h: 3 }, sm: { w: 4, h: 3 } },
      defaultSize: { lg: { w: 3, h: 4 }, md: { w: 4, h: 4 }, sm: { w: 4, h: 4 } },
    },
  ],

  fields: [
    { key: 'entityId', label: 'Aspirateur', fieldType: 'entity', domain: 'vacuum' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    {
      key: 'rooms',
      label: 'Pièces (map Roborock)',
      fieldType: 'list',
      itemFields: [
        { key: 'id', label: 'ID segment', fieldType: 'text' },
        { key: 'name', label: 'Nom de la pièce', fieldType: 'text' },
        { key: 'segmentId', label: 'Segment ID (numérique)', fieldType: 'number' },
        { key: 'icon', label: 'Icône', fieldType: 'icon' },
      ],
    },
    {
      key: 'selects',
      label: 'Contrôles select (vitesse ventilateur, intensité lavage…)',
      fieldType: 'list',
      itemFields: [
        { key: 'entityId', label: 'Entité select', fieldType: 'entity', domain: 'select' },
        { key: 'label', label: 'Libellé personnalisé', fieldType: 'text' },
      ],
    },
    { key: 'showInfoPanel', label: 'Panneau info (More Info)', fieldType: 'boolean' },
  ],

  defaults: {
    type: 'vacuum',
    entityId: 'vacuum.robot',
    rooms: [],
  } satisfies WidgetDefaults<WidgetConfig>,
});
