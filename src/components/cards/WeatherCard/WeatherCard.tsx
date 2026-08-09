import { useRef } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE, DURATION_MEDIUM } from '@/lib/motion-tokens';
import { cn } from '@/lib/utils';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { Wind, Droplets, Gauge, Snowflake, Cloud, Sun, CloudRain, CloudSnow, Cloudy, CloudDrizzle, Zap } from 'lucide-react';
import { useWeather, useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { WeatherCardConfig } from '@/types/widget-configs';
import type { WeatherCondition } from '@/types/widget-types';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import { useI18n } from '@/i18n';
import WeatherEffects from '@/components/effects/WeatherEffects';

type IconColor = { icon: React.ReactNode; bg: string; border: string };

function getConditionStyle(condition: string, size = 32, customIcons?: Partial<Record<WeatherCondition, string>>): IconColor {
  const customValue = customIcons?.[condition as WeatherCondition];
  if (customValue) {
    let iconNode: React.ReactNode;
    if (isCustomIcon(customValue)) {
      iconNode = (
        <img src={getCustomIconUrl(customValue)} alt={condition} style={{ width: size, height: size }} className='object-contain' />
      );
    } else {
      const CustomLucide = resolveIcon(customValue);
      // eslint-disable-next-line react-hooks/static-components
      iconNode = CustomLucide ? <CustomLucide size={size} className='text-white/80' /> : <Sun size={size} className='text-yellow-300' />;
    }
    return { icon: iconNode, bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.10)' };
  }

  const cn = condition.toLowerCase();
  if (cn.includes('sunny') || cn === 'clear-night' || cn.includes('clear'))
    return { icon: <Sun size={size} className='text-yellow-300' />, bg: 'rgba(253,224,71,0.10)', border: 'rgba(253,224,71,0.20)' };
  if (cn.includes('lightning') || cn.includes('storm'))
    return { icon: <Zap size={size} className='text-yellow-400' />, bg: 'rgba(250,204,21,0.10)', border: 'rgba(250,204,21,0.20)' };
  if (cn.includes('drizzle'))
    return { icon: <CloudDrizzle size={size} className='text-sky-300' />, bg: 'rgba(125,211,252,0.10)', border: 'rgba(125,211,252,0.20)' };
  if (cn.includes('rain') || cn.includes('shower') || cn.includes('pouring'))
    return { icon: <CloudRain size={size} className='text-blue-400' />, bg: 'rgba(96,165,250,0.10)', border: 'rgba(96,165,250,0.20)' };
  if (cn.includes('snow') || cn.includes('hail') || cn.includes('snowy'))
    return { icon: <CloudSnow size={size} className='text-blue-200' />, bg: 'rgba(191,219,254,0.10)', border: 'rgba(191,219,254,0.18)' };
  if (cn.includes('partly') || cn.includes('mostly'))
    return { icon: <Cloudy size={size} className='text-slate-300' />, bg: 'rgba(203,213,225,0.08)', border: 'rgba(203,213,225,0.15)' };
  if (cn.includes('cloud') || cn.includes('overcast') || cn.includes('fog') || cn.includes('mist'))
    return { icon: <Cloud size={size} className='text-slate-400' />, bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.14)' };
  return { icon: <Sun size={size} className='text-yellow-300' />, bg: 'rgba(253,224,71,0.10)', border: 'rgba(253,224,71,0.20)' };
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION_ENTRANCE, delay: 0.1 }}
        className='gc rounded-3xl p-4 flex flex-col gap-4 h-full items-center justify-center'
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
  const humidity = weather.attributes.humidity as number | undefined;
  const pressure = weather.attributes.pressure as number | undefined;
  const forecastDays = weather.forecast?.forecast ?? [];
  const days = tArray('widgets.weather.days');
  const conditionKey = `widgets.weather.conditions.${weather.state}`;
  const label = t(conditionKey) !== conditionKey ? t(conditionKey) : weather.state.replace(/_/g, ' ');

  const todayHigh = forecastDays[0]?.temperature;
  const todayLow = forecastDays[0]?.templow;
  const next4 = forecastDays.slice(1, 5);

  // Divulgation progressive : la card empilait en-tête + température + chiffres
  // + prévisions quelle que soit sa hauteur, et débordait de ~80 px dès qu'elle
  // ne faisait que deux rangées. Chaque bloc n'apparaît que s'il a la place.
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);
  const mainStyle = getConditionStyle(weather.state, size.squat ? 22 : 36, config?.customIcons);
  const showStats = size.h !== 'squat';
  const showForecast = size.h === 'normal' || size.h === 'tall';
  const showPressure = size.w !== 'xs' && size.w !== 'sm';

  // Une seule rangée : tout tient sur une ligne, sinon rien n'est lisible.
  if (size.squat) {
    return (
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION_ENTRANCE, delay: 0.1 }}
        className='gc rounded-3xl px-3.5 py-2 flex items-center gap-3 h-full relative overflow-hidden'
      >
        <div
          className='w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0'
          style={{ background: mainStyle.bg, borderColor: mainStyle.border }}
        >
          {mainStyle.icon}
        </div>
        <div className='flex-1 min-w-0'>
          <div className='text-white/40 text-[11px] font-medium capitalize truncate leading-tight'>{label}</div>
          {todayHigh !== undefined && (
            <div className='text-white/50 text-[11px] font-medium leading-tight'>
              ↑{todayHigh}° ↓{todayLow ?? '—'}°
            </div>
          )}
        </div>
        <div className='text-2xl font-light tracking-tight text-white leading-none shrink-0'>
          {temp !== undefined ? <AnimatedNumber value={temp} decimals={1} suffix='°' /> : '—'}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE, delay: 0.1 }}
      className={cn('gc rounded-3xl flex flex-col h-full relative overflow-hidden', size.h === 'short' ? 'p-2.5' : 'p-3.5')}
    >
      <WeatherEffects condition={weather.state} />

      {/* Header: condition label */}
      <div className='flex items-center justify-between mb-2 shrink-0'>
        <span className='text-white/40 text-xs font-medium capitalize truncate'>{label}</span>
        <div className='flex items-center gap-1.5'>
          {todayHigh !== undefined && (
            <span className='text-[10px] text-white/50 font-medium shrink-0'>
              ↑{todayHigh}° ↓{todayLow ?? '—'}°
            </span>
          )}
        </div>
      </div>

      {/* Main section: temp + icon */}
      <div className='flex items-center justify-between mb-2 shrink-0'>
        <div className='flex flex-col'>
          <div className={cn('font-light tracking-tight text-white leading-none', size.h === 'short' ? 'text-4xl' : 'text-5xl')}>
            {temp !== undefined ? <AnimatedNumber value={temp} decimals={1} suffix='°' /> : '—'}
          </div>
        </div>

        <motion.div
          key={weather.state}
          initial={{ scale: 0.8, opacity: 0, rotate: -15 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
          className={cn('rounded-2xl flex items-center justify-center border shrink-0', size.h === 'short' ? 'w-12 h-12' : 'w-16 h-16')}
          style={{ background: mainStyle.bg, borderColor: mainStyle.border }}
        >
          <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
            {mainStyle.icon}
          </motion.div>
        </motion.div>
      </div>

      {/* Stats row */}
      {showStats && (
        <div className='flex flex-wrap gap-1.5 mb-2 shrink-0'>
          {wind !== undefined && (
            <div className='flex items-center gap-1 px-2 py-1 rounded-xl bg-white/5 border border-white/8'>
              <Wind size={11} className='text-white/40' />
              <span className='text-[11px] text-white/50 font-medium'>
                {wind} {windUnit}
              </span>
            </div>
          )}
          {humidity !== undefined && (
            <div className='flex items-center gap-1 px-2 py-1 rounded-xl bg-white/5 border border-white/8'>
              <Droplets size={11} className='text-sky-400/60' />
              <span className='text-[11px] text-white/50 font-medium'>{humidity}%</span>
            </div>
          )}
          {pressure !== undefined && showPressure && (
            <div className='flex items-center gap-1 px-2 py-1 rounded-xl bg-white/5 border border-white/8'>
              <Gauge size={11} className='text-white/40' />
              <span className='text-[11px] text-white/50 font-medium'>{pressure} hPa</span>
            </div>
          )}
        </div>
      )}

      {/* Prévisions — version dense sur deux rangées (l'icône de condition
          n'entre pas), version complète dès trois rangées. */}
      {next4.length > 0 && (
        <>
          <div className='h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2 shrink-0' />
          <div className='flex gap-1 flex-1 min-h-0'>
            {next4.map((day, i) => {
              const d = new Date(day.datetime);
              const dayName = days[d.getDay()];
              const dayStyle = getConditionStyle(day.condition ?? '', showForecast ? 14 : 12, config?.customIcons);
              return (
                <motion.div
                  key={day.datetime}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: DURATION_MEDIUM, delay: 0.1 + i * 0.06 }}
                  className={cn(
                    'flex flex-1 min-w-0 rounded-2xl bg-white/3 border border-white/6 overflow-hidden',
                    // Sur deux rangées la tuile ne fait que ~31 px de haut : un
                    // empilement jour/icône/température en demande ~37 et se
                    // faisait rogner. En ligne, tout tient largement.
                    showForecast
                      ? 'flex-col items-center justify-center gap-1 py-1.5 px-1'
                      : 'flex-row items-center justify-center gap-1 px-1.5 py-0.5'
                  )}
                >
                  <span className='text-[10px] text-white/35 uppercase tracking-wider font-medium shrink-0'>{dayName}</span>
                  {showForecast ? (
                    <div
                      className='w-7 h-7 rounded-xl flex items-center justify-center border'
                      style={{ background: dayStyle.bg, borderColor: dayStyle.border }}
                    >
                      {dayStyle.icon}
                    </div>
                  ) : (
                    <div className='flex items-center justify-center shrink-0'>{dayStyle.icon}</div>
                  )}
                  <span className='text-[11px] text-white/70 font-semibold leading-none shrink-0'>{day.temperature}°</span>
                  {day.templow !== undefined && showForecast && (
                    <span className='text-[10px] text-white/30 leading-none'>{day.templow}°</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      {/* Snowflake accent for cold conditions */}
      {(weather.state.includes('snowy') || weather.state.includes('hail')) && (
        <motion.div
          animate={{ opacity: [0.04, 0.09, 0.04], rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className='absolute -bottom-8 -right-8 pointer-events-none'
        >
          <Snowflake size={96} className='text-blue-200' />
        </motion.div>
      )}
    </motion.div>
  );
}
