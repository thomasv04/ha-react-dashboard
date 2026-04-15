import { useState, useCallback } from 'react';
import { Thermometer } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { MoreInfoHeader } from './MoreInfoHeader';
import { InfoSidebar, type SidebarModule } from './sidebar';
import type { ThermostatCardConfig } from '@/types/widget-types';

const HVAC_COLORS: Record<string, string> = {
  heating: '#f97316',
  cooling: '#3b82f6',
  idle: '#6b7280',
  drying: '#eab308',
  off: '#6b7280',
};

export default function ThermostatMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<ThermostatCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);
  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();

  const minTemp = config?.minTemp ?? (entity?.attributes.min_temp as number) ?? 10;
  const maxTemp = config?.maxTemp ?? (entity?.attributes.max_temp as number) ?? 30;

  const setTemp = useCallback(
    (temp: number) => {
      const clamped = Math.max(minTemp, Math.min(maxTemp, temp));
      helpers.callService({
        domain: 'climate',
        service: 'set_temperature',
        target: { entity_id: entityId },
        serviceData: { temperature: clamped },
      });
    },
    [helpers, entityId, minTemp, maxTemp]
  );

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

  if (!entity) return <div className='p-12 text-white/40 text-center'>Entité introuvable</div>;

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

        {/* Current temperature */}
        {currentTemp != null && (
          <p className='text-sm text-white/50 text-center mt-6'>
            Température actuelle: <span className='text-white font-medium'>{currentTemp}°C</span>
          </p>
        )}

        {/* Target temperature - giant display */}
        <div className='flex items-center justify-center gap-6 mt-4'>
          <button
            onClick={() => targetTemp != null && setTemp(targetTemp - 0.5)}
            className='w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white text-xl font-light flex items-center justify-center transition-colors'
          >
            −
          </button>
          <div className='text-center'>
            <span className='text-7xl font-light italic text-white' style={{ textShadow: `0 0 60px ${actionColor}40` }}>
              {targetTemp != null ? targetTemp.toFixed(1) : '—'}
            </span>
            <span className='text-2xl text-white/40 ml-1'>°C</span>
          </div>
          <button
            onClick={() => targetTemp != null && setTemp(targetTemp + 0.5)}
            className='w-12 h-12 rounded-full bg-white/5 hover:bg-white/10 text-white text-xl font-light flex items-center justify-center transition-colors'
          >
            +
          </button>
        </div>

        {/* Slider */}
        <div className='mt-6 px-8'>
          <input
            type='range'
            min={minTemp}
            max={maxTemp}
            step={0.5}
            value={targetTemp ?? minTemp}
            onChange={e => setTemp(Number(e.target.value))}
            className='w-full accent-orange-400'
          />
          <div className='flex justify-between text-[10px] text-white/30 mt-1'>
            <span>{minTemp}°</span>
            <span>{maxTemp}°</span>
          </div>
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
