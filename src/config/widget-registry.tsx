import React, { lazy, memo, Suspense, type ComponentType } from 'react';
import type { GridWidget } from '@/context/DashboardLayoutContext';
import { WeatherCard } from '@/components/cards/WeatherCard/WeatherCard';
import { CameraCard } from '@/components/cards/CameraCard/CameraCard';
import { ThermostatCard } from '@/components/cards/ThermostatCard/ThermostatCard';
import { ShortcutsCard } from '@/components/cards/ShortcutsCard/ShortcutsCard';
import { TempoCard } from '@/components/cards/TempoCard/TempoCard';
import { EnergyCard } from '@/components/cards/EnergyCard/EnergyCard';
import { GreetingCard } from '@/components/cards/GreetingCard/GreetingCard';
import { ActivityBar } from '@/components/cards/ActivityBar/ActivityBar';
import { SensorCard } from '@/components/cards/SensorCard/SensorCard';
import { LightCard } from '@/components/cards/LightCard/LightCard';
import { PersonStatusCard } from '@/components/cards/PersonStatus/PersonStatusCard';
import { CoverCard } from '@/components/cards/CoverCard/CoverCard';
import { TemplateCard } from '@/components/cards/TemplateCard/TemplateCard';
import { AutomationCard } from '@/components/cards/AutomationCard/AutomationCard';
import { ButtonCard } from '@/components/cards/ButtonCard/ButtonCard';
import { GroupCard } from '@/components/cards/GroupCard/GroupCard';
import { RoomCard } from '@/components/cards/RoomCard/RoomCard';
import { MediaPlayerCard } from '@/components/cards/MediaPlayerCard/MediaPlayerCard';
import { AlarmCard } from '@/components/cards/AlarmCard/AlarmCard';
import { VacuumCard } from '@/components/cards/VacuumCard/VacuumCard';
import { PelletCard } from '@/components/cards/PelletCard/PelletCard';

/**
 * Wraps a dynamic import of a named export into a lazy + memo component
 * with a Suspense boundary. Used for code-splitting widget chunks.
 */
function lazyMemo<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
) {
  const Lazy = lazy(factory);
  return memo(function LazyWidget(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={null}>
        <Lazy {...props} />
      </Suspense>
    );
  });
}

/** Helper: wrap a named export into { default } for React.lazy */
const named =
  <T extends ComponentType<any>>(pick: (m: any) => T) =>
  (mod: any) => ({ default: pick(mod) }) as { default: T };

/** Registry used for live previews in AddWidgetModal and WidgetEditModal */
export const PREVIEW_COMPONENTS: Partial<Record<GridWidget['type'], React.ComponentType>> = {
  weather: WeatherCard,
  camera: CameraCard,
  thermostat: ThermostatCard,
  shortcuts: ShortcutsCard,
  tempo: TempoCard,
  energy: EnergyCard,
  greeting: GreetingCard,
  activity: ActivityBar,
  sensor: SensorCard,
  light: LightCard,
  person: PersonStatusCard,
  cover: CoverCard,
  template: TemplateCard,
  automation: AutomationCard,
  button: ButtonCard,
  group: GroupCard,
  room: RoomCard,
  media_player: MediaPlayerCard,
  alarm: AlarmCard,
  vacuum: VacuumCard,
  pellet: PelletCard,
};

/** Registry used by the dashboard grid to render widgets (lazy-loaded + memoized for code-splitting) */
export const WIDGET_COMPONENTS: Record<GridWidget['type'], React.ComponentType> = {
  weather: lazyMemo(() => import('@/components/cards/WeatherCard/WeatherCard').then(named(m => m.WeatherCard))),
  camera: lazyMemo(() => import('@/components/cards/CameraCard/CameraCard').then(named(m => m.CameraCard))),
  thermostat: lazyMemo(() => import('@/components/cards/ThermostatCard/ThermostatCard').then(named(m => m.ThermostatCard))),
  shortcuts: lazyMemo(() => import('@/components/cards/ShortcutsCard/ShortcutsCard').then(named(m => m.ShortcutsCard))),
  tempo: lazyMemo(() => import('@/components/cards/TempoCard/TempoCard').then(named(m => m.TempoCard))),
  energy: lazyMemo(() => import('@/components/cards/EnergyCard/EnergyCard').then(named(m => m.EnergyCard))),
  greeting: lazyMemo(() => import('@/components/cards/GreetingCard/GreetingCard').then(named(m => m.ClockWidget))),
  activity: lazyMemo(() => import('@/components/cards/ActivityBar/ActivityBar').then(named(m => m.ActivityBar))),
  sensor: lazyMemo(() => import('@/components/cards/SensorCard/SensorCard').then(named(m => m.SensorCard))),
  light: lazyMemo(() => import('@/components/cards/LightCard/LightCard').then(named(m => m.LightCard))),
  person: lazyMemo(() => import('@/components/cards/PersonStatus/PersonStatusCard').then(named(m => m.PersonStatusCard))),
  cover: lazyMemo(() => import('@/components/cards/CoverCard/CoverCard').then(named(m => m.CoverCard))),
  template: lazyMemo(() => import('@/components/cards/TemplateCard/TemplateCard').then(named(m => m.TemplateCard))),
  automation: lazyMemo(() => import('@/components/cards/AutomationCard/AutomationCard').then(named(m => m.AutomationCard))),
  button: lazyMemo(() => import('@/components/cards/ButtonCard/ButtonCard').then(named(m => m.ButtonCard))),
  group: lazy(() => import('@/components/cards/GroupCard/GroupCard').then(named(m => m.GroupCard))), // pas de memo — contient état éditeur
  room: lazyMemo(() => import('@/components/cards/RoomCard/RoomCard').then(named(m => m.RoomCard))),
  media_player: lazyMemo(() => import('@/components/cards/MediaPlayerCard/MediaPlayerCard').then(named(m => m.MediaPlayerCard))),
  alarm: lazyMemo(() => import('@/components/cards/AlarmCard/AlarmCard').then(named(m => m.AlarmCard))),
  vacuum: lazyMemo(() => import('@/components/cards/VacuumCard/VacuumCard').then(named(m => m.VacuumCard))),
  pellet: lazyMemo(() => import('@/components/cards/PelletCard/PelletCard').then(named(m => m.PelletCard))),
};
