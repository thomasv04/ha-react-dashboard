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

export const BLOCK_META = {
  button: { labelKey: 'layout.customPanel.blockTypeButton', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', Icon: Zap },
  'button-row': {
    labelKey: 'layout.customPanel.blockTypeButtonRow',
    color: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30',
    Icon: LayoutTemplate,
  },
  'cover-row': {
    labelKey: 'layout.customPanel.blockTypeCoverRow',
    color: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30',
    Icon: Blinds,
  },
  'section-header': {
    labelKey: 'layout.customPanel.blockTypeSectionHeader',
    color: 'bg-white/8 text-white/40 border border-white/12',
    Icon: Minus,
  },
  widget: {
    labelKey: 'layout.customPanel.blockTypeWidget',
    color: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    Icon: LayoutGrid,
  },
} as const;

export const BLOCK_TYPE_PICKER: Array<{
  type: CustomBlock['type'];
  labelKey: string;
  descriptionKey: string;
  Icon: typeof Zap;
  iconBg: string;
  iconColor: string;
  border: string;
  hover: string;
}> = [
  {
    type: 'button',
    labelKey: 'layout.customPanel.blockTypeButton',
    descriptionKey: 'layout.customPanel.blockTypeButtonDesc',
    Icon: Zap,
    iconBg: 'bg-blue-500/15',
    iconColor: 'text-blue-400',
    border: 'border-blue-500/20',
    hover: 'hover:bg-blue-500/10 hover:border-blue-500/30',
  },
  {
    type: 'widget',
    labelKey: 'layout.customPanel.blockTypeWidget',
    descriptionKey: 'layout.customPanel.blockTypeWidgetDesc',
    Icon: LayoutGrid,
    iconBg: 'bg-violet-500/15',
    iconColor: 'text-violet-400',
    border: 'border-violet-500/20',
    hover: 'hover:bg-violet-500/10 hover:border-violet-500/30',
  },
  {
    type: 'button-row',
    labelKey: 'layout.customPanel.blockTypeButtonRow',
    descriptionKey: 'layout.customPanel.blockTypeButtonRowDesc',
    Icon: LayoutTemplate,
    iconBg: 'bg-cyan-500/15',
    iconColor: 'text-cyan-400',
    border: 'border-cyan-500/20',
    hover: 'hover:bg-cyan-500/10 hover:border-cyan-500/30',
  },
  {
    type: 'cover-row',
    labelKey: 'layout.customPanel.blockTypeCoverRow',
    descriptionKey: 'layout.customPanel.blockTypeCoverRowDesc',
    Icon: Blinds,
    iconBg: 'bg-indigo-500/15',
    iconColor: 'text-indigo-400',
    border: 'border-indigo-500/20',
    hover: 'hover:bg-indigo-500/10 hover:border-indigo-500/30',
  },
  {
    type: 'section-header',
    labelKey: 'layout.customPanel.blockTypeSectionHeader',
    descriptionKey: 'layout.customPanel.blockTypeSectionHeaderDesc',
    Icon: Minus,
    iconBg: 'bg-white/8',
    iconColor: 'text-white/50',
    border: 'border-white/10',
    hover: 'hover:bg-white/8 hover:border-white/20',
  },
];


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
