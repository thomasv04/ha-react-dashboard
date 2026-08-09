import { useRef } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE, DURATION_MEDIUM } from '@/lib/motion-tokens';
import { useI18n } from '@/i18n';
import { useWidgetSize } from '@/hooks/useWidgetSize';
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
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<TempoCardConfig>(widgetId || 'tempo');
  const cardRef = useRef<HTMLDivElement>(null);
  // Avant tout retour anticipé : les hooks doivent partir à chaque rendu.
  const size = useWidgetSize(cardRef);

  const current = useSafeEntity(config?.currentColorEntity ?? 'sensor.tempo_current_color');
  const next = useSafeEntity(config?.nextColorEntity ?? 'sensor.tempo_next_color');
  const hc = useSafeEntity(config?.offPeakEntity ?? 'binary_sensor.tempo_off_peak');
  const blue = useSafeEntity(config?.remainingBlueEntity ?? 'sensor.tempo_remaining_blue');
  const white = useSafeEntity(config?.remainingWhiteEntity ?? 'sensor.tempo_remaining_white');
  const red = useSafeEntity(config?.remainingRedEntity ?? 'sensor.tempo_remaining_red');

  if (!current) return null;

  const isHC = hc?.state === 'on';

  // La card empilait en-tête + deux pastilles + séparateur + jours restants
  // avec un padding de 20 px, quelle que soit sa hauteur : elle débordait dès
  // deux rangées. Les espacements se resserrent et le séparateur disparaît.
  const isRoomy = size.h === 'normal' || size.h === 'tall';

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE, delay: 0.2 }}
      className={cn('gc rounded-3xl h-full flex flex-col overflow-hidden', isRoomy ? 'p-5' : 'p-3.5')}
    >
      <div className={cn('text-white/50 text-xs uppercase tracking-wider font-medium shrink-0', isRoomy ? 'mb-3' : 'mb-2')}>
        {t('widgets.tempo.label')}
      </div>

      <div className={cn('flex items-start gap-2 shrink-0', isRoomy ? 'gap-3 mb-4' : 'mb-2')}>
        {/* Current period */}
        <motion.div
          whileTap={{ scale: 0.97 }}
          className={cn(
            'flex items-center rounded-2xl flex-1 min-w-0 transition-all duration-200',
            isRoomy ? 'gap-3 px-4 py-3' : 'gap-2 px-2.5 py-2',
            colorClass(current.state)
          )}
        >
          <div className='w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0'>
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Zap size={16} />
            </motion.div>
          </div>
          <div className='min-w-0'>
            <div className='font-bold text-sm truncate'>{isHC ? t('widgets.tempo.offPeak') : t('widgets.tempo.peak')}</div>
            <div className='text-xs opacity-60 truncate'>
              {t('widgets.tempo.rate')}
              {current.state}
            </div>
          </div>
        </motion.div>

        {/* Tomorrow */}
        <motion.div
          whileTap={{ scale: 0.97 }}
          className={cn(
            'flex items-center rounded-2xl flex-1 min-w-0 transition-all duration-200',
            isRoomy ? 'gap-3 px-4 py-3' : 'gap-2 px-2.5 py-2',
            colorClass(next?.state ?? '')
          )}
        >
          <div className='w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0'>
            <Calendar size={16} />
          </div>
          <div className='min-w-0'>
            <div className='font-bold text-sm truncate'>{t('widgets.tempo.tomorrow')}</div>
            <div className='text-xs opacity-60 truncate'>{next?.state ?? '—'}</div>
          </div>
        </motion.div>
      </div>

      {/* Separator */}
      {isRoomy && <div className='h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-3 shrink-0' />}

      {/* Remaining days */}
      <div className={cn('flex flex-wrap items-center', isRoomy ? 'gap-3' : 'gap-1.5')}>
        {/* `key` reste la couleur canonique renvoyée par HA : `dotColor` doit
            comparer une valeur stable, pas le libellé traduit. */}
        {[
          { key: 'Bleu', label: t('widgets.tempo.blue'), state: blue?.state ?? '?', color: 'text-blue-400' },
          { key: 'Blanc', label: t('widgets.tempo.white'), state: white?.state ?? '?', color: 'text-white/80' },
          ...(Number(red?.state ?? 0) > 0
            ? [{ key: 'Rouge', label: t('widgets.tempo.red'), state: red?.state ?? '0', color: 'text-red-400' }]
            : []),
        ].map(({ key, label, state, color }, i) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DURATION_MEDIUM, delay: 0.2 + i * 0.08 }}
            className={cn(
              'flex items-center gap-1.5 bg-white/5 border border-white/8 rounded-full text-xs',
              isRoomy ? 'px-3 py-1.5' : 'px-2.5 py-1'
            )}
          >
            <motion.span
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              className={cn('w-2.5 h-2.5 rounded-full inline-block', dotColor(key))}
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
