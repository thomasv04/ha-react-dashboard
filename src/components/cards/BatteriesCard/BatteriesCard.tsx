import { useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { BatteryLow, BatteryFull } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { ProgressBar } from '@/components/charts/ProgressBar';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { BatteriesCardConfig } from '@/types/widget-configs';

interface Battery {
  id: string;
  name: string;
  level: number;
}

/**
 * Toutes les entités `device_class: battery` chiffrées, triées du plus faible
 * au plus élevé.
 *
 * Le filtrage vit **dans** le sélecteur zustand : passer par
 * `useEntitiesByDomain('sensor')` re-rendrait la card à chaque relevé de
 * température de la maison.
 */
function useBatteries(): Battery[] {
  const cacheRef = useRef<Battery[] | null>(null);

  return useHass(s => {
    const next: Battery[] = [];
    for (const [id, entity] of Object.entries(s.entities ?? {})) {
      const attributes = entity?.attributes as Record<string, unknown> | undefined;
      if (attributes?.device_class !== 'battery') continue;
      const level = parseFloat(entity.state);
      // Une batterie binaire (`binary_sensor`, on = faible) n'a pas de niveau :
      // la barre n'aurait rien à afficher.
      if (Number.isNaN(level)) continue;
      next.push({ id, name: (attributes.friendly_name as string | undefined) ?? id, level });
    }
    next.sort((a, b) => a.level - b.level);

    const prev = cacheRef.current;
    if (prev && prev.length === next.length && prev.every((b, i) => b.id === next[i].id && b.level === next[i].level)) {
      return prev;
    }
    cacheRef.current = next;
    return next;
  });
}

function levelColor(level: number, threshold: number): string {
  if (level <= threshold) return '#f87171';
  if (level <= threshold * 2) return '#fbbf24';
  return '#34d399';
}

export function BatteriesCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<BatteriesCardConfig>(widgetId || 'batteries');
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);

  const all = useBatteries();
  const threshold = config?.threshold ?? 20;
  const onlyLow = config?.onlyLow ?? false;
  const excludeKey = (config?.exclude ?? []).join(',');

  const { shown, lowCount } = useMemo(() => {
    const excluded = new Set(excludeKey ? excludeKey.split(',') : []);
    const kept = all.filter(b => !excluded.has(b.id));
    return {
      shown: onlyLow ? kept.filter(b => b.level <= threshold) : kept,
      lowCount: kept.filter(b => b.level <= threshold).length,
    };
  }, [all, excludeKey, onlyLow, threshold]);

  const name = config?.name ?? t('widgets.batteries.label');

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      className={cn('gc rounded-3xl h-full overflow-hidden select-none flex flex-col', size.squat ? 'px-3 py-2' : 'p-3.5')}
    >
      {/* En-tête : le compteur de batteries faibles est l'information utile */}
      <div className='flex items-center gap-2 shrink-0'>
        <div
          className='w-7 h-7 rounded-xl flex items-center justify-center border shrink-0'
          style={
            lowCount > 0
              ? { background: 'rgba(248,113,113,0.12)', borderColor: 'rgba(248,113,113,0.25)' }
              : { background: 'rgba(52,211,153,0.10)', borderColor: 'rgba(52,211,153,0.22)' }
          }
        >
          {lowCount > 0 ? <BatteryLow size={14} className='text-red-400' /> : <BatteryFull size={14} className='text-emerald-400' />}
        </div>
        <span className='text-white/40 text-xs font-medium truncate'>{name}</span>
        <span
          className={cn(
            'ml-auto text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0',
            lowCount > 0 ? 'text-red-300 bg-red-400/10 border-red-400/25' : 'text-white/25 bg-white/5 border-white/8'
          )}
        >
          {t('widgets.batteries.lowCount', { count: lowCount, threshold })}
        </span>
      </div>

      {/* Liste */}
      {shown.length === 0 ? (
        <div className='flex-1 flex items-center justify-center'>
          <span className='text-white/25 text-sm'>{t(onlyLow ? 'widgets.batteries.allHealthy' : 'widgets.batteries.empty')}</span>
        </div>
      ) : (
        <div className='flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto scrollbar-none mt-2' style={{ scrollbarWidth: 'none' }}>
          {shown.map(b => (
            <div key={b.id} className='flex items-center gap-2.5 shrink-0'>
              <span className='text-white/60 text-xs truncate flex-1 min-w-0'>{b.name}</span>
              <div className='w-16 shrink-0'>
                <ProgressBar value={b.level} color={levelColor(b.level, threshold)} height={5} />
              </div>
              <span
                className='text-[11px] font-medium tabular-nums w-9 text-right shrink-0'
                style={{ color: levelColor(b.level, threshold) }}
              >
                {Math.round(b.level)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
