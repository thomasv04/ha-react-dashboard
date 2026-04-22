import type { GridWidget } from '@/context/DashboardLayoutContext';

/**
 * Matrice d'occupation de la grille.
 * occupancy[row][col] = widgetId | null
 */
export type OccupancyMap = (string | null)[][];

/**
 * Construit la matrice d'occupation à partir des widgets.
 */
export function buildOccupancyMap(widgets: GridWidget[], cols: number, rows: number, excludeId?: string): OccupancyMap {
  const map: OccupancyMap = Array.from({ length: rows }, () => Array.from({ length: cols }, () => null));

  for (const w of widgets) {
    if (w.id === excludeId) continue;
    for (let r = w.y; r < w.y + w.h && r < rows; r++) {
      for (let c = w.x; c < w.x + w.w && c < cols; c++) {
        map[r][c] = w.id;
      }
    }
  }

  return map;
}

/**
 * Vérifie si un widget peut être placé à (col, row) sans chevauchement.
 */
export function canPlace(map: OccupancyMap, col: number, row: number, w: number, h: number, cols: number): boolean {
  if (col < 0 || col + w > cols) return false;
  if (row < 0) return false;

  const maxRow = map.length;
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      if (r < maxRow && map[r]?.[c] != null) return false;
    }
  }
  return true;
}

/**
 * Convertit des coordonnées pixel (relativement au conteneur grille)
 * en coordonnées grille (col, row).
 */
export function pixelToGrid(
  pixelX: number,
  pixelY: number,
  containerRect: DOMRect,
  cols: number,
  rowHeight: number,
  gap: number
): { col: number; row: number } {
  const relX = pixelX - containerRect.left;
  const relY = pixelY - containerRect.top;

  const cellWidth = (containerRect.width - (cols - 1) * gap) / cols;
  const cellPlusGapW = cellWidth + gap;
  const cellPlusGapH = rowHeight + gap;

  const col = Math.max(0, Math.min(cols - 1, Math.floor(relX / cellPlusGapW)));
  const row = Math.max(0, Math.floor(relY / cellPlusGapH));

  return { col, row };
}

/**
 * Compactage vertical : pousse tous les widgets le plus haut possible
 * sans chevauchement (masonry behavior).
 */
export function compactVertically(widgets: GridWidget[], cols: number): GridWidget[] {
  const sorted = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: GridWidget[] = [];

  for (const widget of sorted) {
    if (widget.static) {
      placed.push(widget);
      continue;
    }

    let bestY = 0;
    const maxSearch = 100;

    for (let tryY = 0; tryY < maxSearch; tryY++) {
      const map = buildOccupancyMap(placed, cols, tryY + widget.h + 1);
      if (canPlace(map, widget.x, tryY, widget.w, widget.h, cols)) {
        bestY = tryY;
        break;
      }
      bestY = tryY + 1;
    }

    placed.push({ ...widget, y: bestY });
  }

  return placed;
}

/**
 * Vérifie si deux rectangles de grille se chevauchent.
 */
function rectanglesOverlap(a: GridWidget, b: GridWidget): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/**
 * Place un widget à (col, row). Si ça chevauche d'autres widgets,
 * les pousse vers le bas. Retourne le layout mis à jour.
 */
export function placeWidgetAt(widget: GridWidget, col: number, row: number, otherWidgets: GridWidget[], cols: number): GridWidget[] {
  const movedWidget = { ...widget, x: col, y: row };

  const conflicting = new Set<string>();
  for (const other of otherWidgets) {
    if (other.id === widget.id) continue;
    if (rectanglesOverlap(movedWidget, other)) {
      conflicting.add(other.id);
    }
  }

  const result = otherWidgets.map(w => {
    if (w.id === widget.id) return movedWidget;
    if (conflicting.has(w.id)) {
      return { ...w, y: row + movedWidget.h };
    }
    return w;
  });

  if (!result.some(w => w.id === widget.id)) {
    result.push(movedWidget);
  }

  return compactVertically(result, cols);
}
