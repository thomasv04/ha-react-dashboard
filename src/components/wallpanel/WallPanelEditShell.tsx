import { useEffect, useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, CloudUpload, X } from 'lucide-react';
import { useWallPanel } from '@/context/WallPanelContext';
import { PageProvider, type Page } from '@/context/PageContext';
import { WidgetConfigProvider, useWidgetConfig } from '@/context/WidgetConfigContext';
import { DashboardLayoutProvider, useDashboardLayout, useEditMode } from '@/context/DashboardLayoutContext';
import { DashboardGrid, GridItem } from '@/components/layout/DashboardGrid';
import { AddWidgetModal } from '@/components/layout/AddWidgetModal';
import { WidgetEditModal } from '@/components/layout/WidgetEditModal';
import { WIDGET_COMPONENTS } from '@/widgets';
import { useI18n } from '@/i18n';
import { widgetExtentOf, type WallPanelConfig, type WidgetAnchor } from '@/types/wallpanel';
import type { WidgetConfigs } from '@/types/widget-configs';
import type { DashboardLayout } from '@/context/DashboardLayoutContext';

/** Où la grille se pose sur l'overlay. La largeur vient de `widgetExtentOf`. */
const ANCHOR_CLASS: Record<WidgetAnchor, string> = {
  top: 'absolute top-0 left-1/2 -translate-x-1/2 px-5 pt-8',
  bottom: 'absolute bottom-0 left-1/2 -translate-x-1/2 px-5 pb-8',
  left: 'absolute inset-y-0 left-0 px-5 py-8 overflow-y-auto',
  right: 'absolute inset-y-0 right-0 px-5 py-8 overflow-y-auto',
};

/** Classe et largeur de la zone des widgets, pour une configuration donnée. */
function anchorStyle(config: WallPanelConfig): { className: string; style: React.CSSProperties } {
  const anchor = config.widgetAnchor ?? 'top';
  const extent = widgetExtentOf(config);
  return {
    className: ANCHOR_CLASS[anchor],
    // `maxWidth` seulement en haut et en bas : sur un côté, la bande *est* la
    // part demandée, la borner à 1440 px n'aurait aucun sens sur un écran étroit.
    style: anchor === 'left' || anchor === 'right' ? { width: `${extent}%` } : { width: `${extent}%`, maxWidth: 1440 },
  };
}

/** Enregistre la disposition et les configs de l'ecran de veille sur le serveur. */
export type WallPanelSave = (layout: DashboardLayout, widgetConfigs: WidgetConfigs) => void;

// Single fake page used by the nested DashboardLayoutProvider
const WALLPANEL_PAGES: Page[] = [{ id: 'wallpanel', label: 'WallPanel', type: 'grid', order: 0 }];

/**
 * Toolbar + modals for the wallpanel edit session.
 * Must render INSIDE the nested DashboardLayoutProvider so it can access both:
 *   - useDashboardLayout() → the wallpanel layout
 *   - useWallPanel()       → outer context to persist the result
 */
function WallPanelEditActions({ onSave }: { onSave?: WallPanelSave }) {
  const { t } = useI18n();
  const { allLayouts } = useDashboardLayout();
  const { allWidgetConfigsByPage } = useWidgetConfig();
  const { setEditMode } = useEditMode();
  const { exitWallPanelEditMode, setWallPanelLayout, setWallPanelWidgetConfigs } = useWallPanel();
  const [showAddModal, setShowAddModal] = useState(false);

  // Activate grid edit mode on mount
  useEffect(() => {
    setEditMode(true);
    return () => setEditMode(false);
  }, [setEditMode]);

  // « Enregistrer » n'ecrivait que dans le contexte : il fallait ensuite passer
  // le dashboard en edition et l'enregistrer *aussi*, sans quoi la disposition
  // de l'ecran de veille disparaissait au rechargement. `onSave` vient de
  // l'overlay, qui a acces a la config complete.
  const handleSave = () => {
    const wpLayout = allLayouts['wallpanel'] ?? null;
    const wpConfigs = allWidgetConfigsByPage['wallpanel'] ?? {};
    if (wpLayout) setWallPanelLayout(wpLayout);
    setWallPanelWidgetConfigs(wpConfigs);
    if (wpLayout) onSave?.(wpLayout, wpConfigs);
    exitWallPanelEditMode();
  };

  return (
    // pointer-events-auto overrides the pointer-events-none inherited from the
    // WallPanelOverlay ancestor — all buttons and modals must be interactive.
    <div className='pointer-events-auto'>
      {/* Floating toolbar — z-[210] so it sits above the overlay */}
      <div className='fixed top-4 right-4 z-[210] flex items-center gap-2'>
        <button
          onClick={() => setShowAddModal(true)}
          className='flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-sm font-medium transition-colors backdrop-blur-sm'
        >
          <Plus size={15} />
          {t('common.add')}
        </button>
        <button
          onClick={handleSave}
          className='flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 text-sm font-medium transition-colors backdrop-blur-sm'
        >
          <CloudUpload size={15} />
          {t('common.save')}
        </button>
        <button
          onClick={exitWallPanelEditMode}
          className='p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white transition-colors backdrop-blur-sm'
          title='Annuler'
        >
          <X size={16} />
        </button>
      </div>

      {/* Widget edit modal (config / disposition) */}
      <WidgetEditModal />

      {/* Add widget modal */}
      <AnimatePresence>{showAddModal && <AddWidgetModal onClose={() => setShowAddModal(false)} />}</AnimatePresence>
    </div>
  );
}

