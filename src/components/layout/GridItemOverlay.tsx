import { memo } from 'react';
import { MoveDiagonal, Pencil, Trash2, Settings } from 'lucide-react';
import { useDashboardLayout, useSizePresets, type GridWidget, type SizePresetName } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { WIDGET_DISPOSITIONS } from '@/config/widget-dispositions';
import type { Breakpoint } from './DashboardGrid';

interface GridItemOverlayProps {
  id: string;
  label: string;
  widget: GridWidget;
  breakpoint: Breakpoint;
  onResizeStart: (clientX: number, clientY: number) => void;
}

function GridItemOverlayInner({ id, label, widget, breakpoint, onResizeStart }: GridItemOverlayProps) {
  const { removeWidget } = useDashboardLayout();
  const { cycleSize, getCurrentPresetName } = useSizePresets();
  const { setEditingWidgetId } = useWidgetConfig();
  const hasDispositions = !!WIDGET_DISPOSITIONS[widget.type]?.length;
  const presetName: SizePresetName | null = getCurrentPresetName(id, breakpoint);

  if (widget.static) {
    return (
      <div className='absolute top-2 right-2 z-10 flex items-center gap-1'>
        <button onClick={() => setEditingWidgetId(id)}
          className='p-1.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400/70 hover:text-blue-300 transition-colors cursor-pointer'
          title={`Configurer ${label}`}>
          <Settings size={11} />
        </button>
        <div className='p-1.5 rounded-lg bg-black/30 border border-white/10 text-white/35'
          title={`${label} - widget fixe`}>
          <Pencil size={11} />
        </div>
      </div>
    );
  }

  return (
    <div className='absolute inset-0 z-10 rounded-2xl overflow-hidden flex flex-col cursor-grab active:cursor-grabbing'
      style={{ background: 'rgba(8, 12, 35, 0.55)' }} data-drag-handle>
      <div className='flex items-center justify-between px-3 pt-2.5'>
        <span className='text-[11px] font-medium text-white/45'>{label}</span>
        <div className='flex items-center gap-1'>
          <button onMouseDown={e => e.stopPropagation()} onClick={() => setEditingWidgetId(id)}
            className='p-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/35 text-blue-400/70 hover:text-blue-300 transition-colors cursor-pointer'
            title='Configurer le widget'>
            <Settings size={12} />
          </button>
          <button onMouseDown={e => e.stopPropagation()} onClick={() => removeWidget(id)}
            className='p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/35 text-red-400/70 hover:text-red-300 transition-colors cursor-pointer'
            title='Retirer du dashboard'>
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className='flex-1' />
      <div className='flex items-center justify-between px-3 pb-2.5'>
        <span className='text-[10px] text-white/25'>{widget.w}c × {widget.h}r</span>
        {hasDispositions ? (
          <button onMouseDown={e => e.stopPropagation()} onClick={() => setEditingWidgetId(id)}
            className='flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/8 hover:bg-purple-500/25 border border-white/12 hover:border-purple-400/40 text-white/40 hover:text-purple-200 transition-all cursor-pointer'
            title='Mise en page'>
            <MoveDiagonal size={11} />
            <span className='text-[10px] font-medium'>{widget.w}×{widget.h}</span>
          </button>
        ) : (
          <button onMouseDown={e => e.stopPropagation()} onClick={() => cycleSize(id, breakpoint)}
            className='flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/8 hover:bg-purple-500/25 border border-white/12 hover:border-purple-400/40 text-white/40 hover:text-purple-200 transition-all cursor-pointer'
            title='Changer la taille (Compact > Normal > Large)'>
            <MoveDiagonal size={11} />
            <span className='text-[10px] font-medium'>{presetName ?? 'Normal'}</span>
          </button>
        )}
      </div>
      {/* Resize handle (bottom-right corner) */}
      {hasDispositions && (
        <div
          className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize z-20 flex items-center justify-center"
          onMouseDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onResizeStart(e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            const touch = e.touches[0];
            if (touch) onResizeStart(touch.clientX, touch.clientY);
          }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" className="text-white/30">
            <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" strokeWidth="1.5" />
            <line x1="9" y1="4" x2="4" y2="9" stroke="currentColor" strokeWidth="1.5" />
            <line x1="9" y1="7" x2="7" y2="9" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </div>
      )}
    </div>
  );
}

export const GridItemOverlay = memo(GridItemOverlayInner);
