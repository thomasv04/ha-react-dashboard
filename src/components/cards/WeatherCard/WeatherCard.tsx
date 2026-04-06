import { motion } from 'framer-motion';
import { Wind, Cloud, Sun, CloudRain, CloudSnow, Cloudy, CloudDrizzle } from 'lucide-react';
import { useWeather } from '@hakit/core';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { WeatherCardConfig } from '@/types/widget-configs';

function WeatherIcon({ condition, size = 32 }: { condition: string; size?: number }) {
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

const DAYS_FR = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];

const CONDITION_FR: Record<string, string> = {
  'clear-night': 'Nuit claire',
  cloudy: 'Nuageux',
  exceptional: 'Conditions exceptionnelles',
  fog: 'Brouillard',
  hail: 'Grêle',
  lightning: 'Orage',
  'lightning-rainy': 'Orage pluvieux',
  partlycloudy: 'Partiellement nuageux',
  pouring: 'Forte pluie',
  rainy: 'Pluvieux',
  snowy: 'Enneigé',
  'snowy-rainy': 'Neige et pluie',
  sunny: 'Ensoleillé',
  windy: 'Venteux',
  'windy-variant': 'Très venteux',
};

export function WeatherCard() {
  const { getWidgetConfig } = useDashboardLayout();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<WeatherCardConfig>(widgetId || 'weather');
  const entityId = config?.entityId ?? 'weather.menneville';

  const weather = useWeather(entityId as 'weather.menneville', { type: 'daily' });

  const temp = weather.attributes.temperature as number | undefined;
  const wind = weather.attributes.wind_speed as number | undefined;
  const windUnit = (weather.attributes.wind_speed_unit as string | undefined) ?? 'km/h';
  const forecastDays = weather.forecast?.forecast ?? [];
  const label = CONDITION_FR[weather.state] ?? weather.state.replace(/_/g, ' ');

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
          <div className='text-5xl font-light text-white tracking-tight'>{temp !== undefined ? `${temp}°` : '—'}</div>
          <div className='text-white/70 text-base mt-1 capitalize font-medium'>{label}.</div>
          {(todayHigh !== undefined || todayLow !== undefined) && (
            <div className='text-white/40 text-xs mt-1'>
              {todayHigh !== undefined && <span>MAX {todayHigh}° </span>}
              {todayLow !== undefined && <span>MIN {todayLow}°</span>}
            </div>
          )}
        </div>
        <WeatherIcon condition={weather.state} size={44} />
      </div>

      {/* Wind */}
      {wind !== undefined && (
        <div className='flex items-center gap-1.5 text-xs text-white/40'>
          <Wind size={12} />
          <span>
            {wind} {windUnit}
          </span>
        </div>
      )}

      {/* 4-day forecast */}
      {next4.length > 0 && (
        <>
          <div className='h-px bg-white/6' />
          <div className='grid grid-cols-4 gap-1'>
            {next4.map(day => {
              const d = new Date(day.datetime);
              const dayName = DAYS_FR[d.getDay()];
              return (
                <div key={day.datetime} className='flex flex-col items-center gap-1.5 py-1'>
                  <span className='text-[11px] text-white/40 capitalize'>{dayName}</span>
                  <WeatherIcon condition={day.condition ?? ''} size={16} />
                  <span className='text-[11px] text-white/70 font-medium'>{day.temperature}°</span>
                  {day.templow !== undefined && <span className='text-[10px] text-white/30'>{day.templow}°</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </motion.div>
  );
}
