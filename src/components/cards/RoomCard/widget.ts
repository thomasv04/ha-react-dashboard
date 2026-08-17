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
      label: 'Pièce',
      minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
      defaultSize: { lg: { w: 2, h: 2 }, md: { w: 3, h: 2 }, sm: { w: 4, h: 2 } },
    },
  ],

  fields: [
    { key: 'area', label: 'Zone Home Assistant', fieldType: 'area-controls' },
    { key: 'label', label: 'Nom de la pièce', fieldType: 'text' },
    { key: 'icon', label: 'Icône', fieldType: 'icon' },
    { key: 'iconBg', label: 'Dégradé icône', fieldType: 'gradient' },
    { key: 'tempEntity', label: 'Capteur température', fieldType: 'entity', domain: 'sensor' },
    { key: 'humidityEntity', label: 'Capteur humidité', fieldType: 'entity', domain: 'sensor' },
    { key: 'lightEntities', label: 'Lumières (toggle auto)', fieldType: 'entity-list', domain: 'light' },
    { key: 'panelId', label: 'Panneau lié (→)', fieldType: 'panel-select' },
    {
      key: 'controls',
      label: 'Boutons personnalisés',
      fieldType: 'list',
      itemFields: [
        { key: 'label', label: 'Libellé', fieldType: 'text' },
        { key: 'icon', label: 'Icône', fieldType: 'icon' },
        { key: 'domain', label: 'Domaine (ex: light)', fieldType: 'text' },
        { key: 'service', label: 'Service (ex: toggle)', fieldType: 'text' },
        { key: 'entityId', label: 'Entité cible', fieldType: 'entity' },
        { key: 'stateEntity', label: 'Entité état (couleur)', fieldType: 'entity' },
        { key: 'color', label: 'Couleur active (#hex ou template Jinja)', fieldType: 'text' },
      ],
    },
  ],

  defaults: {
    type: 'room',
    label: 'Pièce',
    icon: 'Home',
    iconBg: 'from-blue-500 to-sky-400',
  } satisfies WidgetDefaults<WidgetConfig>,
});
