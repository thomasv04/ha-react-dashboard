import { PanelProvider, usePanel } from '@/context/PanelContext';
import { DashboardLayoutProvider, useDashboardLayout, type GridWidget } from '@/context/DashboardLayoutContext';
import { PageProvider, usePages } from '@/context/PageContext';
import { BottomNav } from '@/components/layout/BottomNav';
import { PanelOverlay } from '@/components/layout/Panel';
import { DashboardGrid, GridItem } from '@/components/layout/DashboardGrid';
import { WidgetEditModal } from '@/components/layout/WidgetEditModal';
import { ThemeControlsModal } from '@/components/layout/ThemeControlsModal';
import { AddWidgetModal } from '@/components/layout/AddWidgetModal';
import { PageTabs } from '@/components/layout/PageTabs';
import { useUser } from '@hakit/core';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PencilLine, Check, X, CloudUpload, Plus, Loader2 } from 'lucide-react';

// 👉 Import de notre hook backend !
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { usePageRouting } from '@/hooks/usePageRouting';
import { WallPanelProvider, useWallPanel } from '@/context/WallPanelContext';
import { WallPanelOverlay } from '@/components/wallpanel/WallPanelOverlay';
import { useIdleDetector } from '@/hooks/useIdleDetector';
import { useSafeEntity } from '@/hooks/useSafeEntity';

// Cards
import { ClockWidget } from '@/components/cards/GreetingCard/GreetingCard';
import { WeatherCard } from '@/components/cards/WeatherCard/WeatherCard';
import { EnergyCard } from '@/components/cards/EnergyCard/EnergyCard';
import { TempoCard } from '@/components/cards/TempoCard/TempoCard';
import { ThermostatCard } from '@/components/cards/ThermostatCard/ThermostatCard';
import { RoomsGrid } from '@/components/cards/RoomsGrid/RoomsGrid';
import { ActivityBar } from '@/components/cards/ActivityBar/ActivityBar';
import { ShortcutsCard } from '@/components/cards/ShortcutsCard/ShortcutsCard';
import { CameraCard } from '@/components/cards/CameraCard/CameraCard';
import { SensorCard } from '@/components/cards/SensorCard/SensorCard';
import { LightCard } from '@/components/cards/LightCard/LightCard';
import { PersonStatusCard } from '@/components/cards/PersonStatus/PersonStatusCard';
import { CoverCard } from '@/components/cards/CoverCard/CoverCard';
import { TemplateCard } from '@/components/cards/TemplateCard/TemplateCard';

// Panels
import { ShuttersPanel } from '@/components/panels/ShuttersPanel';
import { LightsPanel } from '@/components/panels/LightsPanel';
import { VacuumPanel } from '@/components/panels/VacuumPanel';
import { SecurityPanel } from '@/components/panels/SecurityPanel';
import { NotificationsPanel } from '@/components/panels/NotificationsPanel';
import { FlowersPanel } from '@/components/panels/FlowersPanel';
import { CameraPanel } from '@/components/panels/CameraPanel';

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

/**
 * Bouton flottant d'édition visible uniquement par les admins.
 * - Affiche/masque le mode édition (overlays sur chaque card)
 * - Propose de sauvegarder dans Node.js (dossier /data HA)
 */
function EditButton() {
  const user = useUser();
  const { isEditMode, setEditMode, saveLayout, allLayouts, allWidgetConfigsByPage } = useDashboardLayout();
  const { pages } = usePages();
  const { config: wpConfig, wallPanelLayout } = useWallPanel();

  // 👉 Récupère la fonction de sauvegarde de notre backend Node
  const { saveConfig, isSaving } = useDashboardConfig();

  const [showAddModal, setShowAddModal] = useState(false);

  if (!user?.is_admin) return null;

  const handleSave = async () => {
    saveLayout();
    await saveConfig({
      version: 2,
      pages,
      layouts: allLayouts,
      widgetConfigs: allWidgetConfigsByPage,
      wallPanel: {
        config: wpConfig,
        layout: wallPanelLayout,
        widgetConfigs: {},
      },
    });
    setEditMode(false);
  };

  return (
    <>
      <div className='fixed top-4 right-4 z-50 flex items-center gap-2'>
        <AnimatePresence>
          {isEditMode && (
            <motion.div
              key='edit-actions'
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className='flex items-center gap-2'
            >
              {/* Bouton Ajouter */}
              <button
                onClick={() => setShowAddModal(true)}
                className='flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 hover:text-blue-100 text-sm font-medium transition-colors backdrop-blur-sm'
              >
                <Plus size={15} />
                Ajouter
              </button>
              
              {/* Bouton Sauvegarder */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className='flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 hover:text-green-100 text-sm font-medium transition-colors backdrop-blur-sm disabled:opacity-50'
              >
                {/* Petit spinner si ça sauvegarde */}
                {isSaving ? <Loader2 size={15} className="animate-spin" /> : <CloudUpload size={15} />}
                {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
              
              {/* Bouton Annuler */}
              <button
                onClick={() => setEditMode(false)}
                className='p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/60 hover:text-white transition-colors backdrop-blur-sm'
                title='Annuler'
              >
                <X size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bouton toggle édition */}
        <motion.button
          onClick={() => setEditMode(!isEditMode)}
          whileTap={{ scale: 0.92 }}
          title={isEditMode ? 'Quitter le mode édition' : 'Modifier le dashboard'}
          className={`p-2.5 rounded-xl border transition-colors backdrop-blur-sm ${
            isEditMode
              ? 'bg-purple-500/30 border-purple-500/50 text-purple-200'
              : 'bg-white/10 border-white/20 text-white/70 hover:text-white hover:bg-white/20'
          }`}
        >
          {isEditMode ? <Check size={17} /> : <PencilLine size={17} />}
        </motion.button>
      </div>

      {/* Modal ajout de widget */}
      <AnimatePresence>
        {showAddModal && <AddWidgetModal onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>
    </>
  );
}

function ActivePanel() {
  const { activePanel } = usePanel();
  switch (activePanel) {
    case 'volets':
      return <ShuttersPanel />;
    case 'lumieres':
      return <LightsPanel />;
    case 'aspirateur':
      return <VacuumPanel />;
    case 'security':
      return <SecurityPanel />;
    case 'notifications':
      return <NotificationsPanel />;
    case 'flowers':
      return <FlowersPanel />;
    case 'cameras':
      return <CameraPanel />;
    case 'alarme':
      return <SecurityPanel />;
    default:
      return null;
  }
}

// ── Widget component map for dynamic rendering ────────────────────────────────

const WIDGET_COMPONENTS: Record<GridWidget['type'], React.ComponentType> = {
  weather: WeatherCard,
  camera: CameraCard,
  thermostat: ThermostatCard,
  rooms: RoomsGrid,
  shortcuts: ShortcutsCard,
  tempo: TempoCard,
  energy: EnergyCard,
  greeting: ClockWidget,
  activity: ActivityBar,
  sensor: SensorCard,
  light: LightCard,
  person: PersonStatusCard,
  cover: CoverCard,
  template: TemplateCard,
};

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
      <DashboardLayoutProvider initialLayouts={allLayouts} initialAllWidgetConfigs={allWidgetConfigs}>
        <WallPanelProvider initialConfig={wallPanelConfig} initialLayout={wallPanelLayout}>
          <PanelProvider>
            <DashboardContent />
          </PanelProvider>
        </WallPanelProvider>
      </DashboardLayoutProvider>
    </PageProvider>
  );
}

export default Dashboard;