import { motion } from 'framer-motion';
import { Wind, Cloud, Sun, CloudRain, CloudSnow, Cloudy, CloudDrizzle } from 'lucide-react';
import { useWeather, useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { WeatherCardConfig } from '@/types/widget-configs';
import type { WeatherCondition } from '@/types/widget-types';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { useI18n } from '@/i18n';

function WeatherIcon({
  condition,
  size = 32,
  customIcons,
}: {
  condition: string;
  size?: number;
  customIcons?: Partial<Record<WeatherCondition, string>>;
}) {
  // Check for custom icon override
  const customValue = customIcons?.[condition as WeatherCondition];
  if (customValue) {
    if (isCustomIcon(customValue)) {
      return <img src={getCustomIconUrl(customValue)} alt={condition} style={{ width: size, height: size }} className='object-contain' />;
    }
    const CustomLucide = resolveIcon(customValue);
    // eslint-disable-next-line react-hooks/static-components
    if (CustomLucide) return <CustomLucide size={size} className='text-white/80' />;
  }

  // Default icons
  const cn = condition.toLowerCase();
  if (cn.includes('sunny') || cn.includes('clear')) return <Sun size={size} className='text-yellow-300' />;
  if (cn.includes('drizzle')) return <CloudDrizzle size={size} className='text-blue-300' />;
  if (cn.includes('rain') || cn.includes('shower') || cn.includes('storm')) return <CloudRain size={size} className='text-blue-400' />;
  if (cn.includes('snow') || cn.includes('hail')) return <CloudSnow size={size} className='text-blue-200' />;
  if (cn.includes('mostly') || cn.includes('partly')) return <Cloudy size={size} className='text-slate-300' />;
  if (cn.includes('cloud') || cn.includes('overcast') || cn.includes('fog') || cn.includes('mist'))
    return <Cloud size={size} className='text-slate-400' />;
  return <Sun size={size} className='text-yellow-300' />;
}

export function WeatherCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<WeatherCardConfig>(widgetId || 'weather');
  const entityId = config?.entityId ?? 'weather.home';

  const entities = useHass(s => s.entities);
  if (!entities?.[entityId]) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className='gc rounded-3xl p-5 flex flex-col gap-4 h-full items-center justify-center'
      >
        <Sun size={36} className='text-yellow-300/30' />
      </motion.div>
    );
  }

  return <WeatherCardInner entityId={entityId} config={config ?? null} />;
}

function WeatherCardInner({ entityId, config }: { entityId: string; config: WeatherCardConfig | null }) {
  const { t, tArray } = useI18n();
  const weather = useWeather(entityId as never, { type: 'daily' });

  const temp = weather.attributes.temperature as number | undefined;
  const wind = weather.attributes.wind_speed as number | undefined;
  const windUnit = (weather.attributes.wind_speed_unit as string | undefined) ?? 'km/h';
  const forecastDays = weather.forecast?.forecast ?? [];
  const days = tArray('widgets.weather.days');
  const conditionKey = `widgets.weather.conditions.${weather.state}`;
  const label = t(conditionKey) !== conditionKey ? t(conditionKey) : weather.state.replace(/_/g, ' ');

  const todayHigh = forecastDays[0]?.temperature;
  const todayLow = forecastDays[0]?.templow;
  const next4 = forecastDays.slice(1, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className='gc rounded-3xl p-5 flex flex-col gap-4 h-full'
    >
      {/* Main row */}
      <div className='flex items-start justify-between'>
        <div>
          <div className='text-5xl font-light tracking-tight text-white'>
            {temp !== undefined ? <AnimatedNumber value={temp} decimals={1} suffix='°' /> : '—'}
          </div>
          <div className='text-white/70 text-base mt-1 capitalize font-medium'>{label}.</div>
          {(todayHigh !== undefined || todayLow !== undefined) && (
            <div className='text-white/40 text-xs mt-1'>
              {todayHigh !== undefined && (
                <span>
                  {t('widgets.weather.max')} {todayHigh}°{' '}
                </span>
              )}
              {todayLow !== undefined && (
                <span>
                  {t('widgets.weather.min')} {todayLow}°
                </span>
              )}
            </div>
          )}
        </div>
        <motion.div
          key={weather.state}
          initial={{ scale: 0.8, opacity: 0, rotate: -20 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className='w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center'
        >
          <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            <WeatherIcon condition={weather.state} size={32} customIcons={config?.customIcons} />
          </motion.div>
        </motion.div>
      </div>

      {/* Wind */}
      {wind !== undefined && (
        <motion.div
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className='inline-flex items-center gap-1.5 text-xs text-white/40 bg-white/5 rounded-full px-3 py-1 w-fit'
        >
          <motion.div animate={{ rotate: [0, 15, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
            <Wind size={12} />
          </motion.div>
          <span>
            {wind} {windUnit}
          </span>
        </motion.div>
      )}

      {/* 4-day forecast */}
      {next4.length > 0 && (
        <>
          <div className='h-px bg-gradient-to-r from-transparent via-white/15 to-transparent' />
          <div className='flex gap-1 overflow-x-auto scrollbar-none' style={{ scrollbarWidth: 'none' }}>
            {next4.map((day, i) => {
              const d = new Date(day.datetime);
              const dayName = days[d.getDay()];
              return (
                <motion.div
                  key={day.datetime}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + i * 0.06 }}
                  className='flex flex-col items-center gap-1.5 py-1.5 flex-1 min-w-[52px]'
                >
                  <span className='text-[11px] text-white/40 uppercase tracking-wider font-medium'>{dayName}</span>
                  <motion.div
                    whileHover={{ scale: 1.15, backgroundColor: 'rgba(255,255,255,0.1)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className='w-8 h-8 rounded-full bg-white/5 flex items-center justify-center'
                  >
                    <WeatherIcon condition={day.condition ?? ''} size={16} customIcons={config?.customIcons} />
                  </motion.div>
                  <span className='text-[11px] text-white/70 font-semibold'>{day.temperature}°</span>
                  {day.templow !== undefined && <span className='text-[10px] text-white/30'>{day.templow}°</span>}
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
