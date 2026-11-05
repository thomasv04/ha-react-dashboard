import { Zap, Blinds, Minus, LayoutGrid, LayoutTemplate } from 'lucide-react';
import type { CustomBlock } from '@/types/custom-panel';

/**
 * Métadonnées des blocs d'un panneau personnalisé : icône, libellé, valeurs par
 * défaut à la création, et résumé affiché dans la liste.
 *
 * Séparé des formulaires d'édition : ces tables sont lues par la liste comme
 * par le sélecteur d'ajout, qui n'ont pas besoin des champs de saisie.
 */

type TFn = (key: string, params?: Record<string, string | number>) => string;

export function genId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── Block type meta ───────────────────────────────────────────────────────────

/**
 * Un type de bloc : libellés, icône et pastille de couleur, comme les apps du
 * lanceur. Dans l'ordre du sélecteur d'ajout.
 */
export const BLOCK_TYPES: Array<{
  type: CustomBlock['type'];
  labelKey: string;
  descriptionKey: string;
  Icon: typeof Zap;
  color: string;
}> = [
  {
    type: 'button',
    labelKey: 'layout.customPanel.blockTypeButton',
    descriptionKey: 'layout.customPanel.blockTypeButtonDesc',
    Icon: Zap,
    color: 'var(--ds-tile-on)',
  },
  {
    type: 'widget',
    labelKey: 'layout.customPanel.blockTypeWidget',
    descriptionKey: 'layout.customPanel.blockTypeWidgetDesc',
    Icon: LayoutGrid,
    color: 'var(--ds-app-music)',
  },
  {
    type: 'button-row',
    labelKey: 'layout.customPanel.blockTypeButtonRow',
    descriptionKey: 'layout.customPanel.blockTypeButtonRowDesc',
    Icon: LayoutTemplate,
    color: 'var(--ds-app-home)',
  },
  {
    type: 'cover-row',
    labelKey: 'layout.customPanel.blockTypeCoverRow',
    descriptionKey: 'layout.customPanel.blockTypeCoverRowDesc',
    Icon: Blinds,
    color: 'var(--ds-app-calendar)',
  },
  {
    type: 'section-header',
    labelKey: 'layout.customPanel.blockTypeSectionHeader',
    descriptionKey: 'layout.customPanel.blockTypeSectionHeaderDesc',
    Icon: Minus,
    color: 'var(--ds-control)',
  },
];

export const blockType = (type: CustomBlock['type']) => BLOCK_TYPES.find(b => b.type === type)!;

export function blockSummary(block: CustomBlock, t: TFn): string {
  switch (block.type) {
    case 'button':
      return block.label || t('layout.customPanel.blockNoName');
    case 'button-row':
      return block.buttons.length ? block.buttons.map(b => b.label || '…').join(' · ') : t('layout.customPanel.blockNoButtons');
    case 'cover-row':
      return block.label || block.entityId || t('layout.customPanel.blockNoEntity');
    case 'section-header':
      return block.title || t('layout.customPanel.blockNoName');
    case 'widget':
      return block.widgetType || t('layout.customPanel.blockNoName');
    default:
      return '';
  }
}
