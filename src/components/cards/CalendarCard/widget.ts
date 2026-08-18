import { CalendarDays } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { CalendarCardConfig } from '@/types/widget-configs';

/**
 * Agenda — les prochains évènements, plusieurs calendriers fusionnés.
 *
 * Les évènements ne sont pas dans le store d'entités : un agenda ne publie que
 * `on`/`off`. La liste vient de `calendar.get_events` (service à réponse), cf.
 * `useServiceResponse`.
 */
export default defineWidget({
  type: 'calendar',

  component: () => import('./CalendarCard').then(m => ({ default: m.CalendarCard })),

  meta: {
    label: 'widgets.calendar.label',
    description: 'widgets.calendar.description',
    category: 'home',
    icon: CalendarDays,
    color: '#a78bfa',
    entityDomain: 'calendar',
    entityConfigKey: 'entityIds',
    keywords: ['agenda', 'calendrier', 'évènements', 'calendar'],
  },

  defaultSize: { lg: { w: 3, h: 3 }, md: { w: 4, h: 3 }, sm: { w: 4, h: 3 } },
  minSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 3, h: 2 },
      { name: 'Normal', w: 3, h: 3 },
      { name: 'Large', w: 4, h: 5 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 6, h: 5 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 4, h: 3 },
      { name: 'Large', w: 4, h: 5 },
    ],
  },

  fields: [
    { key: 'entityIds', label: 'Agendas', fieldType: 'entity-list', domain: 'calendar' },
    { key: 'name', label: 'Titre', fieldType: 'text' },
    { key: 'days', label: 'Horizon (jours)', fieldType: 'number' },
    { key: 'max', label: "Nombre d'évènements", fieldType: 'number' },
  ],

  defaults: {
    entityIds: [],
    days: 7,
    max: 5,
  } satisfies WidgetDefaults<CalendarCardConfig>,
});
