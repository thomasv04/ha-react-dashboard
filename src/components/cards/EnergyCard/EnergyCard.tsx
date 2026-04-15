import { motion } from 'framer-motion';
import { Zap, Sun } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { EnergyCardConfig } from '@/types/widget-configs';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

type PackState = 'charging' | 'discharging' | 'idle';

function normalizePackState(raw: string): PackState {
  if (['charging', 'En charge', '1'].includes(raw)) return 'charging';
  if (['discharging', 'En décharge', '2'].includes(raw)) return 'discharging';
  return 'idle';
}

export function EnergyCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<EnergyCardConfig>(widgetId || 'energy');

  const batteryLevel = useSafeEntity(config?.batteryLevelEntity ?? 'sensor.battery_level');
  const packState = useSafeEntity(config?.batteryStateEntity ?? 'sensor.battery_state');
  const gridInput = useSafeEntity(config?.gridInputPowerEntity ?? 'sensor.grid_power');
  const homeOutput = useSafeEntity(config?.homeOutputPowerEntity ?? 'sensor.home_power');
  const solarProd = useSafeEntity(config?.solarProductionEntity ?? 'sensor.solar_production');

  if (!batteryLevel) return null;

  const state = normalizePackState(packState?.state ?? 'idle');

  const flowPower =
    state === 'charging'
      ? `${gridInput?.state ?? '0'} W entrant`
      : state === 'discharging'
        ? `${homeOutput?.state ?? '0'} W sortant`
        : 'Veille';

  const stateColors: Record<PackState, string> = {
    charging: 'text-green-400',
    discharging: 'text-orange-400',
    idle: 'text-zinc-400',
  };

  const stateLabels: Record<PackState, string> = {
    charging: 'En charge',
    discharging: 'En décharge',
    idle: 'Veille',
  };

  const level = Number(batteryLevel.state);
  const battColor = level > 60 ? '#22c55e' : level > 25 ? '#eab308' : '#ef4444';
  const battColorLight = level > 60 ? '#4ade80' : level > 25 ? '#fbbf24' : '#f87171';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className='gc rounded-3xl p-5 h-full flex flex-col'
    >
      <div className='text-white/50 text-xs uppercase tracking-wider mb-3 font-medium'>Énergie solaire</div>

      <div className='flex items-start justify-between gap-4 flex-1'>
        {/* Battery SVG */}
        <div className='flex flex-col gap-2 items-start'>
          <div className='flex items-center gap-3'>
            <svg viewBox='0 0 40 68' className='w-8 h-14 flex-shrink-0'>
              <defs>
                <linearGradient id='battGrad' x1='0' y1='1' x2='0' y2='0'>
                  <stop offset='0%' stopColor={battColor} />
                  <stop offset='100%' stopColor={battColorLight} />
                </linearGradient>
              </defs>
              {/* Terminal */}
              <rect x='12' y='0' width='16' height='5' rx='2' fill='white' opacity='0.25' />
              {/* Contour */}
              <rect x='2' y='5' width='36' height='60' rx='5' fill='none' stroke='white' strokeOpacity='0.15' strokeWidth='2' />
              {/* Track fantôme */}
              <rect x='5' y='8' width='30' height='54' rx='3' fill='white' opacity='0.05' />
              {/* Remplissage */}
              <motion.rect
                x='5'
                initial={{ height: 0, y: 62 }}
                animate={{ height: (level / 100) * 54, y: 8 + (1 - level / 100) * 54 }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                width='30'
                rx='3'
                fill='url(#battGrad)'
              />
              {/* Charging bolt */}
              {state === 'charging' && (
                <motion.polygon
                  points='22,20 17,35 21,35 18,48 27,31 23,31 26,20'
                  fill='white'
                  opacity='0.8'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 0.9, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              {/* Discharging down-arrow */}
              {state === 'discharging' && (
                <motion.polygon
                  points='20,48 15,38 19,38 19,24 21,24 21,38 25,38'
                  fill='white'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.3, 0.65, 0.3] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
              )}
              {/* Energy flow stripes (charge=up, discharge=down) */}
              {state !== 'idle' && (
                <>
                  <defs>
                    <pattern id='flowStripes' x='0' y='0' width='30' height='10' patternUnits='userSpaceOnUse'>
                      <rect width='30' height='5' fill='white' opacity='0.07' />
                    </pattern>
                    <clipPath id='flowClip'>
                      <rect x='5' y={8 + (1 - level / 100) * 54} width='30' height={(level / 100) * 54} rx='3' />
                    </clipPath>
                  </defs>
                  <motion.rect
                    x='5'
                    width='30'
                    height='120'
                    fill='url(#flowStripes)'
                    clipPath='url(#flowClip)'
                    animate={{ y: state === 'charging' ? [0, -10] : [0, 10] }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                </>
              )}
              {/* Shimmer sweep */}
              <defs>
                <linearGradient id='battShimmer' x1='0' y1='0' x2='0' y2='1'>
                  <stop offset='0%' stopColor='white' stopOpacity='0' />
                  <stop offset='50%' stopColor='white' stopOpacity='0.12' />
                  <stop offset='100%' stopColor='white' stopOpacity='0' />
                </linearGradient>
                <clipPath id='battClip'>
                  <rect x='5' y={8 + (1 - level / 100) * 54} width='30' height={(level / 100) * 54} rx='3' />
                </clipPath>
              </defs>
              <motion.rect
                x='5'
                width='30'
                height='12'
                rx='3'
                fill='url(#battShimmer)'
                clipPath='url(#battClip)'
                initial={{ y: 62 }}
                animate={{ y: [62, 4, 62] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', repeatDelay: 2 }}
              />
            </svg>

            <div className='flex flex-col'>
              <span className='text-3xl font-bold text-white'>
                <AnimatedNumber value={level} suffix='%' />
              </span>
              <motion.span
                key={state}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`text-xs font-medium ${stateColors[state]}`}
              >
                {stateLabels[state]}
              </motion.span>
            </div>
          </div>
        </div>

        {/* Power flow */}
        <div className='flex flex-col gap-2 items-end'>
          <motion.div
            animate={state !== 'idle' ? { scale: [1, 1.04, 1] } : undefined}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className={`inline-flex items-center gap-1.5 text-sm rounded-xl px-3 py-1.5 border transition-all ${
              state === 'charging'
                ? 'bg-green-500/10 border-green-500/20'
                : state === 'discharging'
                  ? 'bg-orange-500/10 border-orange-500/20'
                  : 'bg-white/5 border-white/10'
            }`}
          >
            <Zap size={14} className={stateColors[state]} />
            <span className={`font-semibold ${stateColors[state]}`}>{flowPower}</span>
          </motion.div>
          <div className='inline-flex items-center gap-1.5 text-sm bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-1.5'>
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}>
              <Sun size={14} className='text-green-400' />
            </motion.div>
            <span className='font-semibold text-green-400'>{solarProd?.state ?? '—'} W</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
