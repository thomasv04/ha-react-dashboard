import { lazy } from 'react';

export const MORE_INFO_COMPONENTS: Record<
  string,
  React.LazyExoticComponent<React.ComponentType<{ entityId: string; widgetId: string }>>
> = {
  sensor: lazy(() => import('./SensorMoreInfo')),
  light: lazy(() => import('./LightMoreInfo')),
  cover: lazy(() => import('./CoverMoreInfo')),
  weather: lazy(() => import('./WeatherMoreInfo')),
  thermostat: lazy(() => import('./ThermostatMoreInfo')),
  camera: lazy(() => import('./CameraMoreInfo')),
  person: lazy(() => import('./PersonMoreInfo')),
  automation: lazy(() => import('./AutomationMoreInfo')),
  energy: lazy(() => import('./EnergyMoreInfo')),
  template: lazy(() => import('./TemplateMoreInfo')),
};

export const MORE_INFO_WIDGET_TYPES = Object.keys(MORE_INFO_COMPONENTS);
