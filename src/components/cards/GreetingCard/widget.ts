import { Clock } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WidgetConfig } from '@/types/widget-configs';

/** Manifeste du widget « greeting » — migré des registres historiques (2.2.0). */
export default defineWidget({
  type: 'greeting',

  component: () => import('./GreetingCard').then(m => ({ default: m.ClockWidget })),

  meta: {
    label: 'widgets.greeting.label',
    description: 'widgets.greeting.description',
    category: 'system',
    icon: Clock,
    color: '#f59e0b',
  },

  defaultSize: { lg: { w: 1, h: 1 }, md: { w: 1, h: 1 }, sm: { w: 1, h: 1 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 3, h: 1 },
      { name: 'Normal', w: 5, h: 1 },
      { name: 'Large', w: 8, h: 2 },
    ],
    md: [
      { name: 'Compact', w: 3, h: 1 },
      { name: 'Normal', w: 5, h: 1 },
      { name: 'Large', w: 8, h: 2 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 3, h: 1 },
      { name: 'Large', w: 4, h: 2 },
    ],
  },

  dispositions: [
    {
      id: 'default',
      label: 'Standard',
      minSize: { lg: { w: 1, h: 1 }, md: { w: 1, h: 1 }, sm: { w: 1, h: 1 } },
      defaultSize: { lg: { w: 1, h: 1 }, md: { w: 1, h: 1 }, sm: { w: 1, h: 1 } },
    },
  ],

  fields: [{ key: 'locale', label: 'Locale (fr-FR, en-US...)', fieldType: 'text' }],

  defaults: {
    type: 'greeting',
    locale: 'fr-FR',
  } satisfies WidgetDefaults<WidgetConfig>,
});
