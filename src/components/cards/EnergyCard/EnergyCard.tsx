import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { Zap, Sun, BatteryCharging } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { EnergyCardConfig } from '@/types/widget-configs';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

type PackState = 'charging' | 'discharging' | 'idle';

function normalizePackState(raw: string): PackState {
  if (['charging', 'En charge', '1'].includes(raw)) return 'charging';
  if (['discharging', 'En décharge', '2'].includes(raw)) return 'discharging';
  return 'idle';
}

const STATE_STYLES: Record<PackState, { bg: string; border: string; text: string; dot: string }> = {
  charging: {
    bg: 'rgba(74,222,128,0.10)',
    border: 'rgba(74,222,128,0.22)',
    text: 'text-green-400',
    dot: '#4ade80',
  },
  discharging: {
    bg: 'rgba(251,146,60,0.10)',
    border: 'rgba(251,146,60,0.22)',
    text: 'text-orange-400',
    dot: '#fb923c',
  },
  idle: {
    bg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.08)',
    text: 'text-white/40',
    dot: '#ffffff44',
  },
};

export function EnergyCard() {
  const { t } = useI18n();
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

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      setCardH(entries[0].contentRect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!batteryLevel) return null;

  const state = normalizePackState(packState?.state ?? 'idle');
  const styles = STATE_STYLES[state];
  const level = Number(batteryLevel.state);
  const battColor = level > 60 ? '#4ade80' : level > 25 ? '#fbbf24' : '#f87171';
  const battColorDark = level > 60 ? '#22c55e' : level > 25 ? '#eab308' : '#ef4444';

  const flowWatts = state === 'charging' ? `${gridInput?.state ?? '0'} W` : state === 'discharging' ? `${homeOutput?.state ?? '0'} W` : '—';

  const flowLabel =
    state === 'charging' ? t('widgets.energy.flowIn') : state === 'discharging' ? t('widgets.energy.flowOut') : t('widgets.energy.standby');

  const stateLabel =
    state === 'charging'
      ? t('widgets.energy.charging')
      : state === 'discharging'
        ? t('widgets.energy.discharging')
        : t('widgets.energy.standby');

  const name = config?.name ?? t('widgets.energy.defaultName');

  // Layout modes based on available height
  const isCompact = cardH < 160; // h=1 — ultra tight, single row
  const isTight = cardH < 210; // h=2 — chips side by side

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE, delay: 0.15 }}
      className='gc rounded-3xl p-3.5 h-full flex flex-col overflow-hidden'
    >
      {/* Header */}
      <div className='flex items-center justify-between mb-2 shrink-0'>
        <span className='text-white/40 text-xs font-medium truncate'>{name}</span>
        <motion.span
          key={state}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0 ml-2 ${styles.text}`}
          style={{ background: styles.bg, borderColor: styles.border }}
        >
          {stateLabel}
        </motion.span>
      </div>

      {/* COMPACT mode (h=1): everything on one line */}
      {isCompact ? (
        <div className='flex items-center gap-2 flex-1 min-w-0'>
          <div
            className='w-8 h-8 rounded-xl flex items-center justify-center border shrink-0'
            style={{ background: styles.bg, borderColor: styles.border }}
          >
            <BatteryCharging size={16} className={styles.text} />
          </div>
          <span className='text-xl font-light text-white shrink-0'>
            <AnimatedNumber value={level} suffix='%' />
          </span>
          <div className='flex-1 h-1 rounded-full overflow-hidden mx-1' style={{ background: 'rgba(255,255,255,0.06)' }}>
            <motion.div
              className='h-full rounded-full'
              initial={{ width: 0 }}
              animate={{ width: `${level}%` }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              style={{ background: `linear-gradient(to right, ${battColorDark}, ${battColor})` }}
            />
          </div>
          <div className='flex items-center gap-1 shrink-0'>
            <Zap size={12} className={styles.text} />
            <span className={`text-xs font-semibold ${styles.text}`}>{flowWatts}</span>
          </div>
          <div className='flex items-center gap-1 shrink-0'>
            <Sun size={12} className='text-green-400' />
            <span className='text-xs font-semibold text-green-400'>{solarProd?.state ?? '—'} W</span>
          </div>
        </div>
      ) : (
        <>
          {/* Battery + level */}
          <div className='flex items-center gap-3 mb-2 shrink-0'>
            <div
              className='w-9 h-9 rounded-xl flex items-center justify-center border shrink-0'
              style={{ background: styles.bg, borderColor: styles.border }}
            >
              <BatteryCharging size={18} className={styles.text} />
            </div>
            <div className='flex-1 min-w-0'>
              <span className='text-3xl font-light tracking-tight text-white leading-none block mb-1'>
                <AnimatedNumber value={level} suffix='%' />
              </span>
              <div className='h-1.5 rounded-full overflow-hidden' style={{ background: 'rgba(255,255,255,0.06)' }}>
                <motion.div
                  className='h-full rounded-full'
                  initial={{ width: 0 }}
                  animate={{ width: `${level}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  style={{ background: `linear-gradient(to right, ${battColorDark}, ${battColor})` }}
                />
              </div>
            </div>
          </div>

          {/* Separator — hidden when tight */}
          {!isTight && <div className='h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-2 shrink-0' />}

          {/* Flow chips — row when tight, column otherwise */}
          <div className={cn('flex gap-1.5', isTight ? 'flex-row' : 'flex-col flex-1 justify-center')}>
            {/* Power flow */}
            <motion.div
              animate={state !== 'idle' ? { scale: [1, 1.02, 1] } : undefined}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className={cn('flex items-center gap-2 rounded-2xl border', isTight ? 'flex-1 px-2 py-1.5' : 'px-2.5 py-2')}
              style={{ background: styles.bg, borderColor: styles.border }}
            >
              <div
                className='w-6 h-6 rounded-lg flex items-center justify-center border shrink-0'
                style={{ background: styles.bg, borderColor: styles.border }}
              >
                <Zap size={13} className={styles.text} />
              </div>
              <div className='flex flex-col min-w-0'>
                <span className={`text-sm font-semibold ${styles.text}`}>{flowWatts}</span>
                {!isTight && <span className='text-[10px] text-white/30 leading-none'>{flowLabel}</span>}
              </div>
              {state !== 'idle' && !isTight && (
                <motion.div
                  className='ml-auto w-1.5 h-1.5 rounded-full shrink-0'
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ background: styles.dot }}
                />
              )}
            </motion.div>

            {/* Solar production */}
            <div
              className={cn('flex items-center gap-2 rounded-2xl border', isTight ? 'flex-1 px-2 py-1.5' : 'px-2.5 py-2')}
              style={{ background: 'rgba(74,222,128,0.08)', borderColor: 'rgba(74,222,128,0.18)' }}
            >
              <div
                className='w-6 h-6 rounded-lg flex items-center justify-center border shrink-0'
                style={{ background: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.22)' }}
              >
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}>
                  <Sun size={13} className='text-green-400' />
                </motion.div>
              </div>
              <div className='flex flex-col min-w-0'>
                <span className='text-sm font-semibold text-green-400'>{solarProd?.state ?? '—'} W</span>
                {!isTight && <span className='text-[10px] text-white/30 leading-none'>{t('widgets.energy.solar')}</span>}
              </div>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
