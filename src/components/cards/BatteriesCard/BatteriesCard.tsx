import { useMemo, useRef } from 'react';
import { BatteryLow, BatteryFull } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { BatteriesCardConfig } from '@/types/widget-configs';
import { friendlyName } from '@/lib/ha-service';

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
      next.push({ id, name: friendlyName({ attributes }) ?? id, level });
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

/** Rouge sous le seuil, orange jusqu'au double, vert au-delà. */
function levelColor(level: number, threshold: number): string {
  if (level <= threshold) return 'var(--ds-alert)';
  if (level <= threshold * 2) return 'var(--ds-heat)';
  return 'var(--ds-good)';
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
    <div
      ref={cardRef}
      className={cn(
        'flex h-full select-none flex-col gap-3 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)]',
        size.squat ? 'justify-center px-4' : 'p-[var(--ds-space-4)]'
      )}
    >
      {/* En-tête : le compteur de piles faibles est l'information utile */}
      <div className='flex shrink-0 items-center gap-3'>
        {lowCount > 0 ? (
          <BatteryLow size={22} aria-hidden='true' className='shrink-0 text-[var(--ds-alert)]' />
        ) : (
          <BatteryFull size={22} aria-hidden='true' className='shrink-0 text-[var(--ds-good)]' />
        )}
        <div className='min-w-0'>
          <div className='truncate text-[17px] font-semibold leading-tight'>{name}</div>
          <div className={cn('truncate text-sm', lowCount > 0 ? 'text-[var(--ds-alert)]' : 'text-[var(--ds-ink-muted)]')}>
            {t('widgets.batteries.lowCount', { count: lowCount, threshold })}
          </div>
        </div>
      </div>

      {/* Liste : une pilule par appareil, remplie à son niveau */}
      {!size.squat &&
        (shown.length === 0 ? (
          <div className='flex flex-1 items-center justify-center'>
            <span className='text-sm text-[var(--ds-ink-muted)]'>
              {t(onlyLow ? 'widgets.batteries.allHealthy' : 'widgets.batteries.empty')}
            </span>
          </div>
        ) : (
          <ul className='flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto' style={{ scrollbarWidth: 'none' }}>
            {shown.map(b => {
              const color = levelColor(b.level, threshold);
              return (
                <li key={b.id} className='flex shrink-0 items-center gap-3'>
                  <span className='min-w-0 flex-1 truncate text-[15px]'>{b.name}</span>
                  <div
                    role='progressbar'
                    aria-label={b.name}
                    aria-valuenow={Math.round(b.level)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className='relative h-7 w-[40%] shrink-0 overflow-hidden rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)]'
                  >
                    <div
                      className='h-full rounded-[var(--ds-radius-pill)]'
                      style={{ width: `${Math.max(6, b.level)}%`, background: color }}
                    />
                  </div>
                  <span className='w-11 shrink-0 text-right text-sm font-bold tabular-nums'>{Math.round(b.level)} %</span>
                </li>
              );
            })}
          </ul>
        ))}
    </div>
  );
}
