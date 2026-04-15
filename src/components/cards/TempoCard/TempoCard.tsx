import { motion } from 'framer-motion';
import { Zap, Calendar } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { TempoCardConfig } from '@/types/widget-configs';
import { AnimatedNumber } from '@/components/ui/AnimatedNumber';

type TempoColor = 'Bleu' | 'Blanc' | 'Rouge' | string;

function colorClass(color: TempoColor) {
  if (color === 'Rouge') return 'text-red-400 bg-gradient-to-br from-red-500/10 to-red-500/20 border border-red-500/20';
  if (color === 'Blanc') return 'text-white bg-gradient-to-br from-white/5 to-white/15 border border-white/20';
  return 'text-blue-400 bg-gradient-to-br from-blue-500/10 to-blue-500/20 border border-blue-500/20';
}

function dotColor(color: TempoColor) {
  if (color === 'Rouge') return 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.5)]';
  if (color === 'Blanc') return 'bg-white shadow-[0_0_6px_rgba(255,255,255,0.4)]';
  return 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.5)]';
}

export function TempoCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<TempoCardConfig>(widgetId || 'tempo');

  const current = useSafeEntity(config?.currentColorEntity ?? 'sensor.tempo_current_color');
  const next = useSafeEntity(config?.nextColorEntity ?? 'sensor.tempo_next_color');
  const hc = useSafeEntity(config?.offPeakEntity ?? 'binary_sensor.tempo_off_peak');
  const blue = useSafeEntity(config?.remainingBlueEntity ?? 'sensor.tempo_remaining_blue');
  const white = useSafeEntity(config?.remainingWhiteEntity ?? 'sensor.tempo_remaining_white');
  const red = useSafeEntity(config?.remainingRedEntity ?? 'sensor.tempo_remaining_red');

  if (!current) return null;

  const isHC = hc?.state === 'on';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className='gc rounded-3xl p-5 h-full'
    >
      <div className='text-white/50 text-xs uppercase tracking-wider mb-3 font-medium'>Tempo EDF</div>

      <div className='flex items-start gap-3 mb-4'>
        {/* Current period */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 flex-1 transition-all duration-200', colorClass(current.state))}
        >
          <div className='w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0'>
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Zap size={16} />
            </motion.div>
          </div>
          <div>
            <div className='font-bold text-sm'>{isHC ? 'Heures creuses' : 'Heures pleines'}</div>
            <div className='text-xs opacity-60'>Tarif {current.state}</div>
          </div>
        </motion.div>

        {/* Tomorrow */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className={cn('flex items-center gap-3 rounded-2xl px-4 py-3 flex-1 transition-all duration-200', colorClass(next?.state ?? ''))}
        >
          <div className='w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0'>
            <Calendar size={16} />
          </div>
          <div>
            <div className='font-bold text-sm'>Demain</div>
            <div className='text-xs opacity-60'>{next?.state ?? '—'}</div>
          </div>
        </motion.div>
      </div>

      {/* Separator */}
      <div className='h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3' />

      {/* Remaining days */}
      <div className='flex gap-3'>
        {[
          { label: 'Bleu', state: blue?.state ?? '?', color: 'text-blue-400' },
          { label: 'Blanc', state: white?.state ?? '?', color: 'text-white/80' },
          ...(Number(red?.state ?? 0) > 0 ? [{ label: 'Rouge', state: red?.state ?? '0', color: 'text-red-400' }] : []),
        ].map(({ label, state, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 + i * 0.08 }}
            className='flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-full px-3 py-1.5 text-xs'
          >
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className={cn('w-2.5 h-2.5 rounded-full inline-block', dotColor(label))}
            />
            <span className='text-white/50'>{label}</span>
            <span className={cn('font-bold', color)}>
              {!isNaN(Number(state)) ? <AnimatedNumber value={Number(state)} suffix='j' /> : `${state}j`}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
