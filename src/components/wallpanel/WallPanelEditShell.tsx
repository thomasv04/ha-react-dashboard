import { useEffect, useState, useMemo } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Plus, CloudUpload, X } from 'lucide-react';
import { useWallPanel } from '@/context/WallPanelContext';
import { PageProvider, type Page } from '@/context/PageContext';
import {
  DashboardLayoutProvider,
  useDashboardLayout,
} from '@/context/DashboardLayoutContext';
import { DashboardGrid, GridItem } from '@/components/layout/DashboardGrid';
import { AddWidgetModal } from '@/components/layout/AddWidgetModal';
import { WidgetEditModal } from '@/components/layout/WidgetEditModal';
import { DEFAULT_WIDGET_CONFIGS } from '@/types/widget-configs';
import type { GridWidget } from '@/context/DashboardLayoutContext';

// Widget components available on the overlay
import { WeatherCard } from '@/components/cards/WeatherCard/WeatherCard';
import { ClockWidget } from '@/components/cards/GreetingCard/GreetingCard';
import { EnergyCard } from '@/components/cards/EnergyCard/EnergyCard';
import { TempoCard } from '@/components/cards/TempoCard/TempoCard';
import { ThermostatCard } from '@/components/cards/ThermostatCard/ThermostatCard';
import { ActivityBar } from '@/components/cards/ActivityBar/ActivityBar';
import { SensorCard } from '@/components/cards/SensorCard/SensorCard';
import { LightCard } from '@/components/cards/LightCard/LightCard';
import { PersonStatusCard } from '@/components/cards/PersonStatus/PersonStatusCard';
import { TemplateCard } from '@/components/cards/TemplateCard/TemplateCard';

const WP_WIDGET_COMPONENTS: Partial<Record<GridWidget['type'], React.ComponentType>> = {
  weather: WeatherCard,
  thermostat: ThermostatCard,
  energy: EnergyCard,
  tempo: TempoCard,
  greeting: ClockWidget,
  activity: ActivityBar,
  sensor: SensorCard,
  light: LightCard,
  person: PersonStatusCard,
  template: TemplateCard,
};

// Single fake page used by the nested DashboardLayoutProvider
const WALLPANEL_PAGES: Page[] = [
  { id: 'wallpanel', label: 'WallPanel', type: 'grid', order: 0 },
];

/**
 * Toolbar + modals for the wallpanel edit session.
 * Must render INSIDE the nested DashboardLayoutProvider so it can access both:
 *   - useDashboardLayout() → the wallpanel layout
 *   - useWallPanel()       → outer context to persist the result
 */
function WallPanelEditActions() {
  const { allLayouts, setEditMode } = useDashboardLayout();
  const { exitWallPanelEditMode, setWallPanelLayout } = useWallPanel();
  const [showAddModal, setShowAddModal] = useState(false);

  // Activate grid edit mode on mount
  useEffect(() => {
    setEditMode(true);
    return () => setEditMode(false);
  }, [setEditMode]);

  const handleSave = () => {
    const wpLayout = allLayouts['wallpanel'];
    if (wpLayout) setWallPanelLayout(wpLayout);
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
          Ajouter
        </button>
        <button
          onClick={handleSave}
          className='flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-300 text-sm font-medium transition-colors backdrop-blur-sm'
        >
          <CloudUpload size={15} />
          Sauvegarder
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
      <AnimatePresence>
        {showAddModal && <AddWidgetModal onClose={() => setShowAddModal(false)} />}
      </AnimatePresence>
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
        const Component = WP_WIDGET_COMPONENTS[widget.type];
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
  const { wallPanelLayout } = useWallPanel();

  const initialLayouts = useMemo(
    () => ({ wallpanel: wallPanelLayout }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const initialAllWidgetConfigs = useMemo(
    () => ({ wallpanel: DEFAULT_WIDGET_CONFIGS }),
    [],
  );

  return (
    <PageProvider initialPages={WALLPANEL_PAGES}>
      <DashboardLayoutProvider
        initialLayouts={initialLayouts}
        initialAllWidgetConfigs={initialAllWidgetConfigs}
      >
        <div className='pointer-events-auto max-w-[1440px] mx-auto px-5 pt-8'>
          <DashboardGrid readonly>
            <WallPanelGridWidgets />
          </DashboardGrid>
        </div>
      </DashboardLayoutProvider>
    </PageProvider>
  );
}

/**
 * Provides a fully isolated PageProvider + DashboardLayoutProvider scoped to
 * the WallPanel overlay. Used when `isWallPanelEditMode` is true.
 */
export function WallPanelEditShell() {
  const { wallPanelLayout } = useWallPanel();

  // Stable references so DashboardLayoutProvider's sync useEffect doesn't loop
  const initialLayouts = useMemo(
    () => ({ wallpanel: wallPanelLayout }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [], // only on mount — changes are saved back via setWallPanelLayout
  );
  const initialAllWidgetConfigs = useMemo(
    () => ({ wallpanel: DEFAULT_WIDGET_CONFIGS }),
    [],
  );

  return (
    <PageProvider initialPages={WALLPANEL_PAGES}>
      <DashboardLayoutProvider
        initialLayouts={initialLayouts}
        initialAllWidgetConfigs={initialAllWidgetConfigs}
      >
        <WallPanelEditActions />
        <div className='pointer-events-auto max-w-[1440px] mx-auto px-5 pt-8'>
          <DashboardGrid>
            <WallPanelGridWidgets />
          </DashboardGrid>
        </div>
      </DashboardLayoutProvider>
    </PageProvider>
  );
}
