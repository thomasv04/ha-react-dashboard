import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
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

/** Bande sensible en haut/bas de la zone scrollable, en px. */
const EDGE_ZONE = 90;
/** Vitesse max, en px par frame (~60 fps → 1000 px/s). */
const EDGE_MAX_SPEED = 17;

/**
 * Vitesse de défilement quand le pointeur entre dans la bande haute ou basse :
 * 0 au milieu, `EDGE_MAX_SPEED` collé au bord. Négatif = vers le haut.
 */
export function edgeScrollSpeed(clientY: number, top: number, bottom: number, zone = EDGE_ZONE, max = EDGE_MAX_SPEED): number {
  if (bottom - top < zone * 2) return 0; // zone trop courte : les deux bandes se chevaucheraient
  if (clientY < top + zone) return -max * Math.min(1, (top + zone - clientY) / zone);
  if (clientY > bottom - zone) return max * Math.min(1, (clientY - (bottom - zone)) / zone);
  return 0;
}

/** Ancêtre réellement scrollable, sinon le document. */
function findScroller(el: HTMLElement | null): HTMLElement {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const overflowY = getComputedStyle(node).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) return node;
  }
  return (document.scrollingElement as HTMLElement | null) ?? document.documentElement;
}

interface UseGridDragDropParams {
  widgets: GridWidget[];
  cols: number;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onWidgetMove: (id: string, col: number, row: number) => void;
  gap?: number;
  rowHeight?: number;
}

interface UseGridDragDropResult {
  draggingId: string | null;
  dropTargetId: string | null;
  ghostPosition: GhostPosition | null;
  dragHandlers: DragHandlers;
}

export function useGridDragDrop({
  widgets,
  cols,
  containerRef,
  onWidgetMove,
  gap = GAP,
  rowHeight = ROW_HEIGHT,
}: UseGridDragDropParams): UseGridDragDropResult {
  const dragSourceRef = useRef<{ id: string } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [ghostPosition, setGhostPosition] = useState<GhostPosition | null>(null);
  const ghostPositionRef = useRef<GhostPosition | null>(null);

  const computeGhost = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current || !dragSourceRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const widget = widgets.find(w => w.id === dragSourceRef.current!.id);
      if (!widget) return;
      const { col, row } = pixelToGrid(clientX, clientY, containerRect, cols, rowHeight, gap);
      const clampedCol = Math.max(0, Math.min(cols - widget.w, col));
      const maxRow = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0) + 5;
      const map = buildOccupancyMap(widgets, cols, maxRow, widget.id);
      const valid = canPlace(map, clampedCol, row, widget.w, widget.h, cols);
      const next: GhostPosition = { col: clampedCol, row, w: widget.w, h: widget.h, valid };
      ghostPositionRef.current = next;
      setGhostPosition(next);
    },
    [widgets, cols, containerRef, gap, rowHeight]
  );

  // Défilement automatique quand on traîne une card vers le haut ou le bas de
  // l'écran : sans ça, impossible de remonter un widget du bas de la page vers
  // le haut — le drag HTML5 comme le tactile empêchent le scroll natif.
  const autoScroll = useRef<{ speed: number; raf: number; scroller: HTMLElement | null }>({ speed: 0, raf: 0, scroller: null });
  const lastPointer = useRef({ x: 0, y: 0 });

  const stopAutoScroll = useCallback(() => {
    if (autoScroll.current.raf) cancelAnimationFrame(autoScroll.current.raf);
    autoScroll.current = { speed: 0, raf: 0, scroller: null };
  }, []);

  const updateAutoScroll = useCallback(
    (clientX: number, clientY: number) => {
      lastPointer.current = { x: clientX, y: clientY };
      // Résolu une fois par drag : `getComputedStyle` sur toute la chaîne de
      // parents à chaque `dragover` forcerait un recalcul de style par frame.
      const scroller = (autoScroll.current.scroller ??= findScroller(containerRef.current));
      const isDoc = scroller === document.scrollingElement || scroller === document.documentElement;
      const rect = isDoc ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect();
      autoScroll.current.speed = edgeScrollSpeed(clientY, rect.top, rect.bottom);

      if (!autoScroll.current.speed) {
        // Sortie de la bande : on coupe la boucle mais on garde le scroller
        // résolu, le drag n'est pas terminé.
        if (autoScroll.current.raf) cancelAnimationFrame(autoScroll.current.raf);
        autoScroll.current.raf = 0;
        return;
      }
      if (autoScroll.current.raf) return; // boucle déjà lancée
      const step = () => {
        const { speed } = autoScroll.current;
        if (!speed) return stopAutoScroll();
        scroller.scrollBy(0, speed);
        // Le pointeur ne bouge plus mais la grille défile sous lui : sans ce
        // recalcul, le fantôme resterait figé sur la case de départ.
        computeGhost(lastPointer.current.x, lastPointer.current.y);
        autoScroll.current.raf = requestAnimationFrame(step);
      };
      autoScroll.current.raf = requestAnimationFrame(step);
    },
    [containerRef, stopAutoScroll, computeGhost]
  );

  const dragHandlers = useMemo<DragHandlers>(
    () => ({
      onItemDragStart: (e, id) => {
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
        dragSourceRef.current = { id };
        setTimeout(() => setDraggingId(id), 0);
      },
      onItemDragOver: e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        computeGhost(e.clientX, e.clientY);
        updateAutoScroll(e.clientX, e.clientY);
      },
      onItemDragEnter: id => {
        if (!dragSourceRef.current || dragSourceRef.current.id === id) return;
        setDropTargetId(id);
      },
      onItemDragLeave: () => setDropTargetId(null),
      onItemDrop: (e, _targetId) => {
        e.preventDefault();
        e.stopPropagation();
        stopAutoScroll();
        const sourceId = e.dataTransfer.getData('text/plain');
        if (!sourceId || !ghostPositionRef.current) return;
        onWidgetMove(sourceId, ghostPositionRef.current.col, ghostPositionRef.current.row);
        setDraggingId(null);
        setDropTargetId(null);
        setGhostPosition(null);
        dragSourceRef.current = null;
      },
      onItemDragEnd: () => {
        stopAutoScroll();
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
        updateAutoScroll(x, y);
      },
      onItemTouchEnd: () => {
        stopAutoScroll();
        if (ghostPositionRef.current && dragSourceRef.current) {
          onWidgetMove(dragSourceRef.current.id, ghostPositionRef.current.col, ghostPositionRef.current.row);
        }
        setDraggingId(null);
        setDropTargetId(null);
        setGhostPosition(null);
        dragSourceRef.current = null;
      },
    }),
    [computeGhost, onWidgetMove, updateAutoScroll, stopAutoScroll]
  );

  // Un démontage en plein drag (sortie du mode édition) laisserait la boucle
  // rAF tourner et la page défiler toute seule.
  useEffect(() => stopAutoScroll, [stopAutoScroll]);

  return { draggingId, dropTargetId, ghostPosition, dragHandlers };
}

// Re-export helpers used by DashboardGrid
export { placeWidgetAt };
export type { DashboardLayout };
