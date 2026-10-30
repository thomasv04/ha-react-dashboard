import { useState, useEffect } from 'react';
import { Flame, Power, Snowflake } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { ThermostatCardConfig } from '@/types/widget-configs';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { climateRange, snapTemp } from '@/lib/climate';
import { friendlyName } from '@/lib/ha-service';
import { Dial, type DialMode } from '@/components/ds/Dial';

const MIN_T = 10;
const MAX_T = 30;

/** Modes HVAC proposés sur le cadran, dans l'ordre où ils s'empilent. */
const MODE_ORDER = ['heat', 'cool', 'heat_cool', 'auto', 'dry', 'fan_only', 'off'] as const;
type HvacMode = (typeof MODE_ORDER)[number];

/** `21.5` → « 21,5° » selon la locale ; un entier reste sans décimale. */
function formatTemp(value: number, locale: string): string {
  return `${value.toLocaleString(locale, { maximumFractionDigits: 1 })}°`;
}

export function ThermostatCard() {
  const { t, language } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<ThermostatCardConfig>(widgetId || 'thermostat');
  const entityId = config?.entityId ?? 'climate.living_room';
  const thermostat = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();

  // Consigne suivie pendant un glisser, rendue à HA dès qu'il répond.
  const haTemp = thermostat?.attributes.temperature as number | undefined;
  const [localTarget, setLocalTarget] = useState<number | null>(null);
  useEffect(() => setLocalTarget(null), [haTemp]);

  if (!thermostat) return null;

  // La consigne ne doit jamais sortir de ce que Home Assistant accepte :
  // `climateRange` croise la plage voulue avec celle de l'entité.
  const range = climateRange(thermostat.attributes, config?.minTemp ?? MIN_T, config?.maxTemp ?? MAX_T);
  const target = localTarget ?? haTemp ?? 20;
  const current = thermostat.attributes.current_temperature as number | undefined;
  const hvacMode = thermostat.state as HvacMode;
  const available = (thermostat.attributes.hvac_modes as string[] | undefined) ?? [];
  const modes: DialMode<HvacMode>[] = MODE_ORDER.filter(m => available.includes(m)).map(m => ({
    id: m,
    label: t(`widgets.thermostat.modes.${m}`),
  }));
  const isCooling = hvacMode === 'cool';
  const name = friendlyName(thermostat) ?? t('widgets.thermostat.label');

  const setTemperature = (value: number) => {
    const snapped = snapTemp(value, range);
    setLocalTarget(snapped);
    helpers.callService({
      domain: 'climate',
      service: 'set_temperature',
      target: { entity_id: entityId },
      serviceData: { temperature: snapped },
    });
    playFeedback('slider_tick');
  };

  const setMode = (mode: HvacMode) => {
    helpers.callService({
      domain: 'climate',
      service: 'set_hvac_mode',
      target: { entity_id: entityId },
      serviceData: { hvac_mode: mode },
    });
    playFeedback(mode === 'off' ? 'toggle_off' : 'click');
  };

  const Icon = hvacMode === 'off' ? Power : isCooling ? Snowflake : Flame;

  return (
    <div className='flex h-full select-none flex-col overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] px-[var(--ds-space-4)] pb-2 pt-[var(--ds-space-4)] text-[var(--ds-ink)]'>
      <span className='truncate text-[17px] font-medium'>{name}</span>
      {/* Le cadran est un cercle dans une bande un peu plus large que haute (les flèches sont dans les marges). */}
      <div className='flex min-h-0 flex-1 items-center justify-center' style={{ containerType: 'size' }}>
        <div style={{ width: 'min(100cqw, 125cqh)' }}>
          <Dial
            value={target}
            min={range.min}
            max={range.max}
            step={range.step}
            onChange={setTemperature}
            onDrag={setLocalTarget}
            mode={isCooling ? 'cool' : 'heat'}
            display={formatTemp(target, language)}
            caption={current != null ? t('widgets.thermostat.currently', { value: formatTemp(current, language) }) : undefined}
            icon={<Icon size={22} aria-hidden='true' />}
            modes={modes}
            activeMode={hvacMode}
            onModeChange={setMode}
            labels={{
              decrease: t('widgets.thermostat.decrease'),
              increase: t('widgets.thermostat.increase'),
              modes: t('widgets.thermostat.mode'),
            }}
          />
        </div>
      </div>
    </div>
  );
}
