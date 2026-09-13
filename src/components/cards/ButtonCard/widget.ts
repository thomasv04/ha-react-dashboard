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
      label: 'widgets.button.dispositions.default.label',
      minSize: { lg: { w: 1, h: 1 }, md: { w: 1, h: 1 }, sm: { w: 1, h: 1 } },
      defaultSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
    },
  ],

  fields: [
    { key: 'label', label: 'widgets.button.fields.label.label', fieldType: 'text' },
    { key: 'subtitle', label: 'widgets.button.fields.subtitle.label', fieldType: 'text' },
    { key: 'icon', label: 'widgets.button.fields.icon.label', fieldType: 'icon' },
    { key: 'color', label: 'widgets.button.fields.color.label', fieldType: 'text' },
    { key: 'domain', label: 'widgets.button.fields.domain.label', fieldType: 'text' },
    { key: 'service', label: 'widgets.button.fields.service.label', fieldType: 'text' },
    { key: 'entityId', label: 'widgets.button.fields.entityId.label', fieldType: 'entity' },
    { key: 'serviceData', label: 'widgets.button.fields.serviceData.label', fieldType: 'text' },
    { key: 'requireConfirm', label: 'widgets.button.fields.requireConfirm.label', fieldType: 'boolean' },
    { key: 'confirmText', label: 'widgets.button.fields.confirmText.label', fieldType: 'text' },
  ],

  defaults: {
    label: 'Mon bouton',
    domain: 'script',
    service: 'turn_on',
    color: '#3b82f6',
  } satisfies WidgetDefaults<WidgetConfig>,
});
