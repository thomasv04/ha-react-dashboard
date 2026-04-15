import { useDashboardLayout, useEditMode } from '@/context/DashboardLayoutContext';
import { useState, useLayoutEffect, useRef, createContext, useContext, memo, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { placeWidgetAt } from '@/lib/grid-utils';
import { getMinSize } from '@/config/widget-dispositions';
import { useGridDragDrop } from '@/hooks/useGridDragDrop';
import { GridItemOverlay } from './GridItemOverlay';
import { WidgetErrorBoundary } from '@/components/ui/WidgetErrorBoundary';
import { useMoreInfo } from '@/context/MoreInfoContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { MORE_INFO_WIDGET_TYPES } from '@/components/modals/more-info-registry';
import { useLongPress } from '@/hooks/useLongPress';

export type Breakpoint = 'lg' | 'md' | 'sm';

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
  automation: 'Automatisation',
};

// Grid Context - contains breakpoint + drag state + drag handler functions
// Handlers passed via context so GridItem can use them (like Tunet getDragProps)

import type { GhostPosition, DragHandlers } from '@/hooks/useGridDragDrop';

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
export function useWidgetId() {
  return useContext(WidgetIdCtx);
}
export function WidgetIdProvider({ id, children }: { id: string; children: ReactNode }) {
  return <WidgetIdCtx.Provider value={id}>{children}</WidgetIdCtx.Provider>;
}

const ROW_HEIGHT = 80;
const GAP = 16;

// DashboardGrid - Pure CSS Grid + HTML5 Drag API (a la Tunet)
// ZERO per-pixel JS during drag. Browser handles ghost image natively.

