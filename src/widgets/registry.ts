import type { WidgetDefinition } from './define-widget';

// ── Widgets déclarés via `defineWidget` ──────────────────────────────────────
//
// Ajouter un widget = créer `src/components/cards/<Nom>/widget.ts` puis
// l'importer ici. C'est la seule ligne à ajouter dans un fichier partagé :
// tous les registres (composants, catalogue, méta, tailles, dispositions,
// champs, valeurs par défaut) en sont dérivés — cf. `./index.ts`.
//
// Import explicite plutôt que `import.meta.glob` : TypeScript voit alors les
// types littéraux, ce dont dérive l'union `WidgetType`, et le bundler garde un
// graphe statique.

import automation from '@/components/cards/AutomationCard/widget';
import automationList from '@/components/cards/AutomationListCard/widget';
import energyFlow from '@/components/cards/EnergyFlowCard/widget';
import chart from '@/components/cards/ChartCard/widget';
import batteries from '@/components/cards/BatteriesCard/widget';
import lock from '@/components/cards/LockCard/widget';
import calendar from '@/components/cards/CalendarCard/widget';
import todo from '@/components/cards/TodoCard/widget';
import fan from '@/components/cards/FanCard/widget';
import clock from '@/components/cards/ClockCard/widget';
import activity from '@/components/cards/ActivityBar/widget';
import greeting from '@/components/cards/GreetingCard/widget';
import pellet from '@/components/cards/PelletCard/widget';
import vacuum from '@/components/cards/VacuumCard/widget';
import alarm from '@/components/cards/AlarmCard/widget';
import mediaPlayer from '@/components/cards/MediaPlayerCard/widget';
import room from '@/components/cards/RoomCard/widget';
import group from '@/components/cards/GroupCard/widget';
import button from '@/components/cards/ButtonCard/widget';
import template from '@/components/cards/TemplateCard/widget';
import person from '@/components/cards/PersonStatus/widget';
import cover from '@/components/cards/CoverCard/widget';
import shortcuts from '@/components/cards/ShortcutsCard/widget';
import camera from '@/components/cards/CameraCard/widget';
import energy from '@/components/cards/EnergyCard/widget';
import thermostat from '@/components/cards/ThermostatCard/widget';
import weather from '@/components/cards/WeatherCard/widget';
import light from '@/components/cards/LightCard/widget';
import sensor from '@/components/cards/SensorCard/widget';
import tempo from '@/components/cards/TempoCard/widget';

export const WIDGETS = [
  automation,
  automationList,
  energyFlow,
  chart,
  batteries,
  lock,
  calendar,
  todo,
  fan,
  clock,
  activity,
  greeting,
  pellet,
  vacuum,
  alarm,
  mediaPlayer,
  room,
  group,
  button,
  template,
  person,
  cover,
  shortcuts,
  camera,
  energy,
  thermostat,
  weather,
  light,
  sensor,
  tempo,
] satisfies readonly WidgetDefinition[];

/** Union des types de widgets déclarés par manifeste */
export type ManifestWidgetType = (typeof WIDGETS)[number]['type'];
