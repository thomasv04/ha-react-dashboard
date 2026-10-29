import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { WIDGET_DISPOSITIONS, getMinSize } from '@/widgets';
import { cn, clamp } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface CardLayoutTabProps {
  widgetId: string;
}

export function CardLayoutTab({ widgetId }: CardLayoutTabProps) {
  const { t } = useI18n();
  const { layout, updateWidget } = useDashboardLayout();
  const panel = layout.panels.find(p => p.widgets.some(w => w.id === widgetId));
  const widget = panel?.widgets.find(w => w.id === widgetId);

  if (!panel || !widget) return null;

  // La tuile ne dépasse pas la largeur de son panneau.
  const cols = panel.cols;
  const dispositions = WIDGET_DISPOSITIONS[widget.type] ?? [];
  const minSize = getMinSize(widget.type, 'lg', widget.disposition);

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
    <div className='flex flex-col gap-6'>
      {/* ── Disposition du contenu ──────────────────────────── */}
      {dispositions.length > 1 && (
        <div>
          <h4 className='text-[var(--ds-ink-muted)] text-sm mb-3'>{t('layout.contentLayout')}</h4>
          <div className='grid grid-cols-2 gap-3'>
            {dispositions.map(disp => (
              <button
                key={disp.id}
                onClick={() => setDisposition(disp.id)}
                className={cn(
                  'p-4 rounded-[var(--ds-radius-lg)] border text-left transition-all cursor-pointer',
                  widget.disposition === disp.id || (!widget.disposition && disp === dispositions[0])
                    ? 'border-[var(--ds-accent)] bg-[var(--ds-tile-on)] ring-1 ring-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                    : 'border-[var(--ds-surface-3)] bg-[var(--ds-surface-2)]'
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
                <div className='text-sm font-medium text-[var(--ds-ink)]'>{t(disp.label)}</div>
                {disp.description && <div className='text-[11px] text-[var(--ds-ink-muted)] mt-1'>{t(disp.description)}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Prévisualisation grille + sliders ────────────────── */}
      <div>
        <h4 className='text-[var(--ds-ink-muted)] text-sm mb-3'>{t('layout.gridSize')}</h4>

        <div className='flex gap-3'>
          {/* Slider vertical (hauteur) à gauche */}
          <div className='flex flex-col items-center gap-1'>
            <span className='text-[10px] text-[var(--ds-ink-muted)]'>{widget.h}</span>
            <input
              type='range'
              min={minSize.h}
              max={maxH}
              value={widget.h}
              onChange={e => setHeight(parseInt(e.target.value))}
              className='h-32 appearance-none cursor-pointer
                [writing-mode:vertical-lr] [direction:rtl]
                [&::-webkit-slider-track]:rounded-full
                [&::-webkit-slider-track]:bg-[var(--ds-surface-3)]
                [&::-webkit-slider-track]:w-2
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-[var(--ds-accent)]'
            />
          </div>

          {/* Grille de preview */}
          <div className='flex flex-col gap-1 flex-1'>
            {/* Slider horizontal (largeur) au-dessus */}
            <div className='flex items-center gap-2 mb-1'>
              <input
                type='range'
                min={minSize.w}
                max={maxW}
                value={widget.w}
                onChange={e => setWidth(parseInt(e.target.value))}
                className='flex-1 h-2 rounded-full appearance-none cursor-pointer bg-[var(--ds-surface-3)]
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-[var(--ds-accent)]'
              />
              <span className='text-[10px] text-[var(--ds-ink-muted)] min-w-[2ch]'>{widget.w}</span>
            </div>

            {/* Grille miniature */}
            <GridPreview cols={cols} widgetW={widget.w} widgetH={widget.h} />
          </div>
        </div>
      </div>

      {/* ── Info taille min ──────────────────────────────────── */}
      <div className='text-[11px] text-[var(--ds-ink-muted)]'>{t('layout.minSize', { w: minSize.w, h: minSize.h })}</div>
    </div>
  );
}

// ── Mini-grille de prévisualisation ─────────────────────────────────────────
function GridPreview({ cols, widgetW, widgetH }: { cols: number; widgetW: number; widgetH: number }) {
  const displayRows = Math.max(widgetH + 1, 4);

  return (
    <div
      className='grid gap-1 p-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)]'
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
          <div
            key={i}
            className={cn(
              'rounded-sm transition-colors',
              isWidget
                ? 'bg-[var(--ds-tile-on)] border border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                : 'bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)]'
            )}
          />
        );
      })}
    </div>
  );
}
