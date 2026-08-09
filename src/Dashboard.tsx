import { PanelProvider } from '@/context/PanelContext';
import { CustomPanelProvider } from '@/context/CustomPanelContext';
import { DashboardLayoutProvider, useDashboardLayout } from '@/context/DashboardLayoutContext';
import { WidgetConfigProvider } from '@/context/WidgetConfigContext';
import { PageProvider } from '@/context/PageContext';
import { MoreInfoProvider } from '@/context/MoreInfoContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { PanelOverlay } from '@/components/layout/Panel';
import { DashboardGrid, GridItem } from '@/components/layout/DashboardGrid';
import { WidgetEditModal } from '@/components/layout/WidgetEditModal';
import { ThemeControlsModal } from '@/components/layout/ThemeControlsModal';
import { PageTabs } from '@/components/layout/PageTabs';
import { MoreInfoModal } from '@/components/modals/MoreInfoModal';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { useEffect, useState, memo } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';

import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { usePageRouting } from '@/hooks/usePageRouting';
import { WallPanelProvider, useWallPanel } from '@/context/WallPanelContext';
import { WallPanelOverlay } from '@/components/wallpanel/WallPanelOverlay';
import { useIdleDetector } from '@/hooks/useIdleDetector';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useIsMobile } from '@/hooks/useIsMobile';
import { WIDGET_COMPONENTS } from '@/widgets';
import type { GridWidget } from '@/context/DashboardLayoutContext';

const WidgetItem = memo(function WidgetItem({ widget }: { widget: GridWidget }) {
  const Component = WIDGET_COMPONENTS[widget.type];
  if (!Component) return null;
  return (
    <GridItem id={widget.id}>
      <Component />
    </GridItem>
  );
});

import { EditButton } from '@/components/dashboard/EditButton';
import { ActivePanel } from '@/components/dashboard/ActivePanel';
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState';

/**
 * Watcher d'inactivité — doit être monté à l'intérieur du WallPanelProvider
 */
function IdleWatcher() {
  const { config, enabled, activate, isActive } = useWallPanel();
  useIdleDetector({
    idleTime: config.idle_time,
    enabled: enabled && !isActive,
    onIdle: activate,
    onActive: () => {},
  });
  return null;
}

/**
 * Surveille l'entité HA `screensaver_entity` via WebSocket pour
 * activer/désactiver le WallPanel depuis Home Assistant.
 */
function ScreensaverEntityWatcher() {
  const { config, activate, deactivate, isActive } = useWallPanel();
  const entityId = config.screensaver_entity ?? '';
  const entity = useSafeEntity(entityId);

  useEffect(() => {
    if (!entityId || !entity) return;
    if (entity.state === 'on' && !isActive) activate();
    if (entity.state === 'off' && isActive) deactivate();
  }, [entity?.state, entityId, isActive, activate, deactivate]);

  return null;
}

function DashboardContent() {
  const { layout } = useDashboardLayout();
  usePageRouting();
  const isMobile = useIsMobile(640);
  const isCompact = useIsMobile(768) && !isMobile;
  // Use lg layout as canonical list of widget ids (all breakpoints share same ids)
  const widgets = layout.widgets.lg;

  return (
    <LayoutGroup>
      <div className='min-h-screen w-full text-white overflow-x-hidden'>
        <div className='max-w-[1440px] mx-auto px-2 sm:px-4 md:px-5 pt-4 sm:pt-5 pb-24 sm:pb-32 md:pb-36'>
          {/* Onglets de navigation entre pages */}
          <PageTabs />

          <DashboardGrid className={isMobile ? 'mobile-layout' : isCompact ? 'compact-layout' : undefined}>
            {widgets.map(widget => (
              <WidgetItem key={widget.id} widget={widget} />
            ))}
          </DashboardGrid>

          {widgets.length === 0 && <DashboardEmptyState />}
        </div>

        {/* Bouton d'édition admin (fixe, top-right) */}
        <EditButton />

        {/* Bouton apparence / thèmes (fixe, top-left) */}
        <ThemeControlsModal />

        {/* Widget edit modal */}
        <AnimatePresence>
          <WidgetEditModal />
        </AnimatePresence>

        {/* Bottom nav */}
        <BottomNav />

        {/* Panel overlay */}
        <PanelOverlay>
          <ActivePanel />
        </PanelOverlay>

        {/* Idle detector + WallPanel overlay */}
        <IdleWatcher />
        <ScreensaverEntityWatcher />
        <WallPanelOverlay />

        {/* More Info modal */}
        <MoreInfoModal />
      </div>
    </LayoutGroup>
  );
}

function Dashboard() {
  const { isLoading, pages, allLayouts, allWidgetConfigs, wallPanelConfig, wallPanelLayout, customPanels } = useDashboardConfig();
  // Échappatoire : passer outre l'attente et afficher le dashboard tel qu'il
  // peut l'être (cache ou valeurs par défaut). Le chargement continue derrière.
  const [skipped, setSkipped] = useState(false);

  // `isLoading` n'est vrai que sans cache **et** sans réponse serveur : au
  // rechargement, le dashboard se peint immédiatement depuis le cache local.
  if (isLoading && !skipped) {
    return <LoadingScreen stage='config' onSkip={() => setSkipped(true)} />;
  }

  return (
    <PageProvider initialPages={pages}>
      <WidgetConfigProvider initialAllWidgetConfigs={allWidgetConfigs}>
        <DashboardLayoutProvider initialLayouts={allLayouts}>
          <WallPanelProvider initialConfig={wallPanelConfig} initialLayout={wallPanelLayout}>
            <CustomPanelProvider initialPanels={customPanels}>
              <MoreInfoProvider>
                <PanelProvider>
                  <DashboardContent />
                </PanelProvider>
              </MoreInfoProvider>
            </CustomPanelProvider>
          </WallPanelProvider>
        </DashboardLayoutProvider>
      </WidgetConfigProvider>
    </PageProvider>
  );
}

export default Dashboard;
