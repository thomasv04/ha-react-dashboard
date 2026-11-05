import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { findWidget } from '@/lib/panel-grid';
import { WIDGET_DISPOSITIONS, getMinSize } from '@/widgets';
import { cn, clamp } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { Minus, Plus } from 'lucide-react';
import { FIELD_CARD, INTRO, ROUND, SECTION_TITLE } from './WidgetEditModal/ui';

interface CardLayoutTabProps {
  widgetId: string;
}

export function CardLayoutTab({ widgetId }: CardLayoutTabProps) {
  const { t } = useI18n();
  const { layout, updateWidget } = useDashboardLayout();
  const found = findWidget(layout, widgetId);
  if (!found) return null;
  const { panel, widget } = found;

  // La tuile ne dépasse pas la largeur de son panneau.
  const cols = panel.cols;
  const dispositions = WIDGET_DISPOSITIONS[widget.type] ?? [];
  const minSize = getMinSize(widget.type, widget.disposition);

  const maxW = cols;
  const maxH = 12;

  const setWidth = (w: number) => {
    const clamped = clamp(w, minSize.w, maxW);
    updateWidget(widgetId, { w: clamped });
  };

  const setHeight = (h: number) => {
    const clamped = clamp(h, minSize.h, maxH);
    updateWidget(widgetId, { h: clamped });
  };

  const setDisposition = (dispositionId: string) => {
    const newDisposition = dispositions.find(d => d.id === dispositionId);
    if (!newDisposition) return;

    const newMin = newDisposition.minSize.lg;

    updateWidget(widgetId, {
      disposition: dispositionId,
      w: clamp(widget.w, newMin.w, maxW),
      h: Math.max(newMin.h, widget.h),
    });
  };

  return (
    <div className='flex flex-col gap-3'>
      {/* ── Disposition du contenu ──────────────────────────── */}
      {dispositions.length > 1 && (
        <section className={FIELD_CARD}>
          <h3 className={cn(SECTION_TITLE, 'mb-3')}>{t('layout.contentLayout')}</h3>
          <div className='grid grid-cols-2 gap-3'>
            {dispositions.map(disp => (
              <button
                key={disp.id}
                aria-pressed={widget.disposition === disp.id || (!widget.disposition && disp === dispositions[0])}
                onClick={() => setDisposition(disp.id)}
                className={cn(
                  'rounded-[var(--ds-radius-lg)] p-4 text-left transition-colors',
                  widget.disposition === disp.id || (!widget.disposition && disp === dispositions[0])
                    ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]'
                    : // Plus sombre que la vignette `surface-3` qu'elle porte : sinon la vignette disparaît.
                      'bg-[var(--ds-sheet)]'
                )}
              >
                <div className='flex items-center justify-center mb-3 h-12'>
                  {disp.id === 'horizontal' ? (
                    <div className='flex items-center gap-2 px-3 py-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)]'>
                      <div className='w-6 h-6 rounded-full bg-[var(--ds-surface-3)]' />
                      <div className='flex flex-col gap-1'>
                        <div className='w-12 h-1.5 rounded bg-[var(--ds-surface-3)]' />
                        <div className='w-8 h-1 rounded bg-[var(--ds-surface-3)]' />
                      </div>
                    </div>
                  ) : (
                    <div className='flex flex-col items-center gap-1.5 px-4 py-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)]'>
                      <div className='w-6 h-6 rounded-full bg-[var(--ds-surface-3)]' />
                      <div className='w-10 h-1.5 rounded bg-[var(--ds-surface-3)]' />
                    </div>
                  )}
                </div>
                <div className='text-base font-semibold'>{t(disp.label)}</div>
                {disp.description && <div className='mt-1 text-sm opacity-80'>{t(disp.description)}</div>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Taille sur la grille : un pas au doigt par axe, et la mini-grille ── */}
      <section className={cn(FIELD_CARD, 'flex flex-col gap-3')}>
        <h3 className={SECTION_TITLE}>{t('layout.gridSize')}</h3>
        <SizeStepper label={t('layout.panel.width_label')} value={widget.w} min={minSize.w} max={maxW} onChange={setWidth} />
        <SizeStepper label={t('layout.panel.height')} value={widget.h} min={minSize.h} max={maxH} onChange={setHeight} />
        <GridPreview cols={cols} widgetW={widget.w} widgetH={widget.h} />
        <p className={INTRO}>{t('layout.minSize', { w: minSize.w, h: minSize.h })}</p>
      </section>
    </div>
  );
}

/**
 * Un pas « − n + » : la taille d'une tuile se compte en colonnes et en rangées,
 * douze au plus. Plus sûr au doigt qu'un curseur — et le vertical, à l'écran
 * tactile, se confondait avec le défilement de la feuille.
 */
function SizeStepper({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className='flex items-center gap-3'>
      <span className='flex-1 text-base font-semibold'>{label}</span>
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={t('layout.decrease', { label })}
        className={cn(ROUND, 'size-11 disabled:opacity-30')}
      >
        <Minus size={18} />
      </button>
      <output aria-live='polite' className='min-w-8 text-center text-xl font-semibold tabular-nums'>
        {value}
      </output>
      <button
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={t('layout.increase', { label })}
        className={cn(ROUND, 'size-11 disabled:opacity-30')}
      >
        <Plus size={18} />
      </button>
    </div>
  );
}

// ── Mini-grille de prévisualisation ─────────────────────────────────────────
function GridPreview({ cols, widgetW, widgetH }: { cols: number; widgetW: number; widgetH: number }) {
  const displayRows = Math.max(widgetH + 1, 4);

  return (
    <div
      // Fond plus sombre que les cases : sur `surface-3` comme elles, la grille vide ne se lisait pas.
      className='grid gap-1 rounded-[var(--ds-radius-md)] bg-[var(--ds-sheet)] p-2'
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: '12px',
      }}
    >
      {Array.from({ length: displayRows * cols }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const isWidget = col < widgetW && row < widgetH;

        return (
          <div key={i} className={cn('rounded-sm transition-colors', isWidget ? 'bg-[var(--ds-tile-on)]' : 'bg-[var(--ds-surface-3)]')} />
        );
      })}
    </div>
  );
}
