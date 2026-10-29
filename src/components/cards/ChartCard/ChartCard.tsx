import { useRef, useState } from 'react';
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
import { friendlyName } from '@/lib/ha-service';

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
  const color = useColor(config?.color) ?? 'var(--ds-accent)';
  const hours = config?.hours ?? 24;
  const { data, loading } = useEntityHistory(entityId, hours);

  if (!entity) {
    return (
      <div ref={cardRef} className='gc flex h-full items-center justify-center p-4'>
        <span className='text-sm text-[var(--ds-ink-muted)]'>{t('widgets.chart.notFound')}</span>
      </div>
    );
  }

  const name = config?.name ?? friendlyName(entity) ?? entityId;
  const unit = (entity.attributes.unit_of_measurement as string | undefined) ?? '';
  // Une entité non numérique n'a pas de courbe : sa frise on/off la remplace.
  const variant = config?.variant ?? (Number.isNaN(parseFloat(entity.state)) ? 'timeline' : 'line');

  return (
    <div
      ref={cardRef}
      className={cn(
        'flex h-full select-none flex-col overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)]',
        size.squat ? 'justify-center gap-1 px-4' : 'gap-2 p-[var(--ds-space-4)]'
      )}
    >
      {/* En-tête : sur une seule rangée, la valeur passe à côté du titre */}
      <div className='flex shrink-0 items-baseline justify-between gap-3'>
        <span className='truncate text-[17px] font-semibold'>{name}</span>
        <span className={cn('shrink-0 font-light tracking-tight tabular-nums', size.squat ? 'text-xl' : 'text-3xl')}>
          {entity.state}
          {unit && <span className='ml-1 text-sm text-[var(--ds-ink-muted)]'>{unit}</span>}
        </span>
      </div>

      {/* Tracé */}
      <div className='flex min-h-0 flex-1 items-center justify-center'>
        {loading && data.length === 0 ? (
          <span className='text-sm text-[var(--ds-ink-muted)]'>{t('common.loading')}</span>
        ) : variant === 'timeline' ? (
          // La frise embarque sa propre liste d'évènements : illisible tant que
          // la card n'a pas au moins deux rangées.
          <div className='w-full overflow-hidden'>{size.squat ? <TimelineStrip data={data} /> : <BinaryTimeline data={data} />}</div>
        ) : (
          <HistoryGraph data={data} height={GRAPH_HEIGHT[size.h]} color={color} />
        )}
      </div>
    </div>
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
    <div className='relative h-4 overflow-hidden rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)]'>
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
              backgroundColor: p.state === 'on' ? 'var(--ds-good)' : 'var(--ds-surface-3)',
            }}
          />
        );
      })}
    </div>
  );
}
