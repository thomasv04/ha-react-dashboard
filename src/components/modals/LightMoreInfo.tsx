import { useState } from 'react';
import { Lightbulb, Sun } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { PillSlider } from '@/components/ds/PillSlider';
import { COLOR_TEMP_TRACK, HUE_TRACK, TRACK_MARKER } from '@/components/ds/light-tracks';
import { LightSwatches, lightState, useLightActions } from '@/components/ds/LightControls';
import { MoreInfoHeader } from './MoreInfoHeader';
import { InfoSidebar, SheetSection, type SidebarModule } from './sidebar';
import type { LightCardConfig } from '@/types/widget-types';
import { useI18n } from '@/i18n';
import { friendlyName } from '@/lib/ha-service';
import { cn } from '@/lib/utils';

type ColorTab = 'color' | 'color_temp';

export default function LightMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<LightCardConfig>(widgetId);
  const showInfoPanel = config?.showInfoPanel !== false;
  const [historyHours, setHistoryHours] = useState(24);
  const [colorTab, setColorTab] = useState<ColorTab>('color');
  const entity = useSafeEntity(entityId);
  const actions = useLightActions(entityId);

  if (!entity) return <div className='p-12 text-center text-[var(--ds-ink-muted)]'>{t('common.entityNotFound')}</div>;

  const name = config?.name ?? friendlyName(entity) ?? entityId;
  const {
    isOn,
    dimmable: isDimmable,
    color: supportsColor,
    colorTemp: supportsColorTemp,
    brightness,
    brightnessPct,
    kelvin: colorTempKelvin,
    minKelvin,
    maxKelvin,
    hsColor,
    hue,
  } = lightState(entity);
  // Un seul des deux : pas d'onglets, la section montre celui qui existe.
  const tab: ColorTab = supportsColor && supportsColorTemp ? colorTab : supportsColor ? 'color' : 'color_temp';

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
          onClick={actions.toggle}
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
            onChange={actions.brightness}
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
              <LightSwatches hue={hue} isOn={isOn} onPick={actions.hue} />
              <PillSlider
                value={hue}
                max={359}
                track={HUE_TRACK}
                fill={TRACK_MARKER}
                label={t('widgets.light.hue')}
                valueText={`${hue}°`}
                onChange={actions.hue}
              />
            </div>
          ) : (
            <PillSlider
              value={colorTempKelvin ?? minKelvin}
              min={minKelvin}
              max={maxKelvin}
              track={COLOR_TEMP_TRACK}
              fill={TRACK_MARKER}
              label={t('widgets.light.colorTemp')}
              valueText={`${colorTempKelvin ?? minKelvin} K`}
              onChange={actions.kelvin}
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
