import { PanelProvider } from '@/context/PanelContext';
import { CustomPanelProvider } from '@/context/CustomPanelContext';
import { DashboardLayoutProvider, useDashboardLayout, useEditMode } from '@/context/DashboardLayoutContext';
import { WidgetConfigProvider } from '@/context/WidgetConfigContext';
import { PageProvider } from '@/context/PageContext';
import { MoreInfoProvider } from '@/context/MoreInfoContext';
import { PanelOverlay } from '@/components/layout/Panel';
import { DashboardGrid } from '@/components/layout/DashboardGrid';
import { WidgetEditModal } from '@/components/layout/WidgetEditModal';
import { PageBadges } from '@/components/layout/PageBadges';
import { TopBar } from '@/components/shell/TopBar';
import { NavRail } from '@/components/shell/NavRail';
import { Launcher } from '@/components/shell/Launcher';
import { MoreInfoModal } from '@/components/modals/MoreInfoModal';
import { LoadingScreen } from '@/components/layout/LoadingScreen';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'framer-motion';

import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { usePageRouting } from '@/hooks/usePageRouting';
import { WallPanelProvider, useScreensaverPlan, useWallPanel } from '@/context/WallPanelContext';
import { WallPanelOverlay } from '@/components/wallpanel/WallPanelOverlay';
import { useIdleDetector } from '@/hooks/useIdleDetector';
import { useSafeEntity } from '@/hooks/useSafeEntity';

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
import { layoutWidgets } from '@/lib/panel-grid';

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
 * Écran de veille sur une maquette (`floorplan_page`) : la veille montre sa
 * page Plan sans y naviguer. En partant, on retrouve la page où l'on était —
 * celle de l'accueil si l'inactivité y a ramené entre-temps.
 */
function ScreensaverPlanWatcher() {
  const { isActive } = useWallPanel();
  const plan = useScreensaverPlan();
  const { showPage } = usePages();
  useEffect(() => showPage(isActive && plan ? plan : null), [isActive, plan, showPage]);
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
  const { currentPage } = usePages();
  usePageRouting();
  const widgets = layoutWidgets(layout);
  const { isEditMode } = useEditMode();
  // Sans panneau ni édition, il n'y a rien à dessiner : l'écran d'accueil vide s'en charge.
  const hasBoard = layout.panels.length > 0 || isEditMode;
  const isFloorplan = currentPage?.type === 'floorplan';
  const [launcherOpen, setLauncherOpen] = useState(false);
  const closeLauncher = useCallback(() => setLauncherOpen(false), []);

  return (
    <LayoutGroup>
      <div className='min-h-screen w-full overflow-x-hidden text-[var(--ds-ink)]'>
        <TopBar onOpenLauncher={() => setLauncherOpen(true)} />
        <NavRail />
        <Launcher open={launcherOpen} onClose={closeLauncher} />

        {/* Sous la barre du haut et à droite du rail ; sur téléphone le rail
            passe en bas. Page plan : tout l'écran restant, le plan se lit
            d'un coup d'œil, sans défiler. */}
        <div
          className={cn(
            'pt-[112px] pl-3 pr-3 sm:pl-[124px] sm:pr-6',
            isFloorplan ? 'h-dvh flex flex-col pb-24 sm:pb-6' : 'pb-28 sm:pb-6 md:flex md:h-dvh md:flex-col'
          )}
        >
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
              {/* À partir de `md`, le plateau prend tout l'écran restant : ce sont les panneaux qui défilent, pas la page. */}
              {hasBoard && (
                <div className='relative md:min-h-0 md:flex-1'>
                  <DashboardGrid />
                </div>
              )}

              {widgets.length === 0 && <DashboardEmptyState />}
            </>
          )}
        </div>

        {/* Bouton d'édition admin, dans la barre du haut */}
        <EditButton />

        {/* Widget edit modal */}
        <AnimatePresence>
          <WidgetEditModal />
        </AnimatePresence>

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
