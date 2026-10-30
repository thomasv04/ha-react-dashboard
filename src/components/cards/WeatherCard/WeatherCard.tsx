import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { Cloud, Sun, CloudRain, CloudSnow, Cloudy, CloudDrizzle, Moon, Zap, type LucideIcon } from 'lucide-react';
import { useWeather, useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { WeatherCardConfig } from '@/types/widget-configs';
import type { WeatherCondition } from '@/types/widget-types';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { useI18n } from '@/i18n';

/** Icône et teinte d'une condition. La teinte vient des jetons : soleil chaud, pluie froide, nuages neutres. */
function conditionIcon(condition: string): { Icon: LucideIcon; color: string } {
  const c = condition.toLowerCase();
  if (c === 'clear-night') return { Icon: Moon, color: 'var(--ds-cool)' };
  if (c.includes('sunny') || c.includes('clear')) return { Icon: Sun, color: 'var(--ds-warm-light)' };
  if (c.includes('lightning') || c.includes('storm')) return { Icon: Zap, color: 'var(--ds-warm-light)' };
  if (c.includes('drizzle')) return { Icon: CloudDrizzle, color: 'var(--ds-cool)' };
  if (c.includes('rain') || c.includes('shower') || c.includes('pouring')) return { Icon: CloudRain, color: 'var(--ds-cool)' };
  if (c.includes('snow') || c.includes('hail')) return { Icon: CloudSnow, color: 'var(--ds-cool)' };
  if (c.includes('partly') || c.includes('mostly')) return { Icon: Cloudy, color: 'var(--ds-ink-muted)' };
  if (c.includes('cloud') || c.includes('overcast') || c.includes('fog') || c.includes('mist'))
    return { Icon: Cloud, color: 'var(--ds-ink-muted)' };
  return { Icon: Sun, color: 'var(--ds-warm-light)' };
}

/** L'icône d'une condition, ou celle que l'utilisateur a choisie pour elle. */
function ConditionIcon({
  condition,
  size,
  customIcons,
}: {
  condition: string;
  size: number;
  customIcons?: Partial<Record<WeatherCondition, string>>;
}) {
  const custom = customIcons?.[condition as WeatherCondition];
  if (custom && isCustomIcon(custom)) {
    return <img src={getCustomIconUrl(custom)} alt='' style={{ width: size, height: size }} className='object-contain' />;
  }
  const fallback = conditionIcon(condition);
  const Icon = (custom ? resolveIcon(custom) : undefined) ?? fallback.Icon;
  // eslint-disable-next-line react-hooks/static-components
  return <Icon size={size} aria-hidden='true' style={{ color: fallback.color }} />;
}

export function WeatherCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<WeatherCardConfig>(widgetId || 'weather');
  const entityId = config?.entityId ?? 'weather.home';

  // Booléen dérivé : sinon la card se re-rend à chaque message WebSocket.
  const exists = useHass(s => !!s.entities?.[entityId]);
  if (!exists) {
    return (
      <div className='rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)] flex h-full items-center justify-center p-4'>
        <Sun size={36} aria-hidden='true' className='text-[var(--ds-ink-muted)]' />
      </div>
    );
  }

  return <WeatherCardInner entityId={entityId} config={config ?? null} />;
}

const CHIP = 'inline-flex h-9 items-center rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-3.5 text-sm font-semibold';

function WeatherCardInner({ entityId, config }: { entityId: string; config: WeatherCardConfig | null }) {
  const { t, tArray, language } = useI18n();
  const weather = useWeather(entityId as never, { type: 'daily' });

  const temp = weather.attributes.temperature as number | undefined;
  const wind = weather.attributes.wind_speed as number | undefined;
  const windUnit = (weather.attributes.wind_speed_unit as string | undefined) ?? 'km/h';
  const humidity = weather.attributes.humidity as number | undefined;
  const pressure = weather.attributes.pressure as number | undefined;
  const forecastDays = weather.forecast?.forecast ?? [];
  const days = tArray('widgets.weather.days');
  const conditionKey = `widgets.weather.conditions.${weather.state}`;
  const label = t(conditionKey) !== conditionKey ? t(conditionKey) : weather.state.replace(/_/g, ' ');
  const tempText = temp !== undefined ? `${temp.toLocaleString(language, { maximumFractionDigits: 1 })}°` : '—';

  const todayHigh = forecastDays[0]?.temperature;
  const todayLow = forecastDays[0]?.templow;
  const next4 = forecastDays.slice(1, 5);
  const range = todayHigh !== undefined ? t('widgets.weather.range', { high: todayHigh, low: todayLow ?? '—' }) : undefined;
  const subtitle = [label, range].filter(Boolean).join(' · ');

  // Divulgation progressive : chaque bloc n'apparaît que s'il a la place.
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);
  const showStats = size.h !== 'squat' && size.h !== 'short';
  const showForecast = (size.h === 'normal' || size.h === 'tall') && next4.length > 0;
  const showPressure = size.w !== 'xs' && size.w !== 'sm';

  // Une seule rangée : tout tient sur une ligne.
  if (size.squat) {
    return (
      <div
        ref={cardRef}
        className='flex h-full items-center gap-3 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] px-4 text-[var(--ds-ink)]'
      >
        <ConditionIcon condition={weather.state} size={28} customIcons={config?.customIcons} />
        <div className='min-w-0 flex-1'>
          <div className='truncate text-[17px] font-semibold capitalize leading-tight'>{label}</div>
          {range && <div className='truncate text-sm text-[var(--ds-ink-muted)]'>{range}</div>}
        </div>
        <span className='shrink-0 text-3xl font-light'>{tempText}</span>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className='flex h-full flex-col gap-3 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-[var(--ds-space-4)] text-[var(--ds-ink)]'
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className={cn('font-light leading-none tracking-[-2px]', size.h === 'short' ? 'text-5xl' : 'text-[72px]')}>{tempText}</div>
          <div className='mt-1 truncate text-sm capitalize text-[var(--ds-ink-muted)]'>{subtitle}</div>
        </div>
        <ConditionIcon condition={weather.state} size={size.h === 'short' ? 40 : 56} customIcons={config?.customIcons} />
      </div>

      {showStats && (
        <div className='flex shrink-0 flex-wrap gap-2'>
          {wind !== undefined && (
            <span className={CHIP}>
              {t('widgets.weather.wind')} {wind} {windUnit}
            </span>
          )}
          {humidity !== undefined && (
            <span className={CHIP}>
              {t('widgets.weather.humidity')} {humidity} %
            </span>
          )}
          {pressure !== undefined && showPressure && <span className={CHIP}>{pressure} hPa</span>}
        </div>
      )}

      {/* Prévisions : une colonne par jour, la journée et ses deux températures. */}
      {showForecast && (
        <div className='grid min-h-0 flex-1 grid-cols-4 gap-2'>
          {next4.map(day => (
            <div
              key={day.datetime}
              className='flex min-w-0 flex-col items-center justify-center gap-1 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-3)] px-1 py-2'
            >
              <span className='text-sm font-semibold capitalize text-[var(--ds-ink-muted)]'>{days[new Date(day.datetime).getDay()]}</span>
              <ConditionIcon condition={day.condition ?? ''} size={24} customIcons={config?.customIcons} />
              <span className='font-bold leading-none'>{day.temperature}°</span>
              {day.templow !== undefined && <span className='text-sm leading-none text-[var(--ds-ink-muted)]'>{day.templow}°</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
