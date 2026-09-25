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
import { PageBadges } from '@/components/layout/PageBadges';
import { MoreInfoModal } from '@/components/modals/MoreInfoModal';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { lazy, Suspense, useEffect, useRef, useState, memo } from 'react';
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
import { cn } from '@/lib/utils';
import { TourHost } from '@/components/onboarding/TourOverlay';
import { ReleaseNotesHost } from '@/components/onboarding/ReleaseNotesModal';
import { WidgetErrorBoundary } from '@/components/ui/WidgetErrorBoundary';
import { QuickBar } from '@/components/dashboard/QuickBar';
import { useTheme } from '@/context/ThemeContext';
import { usePages } from '@/context/PageContext';
import { usePanel } from '@/context/PanelContext';
import { useMoreInfo } from '@/context/MoreInfoContext';

// La page plan ne se télécharge qu'à sa première visite : sans plan, rien à payer.
const FloorplanView = lazy(() => import('@/components/floorplan/FloorplanView').then(m => ({ default: m.FloorplanView })));

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
 * Ramène à la première page après un temps d'inactivité.
 *
 * Le cas d'usage est la tablette murale : quelqu'un consulte la page « Caméras »,
 * s'en va, et l'écran reste sur les caméras jusqu'au prochain passage. Le
 * détecteur d'inactivité existait déjà pour l'économiseur d'écran — il ne
 * manquait que le réglage et ce branchement.
 */
function ReturnHomeWatcher() {
  const { behaviourSettings } = useTheme();
  const { pages, currentPageId, setCurrentPage } = usePages();
  const { closePanel } = usePanel();
  const { closeMoreInfo } = useMoreInfo();

  const home = pages[0]?.id;

  useIdleDetector({
    // Le réglage est en minutes, le détecteur en secondes.
    idleTime: behaviourSettings.returnHomeAfter * 60,
    enabled: behaviourSettings.returnHomeAfter > 0 && !!home,
    onIdle: () => {
      // Refermer aussi ce qui se superpose : revenir à l'accueil en laissant
      // une fiche ouverte par-dessus ne ramènerait rien de visible.
      closeMoreInfo();
      closePanel();
      if (home && currentPageId !== home) setCurrentPage(home);
    },
    onActive: () => {},
  });

  return null;
}

/**
 * Surveille l'entité HA `screensaver_entity` via WebSocket pour
 * activer/désactiver le WallPanel depuis Home Assistant.
 */
/**
 * Écran de veille sur une maquette (`floorplan_page`) : la veille ouvre sa
 * page Plan, et rend en partant la page qu'on avait — celle de l'accueil si
 * l'inactivité y a ramené entre-temps.
 */
function ScreensaverPlanWatcher() {
  const { isActive, config } = useWallPanel();
  const { pages, currentPageId, setCurrentPage } = usePages();
  const plan = pages.find(p => p.id === config.floorplan_page && p.type === 'floorplan')?.id;
  const back = useRef<string | null>(null);
  useEffect(() => {
    if (isActive && plan) {
      if (currentPageId === plan) return;
      back.current = currentPageId;
      setCurrentPage(plan);
    } else if (!isActive && back.current !== null) {
      const page = back.current;
      back.current = null;
      setCurrentPage(page);
    }
  }, [isActive, plan, currentPageId, setCurrentPage]);
  return null;
}

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
  const { currentPage } = usePages();
  usePageRouting();
  const isMobile = useIsMobile(640);
  const isCompact = useIsMobile(768) && !isMobile;
  // Use lg layout as canonical list of widget ids (all breakpoints share same ids)
  const widgets = layout.widgets.lg;
  const isFloorplan = currentPage?.type === 'floorplan';

  return (
    <LayoutGroup>
      <div className='min-h-screen w-full text-white overflow-x-hidden'>
        {/* `pt-2` : l'en-tête (onglets, pastilles) mangeait un sixième de la hauteur
            d'une tablette avant la première card. */}
        {/* Page plan : tout l'écran, le plan prenant la hauteur que laissent les
            onglets — il se lit d'un coup d'œil, sans défiler. */}
        <div
          className={cn(
            'mx-auto px-2 sm:px-4 md:px-5 pt-2 sm:pt-3',
            isFloorplan ? 'h-dvh flex flex-col' : 'max-w-[1440px] pb-24 sm:pb-32 md:pb-36'
          )}
        >
          {/* Onglets de navigation entre pages */}
          <PageTabs />

          {/* Pastilles d'état de la page — n'occupent aucune place si vides */}
          <PageBadges />

          {isFloorplan ? (
            // Un chunk du plan qui ne se charge pas — réseau coupé, ancien index
            // gardé en cache après une mise à jour — n'emporte que le plan.
            <WidgetErrorBoundary messageKey='common.panelUnavailable'>
              <Suspense fallback={null}>
                <FloorplanView />
              </Suspense>
            </WidgetErrorBoundary>
          ) : (
            <>
              <DashboardGrid className={isMobile ? 'mobile-layout' : isCompact ? 'compact-layout' : undefined}>
                {widgets.map(widget => (
                  <WidgetItem key={widget.id} widget={widget} />
                ))}
              </DashboardGrid>

              {widgets.length === 0 && <DashboardEmptyState />}
            </>
          )}
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

        {/* Panel overlay — le contenu vient d'une config éditable, il peut
            planter. Sans frontière, il emportait tout le dashboard avec lui. */}
        <PanelOverlay>
          <WidgetErrorBoundary messageKey='common.panelUnavailable'>
            <ActivePanel />
          </WidgetErrorBoundary>
        </PanelOverlay>

        {/* Idle detector + WallPanel overlay */}
        <IdleWatcher />
        <ReturnHomeWatcher />
        <ScreensaverEntityWatcher />
        <ScreensaverPlanWatcher />
        <WallPanelOverlay />

        {/* More Info modal — une modale par domaine, chacune avec ses graphes
            et son historique : beaucoup de surface pour une exception. */}
        <WidgetErrorBoundary messageKey='common.panelUnavailable'>
          <MoreInfoModal />
        </WidgetErrorBoundary>

        {/* Barre de commande rapide — « e » une entité, « c » une page */}
        <AnimatePresence>
          <QuickBar />
        </AnimatePresence>

        {/* Visite guidée — au premier lancement, puis à la demande */}
        <TourHost />

        {/* Nouveautés — après une mise à jour, puis à la demande */}
        <ReleaseNotesHost />
      </div>
    </LayoutGroup>
  );
}

function Dashboard() {
  const { isLoading, pages, allLayouts, allWidgetConfigs, wallPanelConfig, wallPanelLayout, wallPanelWidgetConfigs, customPanels, dock } =
    useDashboardConfig();
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
          <WallPanelProvider initialConfig={wallPanelConfig} initialLayout={wallPanelLayout} initialWidgetConfigs={wallPanelWidgetConfigs}>
            <CustomPanelProvider initialPanels={customPanels} initialDock={dock}>
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
