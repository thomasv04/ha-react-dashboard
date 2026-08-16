import { motion } from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { SafeBlock } from '@/components/custom-panels/CustomPanelRenderer';
import { resolveIcon, useIconCatalog } from '@/lib/lucide-icon-map';
import { staggerGridItem } from '@/lib/motion-variants';
import { useI18n } from '@/i18n';
import { WallPanelSheet } from './WallPanelSheet';

/**
 * Menu rapide de l'écran de veille : un panneau custom existant, rendu tel
 * quel. Rien à composer ici — l'éditeur de panneaux produit déjà des rangées
 * de boutons, de volets et de widgets, et `SafeBlock` isole les pannes.
 */
export function QuickPanelSheet({ panelId, onClose }: { panelId: string; onClose: () => void }) {
  // Les icones hors du noyau arrivent avec le catalogue complet, charge a la
  // demande : sans cet abonnement elles resteraient sur leur icone de repli.
  useIconCatalog();
  const { t } = useI18n();
  const { getPanel } = useCustomPanels();
  const panel = getPanel(panelId.replace(/^custom:/, ''));

  // Repli sur l'icône générique : un nom d'icône téléversée ou inconnu du
  // catalogue renvoie `undefined`, et la feuille n'a pas à rester sans repère.
  const IconComponent = panel?.icon ? resolveIcon(panel.icon) : null;
  // eslint-disable-next-line react-hooks/static-components
  const icon = IconComponent ? <IconComponent size={16} /> : <LayoutGrid size={16} />;

  return (
    <WallPanelSheet side='bottom' title={panel?.name ?? t('layout.wallPanel.gestures.quickMenu')} icon={icon} onClose={onClose}>
      {panel?.blocks.map(block => (
        <motion.div key={block.id} variants={staggerGridItem}>
          <SafeBlock block={block} />
        </motion.div>
      ))}
      {(!panel || panel.blocks.length === 0) && (
        <p className='text-white/30 text-sm text-center py-8'>{t('layout.wallPanel.gestures.noQuickPanel')}</p>
      )}
    </WallPanelSheet>
  );
}
