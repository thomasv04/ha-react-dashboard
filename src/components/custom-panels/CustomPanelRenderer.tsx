import { useCustomPanels } from '@/context/CustomPanelContext';
import { Panel } from '@/components/layout/Panel';
import { resolveIcon } from '@/lib/lucide-icon-map';
import { CoverRowBlockRenderer } from './CoverRowBlock';
import { ButtonBlockRenderer } from './ButtonBlock';
import { ButtonRowBlockRenderer } from './ButtonRowBlock';
import { SectionHeaderBlockRenderer } from './SectionHeaderBlock';
import { WidgetBlockRenderer } from './WidgetBlock';
import type { CustomBlock } from '@/types/custom-panel';
import { useI18n } from '@/i18n';

function BlockRenderer({ block }: { block: CustomBlock }) {
  switch (block.type) {
    case 'cover-row':
      return <CoverRowBlockRenderer block={block} />;
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

export function CustomPanelRenderer({ panelId }: { panelId: string }) {
  const { getPanel } = useCustomPanels();
  const { t } = useI18n();
  const panel = getPanel(panelId);

  if (!panel) return null;

  // eslint-disable-next-line react-hooks/static-components
  const IconComponent = panel.icon ? resolveIcon(panel.icon) : null;

  // eslint-disable-next-line react-hooks/static-components
  const panelIcon = IconComponent ? <IconComponent size={18} /> : undefined;
  return (
    <Panel title={panel.name} icon={panelIcon}>
      <div className='flex flex-col gap-2'>
        {panel.blocks.map(block => (
          <BlockRenderer key={block.id} block={block} />
        ))}
        {panel.blocks.length === 0 && <div className='text-white/30 text-sm text-center py-6'>{t('layout.customPanel.emptyPanel')}</div>}
      </div>
    </Panel>
  );
}
