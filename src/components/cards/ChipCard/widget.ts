import { MapPin } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { ChipCardConfig } from '@/types/widget-configs';

/**
 * Manifeste de la pastille d'état : icône + état d'une entité, dans une pilule.
 *
 * Pensée pour les pages `floorplan`, où elle se pose au clic sur le plan, mais
 * utilisable sur une grille comme n'importe quel widget.
 */
export default defineWidget({
  type: 'chip',

  component: () => import('./ChipCard').then(m => ({ default: m.ChipCard })),

  meta: {
    label: 'widgets.chip.label',
    description: 'widgets.chip.description',
    category: 'sensors',
    icon: MapPin,
    color: '#f59e0b',
  },

  defaultSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },
  minSize: { lg: { w: 1, h: 1 }, md: { w: 1, h: 1 }, sm: { w: 1, h: 1 } },

  fields: [
    { key: 'entityId', label: 'widgets.chip.fields.entityId.label', fieldType: 'entity' },
    { key: 'name', label: 'widgets.chip.fields.name.label', fieldType: 'text' },
    { key: 'icon', label: 'widgets.chip.fields.icon.label', fieldType: 'icon' },
    { key: 'glow', label: 'widgets.chip.fields.glow.label', fieldType: 'boolean' },
    { key: 'glowSize', label: 'widgets.chip.fields.glowSize.label', fieldType: 'number' },
  ],

  // `glow` explicite : la modale affiche un booléen absent comme coché.
  defaults: {
    entityId: '',
    glow: true,
    glowSize: 12,
  } satisfies WidgetDefaults<ChipCardConfig>,
});
