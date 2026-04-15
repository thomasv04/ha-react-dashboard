import { LayoutGrid, Music, Settings, Plus, X, Monitor } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePages, type PageType } from '@/context/PageContext';
import { useEditMode } from '@/context/DashboardLayoutContext';
import { useWallPanel } from '@/context/WallPanelContext';
import { cn } from '@/lib/utils';
import { resolveIcon } from '@/lib/lucide-icon-map';
import { useState } from 'react';
import { WallPanelConfigModal } from '@/components/wallpanel/WallPanelConfigModal';
import { AnimatePresence } from 'framer-motion';

const DEFAULT_ICONS: Record<PageType, LucideIcon> = {
  grid: LayoutGrid,
  media: Music,
  settings: Settings,
};

export function PageTabs() {
  const { pages, currentPageId, setCurrentPage, addPage, deletePage } = usePages();
  const { isEditMode } = useEditMode();
  const { isConfigured } = useWallPanel();
  const [showWpConfig, setShowWpConfig] = useState(false);

  const sortedPages = [...pages].sort((a, b) => a.order - b.order);

  return (
    <>
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-2 mb-3">
      {/* Bouton WallPanel — toujours à gauche */}
      {(isEditMode || isConfigured) && (
        <button
          onClick={() => setShowWpConfig(true)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
            isConfigured
              ? 'text-purple-300/70 bg-purple-500/[0.08] border border-purple-500/20 hover:bg-purple-500/15'
              : 'text-white/30 border border-dashed border-white/15 hover:border-purple-500/30 hover:text-purple-300/60',
          )}
        >
          <Monitor size={16} />
          <span className='uppercase tracking-wider text-xs'>
            {isConfigured ? 'WallPanel' : '+ WallPanel'}
          </span>
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
              isActive
                ? 'bg-white/10 text-white border border-white/20'
                : 'text-white/40 hover:text-white/60 hover:bg-white/5',
            )}
          >
            <IconComponent size={16} />
            <span className="uppercase tracking-wider text-xs">{page.label}</span>

            {/* Bouton supprimer en mode édition (sauf page home) */}
            {isEditMode && page.id !== 'home' && (
              <span
                role="button"
                onClick={(e) => {
                  e.stopPropagation();
                  deletePage(page.id);
                }}
                className="ml-1 text-red-400/60 hover:text-red-400 cursor-pointer"
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
          onClick={() => addPage({ label: 'Nouvelle page', type: 'grid' })}
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
        >
          <Plus size={14} />
          <span className="text-xs">Page</span>
        </button>
      )}
    </div>

    {/* WallPanel config modal */}
    <AnimatePresence>
      {showWpConfig && <WallPanelConfigModal onClose={() => setShowWpConfig(false)} />}
    </AnimatePresence>
    </>
  );
}
