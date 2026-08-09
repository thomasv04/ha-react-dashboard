import React, { lazy, memo, Suspense, type ComponentType } from 'react';
import type { GridWidget } from '@/context/DashboardLayoutContext';

/**
 * Wraps a dynamic import of a named export into a lazy + memo component
 * with a Suspense boundary. Used for code-splitting widget chunks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lazyMemo<T extends ComponentType<any>>(factory: () => Promise<{ default: T }>) {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  <T extends ComponentType<any>>(pick: (m: any) => T) =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (mod: any) =>
      ({ default: pick(mod) }) as { default: T };

/**
 * Registry used by the dashboard grid to render widgets — et aussi pour les
 * aperçus des modales d'ajout/édition.
 *
 * Il existait auparavant un second registre `PREVIEW_COMPONENTS` qui importait
 * les 21 cards de façon statique, dans ce même module : le code-splitting était
 * donc annulé (rolldown : `INEFFECTIVE_DYNAMIC_IMPORT`) et tout le catalogue de
 * widgets atterrissait dans le bundle initial. Un seul registre lazy suffit
 * pour les deux usages.
 */
// `Partial` et non `Record` : le type `rooms` existe dans l'union mais n'a
// jamais eu de composant enregistré (cf. `npm run check:widgets`). Les
// consommateurs gardent déjà le cas `undefined`.
export const LEGACY_WIDGET_COMPONENTS: Partial<Record<GridWidget['type'], React.ComponentType>> = {
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
