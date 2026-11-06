import { Hand } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { WelcomeCardConfig } from '@/types/widget-configs';

/** « Bonjour Thomas. Belle journée ! » et les routines à lancer — maquette « Accueil ». */
export default defineWidget({
  type: 'welcome',

  component: () => import('./WelcomeCard').then(m => ({ default: m.WelcomeCard })),

  meta: {
    label: 'widgets.welcome.label',
    description: 'widgets.welcome.description',
    category: 'system',
    icon: Hand,
    color: '#38b48a',
  },

  defaultSize: { lg: { w: 5, h: 5 }, md: { w: 5, h: 5 }, sm: { w: 4, h: 4 } },
  minSize: { lg: { w: 3, h: 1 }, md: { w: 3, h: 1 }, sm: { w: 2, h: 1 } },

  fields: [{ key: 'routines', label: 'widgets.welcome.fields.routines.label', fieldType: 'entity-list', domain: 'script,scene' }],

  defaults: {
    routines: [],
  } satisfies WidgetDefaults<WelcomeCardConfig>,
});
