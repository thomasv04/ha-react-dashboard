import { useDashboardLayout, type GridWidget } from '@/context/DashboardLayoutContext';
import { useState, useLayoutEffect, useRef, createContext, useContext, memo, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { MoveDiagonal, Pencil, Trash2, Settings } from 'lucide-react';
import {
  buildOccupancyMap,
  canPlace,
  pixelToGrid,
  placeWidgetAt,
} from '@/lib/grid-utils';
import { WIDGET_DISPOSITIONS, getMinSize } from '@/config/widget-dispositions';

type Breakpoint = 'lg' | 'md' | 'sm';

export function resolveBreakpoint(w: number): Breakpoint {
  return w >= 1200 ? 'lg' : w >= 768 ? 'md' : 'sm';
}

export const WIDGET_LABELS: Record<string, string> = {
  activity: 'Activité',
  greeting: 'Horloge',
  camera: 'Caméra',
  weather: 'Météo',
  thermostat: 'Thermostat',
  rooms: 'Pièces',
  shortcuts: 'Raccourcis',
  tempo: 'Tempo EDF',
  energy: 'Énergie',
  sensor: 'Capteur',
  light: 'Lumière',
  person: 'Personnes',
  cover: 'Volet',
  template: 'Template',
};

// Grid Context - contains breakpoint + drag state + drag handler functions
// Handlers passed via context so GridItem can use them (like Tunet getDragProps)

interface GhostPosition {
  col: number; row: number; w: number; h: number; valid: boolean;
}

interface DragHandlers {
  onItemDragStart: (e: React.DragEvent, id: string) => void;
  onItemDragOver: (e: React.DragEvent) => void;
  onItemDragEnter: (id: string) => void;
  onItemDragLeave: () => void;
  onItemDrop: (e: React.DragEvent, id: string) => void;
  onItemDragEnd: () => void;
  onItemTouchStart: (id: string, x: number, y: number) => void;
  onItemTouchMove: (x: number, y: number) => void;
  onItemTouchEnd: () => void;
}

interface GridCtxValue {
  breakpoint: Breakpoint;
  draggingId: string | null;
  dropTargetId: string | null;
  ghostPosition: GhostPosition | null;
  drag: DragHandlers;
  startResize: (widgetId: string, clientX: number, clientY: number) => void;
}

const GridCtx = createContext<GridCtxValue | null>(null);

function useGridCtx() {
  const ctx = useContext(GridCtx);
  if (!ctx) throw new Error('useGridCtx must be used inside DashboardGrid');
  return ctx;
}

// ── Widget ID context — lets each card know its own widget id ─────────────────
const WidgetIdCtx = createContext<string>('');
export function useWidgetId() { return useContext(WidgetIdCtx); }
export function WidgetIdProvider({ id, children }: { id: string; children: ReactNode }) {
  return <WidgetIdCtx.Provider value={id}>{children}</WidgetIdCtx.Provider>;
}

const ROW_HEIGHT = 80;
const GAP = 16;

// DashboardGrid - Pure CSS Grid + HTML5 Drag API (a la Tunet)
// ZERO per-pixel JS during drag. Browser handles ghost image natively.

export function DashboardGrid({ children, readonly }: { children: ReactNode; readonly?: boolean }) {
  const { layout, setLayout, isEditMode: ctxEditMode } = useDashboardLayout();
  const isEditMode = ctxEditMode && !readonly;
  const outerRef = useRef<HTMLDivElement>(null);
  const [bp, setBp] = useState<Breakpoint>('lg');

  // Drag state - ref for source (no re-render), state for visuals only
  const dragSourceRef = useRef<{ id: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [ghostPosition, setGhostPosition] = useState<GhostPosition | null>(null);

  // Touch cooldown (Tunet: 150ms between swaps)
  const touchSwapCooldownRef = useRef(0);

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = (w: number) => {
      if (w > 0) setBp(resolveBreakpoint(w));
    };
    measure(el.getBoundingClientRect().width);
    const obs = new ResizeObserver(entries => measure(entries[0]?.contentRect.width ?? 0));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const widgets = layout.widgets[bp];
  const cols = layout.cols[bp];

  // Place widget at a specific grid cell (replaces the old swapWidgets)
  const moveWidgetToCell = useCallback((widgetId: string, col: number, row: number) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;
    const clampedCol = Math.max(0, Math.min(cols - widget.w, col));
    const newWidgets = placeWidgetAt(
      widget,
      clampedCol,
      row,
      widgets.filter(w => w.id !== widgetId),
      cols,
    );
    setLayout({ ...layout, widgets: { ...layout.widgets, [bp]: newWidgets } });
  }, [widgets, layout, bp, cols, setLayout]);

  // Helper to compute ghost position from pixel coords
  const computeGhost = useCallback((clientX: number, clientY: number) => {
    if (!outerRef.current || !dragSourceRef.current) return;
    const containerRect = outerRef.current.getBoundingClientRect();
    const widget = widgets.find(w => w.id === dragSourceRef.current!.id);
    if (!widget) return;
    const { col, row } = pixelToGrid(clientX, clientY, containerRect, cols, ROW_HEIGHT, GAP);
    const clampedCol = Math.max(0, Math.min(cols - widget.w, col));
    const maxRow = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0) + 5;
    const map = buildOccupancyMap(widgets, cols, maxRow, widget.id);
    const valid = canPlace(map, clampedCol, row, widget.w, widget.h, cols);
    setGhostPosition({ col: clampedCol, row, w: widget.w, h: widget.h, valid });
  }, [widgets, cols]);

  // Drag handlers passed to GridItem via context
  const drag = useMemo<DragHandlers>(() => ({
    onItemDragStart: (e, id) => {
      e.dataTransfer.setData('text/plain', id);
      e.dataTransfer.effectAllowed = 'move';
      dragSourceRef.current = { id };
      setTimeout(() => setDraggingId(id), 0);
    },
    onItemDragOver: (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      computeGhost(e.clientX, e.clientY);
    },
    onItemDragEnter: (id) => {
      if (!dragSourceRef.current || dragSourceRef.current.id === id) return;
      setDropTargetId(id);
    },
    onItemDragLeave: () => setDropTargetId(null),
    onItemDrop: (e, _targetId) => {
      e.preventDefault();
      e.stopPropagation();
      const sourceId = e.dataTransfer.getData('text/plain');
      if (!sourceId || !ghostPositionRef.current) return;
      moveWidgetToCell(sourceId, ghostPositionRef.current.col, ghostPositionRef.current.row);
      setDraggingId(null);
      setDropTargetId(null);
      setGhostPosition(null);
      dragSourceRef.current = null;
    },
    onItemDragEnd: () => {
      setDraggingId(null);
      setDropTargetId(null);
      setGhostPosition(null);
      dragSourceRef.current = null;
    },
    onItemTouchStart: (id, _x, _y) => {
      dragSourceRef.current = { id };
      touchSwapCooldownRef.current = 0;
      setDraggingId(id);
    },
    onItemTouchMove: (x, y) => {
      if (!dragSourceRef.current) return;
      computeGhost(x, y);
    },
    onItemTouchEnd: () => {
      if (ghostPositionRef.current && dragSourceRef.current) {
        moveWidgetToCell(dragSourceRef.current.id, ghostPositionRef.current.col, ghostPositionRef.current.row);
      }
      setDraggingId(null);
      setDropTargetId(null);
      setGhostPosition(null);
      dragSourceRef.current = null;
    },
  }), [moveWidgetToCell, computeGhost]);

  const maxRow = useMemo(() => widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0), [widgets]);

  // Keep a ref to ghostPosition so drag handlers can read it without re-creating useMemo
  const ghostPositionRef = useRef<GhostPosition | null>(null);
  ghostPositionRef.current = ghostPosition;

  // ── Resize handle logic ────────────────────────────────────
  const resizeRef = useRef<{
    widgetId: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const startResize = useCallback((widgetId: string, clientX: number, clientY: number) => {
    const widget = widgets.find(w => w.id === widgetId);
    if (!widget) return;
    resizeRef.current = {
      widgetId,
      startX: clientX,
      startY: clientY,
      startW: widget.w,
      startH: widget.h,
    };

    const onMove = (moveX: number, moveY: number) => {
      if (!resizeRef.current || !outerRef.current) return;
      const containerRect = outerRef.current.getBoundingClientRect();
      const cellWidth = (containerRect.width - (cols - 1) * GAP) / cols;
      const cellHeight = ROW_HEIGHT;

      const deltaW = Math.round((moveX - resizeRef.current.startX) / (cellWidth + GAP));
      const deltaH = Math.round((moveY - resizeRef.current.startY) / (cellHeight + GAP));

      const w = widgets.find(wi => wi.id === resizeRef.current!.widgetId);
      if (!w) return;
      const minS = getMinSize(w.type, bp, w.disposition);
      const newW = Math.max(minS.w, Math.min(cols - w.x, resizeRef.current.startW + deltaW));
      const newH = Math.max(minS.h, resizeRef.current.startH + deltaH);

      setLayout(prev => ({
        ...prev,
        widgets: {
          ...prev.widgets,
          [bp]: prev.widgets[bp].map(wi =>
            wi.id === resizeRef.current!.widgetId ? { ...wi, w: newW, h: newH } : wi,
          ),
        },
      }));
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0];
      if (t) onMove(t.clientX, t.clientY);
    };
    const onEnd = () => {
      resizeRef.current = null;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onEnd);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }, [widgets, cols, bp, setLayout]);

  const ctxValue = useMemo<GridCtxValue>(
    () => ({ breakpoint: bp, draggingId, dropTargetId, ghostPosition, drag, startResize }),
    [bp, draggingId, dropTargetId, ghostPosition, drag, startResize],
  );

  // Extra rows for the grid background
  const displayRows = maxRow + 2;

  return (
    <GridCtx.Provider value={ctxValue}>
      <div
        ref={outerRef}
        className={isEditMode ? 'dashboard-editing' : undefined}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridAutoRows: `${ROW_HEIGHT}px`,
          gap: `${GAP}px`,
          minHeight: maxRow * ROW_HEIGHT + Math.max(0, maxRow - 1) * GAP,
          width: '100%',
          position: 'relative',
        }}
        onDragOver={(e) => {
          if (!isEditMode) return;
          drag.onItemDragOver(e);
        }}
        onDrop={(e) => {
          if (!isEditMode || !dragSourceRef.current) return;
          drag.onItemDrop(e, '');
        }}
      >
        {/* Grid background cells visible in edit mode */}
        {isEditMode && Array.from({ length: displayRows * cols }, (_, i) => {
          const row = Math.floor(i / cols);
          const col = i % cols;
          return (
            <div
              key={`bg-${col}-${row}`}
              className="rounded-xl border border-dashed border-white/[0.04] bg-white/[0.01]"
              style={{
                gridColumnStart: col + 1,
                gridRowStart: row + 1,
                pointerEvents: 'none',
              }}
            />
          );
        })}

        {children}

        {/* Ghost placeholder during drag */}
        {isEditMode && ghostPosition && (
          <div
            className={ghostPosition.valid ? 'grid-placeholder' : 'grid-placeholder-invalid'}
            style={{
              gridColumnStart: ghostPosition.col + 1,
              gridRowStart: ghostPosition.row + 1,
              gridColumnEnd: `span ${ghostPosition.w}`,
              gridRowEnd: `span ${ghostPosition.h}`,
              pointerEvents: 'none',
              zIndex: 40,
              transition: 'all 0.15s ease',
            }}
          />
        )}
      </div>
    </GridCtx.Provider>
  );
}

