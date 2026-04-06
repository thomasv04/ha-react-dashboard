import { motion } from 'framer-motion';
import { BatteryChargingIcon, BatteryIcon, Zap, Sun } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { EnergyCardConfig } from '@/types/widget-configs';

type PackState = 'charging' | 'discharging' | 'idle';

function normalizePackState(raw: string): PackState {
  if (['charging', 'En charge', '1'].includes(raw)) return 'charging';
  if (['discharging', 'En décharge', '2'].includes(raw)) return 'discharging';
  return 'idle';
}

export function EnergyCard() {
  const { getWidgetConfig } = useDashboardLayout();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<EnergyCardConfig>(widgetId || 'energy');

  const batteryLevel = useSafeEntity(config?.batteryLevelEntity ?? 'sensor.solarflow_2400_ac_electric_level');
  const packState = useSafeEntity(config?.batteryStateEntity ?? 'sensor.solarflow_2400_ac_pack_state');
  const gridInput = useSafeEntity(config?.gridInputPowerEntity ?? 'sensor.solarflow_2400_ac_grid_input_power');
  const homeOutput = useSafeEntity(config?.homeOutputPowerEntity ?? 'sensor.solarflow_2400_ac_output_home_power');
  const solarProd = useSafeEntity(config?.solarProductionEntity ?? 'sensor.din_panneaux_solaire_puissance');

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className='gc rounded-3xl p-5 h-full'
    >
      <div className='text-white/50 text-xs uppercase tracking-wider mb-3 font-medium'>Énergie solaire</div>

      <div className='flex items-start justify-between gap-4'>
        {/* Battery */}
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-2'>
            {state === 'charging' ? (
              <BatteryChargingIcon size={20} className='text-green-400' />
            ) : (
              <BatteryIcon size={20} className={stateColors[state]} />
            )}
            <span className='text-2xl font-bold text-white'>{level}%</span>
          </div>
          {/* Battery bar */}
          <div className='w-32 h-2 bg-white/8 rounded-full overflow-hidden'>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${level}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className={`h-full rounded-full ${level > 60 ? 'bg-green-500' : level > 25 ? 'bg-yellow-500' : 'bg-red-500'}`}
            />
          </div>
          <span className={`text-xs font-medium ${stateColors[state]}`}>{stateLabels[state]}</span>
        </div>

        {/* Power flow */}
        <div className='flex flex-col gap-2 items-end'>
          <div className='flex items-center gap-1.5 text-sm text-white/70'>
            <Zap size={14} className={stateColors[state]} />
            <span className={`font-semibold ${stateColors[state]}`}>{flowPower}</span>
          </div>
          <div className='flex items-center gap-1.5 text-sm text-white/70'>
            <Sun size={14} className='text-green-400' />
            <span className='font-semibold text-green-400'>{solarProd?.state ?? '—'} W</span>
            <span className='text-xs text-white/40'>production</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
