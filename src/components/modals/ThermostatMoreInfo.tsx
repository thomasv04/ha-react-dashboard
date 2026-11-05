import { useState, useCallback } from 'react';
import { Thermometer } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { MoreInfoHeader } from './MoreInfoHeader';
import { MoreInfoLayout } from './MoreInfoLayout';
import { ThermostatCard } from '@/components/cards/ThermostatCard/ThermostatCard';
import { WidgetIdProvider } from '@/components/layout/DashboardGrid';
import { InfoSidebar, type SidebarModule } from './sidebar';
import type { ThermostatCardConfig } from '@/types/widget-types';
import { useI18n } from '@/i18n';
import { friendlyName } from '@/lib/ha-service';

const HVAC_COLORS: Record<string, string> = {
  heating: '#f97316',
  cooling: '#3b82f6',
  idle: '#6b7280',
  drying: '#eab308',
  off: '#6b7280',
};

export default function ThermostatMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<ThermostatCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);
  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);

  const setHvacMode = useCallback(
    (mode: string) => {
      helpers.callService({
        domain: 'climate',
        service: 'set_hvac_mode',
        target: { entity_id: entityId },
        serviceData: { hvac_mode: mode },
      });
    },
    [helpers, entityId]
  );

  const setFanMode = useCallback(
    (mode: string) => {
      helpers.callService({
        domain: 'climate',
        service: 'set_fan_mode',
        target: { entity_id: entityId },
        serviceData: { fan_mode: mode },
      });
    },
    [helpers, entityId]
  );

  const setSwingMode = useCallback(
    (mode: string) => {
      helpers.callService({
        domain: 'climate',
        service: 'set_swing_mode',
        target: { entity_id: entityId },
        serviceData: { swing_mode: mode },
      });
    },
    [helpers, entityId]
  );

  const setPresetMode = useCallback(
    (mode: string) => {
      helpers.callService({
        domain: 'climate',
        service: 'set_preset_mode',
        target: { entity_id: entityId },
        serviceData: { preset_mode: mode },
      });
    },
    [helpers, entityId]
  );

  if (!entity) return <div className='p-12 text-[var(--ds-ink-muted)] text-center'>{t('common.entityNotFound')}</div>;

  const name = friendlyName(entity) ?? entityId;
  const currentTemp = entity.attributes.current_temperature as number | undefined;
  const targetTemp = entity.attributes.temperature as number | undefined;
  const hvacAction = (entity.attributes.hvac_action as string) ?? 'idle';
  const hvacModes = (entity.attributes.hvac_modes as string[]) ?? [];
  const fanModes = entity.attributes.fan_modes as string[] | undefined;
  const swingModes = entity.attributes.swing_modes as string[] | undefined;
  const currentFanMode = entity.attributes.fan_mode as string | undefined;
  const currentSwingMode = entity.attributes.swing_mode as string | undefined;
  // Home Assistant n'expose `preset_modes` que si le thermostat en a.
  const presetModes = entity.attributes.preset_modes as string[] | undefined;
  const currentPresetMode = entity.attributes.preset_mode as string | undefined;
  const hvacMode = entity.state;
  const actionColor = HVAC_COLORS[hvacAction] ?? '#6b7280';
  // Les valeurs standard de Home Assistant sont traduites ; une valeur propre à
  // une intégration (`on_low`…) n'a pas de clé et s'affiche telle quelle.
  const label = (group: string) => (value: string) => {
    const key = `widgets.thermostat.${group}.${value}`;
    const text = t(key);
    return text === key ? value : text;
  };

  return (
    <MoreInfoLayout
      showPanel={showInfoPanel}
      sidebar={
        <InfoSidebar
          modules={
            [
              ...(hvacModes.length > 0
                ? [
                    {
                      type: 'select' as const,
                      title: t('widgets.thermostat.moreInfo.hvacMode'),
                      value: hvacMode,
                      options: hvacModes,
                      onChange: setHvacMode,
                      format: label('modes'),
                    },
                  ]
                : []),
              ...(presetModes && presetModes.length > 0
                ? [
                    {
                      type: 'select' as const,
                      title: t('widgets.thermostat.moreInfo.presetMode'),
                      value: currentPresetMode ?? '',
                      options: presetModes,
                      onChange: setPresetMode,
                      format: label('presetModes'),
                    },
                  ]
                : []),
              ...(fanModes && fanModes.length > 0
                ? [
                    {
                      type: 'select' as const,
                      title: t('widgets.thermostat.moreInfo.fanMode'),
                      value: currentFanMode ?? '',
                      options: fanModes,
                      onChange: setFanMode,
                      format: label('fanModes'),
                    },
                  ]
                : []),
              ...(swingModes && swingModes.length > 0
                ? [
                    {
                      type: 'select' as const,
                      title: t('widgets.thermostat.moreInfo.swingMode'),
                      value: currentSwingMode ?? '',
                      options: swingModes,
                      onChange: setSwingMode,
                      format: label('swingModes'),
                    },
                  ]
                : []),
              {
                type: 'details' as const,
                title: t('common.moreInfo.info'),
                entries: [
                  {
                    label: t('widgets.thermostat.moreInfo.action'),
                    value: label('hvacActions')(hvacAction),
                    color: `text-[${actionColor}]`,
                  },
                  ...(currentTemp != null ? [{ label: t('widgets.thermostat.currentTemp'), value: `${currentTemp}°C` }] : []),
                  ...(targetTemp != null ? [{ label: t('widgets.thermostat.moreInfo.targetTemp'), value: `${targetTemp}°C` }] : []),
                ],
              },
              { type: 'timeline' as const, entityId },
              { type: 'history' as const, historyHours, onHistoryHoursChange: setHistoryHours },
              { type: 'attributes' as const, entityId },
              { type: 'entityId' as const, entityIds: [entityId] },
            ] satisfies SidebarModule[]
          }
        />
      }
    >
      <MoreInfoHeader icon={Thermometer} name={name} state={label('modes')(hvacMode)} stateColor={actionColor} />

      {/* Gauge — même cadran que la card, en grand */}
      <div className='mx-auto mt-2 w-full max-w-[380px] aspect-[1/1.18]'>
        <WidgetIdProvider id={widgetId}>
          <ThermostatCard />
        </WidgetIdProvider>
      </div>
    </MoreInfoLayout>
  );
}
