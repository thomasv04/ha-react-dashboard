import { useState, useCallback } from 'react';
import { Lightbulb, Sun } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { PillSlider } from '@/components/ds/PillSlider';
import { MoreInfoHeader } from './MoreInfoHeader';
import { InfoSidebar, SheetSection, type SidebarModule } from './sidebar';
import type { LightCardConfig } from '@/types/widget-types';
import { useI18n } from '@/i18n';
import { friendlyName } from '@/lib/ha-service';
import { cn } from '@/lib/utils';

type ColorTab = 'color' | 'color_temp';

/** Les teintes proposées d'un toucher, avant le curseur. */
const SWATCHES = [300, 350, 15, 35, 325, 95, 45, 130];

/** Curseur sur un dégradé (teinte, chaleur) : une pastille blanche marque la valeur. */
function GradientSlider({
  value,
  min,
  max,
  background,
  label,
  valueText,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  background: string;
  label: string;
  valueText: string;
  onChange: (value: number) => void;
}) {
  const ratio = max > min ? Math.min(1, Math.max(0, (value - min) / (max - min))) : 0;
  return (
    <div className='relative h-[52px] rounded-[var(--ds-radius-pill)]' style={{ background }}>
      <span
        aria-hidden='true'
        className='pointer-events-none absolute top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white shadow-[var(--ds-shadow-pin)]'
        // Bornée pour que la pastille ne déborde pas des bouts arrondis.
        style={{ left: `calc(26px + ${ratio} * (100% - 52px))` }}
      />
      <input
        type='range'
        min={min}
        max={max}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={valueText}
        className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
      />
    </div>
  );
}

export default function LightMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<LightCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);
  const [colorTab, setColorTab] = useState<ColorTab>('color');
  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);

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

  if (!entity) return <div className='p-12 text-center text-[var(--ds-ink-muted)]'>{t('common.entityNotFound')}</div>;

  const isOn = entity.state === 'on';
  const name = config?.name ?? friendlyName(entity) ?? entityId;
  const colorModes = (entity.attributes.supported_color_modes as string[]) ?? [];
  const isDimmable = colorModes.some(m => m !== 'onoff');
  const supportsColorTemp = colorModes.includes('color_temp');
  const supportsColor = colorModes.some(m => ['hs', 'rgb', 'xy'].includes(m));
  // Un seul des deux : pas d'onglets, la section montre celui qui existe.
  const tab: ColorTab = supportsColor && supportsColorTemp ? colorTab : supportsColor ? 'color' : 'color_temp';

  const brightness = entity.attributes.brightness as number | undefined;
  const brightnessPct = brightness != null ? Math.round((brightness / 255) * 100) : 0;
  const colorTempKelvin = entity.attributes.color_temp_kelvin as number | undefined;
  const minKelvin = (entity.attributes.min_color_temp_kelvin as number) ?? 2700;
  const maxKelvin = (entity.attributes.max_color_temp_kelvin as number) ?? 6500;
  const hsColor = entity.attributes.hs_color as [number, number] | undefined;
  const hue = Math.round(hsColor?.[0] ?? 0);

  return (
    <div className='flex flex-col gap-3 p-6'>
      <MoreInfoHeader
        icon={Lightbulb}
        name={name}
        state={isOn ? t('widgets.light.on') : t('widgets.light.off')}
        stateColor={isOn ? 'var(--ds-warm-light)' : undefined}
      />

      {/* L'interrupteur en grand, l'ampoule dans la pastille. */}
      <SheetSection className='flex justify-center'>
        <button
          role='switch'
          aria-checked={isOn}
          aria-label={name}
          onClick={handleToggle}
          className={cn(
            'flex h-[76px] w-[170px] items-center rounded-[var(--ds-radius-pill)] p-1.5 transition-colors',
            isOn ? 'justify-end bg-[var(--ds-tile-on)]' : 'justify-start bg-[var(--ds-surface-3)]'
          )}
        >
          <span className='flex size-16 items-center justify-center rounded-full bg-white'>
            <Lightbulb
              size={28}
              aria-hidden='true'
              className={isOn ? 'text-[var(--ds-tile-on)]' : 'text-[#7a8597]'}
              fill={isOn ? 'currentColor' : 'none'}
            />
          </span>
        </button>
      </SheetSection>

      {isDimmable && (
        <SheetSection title={t('widgets.light.brightnessValue', { value: brightnessPct })}>
          <PillSlider
            value={brightnessPct}
            onChange={handleBrightness}
            label={t('widgets.light.brightness')}
            valueText={`${brightnessPct} %`}
            icon={Sun}
          />
        </SheetSection>
      )}

      {(supportsColor || supportsColorTemp) && (
        <SheetSection
          title={
            tab === 'color_temp' && colorTempKelvin != null
              ? t('widgets.light.colorTempValue', { value: colorTempKelvin })
              : tab === 'color_temp'
                ? t('widgets.light.colorTemp')
                : t('widgets.light.color')
          }
        >
          {supportsColor && supportsColorTemp && (
            <div role='tablist' className='mb-4 flex rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] p-1'>
              {(
                [
                  ['color', t('widgets.light.color')],
                  ['color_temp', t('widgets.light.colorTemp')],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  role='tab'
                  aria-selected={tab === id}
                  onClick={() => setColorTab(id)}
                  className={cn(
                    'h-11 flex-1 rounded-[var(--ds-radius-sm)] text-[15px] font-bold',
                    tab === id && 'bg-[var(--ds-sheet-section)] shadow-[var(--ds-shadow-pin)]'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {tab === 'color' ? (
            <div className='flex flex-col gap-4'>
              <div className='flex flex-wrap justify-center gap-3.5'>
                {SWATCHES.map(h => (
                  <button
                    key={h}
                    onClick={() => handleHue(h)}
                    aria-label={t('widgets.light.swatch', { value: h })}
                    aria-pressed={isOn && Math.abs(hue - h) < 3}
                    className={cn(
                      'size-11 rounded-full',
                      isOn && Math.abs(hue - h) < 3 && 'shadow-[0_0_0_3px_var(--ds-sheet-section),0_0_0_6px_var(--ds-ink)]'
                    )}
                    style={{ background: `hsl(${h} 85% 55%)` }}
                  />
                ))}
              </div>
              <GradientSlider
                value={hue}
                min={0}
                max={360}
                background='linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
                label={t('widgets.light.hue')}
                valueText={`${hue}°`}
                onChange={handleHue}
              />
            </div>
          ) : (
            <GradientSlider
              value={colorTempKelvin ?? minKelvin}
              min={minKelvin}
              max={maxKelvin}
              background='linear-gradient(to right, #ff9500, #ffd4a0, #fff5e6, #e8eeff, #b4c8ff)'
              label={t('widgets.light.colorTemp')}
              valueText={`${colorTempKelvin ?? minKelvin} K`}
              onChange={handleColorTemp}
            />
          )}
        </SheetSection>
      )}

      {showInfoPanel && (
        <InfoSidebar
          modules={
            [
              {
                type: 'details',
                title: t('widgets.light.label'),
                entries: [
                  { label: t('widgets.light.state'), value: isOn ? t('widgets.light.on') : t('widgets.light.off') },
                  ...(brightness != null ? [{ label: t('widgets.light.brightness'), value: `${brightnessPct} %` }] : []),
                  ...(colorTempKelvin != null ? [{ label: t('widgets.light.colorTemp'), value: `${colorTempKelvin} K` }] : []),
                  ...(hsColor ? [{ label: t('widgets.light.hue'), value: `${hue}°` }] : []),
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
  );
}
