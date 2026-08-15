import { LineChart } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { ChartCardConfig } from '@/types/widget-configs';

/**
 * Graphique — l'historique de n'importe quelle entité.
 *
 * Les briques de tracé (`HistoryGraph`, `BinaryTimeline`) existaient déjà mais
 * n'étaient accessibles que depuis les modales « More Info » : ce widget les
 * pose sur la grille.
 */
export default defineWidget({
  type: 'chart',

  component: () => import('./ChartCard').then(m => ({ default: m.ChartCard })),

  meta: {
    label: 'widgets.chart.label',
    description: 'widgets.chart.description',
    category: 'sensors',
    icon: LineChart,
    color: '#60a5fa',
    entityDomain: 'sensor',
    keywords: ['historique', 'courbe', 'history', 'graph'],
  },

  defaultSize: { lg: { w: 4, h: 2 }, md: { w: 4, h: 2 }, sm: { w: 4, h: 2 } },
  minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 3, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 6, h: 3 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 8, h: 3 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 1 },
      { name: 'Normal', w: 4, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },

  fields: [
    { key: 'entityId', label: 'Entité', fieldType: 'entity' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'hours', label: "Fenêtre d'historique (heures)", fieldType: 'number' },
    {
      key: 'variant',
      label: 'Rendu',
      fieldType: 'select',
      options: [
        { value: 'line', label: 'Courbe' },
        { value: 'timeline', label: 'Frise on/off' },
      ],
    },
    { key: 'color', label: 'Couleur', fieldType: 'text' },
  ],

  defaults: {
    entityId: '',
    hours: 24,
  } satisfies WidgetDefaults<ChartCardConfig>,
});
