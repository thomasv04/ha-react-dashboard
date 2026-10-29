import { useRef } from 'react';
import { useI18n } from '@/i18n';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { TempoCardConfig } from '@/types/widget-configs';

type TempoColor = 'Bleu' | 'Blanc' | 'Rouge' | string;

/** Couleur du jour Tempo : le fond et le texte qui se lit dessus. */
function dayStyle(color: TempoColor): { background: string; color: string } {
  if (color === 'Rouge') return { background: 'var(--ds-alert)', color: '#ffffff' };
  if (color === 'Blanc') return { background: '#eef1f5', color: '#1b2230' };
  if (color === 'Bleu') return { background: 'var(--ds-accent)', color: '#ffffff' };
  return { background: 'var(--ds-surface-3)', color: 'var(--ds-ink)' };
}

/**
 * Tempo EDF : aujourd'hui et demain en grandes tuiles pleines, à la couleur du
 * jour, puis les jours restants de chaque couleur en pastilles.
 */
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

  const period = hc?.state === 'on' ? t('widgets.tempo.offPeak') : t('widgets.tempo.peak');
  // `key` reste la couleur canonique renvoyée par HA : le style compare une
  // valeur stable, pas le libellé traduit.
  const remaining = [
    { key: 'Bleu', label: t('widgets.tempo.blue'), state: blue?.state },
    { key: 'Blanc', label: t('widgets.tempo.white'), state: white?.state },
    { key: 'Rouge', label: t('widgets.tempo.red'), state: red?.state },
  ].filter(r => r.state != null);

  const days = [
    { label: t('widgets.tempo.today'), color: current.state },
    { label: t('widgets.tempo.tomorrow'), color: next?.state ?? '—' },
  ];

  // Une rangée : les deux jours en pastilles, sans les jours restants.
  if (size.squat) {
    return (
      <div
        ref={cardRef}
        className='flex h-full items-center gap-3 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] px-4 text-[var(--ds-ink)]'
      >
        <div className='min-w-0 shrink'>
          <div className='truncate text-[17px] font-semibold leading-tight'>{t('widgets.tempo.label')}</div>
          <div className='truncate text-sm text-[var(--ds-ink-muted)]'>{period}</div>
        </div>
        <div className='ml-auto flex gap-2'>
          {days.map(d => (
            <span
              key={d.label}
              className='flex h-11 items-center rounded-[var(--ds-radius-pill)] px-4 text-sm font-semibold'
              style={dayStyle(d.color)}
            >
              {d.color}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className='flex h-full flex-col gap-3 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-[var(--ds-space-4)] text-[var(--ds-ink)]'
    >
      <div className='min-w-0'>
        <div className='truncate text-[17px] font-semibold leading-tight'>{t('widgets.tempo.label')}</div>
        <div className='truncate text-sm text-[var(--ds-ink-muted)]'>{period}</div>
      </div>

      <div className='grid min-h-0 flex-1 grid-cols-2 gap-2.5'>
        {days.map(d => (
          <div
            key={d.label}
            className='flex min-h-[64px] flex-col justify-between rounded-[var(--ds-radius-lg)] p-3'
            style={dayStyle(d.color)}
          >
            <span className='text-sm opacity-80'>{d.label}</span>
            <span className={cn('font-semibold leading-tight', size.h === 'short' ? 'text-xl' : 'text-[28px]')}>{d.color}</span>
          </div>
        ))}
      </div>

      {/* Les jours restants à partir de trois rangées : sur deux, ils écrasaient les jours. */}
      {!size.compact && size.h !== 'short' && remaining.length > 0 && (
        <div className='flex shrink-0 flex-wrap gap-2'>
          {remaining.map(r => (
            <span
              key={r.key}
              className='inline-flex h-10 items-center gap-2 rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-4 text-sm font-semibold'
            >
              <span aria-hidden='true' className='size-2.5 rounded-full' style={{ background: dayStyle(r.key).background }} />
              {r.label} {t('widgets.tempo.days', { value: r.state ?? '?' })}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
