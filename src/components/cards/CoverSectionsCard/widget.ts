import { Blinds } from 'lucide-react';
import { defineWidget, type WidgetDefaults } from '@/widgets/define-widget';
import type { CoverSectionsCardConfig } from '@/types/widget-configs';

export default defineWidget({
  type: 'cover_sections',

  component: () => import('./CoverSectionsCard').then(m => ({ default: m.CoverSectionsCard })),

  meta: {
    label: 'widgets.cover_sections.label',
    description: 'widgets.cover_sections.description',
    category: 'home',
    icon: Blinds,
    color: '#0ea5e9',
    keywords: ['volets', 'stores', 'covers', 'blinds', 'shutters'],
  },

  // Le contenu défile : une petite case montre la première section, une grande
  // place les titres à gauche et plusieurs volets par ligne.
  defaultSize: { lg: { w: 8, h: 5 }, md: { w: 8, h: 5 }, sm: { w: 4, h: 6 } },
  minSize: { lg: { w: 3, h: 2 }, md: { w: 3, h: 2 }, sm: { w: 3, h: 2 } },

  sizePresets: {
    lg: [
      { name: 'Compact', w: 4, h: 4 },
      { name: 'Normal', w: 8, h: 5 },
      { name: 'Large', w: 12, h: 7 },
    ],
    md: [
      { name: 'Compact', w: 4, h: 4 },
      { name: 'Normal', w: 8, h: 5 },
      { name: 'Large', w: 8, h: 7 },
    ],
    sm: [
      { name: 'Compact', w: 4, h: 4 },
      { name: 'Normal', w: 4, h: 6 },
      { name: 'Large', w: 4, h: 8 },
    ],
  },

  fields: [
    {
      key: 'sections',
      label: 'widgets.cover_sections.fields.sections.label',
      fieldType: 'list',
      itemFields: [
        { key: 'name', label: 'widgets.cover_sections.fields.sections.item.name.label', fieldType: 'text' },
        { key: 'area', label: 'widgets.cover_sections.fields.sections.item.area.label', fieldType: 'area' },
        { key: 'covers', label: 'widgets.cover_sections.fields.sections.item.covers.label', fieldType: 'entity-list', domain: 'cover' },
      ],
    },
    {
      key: 'separator',
      label: 'widgets.cover_sections.fields.separator.label',
      fieldType: 'select',
      options: [
        { value: 'line', label: 'widgets.cover_sections.fields.separator.line' },
        { value: 'space', label: 'widgets.cover_sections.fields.separator.space' },
        { value: 'none', label: 'widgets.cover_sections.fields.separator.none' },
      ],
    },
    { key: 'showAll', label: 'widgets.cover_sections.fields.showAll.label', fieldType: 'boolean' },
    {
      key: 'allTitle',
      label: 'widgets.cover_sections.fields.allTitle.label',
      fieldType: 'text',
      showIf: config => config.showAll !== false,
    },
    {
      key: 'allCovers',
      label: 'widgets.cover_sections.fields.allCovers.label',
      fieldType: 'entity-list',
      domain: 'cover',
      showIf: config => config.showAll !== false,
    },
  ],

  defaults: {
    sections: [],
    separator: 'line',
    showAll: true,
  } satisfies WidgetDefaults<CoverSectionsCardConfig>,
});
