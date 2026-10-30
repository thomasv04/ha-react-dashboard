import { useRef, useState } from 'react';
import { useElementBox } from '@/hooks/useWidgetSize';
import { normalizePackState } from '@/lib/battery-state';
import { BatteryCharging, House, Sun, Zap } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { EnergyCardConfig } from '@/types/widget-configs';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

/** Puissance lisible : « 320 W », « 2,4 kW ». `null` si le capteur n'a pas de valeur. */
function formatPower(raw: string | undefined, locale: string): { value: string; unit: string } | null {
  const watts = Number(raw);
  if (raw == null || raw === '' || !Number.isFinite(watts)) return null;
  return Math.abs(watts) >= 1000
    ? { value: (watts / 1000).toLocaleString(locale, { maximumFractionDigits: 1 }), unit: 'kW' }
    : { value: Math.round(watts).toLocaleString(locale), unit: 'W' };
}

const asText = (p: { value: string; unit: string } | null) => (p ? `${p.value} ${p.unit}` : '—');

/**
 * Énergie solaire : la production en grand, puis trois pilules — la maison, la
 * batterie (remplie à son niveau) et le réseau.
 */
export function EnergyCard() {
  const { t, language } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<EnergyCardConfig>(widgetId || 'energy');

  const batteryLevel = useSafeEntity(config?.batteryLevelEntity ?? 'sensor.battery_level');
  const packState = useSafeEntity(config?.batteryStateEntity ?? 'sensor.battery_state');
  const gridInput = useSafeEntity(config?.gridInputPowerEntity ?? 'sensor.grid_power');
  const homeOutput = useSafeEntity(config?.homeOutputPowerEntity ?? 'sensor.home_power');
  const solarProd = useSafeEntity(config?.solarProductionEntity ?? 'sensor.solar_production');

  const cardRef = useRef<HTMLDivElement>(null);
  const [cardH, setCardH] = useState(999);
  // Mesure en boîte de bordure : les seuils sont exprimés en rangées de grille
  // (80 / 176 / 272 px).
  useElementBox(cardRef, (_w, height) => setCardH(height));

  if (!batteryLevel) return null;

  const state = normalizePackState(packState?.state ?? 'idle');
  const level = Math.min(100, Math.max(0, Number(batteryLevel.state) || 0));
  const solar = formatPower(solarProd?.state, language);
  const home = formatPower(homeOutput?.state, language);
  const grid = formatPower(gridInput?.state, language);

  const stateLabel =
    state === 'charging'
      ? t('widgets.energy.charging')
      : state === 'discharging'
        ? t('widgets.energy.discharging')
        : t('widgets.energy.standby');
  const name = config?.name ?? t('widgets.energy.defaultName');

  const isRow = cardH < 120; // 1 rangée : tout sur une ligne
  const isTight = cardH < 220; // 2 rangées : pas de grand chiffre

  // La batterie se lit à sa couleur : verte chargée, orange à mi-course, rouge presque vide.
  const batteryFill = level > 60 ? 'var(--ds-good)' : level > 25 ? 'var(--ds-heat)' : 'var(--ds-alert)';

  const pills = (
    <div className={cn('grid shrink-0 gap-2.5', isRow ? 'flex-1 grid-cols-3' : 'grid-cols-3')}>
      <Pill icon={House} label={t('widgets.energy.home')} value={asText(home)} fill='var(--ds-tile-on)' ratio={1} />
      <Pill
        icon={BatteryCharging}
        label={t('widgets.energy.battery')}
        value={`${Math.round(level)} %`}
        fill={batteryFill}
        ratio={level / 100}
      />
      <Pill icon={Zap} label={t('widgets.energy.grid')} value={asText(grid)} fill='var(--ds-surface-3)' ratio={1} />
    </div>
  );

  return (
    <div
      ref={cardRef}
      className={cn(
        'flex h-full select-none overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)]',
        isRow ? 'items-center gap-4 px-4' : 'flex-col gap-3 p-[var(--ds-space-4)]'
      )}
    >
      <div className={cn('flex min-w-0 items-start justify-between gap-3', isRow && 'shrink-0')}>
        <div className='min-w-0'>
          <div className='truncate text-[17px] font-semibold leading-tight'>{name}</div>
          <div className='truncate text-sm text-[var(--ds-ink-muted)]'>
            {isRow ? `${t('widgets.energy.solar')} ${asText(solar)}` : stateLabel}
          </div>
        </div>
        {!isRow && (
          <span
            className={cn(
              'shrink-0 rounded-[var(--ds-radius-pill)] px-3 py-1 text-sm font-bold',
              state === 'charging' ? 'bg-[var(--ds-good)] text-[var(--ds-good-ink)]' : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]'
            )}
          >
            {stateLabel}
          </span>
        )}
      </div>

      {!isRow && !isTight && (
        <div className='flex min-h-0 flex-1 items-center gap-3'>
          <Sun size={34} aria-hidden='true' className='shrink-0 text-[var(--ds-warm-light)]' />
          <div className='min-w-0'>
            <div className='flex items-baseline gap-2'>
              <span className='text-[64px] font-light leading-none tracking-[-2px]'>{solar?.value ?? '—'}</span>
              {solar && <span className='text-2xl text-[var(--ds-ink-muted)]'>{solar.unit}</span>}
            </div>
            <div className='truncate text-sm text-[var(--ds-ink-muted)]'>{t('widgets.energy.producing')}</div>
          </div>
        </div>
      )}

      {pills}
    </div>
  );
}

/** Pilule d'énergie : icône et valeur, remplie à `ratio` (la batterie à son niveau). */
function Pill({ icon: Icon, label, value, fill, ratio }: { icon: typeof Sun; label: string; value: string; fill: string; ratio: number }) {
  return (
    <div
      role='img'
      aria-label={`${label} ${value}`}
      className='relative flex h-14 min-w-0 items-center overflow-hidden rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)]'
    >
      <div
        aria-hidden='true'
        className='absolute inset-y-0 left-0 rounded-[var(--ds-radius-pill)]'
        style={{ width: `${Math.round(ratio * 100)}%`, background: fill }}
      />
      <span className='relative flex min-w-0 items-center gap-1.5 px-3 text-sm font-semibold'>
        <Icon size={16} aria-hidden='true' className='shrink-0' />
        <span className='truncate'>{value}</span>
      </span>
    </div>
  );
}
