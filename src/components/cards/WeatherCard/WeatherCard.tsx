import { useRef } from 'react';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { Sun } from 'lucide-react';
import { conditionIcon, conditionLabel } from '@/lib/weather';
import { useWeather, useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useHideTitle } from '@/hooks/useHideTitle';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { WeatherCardConfig } from '@/types/widget-configs';
import type { WeatherCondition } from '@/types/widget-types';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { useI18n } from '@/i18n';
import { getWeatherLayout } from './weather-layout';

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

const CHIP =
  'inline-flex h-9 max-w-full items-center truncate whitespace-nowrap rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-3.5 text-sm font-semibold';

function WeatherCardInner({ entityId, config }: { entityId: string; config: WeatherCardConfig | null }) {
  const hideTitle = useHideTitle();
  const { t, tArray, language } = useI18n();
  const weather = useWeather(entityId as never, { type: 'daily' });

  const temp = weather.attributes.temperature as number | undefined;
  const wind = weather.attributes.wind_speed as number | undefined;
  const windUnit = (weather.attributes.wind_speed_unit as string | undefined) ?? 'km/h';
  const humidity = weather.attributes.humidity as number | undefined;
  const pressure = weather.attributes.pressure as number | undefined;
  const forecastDays = weather.forecast?.forecast ?? [];
  const days = tArray('widgets.weather.days');

  const label = conditionLabel(t, weather.state);
  const tempText = temp !== undefined ? `${temp.toLocaleString(language, { maximumFractionDigits: 1 })}°` : '—';

  const todayHigh = forecastDays[0]?.temperature;
  const todayLow = forecastDays[0]?.templow;
  const next4 = forecastDays.slice(1, 5);
  const range = todayHigh !== undefined ? t('widgets.weather.range', { high: todayHigh, low: todayLow ?? '—' }) : undefined;
  const subtitle = [label, range].filter(Boolean).join(' · ');

  // Divulgation progressive : chaque bloc n'apparaît que s'il a la place.
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);
  const { showStats, showForecast, showPressure, tempClass, iconSize } = getWeatherLayout(size, next4.length);

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

  // Deux rangées : la ville, puis l'icône et la température à gauche, la
  // condition et les extrêmes du jour à droite — la tuile météo de l'Echo Show.
  if (size.h === 'short') {
    const showSide = size.w !== 'xs' && size.w !== 'sm';
    return (
      <div
        ref={cardRef}
        className='flex h-full flex-col justify-center gap-1 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] px-[var(--ds-space-4)] text-[var(--ds-ink)]'
      >
        {!hideTitle && config?.name && <div className='truncate text-[15px] font-semibold'>{config.name}</div>}
        <div className='flex items-center gap-3'>
          <ConditionIcon condition={weather.state} size={36} customIcons={config?.customIcons} />
          <span className='shrink-0 text-5xl font-light leading-none tracking-[-2px]'>{tempText}</span>
          {showSide && (
            <div className='ml-auto min-w-0 text-right'>
              <div className='truncate text-[15px] font-semibold capitalize'>{label}</div>
              {range && <div className='truncate text-sm text-[var(--ds-ink-muted)]'>{range}</div>}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className='flex h-full flex-col gap-3 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-[var(--ds-space-4)] text-[var(--ds-ink)]'
    >
      {!hideTitle && config?.name && <div className='truncate text-[15px] font-semibold'>{config.name}</div>}
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <div className={`font-light leading-none ${tempClass}`}>{tempText}</div>
          <div className='mt-1 truncate text-sm capitalize text-[var(--ds-ink-muted)]'>{subtitle}</div>
        </div>
        <div className='shrink-0'>
          <ConditionIcon condition={weather.state} size={iconSize} customIcons={config?.customIcons} />
        </div>
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
