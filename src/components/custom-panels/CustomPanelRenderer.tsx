import { useCustomPanels } from '@/context/CustomPanelContext';
import { Panel } from '@/components/layout/Panel';
import { CoverRowBlockRenderer } from './CoverRowBlock';
import { ButtonBlockRenderer } from './ButtonBlock';
import { ButtonRowBlockRenderer, InlineButtonRenderer } from './ButtonRowBlock';
import { SectionHeaderBlockRenderer } from './SectionHeaderBlock';
import { WidgetBlockRenderer } from './WidgetBlock';
import type { CustomBlock, CustomPanel } from '@/types/custom-panel';
import { useI18n } from '@/i18n';
import { WidgetErrorBoundary } from '@/components/ui/WidgetErrorBoundary';

/**
 * Un bloc qui plante ne doit pas emporter le panneau — ni, par ricochet, tout
 * l'arbre React. Les blocs viennent d'une configuration éditable à la main :
 * une entité supprimée ou un champ mal rempli suffisent à faire lever une
 * exception au rendu.
 */
export function SafeBlock({ block, card = false }: { block: CustomBlock; card?: boolean }) {
  return (
    <WidgetErrorBoundary label={block.type}>
      <BlockRenderer block={block} card={card} />
    </WidgetErrorBoundary>
  );
}

function BlockRenderer({ block, card }: { block: CustomBlock; card: boolean }) {
  switch (block.type) {
    case 'cover-row':
      return <CoverRowBlockRenderer block={block} card={card} />;
    case 'button':
      return <ButtonBlockRenderer block={block} card={card} />;
    case 'button-row':
      return <ButtonRowBlockRenderer block={block} card={card} />;
    case 'section-header':
      return <SectionHeaderBlockRenderer block={block} />;
    case 'widget':
      return <WidgetBlockRenderer block={block} />;
    default:
      return null;
  }
}

/**
 * Place d'un bloc dans la grille de tuiles. Un titre de section ouvre une
 * nouvelle rangée ; une rangée de boutons se dissout, ses boutons deviennent
 * des tuiles ; une card embarquée prend deux colonnes.
 */
const BLOCK_SPAN: Partial<Record<CustomBlock['type'], string>> = {
  'section-header': 'col-span-full',
  'button-row': 'contents',
  widget: 'sm:col-span-2',
};

/**
 * Le contenu d'une modale, sans sa feuille : des tuiles Echo dans une grille
 * qui remplit la largeur.
 *
 * Sorti de `CustomPanelRenderer` pour que l'aperçu de l'éditeur montre la
 * modale **en cours d'édition** : le rendu normal lit la modale dans le
 * contexte, or l'éditeur travaille sur un brouillon qui n'y est pas encore.
 */
export function CustomPanelBlocks({ panel }: { panel: CustomPanel }) {
  const { t } = useI18n();

  return (
    <div className='grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3'>
      {panel.blocks.map(block => (
        <div key={block.id} className={BLOCK_SPAN[block.type]}>
          <SafeBlock block={block} card />
        </div>
      ))}
      {panel.blocks.length === 0 && (
        <div className='col-span-full py-6 text-center text-sm text-[var(--ds-ink-muted)]'>{t('layout.customPanel.emptyPanel')}</div>
      )}
    </div>
  );
}

export function CustomPanelRenderer({ panelId }: { panelId: string }) {
  const { getPanel } = useCustomPanels();
  const panel = getPanel(panelId);

  if (!panel) return null;

  const headerButtons = panel.headerButtons?.length ? (
    <div className='flex items-center gap-1.5'>
      {panel.headerButtons.map(button => (
        <InlineButtonRenderer key={button.id} btn={button} compact />
      ))}
    </div>
  ) : undefined;

  return (
    <Panel title={panel.name} actions={headerButtons}>
      <CustomPanelBlocks panel={panel} />
    </Panel>
  );
}