/**
 * Renders the current wallpanel layout's widgets as GridItems.
 * Must be inside the nested DashboardLayoutProvider.
 */
function WallPanelGridWidgets() {
  const { layout } = useDashboardLayout();
  const widgets = layout.widgets.lg;
  return (
    <>
      {widgets.map(widget => {
        // `WIDGET_COMPONENTS`, comme la grille du dashboard : une liste propre
        // a l'ecran de veille n'en connaissait que dix, et tout widget ajoute
        // depuis — camera, volet, aspirateur… — disparaissait sans un mot.
        const Component = WIDGET_COMPONENTS[widget.type];
        if (!Component) return null;
        return (
          <GridItem key={widget.id} id={widget.id}>
            <Component />
          </GridItem>
        );
      })}
    </>
  );
}

/**
 * Same isolated provider stack as WallPanelEditShell, but in readonly mode.
 * Required so DashboardGrid/GridItem can resolve widget positions from the
 * wallpanel layout rather than the main dashboard layout.
 */
export function WallPanelReadonlyShell() {
  const { wallPanelLayout, wallPanelWidgetConfigs, config } = useWallPanel();

  const initialLayouts = useMemo(
    () => ({ wallpanel: wallPanelLayout }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const initialWidgetConfigs = useMemo(
    () => ({ wallpanel: wallPanelWidgetConfigs }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <PageProvider initialPages={WALLPANEL_PAGES}>
      {/* Provider de configs **imbrique** : sans lui, les cards lisaient celles
          du dashboard, indexees sur la page affichee au moment ou la veille
          s'ouvre — donc vides une page sur deux. */}
      <WidgetConfigProvider initialAllWidgetConfigs={initialWidgetConfigs}>
        <DashboardLayoutProvider initialLayouts={initialLayouts}>
          {/* `pointer-events-none` sur le conteneur, réactivé sur chaque card :
              cette bande couvre toute la largeur, et en `auto` elle interceptait
              les balayages destinés au fond entre deux cards. */}
          <div className={`pointer-events-none ${anchorStyle(config).className}`} style={anchorStyle(config).style}>
            <DashboardGrid readonly>
              <WallPanelGridWidgets />
            </DashboardGrid>
          </div>
        </DashboardLayoutProvider>
      </WidgetConfigProvider>
    </PageProvider>
  );
}

/**
 * Provides a fully isolated PageProvider + DashboardLayoutProvider scoped to
 * the WallPanel overlay. Used when `isWallPanelEditMode` is true.
 */
export function WallPanelEditShell({ onSave }: { onSave?: WallPanelSave }) {
  const { wallPanelLayout, wallPanelWidgetConfigs, config } = useWallPanel();

  // Stable references so DashboardLayoutProvider's sync useEffect doesn't loop
  const initialLayouts = useMemo(
    () => ({ wallpanel: wallPanelLayout }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // only on mount — changes are saved back via setWallPanelLayout
  );
  const initialWidgetConfigs = useMemo(
    () => ({ wallpanel: wallPanelWidgetConfigs }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <PageProvider initialPages={WALLPANEL_PAGES}>
      <WidgetConfigProvider initialAllWidgetConfigs={initialWidgetConfigs}>
        <DashboardLayoutProvider initialLayouts={initialLayouts}>
          <WallPanelEditActions onSave={onSave} />
          <div className={`pointer-events-auto ${anchorStyle(config).className}`} style={anchorStyle(config).style}>
            <DashboardGrid>
              <WallPanelGridWidgets />
            </DashboardGrid>
          </div>
        </DashboardLayoutProvider>
      </WidgetConfigProvider>
    </PageProvider>
  );
}
