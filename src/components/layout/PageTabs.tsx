import { LayoutGrid, Music, Settings, Plus, X, Monitor, Layers } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePages, type PageType } from '@/context/PageContext';
import { useEditMode } from '@/context/DashboardLayoutContext';
import { useWallPanel } from '@/context/WallPanelContext';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { cn } from '@/lib/utils';
import { resolveIcon, useIconCatalog } from '@/lib/lucide-icon-map';
import { useState } from 'react';
import { WallPanelConfigModal } from '@/components/wallpanel/WallPanelConfigModal';
import { CustomPanelEditorModal } from '@/components/custom-panels';
import { AnimatePresence } from 'framer-motion';
import { useI18n } from '@/i18n';

const DEFAULT_ICONS: Record<PageType, LucideIcon> = {
  grid: LayoutGrid,
  media: Music,
  settings: Settings,
};

export function PageTabs() {
  // Les icones hors du noyau arrivent avec le catalogue complet, charge a la
  // demande : sans cet abonnement elles resteraient sur leur icone de repli.
  useIconCatalog();
  const { t } = useI18n();
  const { pages, currentPageId, setCurrentPage, addPage, deletePage } = usePages();
  const { isEditMode } = useEditMode();
  const { isConfigured } = useWallPanel();
  const { panels } = useCustomPanels();
  const [showWpConfig, setShowWpConfig] = useState(false);
  const [showPanelsEditor, setShowPanelsEditor] = useState(false);

  const sortedPages = [...pages].sort((a, b) => a.order - b.order);

  return (
    <>
      {/* pl/pr : réserve la place des deux boutons flottants (réglages en haut à
          gauche, édition en haut à droite) qui recouvraient sinon les onglets
          dès que la fenêtre est étroite. */}
      {/* En mode édition la barre d'actions est en `fixed` sur toute la largeur
          utile : sous 1024 px elle recouvrait les onglets (et le bouton
          Panneaux). Le décalage tient donc jusqu'à `lg`, pas jusqu'à `sm`. */}
      <div
        data-tour='pages'
        className={cn('flex items-center gap-2 overflow-x-auto scrollbar-none py-2 mb-3 pl-12 pr-12', isEditMode && 'mt-14 lg:mt-0')}
      >
        {/* Bouton WallPanel — toujours à gauche */}
        {(isEditMode || isConfigured) && (
          <button
            onClick={() => setShowWpConfig(true)}
            data-tour='wallpanel'
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
              isConfigured
                ? 'text-purple-300/70 bg-purple-500/[0.08] border border-purple-500/20 hover:bg-purple-500/15'
                : 'text-white/30 border border-dashed border-white/15 hover:border-purple-500/30 hover:text-purple-300/60'
            )}
          >
            <Monitor size={16} />
            <span className='uppercase tracking-wider text-xs'>{isConfigured ? 'WallPanel' : '+ WallPanel'}</span>
          </button>
        )}

        {/* Bouton Panneaux personnalisés */}
        {(isEditMode || panels.length > 0) && (
          <button
            onClick={() => setShowPanelsEditor(true)}
            data-tour='panels-button'
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
              panels.length > 0
                ? 'text-violet-300/70 bg-violet-500/[0.08] border border-violet-500/20 hover:bg-violet-500/15'
                : 'text-white/30 border border-dashed border-white/15 hover:border-violet-500/30 hover:text-violet-300/60'
            )}
          >
            <Layers size={16} />
            <span className='uppercase tracking-wider text-xs'>{panels.length > 0 ? 'Panneaux' : '+ Panneaux'}</span>
          </button>
        )}

        {sortedPages.map(page => {
          const isActive = page.id === currentPageId;
          const resolved = page.icon ? resolveIcon(page.icon) : undefined;
          const IconComponent: LucideIcon = resolved ?? DEFAULT_ICONS[page.type];

          return (
            <button
              key={page.id}
              onClick={() => setCurrentPage(page.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                isActive ? 'bg-white/10 text-white border border-white/20' : 'text-white/40 hover:text-white/60 hover:bg-white/5'
              )}
            >
              <IconComponent size={16} />
              <span className='uppercase tracking-wider text-xs'>{page.label}</span>

              {/* Bouton supprimer en mode édition (sauf page home) */}
              {isEditMode && page.id !== 'home' && (
                <span
                  role='button'
                  onClick={e => {
                    e.stopPropagation();
                    deletePage(page.id);
                  }}
                  className='ml-1 text-red-400/60 hover:text-red-400 cursor-pointer'
                >
                  <X size={12} />
                </span>
              )}
            </button>
          );
        })}

        {/* Bouton ajouter une page en mode édition */}
        {isEditMode && (
          <button
            onClick={() => addPage({ label: t('layout.newPage'), type: 'grid' })}
            data-tour='add-page'
            className='flex items-center gap-1 px-3 py-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors'
          >
            <Plus size={14} />
            <span className='text-xs'>{t('layout.addPage')}</span>
          </button>
        )}
      </div>

      {/* WallPanel config modal */}
      <AnimatePresence>{showWpConfig && <WallPanelConfigModal onClose={() => setShowWpConfig(false)} />}</AnimatePresence>

      {/* Panneaux personnalisés editor */}
      <AnimatePresence>{showPanelsEditor && <CustomPanelEditorModal onClose={() => setShowPanelsEditor(false)} />}</AnimatePresence>
    </>
  );
}
