import { Clock } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { ClockCardConfig } from '@/types/widget-configs';

export default defineWidget({
  type: 'clock',

  component: () => import('./ClockCard').then(m => ({ default: m.ClockCard })),

  meta: {
    label: 'widgets.clock.label',
    description: 'widgets.clock.description',
    category: 'home',
    icon: Clock,
    color: '#a78bfa',
    // Aucune entité : l'horloge lit celle du navigateur.
  },

  // Tailles en unités de grille (1 rangée = 80 px par défaut)
  defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 2, h: 3 } },
  minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },

  // Un preset par palier de la card : bandeau, numérique, cadran analogique.
  sizePresets: {
    lg: [
      { name: 'Compact', w: 3, h: 1 },
      { name: 'Normal', w: 3, h: 2 },
      { name: 'Large', w: 3, h: 3 },
    ],
  },

  fields: [
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'showAnalog', label: 'Cadran analogique', fieldType: 'boolean' },
    { key: 'showDate', label: 'Afficher la date', fieldType: 'boolean' },
    { key: 'showSeconds', label: 'Afficher les secondes', fieldType: 'boolean' },
    { key: 'hour12', label: 'Format 12 h (AM/PM)', fieldType: 'boolean' },
  ],

  defaults: {
    showAnalog: true,
    showDate: true,
    showSeconds: false,
    hour12: false,
  } satisfies WidgetDefaults<ClockCardConfig>,
});
