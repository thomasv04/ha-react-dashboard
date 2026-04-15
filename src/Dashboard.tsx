import { PanelProvider } from '@/context/PanelContext';
import { DashboardLayoutProvider, useDashboardLayout } from '@/context/DashboardLayoutContext';
import { WidgetConfigProvider } from '@/context/WidgetConfigContext';
import { PageProvider } from '@/context/PageContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { PanelOverlay } from '@/components/layout/Panel';
import { DashboardGrid, GridItem } from '@/components/layout/DashboardGrid';
import { WidgetEditModal } from '@/components/layout/WidgetEditModal';
import { ThemeControlsModal } from '@/components/layout/ThemeControlsModal';
import { PageTabs } from '@/components/layout/PageTabs';
import React, { useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { usePageRouting } from '@/hooks/usePageRouting';
import { WallPanelProvider, useWallPanel } from '@/context/WallPanelContext';
import { WallPanelOverlay } from '@/components/wallpanel/WallPanelOverlay';
import { useIdleDetector } from '@/hooks/useIdleDetector';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { WIDGET_COMPONENTS } from '@/config/widget-registry';

import { EditButton } from '@/components/dashboard/EditButton';
import { ActivePanel } from '@/components/dashboard/ActivePanel';

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
  // Use lg layout as canonical list of widget ids (all breakpoints share same ids)
  const widgets = layout.widgets.lg;

  return (
    <div className='min-h-screen w-full text-white overflow-x-hidden'>
      <div className='max-w-[1440px] mx-auto px-5 pt-5 pb-24'>
        {/* Onglets de navigation entre pages */}
        <PageTabs />

        <DashboardGrid>
          {widgets.map(widget => {
            const Component = WIDGET_COMPONENTS[widget.type];
            if (!Component) return null;
            return (
              <GridItem key={widget.id} id={widget.id}>
                <Component />
              </GridItem>
            );
          })}
        </DashboardGrid>
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
    </div>
  );
}

function Dashboard() {
  const { isLoading, pages, allLayouts, allWidgetConfigs, wallPanelConfig, wallPanelLayout } = useDashboardConfig();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#0c1028] text-white">
        <Loader2 size={32} className="animate-spin text-blue-500 mb-4" />
        <p className="text-white/60">Chargement de la configuration...</p>
      </div>
    );
  }

  return (
    <PageProvider initialPages={pages}>
      <WidgetConfigProvider initialAllWidgetConfigs={allWidgetConfigs}>
        <DashboardLayoutProvider initialLayouts={allLayouts}>
          <WallPanelProvider initialConfig={wallPanelConfig} initialLayout={wallPanelLayout}>
            <PanelProvider>
              <DashboardContent />
            </PanelProvider>
          </WallPanelProvider>
        </DashboardLayoutProvider>
      </WidgetConfigProvider>
    </PageProvider>
  );
}

export default Dashboard;