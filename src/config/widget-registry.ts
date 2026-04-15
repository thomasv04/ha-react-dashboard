import React, { memo } from 'react';
import type { GridWidget } from '@/context/DashboardLayoutContext';
import { WeatherCard } from '@/components/cards/WeatherCard/WeatherCard';
import { CameraCard } from '@/components/cards/CameraCard/CameraCard';
import { ThermostatCard } from '@/components/cards/ThermostatCard/ThermostatCard';
import { RoomsGrid } from '@/components/cards/RoomsGrid/RoomsGrid';
import { ShortcutsCard } from '@/components/cards/ShortcutsCard/ShortcutsCard';
import { TempoCard } from '@/components/cards/TempoCard/TempoCard';
import { EnergyCard } from '@/components/cards/EnergyCard/EnergyCard';
import { GreetingCard, ClockWidget } from '@/components/cards/GreetingCard/GreetingCard';
import { ActivityBar } from '@/components/cards/ActivityBar/ActivityBar';
import { SensorCard } from '@/components/cards/SensorCard/SensorCard';
import { LightCard } from '@/components/cards/LightCard/LightCard';
import { PersonStatusCard } from '@/components/cards/PersonStatus/PersonStatusCard';
import { CoverCard } from '@/components/cards/CoverCard/CoverCard';
import { TemplateCard } from '@/components/cards/TemplateCard/TemplateCard';

/** Registry used for live previews in AddWidgetModal and WidgetEditModal */
export const PREVIEW_COMPONENTS: Partial<Record<GridWidget['type'], React.ComponentType>> = {
  weather:    WeatherCard,
  camera:     CameraCard,
  thermostat: ThermostatCard,
  rooms:      RoomsGrid,
  shortcuts:  ShortcutsCard,
  tempo:      TempoCard,
  energy:     EnergyCard,
  greeting:   GreetingCard,
  activity:   ActivityBar,
  sensor:     SensorCard,
  light:      LightCard,
  person:     PersonStatusCard,
  cover:      CoverCard,
  template:   TemplateCard,
};

/** Registry used by the dashboard grid to render widgets (memoized to prevent unnecessary re-renders) */
export const WIDGET_COMPONENTS: Record<GridWidget['type'], React.ComponentType> = {
  weather:    memo(WeatherCard),
  camera:     memo(CameraCard),
  thermostat: memo(ThermostatCard),
  rooms:      memo(RoomsGrid),
  shortcuts:  memo(ShortcutsCard),
  tempo:      memo(TempoCard),
  energy:     memo(EnergyCard),
  greeting:   memo(ClockWidget),
  activity:   memo(ActivityBar),
  sensor:     memo(SensorCard),
  light:      memo(LightCard),
  person:     memo(PersonStatusCard),
  cover:      memo(CoverCard),
  template:   memo(TemplateCard),
};
