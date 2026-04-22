import { useState, useCallback } from 'react';
import { Lightbulb, Sun, Thermometer, Palette } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { MoreInfoHeader } from './MoreInfoHeader';
import { InfoSidebar, type SidebarModule } from './sidebar';
import type { LightCardConfig } from '@/types/widget-types';

type LightTab = 'brightness' | 'color_temp' | 'color';

export default function LightMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<LightCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);
  const [activeTab, setActiveTab] = useState<LightTab>('brightness');
  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();

  const handleToggle = useCallback(() => {
    helpers.callService({
      domain: 'light',
      service: 'toggle',
      target: { entity_id: entityId },
    });
  }, [helpers, entityId]);

  const handleBrightness = useCallback(
    (pct: number) => {
      helpers.callService({
        domain: 'light',
        service: 'turn_on',
        target: { entity_id: entityId },
        serviceData: { brightness_pct: pct },
      });
    },
    [helpers, entityId]
  );

  const handleColorTemp = useCallback(
    (kelvin: number) => {
      helpers.callService({
        domain: 'light',
        service: 'turn_on',
        target: { entity_id: entityId },
        serviceData: { color_temp_kelvin: kelvin },
      });
    },
    [helpers, entityId]
  );

  const handleHue = useCallback(
    (hue: number) => {
      helpers.callService({
        domain: 'light',
        service: 'turn_on',
        target: { entity_id: entityId },
        serviceData: { hs_color: [hue, 100] },
      });
    },
    [helpers, entityId]
  );

  if (!entity) return <div className='p-12 text-white/40 text-center'>Entité introuvable</div>;

  const isOn = entity.state === 'on';
  const name = config?.name ?? (entity.attributes.friendly_name as string) ?? entityId;
  const colorModes = (entity.attributes.supported_color_modes as string[]) ?? [];
  const isDimmable = colorModes.some(m => m !== 'onoff');
  const supportsColorTemp = colorModes.includes('color_temp');
  const supportsColor = colorModes.some(m => ['hs', 'rgb', 'xy'].includes(m));

  const brightness = entity.attributes.brightness as number | undefined;
  const brightnessPct = brightness != null ? Math.round((brightness / 255) * 100) : 0;
  const colorTempKelvin = entity.attributes.color_temp_kelvin as number | undefined;
  const minKelvin = (entity.attributes.min_color_temp_kelvin as number) ?? 2700;
  const maxKelvin = (entity.attributes.max_color_temp_kelvin as number) ?? 6500;
  const hsColor = entity.attributes.hs_color as [number, number] | undefined;

  const tabs: { id: LightTab; icon: React.ReactNode; label: string; show: boolean }[] = [
    { id: 'brightness', icon: <Sun size={14} />, label: 'BRIGHTNESS', show: isDimmable },
    { id: 'color_temp', icon: <Thermometer size={14} />, label: 'WARMTH', show: supportsColorTemp },
    { id: 'color', icon: <Palette size={14} />, label: 'COLOR', show: supportsColor },
  ];

  return (
    <div className='p-8 md:p-12 lg:grid lg:grid-cols-5 lg:gap-8'>
      {/* Left panel: toggle + tabs */}
      <div className='lg:col-span-3 flex flex-col'>
        <MoreInfoHeader icon={Lightbulb} name={name} state={isOn ? 'ON' : 'OFF'} stateColor={isOn ? '#facc15' : '#6b7280'} />

        {/* Big toggle circle */}
        <div className='flex-1 flex items-center justify-center'>
          <button
            onClick={handleToggle}
            className={`w-40 h-40 rounded-full flex items-center justify-center transition-all ${
              isOn
                ? 'bg-white/10 text-white shadow-[0_0_60px_rgba(255,255,255,0.08)]'
                : 'bg-white/[0.04] text-white/20 hover:bg-white/[0.06]'
            }`}
            style={{
              border: `2px solid ${isOn ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <Lightbulb size={52} strokeWidth={1.2} />
          </button>
        </div>

        {/* Tabs at bottom */}
        {isDimmable && (
          <div className='flex gap-1 justify-center mt-auto bg-white/5 rounded-xl p-1 mx-auto w-fit'>
            {tabs
              .filter(t => t.show)
              .map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold tracking-wider transition-colors ${
                    activeTab === tab.id ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* Right panel: slider for active tab + info panel */}
      <div className='lg:col-span-2 mt-8 lg:mt-0 space-y-6'>
        {/* Active slider */}
        {isDimmable && (
          <div>
            {activeTab === 'brightness' && (
              <div>
                <div className='flex justify-between text-xs text-white/50 mb-3'>
                  <span className='text-[10px] font-bold uppercase tracking-widest text-white/40'>Brightness</span>
                  <span className='text-white font-semibold'>{brightnessPct}%</span>
                </div>
                <input
                  type='range'
                  min={0}
                  max={100}
                  value={brightnessPct}
                  onChange={e => handleBrightness(Number(e.target.value))}
                  className='w-full accent-yellow-400 h-3'
                />
              </div>
            )}
            {activeTab === 'color_temp' && supportsColorTemp && (
              <div>
                <div className='flex justify-between text-xs text-white/50 mb-3'>
                  <span className='text-[10px] font-bold uppercase tracking-widest text-white/40'>Temperature</span>
                  <span className='text-white font-semibold'>{colorTempKelvin ?? '—'}K</span>
                </div>
                <div className='relative h-8 rounded-lg overflow-hidden'>
                  <div
                    className='absolute inset-0'
                    style={{ background: 'linear-gradient(to right, #ff9500, #ffd4a0, #fff5e6, #e8eeff, #b4c8ff)' }}
                  />
                  <input
                    type='range'
                    min={minKelvin}
                    max={maxKelvin}
                    value={colorTempKelvin ?? minKelvin}
                    onChange={e => handleColorTemp(Number(e.target.value))}
                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                  />
                  {/* Thumb indicator */}
                  <div
                    className='absolute top-0 h-full w-1 bg-white shadow-md pointer-events-none'
                    style={{ left: `${(((colorTempKelvin ?? minKelvin) - minKelvin) / (maxKelvin - minKelvin)) * 100}%` }}
                  />
                </div>
              </div>
            )}
            {activeTab === 'color' && supportsColor && (
              <div>
                <div className='flex justify-between items-center text-xs text-white/50 mb-3'>
                  <span className='text-[10px] font-bold uppercase tracking-widest text-white/40'>Hue</span>
                  <div
                    className='w-5 h-5 rounded-full border border-white/20'
                    style={{ backgroundColor: `hsl(${hsColor?.[0] ?? 0}, 100%, 50%)` }}
                  />
                </div>
                <div className='relative h-8 rounded-lg overflow-hidden'>
                  <div
                    className='absolute inset-0'
                    style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }}
                  />
                  <input
                    type='range'
                    min={0}
                    max={360}
                    value={hsColor?.[0] ?? 0}
                    onChange={e => handleHue(Number(e.target.value))}
                    className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
                  />
                  <div
                    className='absolute top-0 h-full w-1 bg-white shadow-md pointer-events-none'
                    style={{ left: `${((hsColor?.[0] ?? 0) / 360) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sidebar */}
        {showInfoPanel && (
          <InfoSidebar
            modules={
              [
                {
                  type: 'details',
                  title: 'Lumière',
                  entries: [
                    { label: 'État', value: isOn ? 'Allumée' : 'Éteinte', color: isOn ? 'text-yellow-400' : 'text-zinc-400' },
                    ...(brightness != null ? [{ label: 'Luminosité', value: `${brightnessPct}%` }] : []),
                    ...(colorTempKelvin != null ? [{ label: 'Température', value: `${colorTempKelvin}K` }] : []),
                    ...(hsColor ? [{ label: 'Teinte', value: `${Math.round(hsColor[0])}°` }] : []),
                  ],
                },
                { type: 'timeline', entityId },
                { type: 'history', historyHours, onHistoryHoursChange: setHistoryHours },
                { type: 'attributes', entityId },
                { type: 'entityId', entityIds: [entityId] },
              ] as SidebarModule[]
            }
          />
        )}
      </div>
    </div>
  );
}
