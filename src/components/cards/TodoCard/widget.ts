import { ListChecks } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { TodoCardConfig } from '@/types/widget-configs';

/**
 * Liste de tâches — courses, à-faire. Cocher et ajouter depuis la card.
 *
 * Comme l'agenda, le contenu ne vit pas dans le store d'entités : l'entité ne
 * publie que le nombre de tâches restantes, la liste vient de `todo.get_items`.
 */
export default defineWidget({
  type: 'todo',

  component: () => import('./TodoCard').then(m => ({ default: m.TodoCard })),

  meta: {
    label: 'widgets.todo.label',
    description: 'widgets.todo.description',
    category: 'home',
    icon: ListChecks,
    color: '#fbbf24',
    entityDomain: 'todo',
    keywords: ['courses', 'tâches', 'liste', 'todo', 'shopping'],
  },

  defaultSize: { lg: { w: 3, h: 4 }, md: { w: 4, h: 4 }, sm: { w: 4, h: 4 } },
  minSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 2, h: 2 },
      { name: 'Normal', w: 3, h: 4 },
      { name: 'Large', w: 4, h: 6 },
    ],
    md: [
      { name: 'Compact', w: 3, h: 2 },
      { name: 'Normal', w: 4, h: 4 },
      { name: 'Large', w: 6, h: 6 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 2 },
      { name: 'Normal', w: 4, h: 4 },
      { name: 'Large', w: 4, h: 6 },
    ],
  },

  fields: [
    { key: 'entityId', label: 'Liste', fieldType: 'entity', domain: 'todo' },
    { key: 'name', label: 'Titre', fieldType: 'text' },
    { key: 'showCompleted', label: 'Afficher les tâches terminées', fieldType: 'boolean' },
    { key: 'allowAdd', label: "Champ d'ajout", fieldType: 'boolean' },
  ],

  defaults: {
    entityId: '',
    allowAdd: true,
  } satisfies WidgetDefaults<TodoCardConfig>,
});
