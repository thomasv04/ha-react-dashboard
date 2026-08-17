import { Play } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « button » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'button',

  component: () => import('./ButtonCard').then(m => ({ default: m.ButtonCard })),

  meta: {
    label: 'widgets.button.label',
    description: 'widgets.button.description',
    category: 'home',
    icon: Play,
    color: '#3b82f6',
  },

  defaultSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 1, h: 1 },
      { name: 'Normal', w: 2, h: 2 },
      { name: 'Large', w: 3, h: 2 },
    ],
    md: [
      { name: 'Compact', w: 1, h: 1 },
      { name: 'Normal', w: 2, h: 2 },
      { name: 'Large', w: 3, h: 2 },
    ],
    sm: [
      { name: 'Compact', w: 1, h: 1 },
      { name: 'Normal', w: 2, h: 2 },
      { name: 'Large', w: 4, h: 2 },
    ],
  },

  dispositions: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 1, h: 1 }, md: { w: 1, h: 1 }, sm: { w: 1, h: 1 } },
      defaultSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
    },
  ],

  fields: [
    { key: 'label', label: 'Libellé du bouton', fieldType: 'text' },
    { key: 'subtitle', label: 'Sous-titre (optionnel)', fieldType: 'text' },
    { key: 'icon', label: 'Icône', fieldType: 'icon' },
    { key: 'color', label: 'Couleur accent (#hex ou template Jinja)', fieldType: 'text' },
    { key: 'domain', label: 'Domaine HA (ex: script, light)', fieldType: 'text' },
    { key: 'service', label: 'Service (ex: turn_on, toggle)', fieldType: 'text' },
    { key: 'entityId', label: 'Entité cible (optionnel)', fieldType: 'entity' },
    { key: 'serviceData', label: 'Données service (JSON)', fieldType: 'text' },
    { key: 'requireConfirm', label: 'Demander confirmation', fieldType: 'boolean' },
    { key: 'confirmText', label: 'Message de confirmation', fieldType: 'text' },
  ],

  defaults: {
    type: 'button',
    label: 'Mon bouton',
    domain: 'script',
    service: 'turn_on',
    color: '#3b82f6',
  } satisfies WidgetDefaults<WidgetConfig>,
});
