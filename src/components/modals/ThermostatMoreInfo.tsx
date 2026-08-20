import { useState, useCallback } from 'react';
import { Thermometer } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { MoreInfoHeader } from './MoreInfoHeader';
import { ThermostatCard } from '@/components/cards/ThermostatCard/ThermostatCard';
import { WidgetIdProvider } from '@/components/layout/DashboardGrid';
import { InfoSidebar, type SidebarModule } from './sidebar';
import type { ThermostatCardConfig } from '@/types/widget-types';
import { useI18n } from '@/i18n';

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
  const { helpers } = useHass();

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

  if (!entity) return <div className='p-12 text-white/40 text-center'>{t('common.entityNotFound')}</div>;

  const name = (entity.attributes.friendly_name as string) ?? entityId;
  const currentTemp = entity.attributes.current_temperature as number | undefined;
  const targetTemp = entity.attributes.temperature as number | undefined;
  const hvacAction = (entity.attributes.hvac_action as string) ?? 'idle';
  const hvacModes = (entity.attributes.hvac_modes as string[]) ?? [];
  const fanModes = entity.attributes.fan_modes as string[] | undefined;
  const swingModes = entity.attributes.swing_modes as string[] | undefined;
  const currentFanMode = entity.attributes.fan_mode as string | undefined;
  const currentSwingMode = entity.attributes.swing_mode as string | undefined;
  const hvacMode = entity.state;
  const actionColor = HVAC_COLORS[hvacAction] ?? '#6b7280';

  return (
    <div className={`p-8 md:p-12 ${showInfoPanel ? 'lg:grid lg:grid-cols-5 lg:gap-8' : ''}`}>
      <div className={showInfoPanel ? 'lg:col-span-3' : ''}>
        <MoreInfoHeader icon={Thermometer} name={name} state={hvacMode.toUpperCase()} stateColor={actionColor} />

        {/* Gauge — même cadran que la card, en grand */}
        <div className='gc-bare mx-auto mt-6 w-full max-w-[380px] aspect-[1/1.18]'>
          <WidgetIdProvider id={widgetId}>
            <ThermostatCard />
          </WidgetIdProvider>
        </div>
      </div>

      {showInfoPanel && (
        <div className='lg:col-span-2 mt-8 lg:mt-0'>
          <InfoSidebar
            modules={
              [
                ...(hvacModes.length > 0
                  ? [{ type: 'select' as const, title: 'Mode HVAC', value: hvacMode, options: hvacModes, onChange: setHvacMode }]
                  : []),
                ...(fanModes && fanModes.length > 0
                  ? [
                      {
                        type: 'select' as const,
                        title: 'Ventilation',
                        value: currentFanMode ?? '',
                        options: fanModes,
                        onChange: setFanMode,
                      },
                    ]
                  : []),
                ...(swingModes && swingModes.length > 0
                  ? [
                      {
                        type: 'select' as const,
                        title: 'Oscillation',
                        value: currentSwingMode ?? '',
                        options: swingModes,
                        onChange: setSwingMode,
                      },
                    ]
                  : []),
                {
                  type: 'details' as const,
                  title: 'Informations',
                  entries: [
                    { label: 'Action', value: hvacAction, color: `text-[${actionColor}]` },
                    ...(currentTemp != null ? [{ label: 'Temp. actuelle', value: `${currentTemp}°C` }] : []),
                    ...(targetTemp != null ? [{ label: 'Temp. cible', value: `${targetTemp}°C` }] : []),
                  ],
                },
                { type: 'timeline' as const, entityId },
                { type: 'history' as const, historyHours, onHistoryHoursChange: setHistoryHours },
                { type: 'attributes' as const, entityId },
                { type: 'entityId' as const, entityIds: [entityId] },
              ] satisfies SidebarModule[]
            }
          />
        </div>
      )}
    </div>
  );
}