// Memoized widget content
const MemoChildren = memo(function MemoChildren({ children, isEditMode }: { children: ReactNode; isEditMode: boolean }) {
  return (
    <div className={`h-full overflow-hidden rounded-2xl${isEditMode ? ' pointer-events-none select-none' : ''}`}>
      {children}
    </div>
  );
});

// Edit overlay
function EditOverlay({ id, label, widget, breakpoint }: {
  id: string; label: string; widget: GridWidget; breakpoint: Breakpoint;
}) {
  const { removeWidget, cycleSize, getCurrentPresetName, setEditingWidgetId } = useDashboardLayout();
  const { startResize } = useGridCtx();
  const hasDispositions = !!WIDGET_DISPOSITIONS[widget.type]?.length;
  const presetName = getCurrentPresetName(id, breakpoint);

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
            startResize(id, e.clientX, e.clientY);
          }}
          onTouchStart={(e) => {
            e.stopPropagation();
            const touch = e.touches[0];
            if (touch) startResize(id, touch.clientX, touch.clientY);
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

const MemoEditOverlay = memo(EditOverlay);

// GridItem - CSS Grid placement + HTML5 Drag + Touch
// Handlers from GridCtx. ZERO per-pixel JS.

export function GridItem({ id, children, readonly }: { id: string; children: ReactNode; readonly?: boolean }) {
  const { layout, isEditMode: ctxEditMode } = useDashboardLayout();
  const { breakpoint, draggingId, dropTargetId, drag } = useGridCtx();
  const isEditMode = ctxEditMode && !readonly;

  const widget = layout.widgets[breakpoint]?.find(w => w.id === id);
  if (!widget) return null;

  const isDragging = draggingId === id;
  const isDropTarget = dropTargetId === id;
  const label = WIDGET_LABELS[widget.type] ?? widget.type;
  const isStatic = widget.static ?? false;
  const canDrag = isEditMode && !isStatic;

  const gridStyle: React.CSSProperties = {
    gridColumnStart: widget.x + 1,
    gridRowStart: widget.y + 1,
    gridColumnEnd: `span ${widget.w}`,
    gridRowEnd: `span ${widget.h}`,
    transform: isDragging ? 'scale(1.05)' : 'none',
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 50 : 1,
    transition: 'transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease',
    boxShadow: isDragging
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      : isDropTarget
        ? '0 0 0 2px rgba(139, 92, 246, 0.6), 0 0 30px rgba(139, 92, 246, 0.3)'
        : 'none',
  };

  return (
    <div
      className='relative h-full'
      style={gridStyle}
      data-widget-id={id}
      draggable={canDrag}
      onDragStart={e => { if (!canDrag) { e.preventDefault(); return; } drag.onItemDragStart(e, id); }}
      onDragOver={drag.onItemDragOver}
      onDragEnter={() => drag.onItemDragEnter(id)}
      onDragLeave={drag.onItemDragLeave}
      onDrop={e => drag.onItemDrop(e, id)}
      onDragEnd={drag.onItemDragEnd}
      onTouchStart={e => {
        if (!canDrag) return;
        if (!(e.target as HTMLElement)?.closest?.('[data-drag-handle]')) return;
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;
        drag.onItemTouchStart(id, touch.clientX, touch.clientY);
      }}
      onTouchMove={e => {
        if (!canDrag || draggingId !== id) return;
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;
        drag.onItemTouchMove(touch.clientX, touch.clientY);
      }}
      onTouchEnd={() => { if (draggingId === id) drag.onItemTouchEnd(); }}
    >
      <WidgetIdCtx.Provider value={id}>
        <MemoChildren isEditMode={isEditMode}>{children}</MemoChildren>
      </WidgetIdCtx.Provider>
      {isEditMode && <MemoEditOverlay id={id} label={label} widget={widget} breakpoint={breakpoint} />}
    </div>
  );
}
