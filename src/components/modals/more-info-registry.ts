import { lazy } from 'react';

export const MORE_INFO_COMPONENTS: Record<
  string,
  React.LazyExoticComponent<React.ComponentType<{ entityId: string; widgetId: string }>>
> = {
  sensor: lazy(() => import('./SensorMoreInfo')),
  light: lazy(() => import('./LightMoreInfo')),
  cover: lazy(() => import('./CoverMoreInfo')),
  fan: lazy(() => import('./FanMoreInfo')),
  weather: lazy(() => import('./WeatherMoreInfo')),
  thermostat: lazy(() => import('./ThermostatMoreInfo')),
  camera: lazy(() => import('./CameraMoreInfo')),
  person: lazy(() => import('./PersonMoreInfo')),
  automation: lazy(() => import('./AutomationMoreInfo')),
  energy: lazy(() => import('./EnergyMoreInfo')),
  template: lazy(() => import('./TemplateMoreInfo')),
};

export const MORE_INFO_WIDGET_TYPES = Object.keys(MORE_INFO_COMPONENTS);

/**
 * Domaines HA dont le nom diffère de la clé du registre. Les autres
 * (`light`, `cover`, `camera`, `person`, `automation`…) portent déjà le même.
 */
const DOMAIN_TO_MODAL: Record<string, string> = {
  climate: 'thermostat',
  binary_sensor: 'sensor',
  input_boolean: 'sensor',
  switch: 'sensor',
  media_player: 'sensor',
  sun: 'sensor',
};

/** Modale la plus adaptée à une entité — `sensor` affiche état et historique par défaut. */
export function modalTypeFor(entityId: string): string {
  const domain = entityId.split('.')[0];
  const mapped = DOMAIN_TO_MODAL[domain] ?? domain;
  return mapped in MORE_INFO_COMPONENTS ? mapped : 'sensor';
}