export function DashboardGrid({ children, readonly }: { children: ReactNode; readonly?: boolean }) {
  const { layout, setLayout } = useDashboardLayout();
  const { isEditMode: ctxEditMode } = useEditMode();
  const isEditMode = ctxEditMode && !readonly;
  const outerRef = useRef<HTMLDivElement>(null);
  const [bp, setBp] = useState<Breakpoint>('lg');

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

  const moveWidgetToCell = useCallback(
    (widgetId: string, col: number, row: number) => {
      const widget = widgets.find(w => w.id === widgetId);
      if (!widget) return;
      const clampedCol = Math.max(0, Math.min(cols - widget.w, col));
      const newWidgets = placeWidgetAt(
        widget,
        clampedCol,
        row,
        widgets.filter(w => w.id !== widgetId),
        cols
      );
      setLayout({ ...layout, widgets: { ...layout.widgets, [bp]: newWidgets } });
    },
    [widgets, layout, bp, cols, setLayout]
  );

  const {
    draggingId,
    dropTargetId,
    ghostPosition,
    dragHandlers: drag,
  } = useGridDragDrop({
    widgets,
    cols,
    containerRef: outerRef,
    onWidgetMove: moveWidgetToCell,
  });

  const maxRow = useMemo(() => widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0), [widgets]);

  // ── Resize handle logic ────────────────────────────────────
  const resizeRef = useRef<{
    widgetId: string;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const startResize = useCallback(
    (widgetId: string, clientX: number, clientY: number) => {
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

        setLayout({
          ...layout,
          widgets: {
            ...layout.widgets,
            [bp]: layout.widgets[bp].map(wi => (wi.id === resizeRef.current!.widgetId ? { ...wi, w: newW, h: newH } : wi)),
          },
        });
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
    },
    [widgets, cols, bp, setLayout, layout]
  );

  const ctxValue = useMemo<GridCtxValue>(
    () => ({ breakpoint: bp, draggingId, dropTargetId, ghostPosition, drag, startResize }),
    [bp, draggingId, dropTargetId, ghostPosition, drag, startResize]
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
        onDragOver={e => {
          if (!isEditMode) return;
          drag.onItemDragOver(e);
        }}
        onDrop={e => {
          if (!isEditMode) return;
          drag.onItemDrop(e, '');
        }}
      >
        {/* Grid background cells visible in edit mode */}
        {isEditMode &&
          Array.from({ length: displayRows * cols }, (_, i) => {
            const row = Math.floor(i / cols);
            const col = i % cols;
            return (
              <div
                key={`bg-${col}-${row}`}
                className='rounded-xl border border-dashed border-white/[0.04] bg-white/[0.01]'
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
const MemoChildren = memo(function MemoChildren({
  children,
  isEditMode,
  onClick,
  onLongPress,
  dimmed,
}: {
  children: ReactNode;
  isEditMode: boolean;
  onClick?: (rect: DOMRect) => void;
  onLongPress?: (rect: DOMRect) => void;
  dimmed?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const longPressHandlers = useLongPress(() => {
    if (onLongPress && ref.current) onLongPress(ref.current.getBoundingClientRect());
  }, 500);
  return (
    <div
      ref={ref}
      className={`h-full overflow-hidden rounded-2xl${isEditMode ? ' pointer-events-none select-none' : ''}${onClick && !isEditMode ? ' cursor-pointer' : ''}`}
      onClick={() => {
        if (onClick && ref.current) onClick(ref.current.getBoundingClientRect());
      }}
      {...(onLongPress && !isEditMode ? longPressHandlers : {})}
      style={{
        opacity: dimmed ? 0 : 1,
        transition: 'opacity 0.25s ease',
      }}
    >
      {children}
    </div>
  );
});

// GridItem - CSS Grid placement + HTML5 Drag + Touch
// Handlers from GridCtx. ZERO per-pixel JS.

export function GridItem({ id, children, readonly }: { id: string; children: ReactNode; readonly?: boolean }) {
  const { layout } = useDashboardLayout();
  const { isEditMode: ctxEditMode } = useEditMode();
  const { breakpoint, draggingId, dropTargetId, drag, startResize } = useGridCtx();
  const { openMoreInfo, state: moreInfoState } = useMoreInfo();
  const { getWidgetConfig } = useWidgetConfig();
  const isEditMode = ctxEditMode && !readonly;

  const widget = layout.widgets[breakpoint]?.find(w => w.id === id);
  if (!widget) return null;

  const isDragging = draggingId === id;
  const isDropTarget = dropTargetId === id;
  const label = WIDGET_LABELS[widget.type] ?? widget.type;
  const hasMoreInfo = MORE_INFO_WIDGET_TYPES.includes(widget.type);
  const isWidgetModalOpen = !isEditMode && moreInfoState?.widgetId === id;
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
      onDragStart={e => {
        if (!canDrag) {
          e.preventDefault();
          return;
        }
        drag.onItemDragStart(e, id);
      }}
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
      onTouchEnd={() => {
        if (draggingId === id) drag.onItemTouchEnd();
      }}
    >
      <WidgetIdCtx.Provider value={id}>
        <WidgetErrorBoundary label={label}>
          <MemoChildren
            isEditMode={isEditMode}
            dimmed={isWidgetModalOpen}
            onClick={
              !isEditMode && hasMoreInfo
                ? rect => {
                    const config = getWidgetConfig(id);
                    const cfgRecord = config as Record<string, unknown> | undefined;
                    const entityId =
                      (cfgRecord?.entityId as string) ||
                      Object.values(cfgRecord ?? {}).find((v): v is string => typeof v === 'string' && v.includes('.')) ||
                      '';
                    openMoreInfo(id, widget.type, entityId, rect);
                  }
                : undefined
            }
            onLongPress={
              !isEditMode && hasMoreInfo
                ? rect => {
                    const config = getWidgetConfig(id);
                    const cfgRecord = config as Record<string, unknown> | undefined;
                    const entityId =
                      (cfgRecord?.entityId as string) ||
                      Object.values(cfgRecord ?? {}).find((v): v is string => typeof v === 'string' && v.includes('.')) ||
                      '';
                    openMoreInfo(id, widget.type, entityId, rect);
                  }
                : undefined
            }
          >
            {children}
          </MemoChildren>
        </WidgetErrorBoundary>
      </WidgetIdCtx.Provider>
      {isEditMode && (
        <GridItemOverlay
          id={id}
          label={label}
          widget={widget}
          breakpoint={breakpoint}
          onResizeStart={(clientX, clientY) => startResize(id, clientX, clientY)}
        />
      )}
    </div>
  );
}
