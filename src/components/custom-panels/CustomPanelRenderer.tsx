import { useCustomPanels } from '@/context/CustomPanelContext';
import { Panel } from '@/components/layout/Panel';
import { resolveIcon } from '@/lib/lucide-icon-map';
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
      return <ButtonBlockRenderer block={block} />;
    case 'button-row':
      return <ButtonRowBlockRenderer block={block} />;
    case 'section-header':
      return <SectionHeaderBlockRenderer block={block} />;
    case 'widget':
      return <WidgetBlockRenderer block={block} />;
    default:
      return null;
  }
}

/** Blocs qui gardent la pleine largeur même sur deux colonnes. */
const FULL_WIDTH_BLOCKS: CustomBlock['type'][] = ['section-header', 'button-row'];

/**
 * Le contenu d'un panneau, sans sa feuille.
 *
 * Sorti de `CustomPanelRenderer` pour que l'aperçu de l'éditeur montre le
 * panneau **en cours d'édition** : le rendu normal lit le panneau dans le
 * contexte, or l'éditeur travaille sur un brouillon qui n'y est pas encore.
 */
export function CustomPanelBlocks({ panel }: { panel: CustomPanel }) {
  const { t } = useI18n();

  // Deux colonnes : la feuille s'élargit, sinon chaque colonne serait deux fois
  // plus étroite qu'avant et on aurait échangé un scroll vertical contre des
  // cartes illisibles. Titres et rangées de boutons gardent la pleine largeur —
  // un intitulé de section au milieu d'une grille ne titre plus rien.
  const twoCols = panel.columns === 2;

  return (
    <div className={twoCols ? 'grid grid-cols-1 sm:grid-cols-2 gap-2 items-start' : 'flex flex-col gap-2'}>
      {panel.blocks.map(block => (
        <div key={block.id} className={twoCols && FULL_WIDTH_BLOCKS.includes(block.type) ? 'sm:col-span-2' : undefined}>
          <SafeBlock block={block} card={twoCols} />
        </div>
      ))}
      {panel.blocks.length === 0 && <div className='text-white/30 text-sm text-center py-6'>{t('layout.customPanel.emptyPanel')}</div>}
    </div>
  );
}

export function CustomPanelRenderer({ panelId }: { panelId: string }) {
  const { getPanel } = useCustomPanels();
  const panel = getPanel(panelId);

  if (!panel) return null;

  const IconComponent = panel.icon ? resolveIcon(panel.icon) : null;

  // eslint-disable-next-line react-hooks/static-components
  const panelIcon = IconComponent ? <IconComponent size={18} /> : undefined;

  const twoCols = panel.columns === 2;

  const headerButtons = panel.headerButtons?.length ? (
    <div className='flex items-center gap-1.5'>
      {panel.headerButtons.map(button => (
        <InlineButtonRenderer key={button.id} btn={button} compact />
      ))}
    </div>
  ) : undefined;

  return (
    <Panel title={panel.name} icon={panelIcon} wide={twoCols} actions={headerButtons}>
      <CustomPanelBlocks panel={panel} />
    </Panel>
  );
}
