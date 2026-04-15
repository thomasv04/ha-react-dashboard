import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { WIDGET_DISPOSITIONS, getMinSize } from '@/config/widget-dispositions';
import { cn } from '@/lib/utils';

interface CardLayoutTabProps {
  widgetId: string;
  breakpoint: 'lg' | 'md' | 'sm';
}

export function CardLayoutTab({ widgetId, breakpoint }: CardLayoutTabProps) {
  const { layout, updateWidget } = useDashboardLayout();
  const widget = layout.widgets[breakpoint]?.find(w => w.id === widgetId);

  if (!widget) return null;

  const cols = layout.cols[breakpoint];
  const dispositions = WIDGET_DISPOSITIONS[widget.type] ?? [];
  const minSize = getMinSize(widget.type, breakpoint, widget.disposition);

  const maxW = cols;
  const maxH = 12;

  const setWidth = (w: number) => {
    const clamped = Math.max(minSize.w, Math.min(maxW, w));
    updateWidget(widgetId, { w: clamped }, breakpoint);
  };

  const setHeight = (h: number) => {
    const clamped = Math.max(minSize.h, Math.min(maxH, h));
    updateWidget(widgetId, { h: clamped }, breakpoint);
  };

  const setDisposition = (dispositionId: string) => {
    const newDisposition = dispositions.find(d => d.id === dispositionId);
    if (!newDisposition) return;

    const newMin = newDisposition.minSize[breakpoint];

    updateWidget(
      widgetId,
      {
        disposition: dispositionId,
        w: Math.max(newMin.w, Math.min(widget.w, maxW)),
        h: Math.max(newMin.h, widget.h),
      },
      breakpoint
    );
  };

  return (
    <div className='flex flex-col gap-6'>
      {/* ── Disposition du contenu ──────────────────────────── */}
      {dispositions.length > 1 && (
        <div>
          <h4 className='text-white/60 text-sm mb-3'>Disposition du contenu</h4>
          <div className='grid grid-cols-2 gap-3'>
            {dispositions.map(disp => (
              <button
                key={disp.id}
                onClick={() => setDisposition(disp.id)}
                className={cn(
                  'p-4 rounded-2xl border text-left transition-all cursor-pointer',
                  widget.disposition === disp.id || (!widget.disposition && disp === dispositions[0])
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30'
                    : 'border-white/10 bg-white/5 hover:bg-white/8'
                )}
              >
                <div className='flex items-center justify-center mb-3 h-12'>
                  {disp.id === 'horizontal' ? (
                    <div className='flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10'>
                      <div className='w-6 h-6 rounded-full bg-white/20' />
                      <div className='flex flex-col gap-1'>
                        <div className='w-12 h-1.5 rounded bg-white/30' />
                        <div className='w-8 h-1 rounded bg-white/15' />
                      </div>
                    </div>
                  ) : (
                    <div className='flex flex-col items-center gap-1.5 px-4 py-2 rounded-xl bg-white/10'>
                      <div className='w-6 h-6 rounded-full bg-white/20' />
                      <div className='w-10 h-1.5 rounded bg-white/30' />
                    </div>
                  )}
                </div>
                <div className='text-sm font-medium text-white/80'>{disp.label}</div>
                {disp.description && <div className='text-[11px] text-white/30 mt-1'>{disp.description}</div>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Prévisualisation grille + sliders ────────────────── */}
      <div>
        <h4 className='text-white/60 text-sm mb-3'>Taille sur la grille</h4>

        <div className='flex gap-3'>
          {/* Slider vertical (hauteur) à gauche */}
          <div className='flex flex-col items-center gap-1'>
            <span className='text-[10px] text-white/30'>{widget.h}</span>
            <input
              type='range'
              min={minSize.h}
              max={maxH}
              value={widget.h}
              onChange={e => setHeight(parseInt(e.target.value))}
              className='h-32 appearance-none cursor-pointer
                [writing-mode:vertical-lr] [direction:rtl]
                [&::-webkit-slider-track]:rounded-full
                [&::-webkit-slider-track]:bg-white/10
                [&::-webkit-slider-track]:w-2
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-blue-500'
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
                className='flex-1 h-2 rounded-full appearance-none cursor-pointer bg-white/10
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-4
                  [&::-webkit-slider-thumb]:h-4
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-blue-500'
              />
              <span className='text-[10px] text-white/30 min-w-[2ch]'>{widget.w}</span>
            </div>

            {/* Grille miniature */}
            <GridPreview cols={cols} widgetW={widget.w} widgetH={widget.h} widgetX={widget.x} />
          </div>
        </div>
      </div>

      {/* ── Info taille min ──────────────────────────────────── */}
      <div className='text-[11px] text-white/20'>
        Taille minimum : {minSize.w} colonnes × {minSize.h} lignes (
        {breakpoint === 'lg' ? 'Desktop' : breakpoint === 'md' ? 'Tablette' : 'Mobile'})
      </div>
    </div>
  );
}

// ── Mini-grille de prévisualisation ─────────────────────────────────────────
function GridPreview({ cols, widgetW, widgetH, widgetX }: { cols: number; widgetW: number; widgetH: number; widgetX: number }) {
  const displayRows = Math.max(widgetH + 1, 4);

  return (
    <div
      className='grid gap-1 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06]'
      style={{
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: '12px',
      }}
    >
      {Array.from({ length: displayRows * cols }, (_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const isWidget = col >= widgetX && col < widgetX + widgetW && row >= 0 && row < widgetH;

        return (
          <div
            key={i}
            className={cn(
              'rounded-sm transition-colors',
              isWidget ? 'bg-blue-500/40 border border-blue-500/50' : 'bg-white/[0.04] border border-white/[0.03]'
            )}
          />
        );
      })}
    </div>
  );
}
