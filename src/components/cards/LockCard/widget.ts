import { Lock } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { LockCardConfig } from '@/types/widget-configs';

/**
 * Serrure — verrouiller / déverrouiller, avec confirmation facultative sur le
 * déverrouillage (le seul sens qui ouvre la maison).
 */
export default defineWidget({
  type: 'lock',

  component: () => import('./LockCard').then(m => ({ default: m.LockCard })),

  meta: {
    label: 'widgets.lock.label',
    description: 'widgets.lock.description',
    category: 'home',
    icon: Lock,
    color: '#34d399',
    entityDomain: 'lock',
    keywords: ['serrure', 'verrou', 'porte', 'lock', 'door'],
  },

  defaultSize: { lg: { w: 2, h: 2 }, md: { w: 2, h: 2 }, sm: { w: 2, h: 2 } },
  minSize: { lg: { w: 2, h: 1 }, md: { w: 2, h: 1 }, sm: { w: 2, h: 1 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 2, h: 2 },
      { name: 'Large', w: 3, h: 3 },
    ],
    md: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 2, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
    sm: [
      { name: 'Compact', w: 2, h: 1 },
      { name: 'Normal', w: 2, h: 2 },
      { name: 'Large', w: 4, h: 3 },
    ],
  },

  fields: [
    { key: 'entityId', label: 'Serrure', fieldType: 'entity', domain: 'lock' },
    { key: 'name', label: 'Nom affiché', fieldType: 'text' },
    { key: 'confirmUnlock', label: 'Confirmer le déverrouillage', fieldType: 'boolean' },
  ],

  defaults: {
    entityId: '',
    confirmUnlock: true,
  } satisfies WidgetDefaults<LockCardConfig>,
});
