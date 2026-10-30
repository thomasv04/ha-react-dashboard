import { useEffect, useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, Check, X } from 'lucide-react';
import { useWallPanel } from '@/context/WallPanelContext';
import { PageProvider, type Page } from '@/context/PageContext';
import { WidgetConfigProvider, useWidgetConfig } from '@/context/WidgetConfigContext';
import { DashboardLayoutProvider, useDashboardLayout, useEditMode } from '@/context/DashboardLayoutContext';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { AddWidgetModal } from '@/components/layout/AddWidgetModal';
import { WidgetEditModal } from '@/components/layout/WidgetEditModal';
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
export type WallPanelSave = (layout: DashboardLayout, widgetConfigs: WidgetConfigs) => Promise<boolean>;

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
  const { allLayouts, layout, addPanel } = useDashboardLayout();
  const { allWidgetConfigsByPage } = useWidgetConfig();
  const { setEditMode, editPanelId, setEditPanelId } = useEditMode();
  const { exitWallPanelEditMode, setWallPanelLayout, setWallPanelWidgetConfigs } = useWallPanel();
  const [showAddModal, setShowAddModal] = useState(false);

  // Activate grid edit mode on mount
  useEffect(() => {
    setEditMode(true);
    return () => setEditMode(false);
  }, [setEditMode]);

  // La veille n'a qu'un panneau : on l'édite d'emblée, tuiles à la main. Sans
  // lui, la grille s'ouvrait sur la carte des panneaux — où l'on ne range rien.
  useEffect(() => {
    setEditPanelId(layout.panels[0]?.id ?? addPanel());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- à l'ouverture seulement
  }, []);

  // « Enregistrer » n'ecrivait que dans le contexte : il fallait ensuite passer
  // le dashboard en edition et l'enregistrer *aussi*, sans quoi la disposition
  // de l'ecran de veille disparaissait au rechargement. `onSave` vient de
  // l'overlay, qui a acces a la config complete.
  const handleSave = async () => {
    const wpLayout = allLayouts['wallpanel'] ?? null;
    const wpConfigs = allWidgetConfigsByPage['wallpanel'] ?? {};
    if (wpLayout) setWallPanelLayout(wpLayout);
    setWallPanelWidgetConfigs(wpConfigs);
    // Refus du serveur : on reste en édition, le toast a prévenu.
    if (wpLayout && onSave && !(await onSave(wpLayout, wpConfigs))) return;
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
          className='flex h-12 items-center gap-2 rounded-full bg-[var(--ds-surface-3)] px-5 text-base font-semibold text-[var(--ds-ink)]'
        >
          <Plus size={18} />
          {t('layout.panel.addTile')}
        </button>
        <button
          onClick={handleSave}
          className='flex h-12 items-center gap-2 rounded-full bg-[var(--ds-tile-on)] px-6 text-base font-bold text-[var(--ds-tile-on-ink)]'
        >
          <Check size={18} strokeWidth={3} />
          {t('dashboard.done')}
        </button>
        <button
          onClick={exitWallPanelEditMode}
          className='flex size-12 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
          title={t('dashboard.discardTooltip')}
          aria-label={t('dashboard.discardTooltip')}
        >
          <X size={18} />
        </button>
      </div>

      {/* Widget edit modal (config / disposition) */}
      <WidgetEditModal />

      {/* Add widget modal */}
      <AnimatePresence>
        {showAddModal && <AddWidgetModal panelId={editPanelId ?? undefined} onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>
    </div>
  );
}

/**
 * Same isolated provider stack as WallPanelEditShell, but in readonly mode.
 * Required so DashboardGrid/GridItem can resolve widget positions from the
 * wallpanel layout rather than the main dashboard layout.
 */
export function WallPanelReadonlyShell() {
  const { wallPanelLayout, wallPanelWidgetConfigs, config } = useWallPanel();

  // Figés au montage : `DashboardLayoutProvider` ne lit ces valeurs *initiales*
  // qu'une fois, et une référence neuve à chaque rendu relancerait sa
  // synchronisation en boucle.
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
            <DashboardGrid readonly />
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
            <DashboardGrid />
          </div>
        </DashboardLayoutProvider>
      </WidgetConfigProvider>
    </PageProvider>
  );
}
