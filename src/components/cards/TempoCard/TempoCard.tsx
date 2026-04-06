import { motion } from 'framer-motion';
import { Zap, Calendar } from 'lucide-react';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { TempoCardConfig } from '@/types/widget-configs';

type TempoColor = 'Bleu' | 'Blanc' | 'Rouge' | string;

function colorClass(color: TempoColor) {
  if (color === 'Rouge') return 'text-red-400 bg-red-500/15';
  if (color === 'Blanc') return 'text-white bg-white/15';
  return 'text-blue-400 bg-blue-500/15';
}

function dotColor(color: TempoColor) {
  if (color === 'Rouge') return 'bg-red-500';
  if (color === 'Blanc') return 'bg-white';
  return 'bg-blue-500';
}

export function TempoCard() {
  const { getWidgetConfig } = useDashboardLayout();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<TempoCardConfig>(widgetId || 'tempo');

  const current = useSafeEntity(config?.currentColorEntity ?? 'sensor.rte_tempo_couleur_actuelle');
  const next = useSafeEntity(config?.nextColorEntity ?? 'sensor.rte_tempo_prochaine_couleur');
  const hc = useSafeEntity(config?.offPeakEntity ?? 'binary_sensor.rte_tempo_heures_creuses');
  const blue = useSafeEntity(config?.remainingBlueEntity ?? 'sensor.rte_tempo_cycle_jours_restants_bleu');
  const white = useSafeEntity(config?.remainingWhiteEntity ?? 'sensor.rte_tempo_cycle_jours_restants_blanc');
  const red = useSafeEntity(config?.remainingRedEntity ?? 'sensor.rte_tempo_cycle_jours_restants_rouge');

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

      <div className='flex items-start gap-4 mb-4'>
        {/* Current period */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className={cn('flex items-center gap-2 rounded-2xl px-4 py-3 flex-1', colorClass(current.state))}
        >
          <Zap size={16} />
          <div>
            <div className='font-bold text-sm'>{isHC ? 'Heures creuses' : 'Heures pleines'}</div>
            <div className='text-xs opacity-70'>Tarif {current.state}</div>
          </div>
        </motion.div>

        {/* Tomorrow */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          className={cn('flex items-center gap-2 rounded-2xl px-4 py-3 flex-1', colorClass(next?.state ?? ''))}
        >
          <Calendar size={16} />
          <div>
            <div className='font-bold text-sm'>Demain</div>
            <div className='text-xs opacity-70'>{next?.state ?? '—'}</div>
          </div>
        </motion.div>
      </div>

      {/* Remaining days */}
      <div className='flex gap-3'>
        {[
          { label: 'Bleu', state: blue?.state ?? '?', color: 'text-blue-400' },
          { label: 'Blanc', state: white?.state ?? '?', color: 'text-white/80' },
          ...(Number(red?.state ?? 0) > 0 ? [{ label: 'Rouge', state: red?.state ?? '0', color: 'text-red-400' }] : []),
        ].map(({ label, state, color }) => (
          <div key={label} className='flex items-center gap-1.5 gc-inner rounded-full px-3 py-1 text-xs'>
            <span className={cn('w-2 h-2 rounded-full inline-block', dotColor(label))} />
            <span className='text-white/50'>{label}</span>
            <span className={cn('font-bold', color)}>{state}j</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
