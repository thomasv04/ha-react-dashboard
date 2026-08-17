import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useEntityHistory } from '@/hooks/useEntityHistory';
import { HistoryGraph } from '@/components/charts/HistoryGraph';
import { BinaryTimeline } from '@/components/charts/BinaryTimeline';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize, type WidgetHeightClass } from '@/hooks/useWidgetSize';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { useColor } from '@/hooks/useColor';
import type { ChartCardConfig } from '@/types/widget-configs';

/**
 * Hauteur du tracé selon la place disponible. `useWidgetSize` ne rend qu'une
 * classe, pas des pixels — c'est suffisant, la grille n'a que quatre paliers.
 */
const GRAPH_HEIGHT: Record<WidgetHeightClass, number> = { squat: 44, short: 96, normal: 172, tall: 250 };

export function ChartCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<ChartCardConfig>(widgetId || 'chart');
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);

  const entityId = config?.entityId ?? '';
  const entity = useSafeEntity(entityId);
  // Avant le retour anticipé : un hook ne se saute pas.
  const color = useColor(config?.color) ?? '#60a5fa';
  const hours = config?.hours ?? 24;
  const { data, loading } = useEntityHistory(entityId, hours);

  if (!entity) {
    return (
      <div ref={cardRef} className='gc rounded-3xl p-4 flex items-center justify-center h-full'>
        <span className='text-white/30 text-sm'>{t('widgets.chart.notFound')}</span>
      </div>
    );
  }

  const name = config?.name ?? (entity.attributes.friendly_name as string | undefined) ?? entityId;
  const unit = (entity.attributes.unit_of_measurement as string | undefined) ?? '';
  // Une entité non numérique n'a pas de courbe : sa frise on/off la remplace.
  const variant = config?.variant ?? (Number.isNaN(parseFloat(entity.state)) ? 'timeline' : 'line');

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      className={cn('gc rounded-3xl h-full overflow-hidden select-none flex flex-col', size.squat ? 'px-3 py-1.5' : 'p-3.5')}
    >
      {/* En-tête : sur une seule rangée, la valeur passe à côté du titre */}
      <div className='flex items-baseline justify-between gap-2 shrink-0'>
        <span className='text-white/40 text-xs font-medium truncate'>{name}</span>
        <span className='text-white text-sm font-light tracking-tight shrink-0'>
          {entity.state}
          {unit && <span className='text-white/40 text-[10px] ml-0.5'>{unit}</span>}
        </span>
      </div>

      {/* Tracé */}
      <div className='flex-1 min-h-0 flex items-center justify-center mt-1'>
        {loading && data.length === 0 ? (
          <span className='text-white/25 text-xs'>{t('common.loading')}</span>
        ) : variant === 'timeline' ? (
          // La frise embarque sa propre liste d'évènements : illisible tant que
          // la card n'a pas au moins deux rangées.
          <div className='w-full overflow-hidden'>{size.squat ? <TimelineStrip data={data} /> : <BinaryTimeline data={data} />}</div>
        ) : (
          <HistoryGraph data={data} height={GRAPH_HEIGHT[size.h]} color={color} />
        )}
      </div>
    </motion.div>
  );
}

/** Frise seule, sans la liste d'évènements — pour une card d'une rangée. */
function TimelineStrip({ data }: { data: { time: Date; state: string }[] }) {
  // Instant de référence figé au montage, comme `BinaryTimeline` : lire
  // `Date.now()` pendant le rendu rendrait la frise instable.
  const [now] = useState(() => Date.now());
  if (data.length === 0) return null;
  const first = data[0].time.getTime();
  const span = now - first || 1;

  return (
    <div className='relative h-4 rounded-full overflow-hidden bg-white/5'>
      {data.map((p, i) => {
        const start = ((p.time.getTime() - first) / span) * 100;
        const end = i < data.length - 1 ? ((data[i + 1].time.getTime() - first) / span) * 100 : 100;
        return (
          <div
            key={i}
            className='absolute top-0 h-full'
            style={{
              left: `${start}%`,
              width: `${Math.max(0.5, end - start)}%`,
              backgroundColor: p.state === 'on' ? '#10b981' : '#6b7280',
            }}
          />
        );
      })}
    </div>
  );
}
