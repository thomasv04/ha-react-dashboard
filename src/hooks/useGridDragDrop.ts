import { useState, useRef, useCallback, useMemo } from 'react';
import { buildOccupancyMap, canPlace, pixelToGrid, placeWidgetAt } from '@/lib/grid-utils';
import type { GridWidget } from '@/context/DashboardLayoutContext';
import type { DashboardLayout } from '@/context/DashboardLayoutContext';

export interface GhostPosition {
  col: number;
  row: number;
  w: number;
  h: number;
  valid: boolean;
}

export interface DragHandlers {
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

const ROW_HEIGHT = 80;
const GAP = 16;

interface UseGridDragDropParams {
  widgets: GridWidget[];
  cols: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onWidgetMove: (id: string, col: number, row: number) => void;
}

interface UseGridDragDropResult {
  draggingId: string | null;
  dropTargetId: string | null;
  ghostPosition: GhostPosition | null;
  ghostPositionRef: React.RefObject<GhostPosition | null>;
  dragHandlers: DragHandlers;
}

export function useGridDragDrop({
  widgets,
  cols,
  containerRef,
  onWidgetMove,
}: UseGridDragDropParams): UseGridDragDropResult {
  const dragSourceRef = useRef<{ id: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [ghostPosition, setGhostPosition] = useState<GhostPosition | null>(null);
  const ghostPositionRef = useRef<GhostPosition | null>(null);
  ghostPositionRef.current = ghostPosition;

  const computeGhost = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current || !dragSourceRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const widget = widgets.find(w => w.id === dragSourceRef.current!.id);
    if (!widget) return;
    const { col, row } = pixelToGrid(clientX, clientY, containerRect, cols, ROW_HEIGHT, GAP);
    const clampedCol = Math.max(0, Math.min(cols - widget.w, col));
    const maxRow = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0) + 5;
    const map = buildOccupancyMap(widgets, cols, maxRow, widget.id);
    const valid = canPlace(map, clampedCol, row, widget.w, widget.h, cols);
    const next: GhostPosition = { col: clampedCol, row, w: widget.w, h: widget.h, valid };
    ghostPositionRef.current = next;
    setGhostPosition(next);
  }, [widgets, cols, containerRef]);

  const dragHandlers = useMemo<DragHandlers>(() => ({
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
      onWidgetMove(sourceId, ghostPositionRef.current.col, ghostPositionRef.current.row);
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
      setDraggingId(id);
    },
    onItemTouchMove: (x, y) => {
      if (!dragSourceRef.current) return;
      computeGhost(x, y);
    },
    onItemTouchEnd: () => {
      if (ghostPositionRef.current && dragSourceRef.current) {
        onWidgetMove(dragSourceRef.current.id, ghostPositionRef.current.col, ghostPositionRef.current.row);
      }
      setDraggingId(null);
      setDropTargetId(null);
      setGhostPosition(null);
      dragSourceRef.current = null;
    },
  }), [computeGhost, onWidgetMove]);

  return { draggingId, dropTargetId, ghostPosition, ghostPositionRef, dragHandlers };
}

// Re-export helpers used by DashboardGrid
export { placeWidgetAt };
export type { DashboardLayout };
