# 11 — Free Grid Placement : Drag-and-Drop vers n'importe quelle cellule

## Problème actuel

Aujourd'hui le drag-and-drop ne fait que **swapper** deux widgets. Si tu drags la WeatherCard sur la CameraCard, elles échangent leurs positions. Mais tu ne peux pas :
- Déplacer un widget vers une zone **vide** de la grille
- Placer un widget exactement où tu veux (colonne X, ligne Y)
- Voir les cellules disponibles sur la grille

Il faut passer d'un modèle "swap" à un modèle **"placement libre sur grille"** avec détection de collision et reflow automatique (masonry).

## Résultat attendu

- En mode édition, la grille affiche un **fond quadrillé** (cells visibles)
- En draggant un widget, un **ghost placeholder** suit la souris et snape aux coordonnées de la grille
- Le widget se dépose à la position exacte de la cellule visée
- Si la position est occupée, les widgets existants **se décalent vers le bas** (comme un masonry vertical)
- Les widgets ne peuvent **jamais se chevaucher**
- Fonctionne au touch (mobile) et à la souris (desktop)

---

## Architecture

### Concepts clés

```
GridCell(col, row)    — Une cellule de la grille (0-indexed)
OccupancyMap          — Matrice 2D booléenne : quelles cellules sont occupées
PlacementTarget       — Position (col, row) calculée en temps réel pendant le drag
Reflow / Compact      — Algorithme qui pousse les widgets vers le bas si conflit
```

### Flux du drag

```
1. User commence le drag (mousedown/touchstart sur le handle)
2. On retire le widget de l'occupancy map (il "flotte")
3. On calcule la cellule sous le curseur (pixel → col/row)
4. On vérifie si le placement est valide (pas hors limites, pas de chevauchement)
5. On affiche le ghost placeholder à cette position
6. Au drop : on place le widget et on relance le compactage
7. Les widgets qui chevauchaient descendent (reflow)
```

---

## Étape 1 : Utilitaire OccupancyMap

Créer un module utilitaire pour gérer la grille d'occupation :

### `src/lib/grid-utils.ts`

```typescript
import type { GridWidget } from '@/context/DashboardLayoutContext';

/**
 * Matrice d'occupation de la grille.
 * occupancy[row][col] = widgetId | null
 */
export type OccupancyMap = (string | null)[][];

/**
 * Construit la matrice d'occupation à partir des widgets.
 * @param widgets Liste des widgets
 * @param cols Nombre de colonnes
 * @param excludeId Widget à exclure (celui qu'on drag)
 */
export function buildOccupancyMap(
  widgets: GridWidget[],
  cols: number,
  rows: number,
  excludeId?: string,
): OccupancyMap {
  const map: OccupancyMap = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null),
  );

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
export function canPlace(
  map: OccupancyMap,
  col: number,
  row: number,
  w: number,
  h: number,
  cols: number,
): boolean {
  // Hors limites horizontales
  if (col < 0 || col + w > cols) return false;
  // Hors limites verticales (on autorise l'extension vers le bas)
  if (row < 0) return false;

  const maxRow = map.length;
  for (let r = row; r < row + h; r++) {
    for (let c = col; c < col + w; c++) {
      // Si la ligne existe dans la map et est occupée → invalide
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
  gap: number,
): { col: number; row: number } {
  const relX = pixelX - containerRect.left;
  const relY = pixelY - containerRect.top;

  // Taille d'une cellule (avec gap)
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
 * Retourne un nouveau tableau de widgets avec les positions ajustées.
 */
export function compactVertically(
  widgets: GridWidget[],
  cols: number,
): GridWidget[] {
  // Trier par y puis par x (traiter les widgets du haut en premier)
  const sorted = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);
  const placed: GridWidget[] = [];

  for (const widget of sorted) {
    if (widget.static) {
      // Les widgets statiques ne bougent pas
      placed.push(widget);
      continue;
    }

    // Chercher la position y la plus haute possible pour ce widget
    let bestY = 0;
    const maxSearch = 100; // Limite de recherche

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
 * Place un widget à (col, row). Si ça chevauche d'autres widgets,
 * les pousse vers le bas. Retourne le layout mis à jour.
 */
export function placeWidgetAt(
  widget: GridWidget,
  col: number,
  row: number,
  otherWidgets: GridWidget[],
  cols: number,
): GridWidget[] {
  const movedWidget = { ...widget, x: col, y: row };
  
  // Identifier les widgets chevauchés
  const conflicting = new Set<string>();
  for (const other of otherWidgets) {
    if (other.id === widget.id) continue;
    if (rectanglesOverlap(movedWidget, other)) {
      conflicting.add(other.id);
    }
  }

  // Pousser les widgets en conflit vers le bas
  let result = otherWidgets.map(w => {
    if (w.id === widget.id) return movedWidget;
    if (conflicting.has(w.id)) {
      // Décaler sous le widget placé
      return { ...w, y: row + movedWidget.h };
    }
    return w;
  });

  // Si le widget draggé n'était pas dans la liste, l'ajouter
  if (!result.some(w => w.id === widget.id)) {
    result.push(movedWidget);
  }

  // Compacter pour combler les trous
  return compactVertically(result, cols);
}

/**
 * Vérifie si deux rectangles de grille se chevauchent.
 */
function rectanglesOverlap(a: GridWidget, b: GridWidget): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}
```

---

## Étape 2 : Modifier DashboardGrid pour le placement libre

Les modifications clés dans `DashboardGrid.tsx` :

### 2a. Ajouter le fond quadrillé en mode édition

```typescript
// Nouveau composant : grille de fond visible en mode édition
function GridBackground({ cols, maxRow, rowHeight, gap }: {
  cols: number; maxRow: number; rowHeight: number; gap: number;
}) {
  const cells: React.ReactNode[] = [];
  // Afficher 2 lignes de plus que le contenu pour permettre le placement en dessous
  const displayRows = maxRow + 2;

  for (let row = 0; row < displayRows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push(
        <div
          key={`${col}-${row}`}
          className="rounded-xl border border-dashed border-white/[0.04] bg-white/[0.01]"
          style={{
            gridColumnStart: col + 1,
            gridRowStart: row + 1,
          }}
        />
      );
    }
  }
  return <>{cells}</>;
}
```

### 2b. Remplacer le `swapWidgets` par `moveWidgetToCell`

```typescript
import {
  buildOccupancyMap,
  canPlace,
  pixelToGrid,
  placeWidgetAt,
  compactVertically,
} from '@/lib/grid-utils';

// Dans DashboardGrid :

// État : position ghost pendant le drag
const [ghostPosition, setGhostPosition] = useState<{
  col: number; row: number; w: number; h: number; valid: boolean;
} | null>(null);

// Remplacer swapWidgets par :
const moveWidgetToCell = useCallback((widgetId: string, col: number, row: number) => {
  const widget = widgets.find(w => w.id === widgetId);
  if (!widget) return;
  
  // Clamper la colonne pour que le widget ne sorte pas de la grille
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
```

### 2c. Modifier les drag handlers pour calculer la position grille

```typescript
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

    if (!outerRef.current || !dragSourceRef.current) return;
    const containerRect = outerRef.current.getBoundingClientRect();
    const widget = widgets.find(w => w.id === dragSourceRef.current!.id);
    if (!widget) return;

    // Convertir pixel → cellule de grille
    const { col, row } = pixelToGrid(
      e.clientX, e.clientY, containerRect, cols, ROW_HEIGHT, GAP,
    );

    // Clamper pour que le widget ne déborde pas
    const clampedCol = Math.max(0, Math.min(cols - widget.w, col));

    // Vérifier si le placement est valide
    const maxRow = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0) + 5;
    const map = buildOccupancyMap(widgets, cols, maxRow, widget.id);
    const valid = canPlace(map, clampedCol, row, widget.w, widget.h, cols);

    setGhostPosition({ col: clampedCol, row, w: widget.w, h: widget.h, valid });
  },

  onItemDragEnter: () => {}, // Plus besoin du swap enter
  onItemDragLeave: () => {},

  onItemDrop: (e, _targetId) => {
    e.preventDefault();
    e.stopPropagation();
    const sourceId = e.dataTransfer.getData('text/plain');
    if (!sourceId || !ghostPosition) return;

    moveWidgetToCell(sourceId, ghostPosition.col, ghostPosition.row);
    setDraggingId(null);
    setGhostPosition(null);
    dragSourceRef.current = null;
  },

  onItemDragEnd: () => {
    setDraggingId(null);
    setGhostPosition(null);
    dragSourceRef.current = null;
  },

  // Touch : même logique
  onItemTouchStart: (id, _x, _y) => {
    dragSourceRef.current = { id };
    touchSwapCooldownRef.current = 0;
    setDraggingId(id);
  },
  onItemTouchMove: (x, y) => {
    if (!dragSourceRef.current || !outerRef.current) return;
    const widget = widgets.find(w => w.id === dragSourceRef.current!.id);
    if (!widget) return;

    const containerRect = outerRef.current.getBoundingClientRect();
    const { col, row } = pixelToGrid(x, y, containerRect, cols, ROW_HEIGHT, GAP);
    const clampedCol = Math.max(0, Math.min(cols - widget.w, col));

    const maxRow = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0) + 5;
    const map = buildOccupancyMap(widgets, cols, maxRow, widget.id);
    const valid = canPlace(map, clampedCol, row, widget.w, widget.h, cols);

    setGhostPosition({ col: clampedCol, row, w: widget.w, h: widget.h, valid });
  },
  onItemTouchEnd: () => {
    if (ghostPosition && dragSourceRef.current) {
      moveWidgetToCell(dragSourceRef.current.id, ghostPosition.col, ghostPosition.row);
    }
    setDraggingId(null);
    setGhostPosition(null);
    dragSourceRef.current = null;
  },
}), [widgets, cols, ghostPosition, moveWidgetToCell]);
```

### 2d. Afficher le ghost placeholder et la grille de fond

```typescript
// Dans le return du DashboardGrid, à l'intérieur du <div> grille :

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
      // Permettre le drop sur la grille entière (zones vides)
      onDragOver={(e) => {
        if (!isEditMode) return;
        drag.onItemDragOver(e);
      }}
      onDrop={(e) => {
        if (!isEditMode || !dragSourceRef.current) return;
        drag.onItemDrop(e, '');
      }}
    >
      {/* Fond quadrillé visible en mode édition */}
      {isEditMode && (
        <GridBackground cols={cols} maxRow={maxRow} rowHeight={ROW_HEIGHT} gap={GAP} />
      )}

      {/* Widgets */}
      {children}

      {/* Ghost placeholder pendant le drag */}
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
```

---

## Étape 3 : Ajouter les styles CSS pour le ghost

Dans `src/index.css`, ajouter :

```css
/* Ghost placeholder - position valide */
.grid-placeholder {
  background: rgba(139, 92, 246, 0.15);
  border: 2px dashed rgba(139, 92, 246, 0.5);
  border-radius: 1rem;
  z-index: 5;
}

/* Ghost placeholder - position invalide (chevauchement) */
.grid-placeholder-invalid {
  background: rgba(239, 68, 68, 0.10);
  border: 2px dashed rgba(239, 68, 68, 0.4);
  border-radius: 1rem;
  z-index: 5;
}

/* Fond quadrillé de la grille en mode édition */
.dashboard-editing {
  /* Le backdrop-filter kill est déjà là */
}
```

---

## Étape 4 : Compactage automatique au chargement

Dans `DashboardLayoutContext.tsx`, ajouter un compactage au chargement pour s'assurer que le layout est toujours cohérent :

```typescript
import { compactVertically } from '@/lib/grid-utils';

// Dans DashboardLayoutProvider, après le chargement du layout :
useEffect(() => {
  if (initialLayout) {
    // Compacter chaque breakpoint pour éviter les trous/chevauchements
    const compacted: typeof layout.widgets = {
      lg: compactVertically(initialLayout.widgets.lg, initialLayout.cols.lg),
      md: compactVertically(initialLayout.widgets.md, initialLayout.cols.md),
      sm: compactVertically(initialLayout.widgets.sm, initialLayout.cols.sm),
    };
    setLayout({ ...initialLayout, widgets: compacted });
  }
}, [initialLayout]);
```

---

## Étape 5 : Tests pour grid-utils

### `src/lib/grid-utils.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import {
  buildOccupancyMap,
  canPlace,
  compactVertically,
  placeWidgetAt,
  pixelToGrid,
} from './grid-utils';
import type { GridWidget } from '@/context/DashboardLayoutContext';

const w = (id: string, x: number, y: number, ww: number, h: number): GridWidget => ({
  id, type: 'sensor', x, y, w: ww, h,
});

describe('buildOccupancyMap', () => {
  it('marks occupied cells', () => {
    const widgets = [w('a', 0, 0, 2, 1)];
    const map = buildOccupancyMap(widgets, 4, 2);
    expect(map[0][0]).toBe('a');
    expect(map[0][1]).toBe('a');
    expect(map[0][2]).toBeNull();
  });

  it('excludes specified widget', () => {
    const widgets = [w('a', 0, 0, 2, 1), w('b', 2, 0, 1, 1)];
    const map = buildOccupancyMap(widgets, 4, 2, 'a');
    expect(map[0][0]).toBeNull();
    expect(map[0][2]).toBe('b');
  });
});

describe('canPlace', () => {
  it('allows placement in empty area', () => {
    const map = buildOccupancyMap([], 4, 4);
    expect(canPlace(map, 0, 0, 2, 2, 4)).toBe(true);
  });

  it('rejects placement out of bounds', () => {
    const map = buildOccupancyMap([], 4, 4);
    expect(canPlace(map, 3, 0, 2, 1, 4)).toBe(false); // déborde à droite
  });

  it('rejects overlap', () => {
    const widgets = [w('a', 0, 0, 2, 2)];
    const map = buildOccupancyMap(widgets, 4, 4);
    expect(canPlace(map, 1, 0, 2, 2, 4)).toBe(false);
  });
});

describe('compactVertically', () => {
  it('moves widgets up to fill gaps', () => {
    const widgets = [w('a', 0, 5, 2, 1)]; // Widget à y=5 sans rien au-dessus
    const result = compactVertically(widgets, 4);
    expect(result[0].y).toBe(0); // Remonté à y=0
  });

  it('preserves static widgets', () => {
    const widgets = [{ ...w('a', 0, 3, 2, 1), static: true }];
    const result = compactVertically(widgets, 4);
    expect(result[0].y).toBe(3); // Pas bougé
  });

  it('stacks widgets without overlap', () => {
    const widgets = [w('a', 0, 0, 4, 1), w('b', 0, 0, 4, 1)]; // Même position
    const result = compactVertically(widgets, 4);
    expect(result[0].y).toBe(0);
    expect(result[1].y).toBe(1); // Poussé en dessous
  });
});

describe('pixelToGrid', () => {
  it('converts pixel to grid coords', () => {
    const rect = { left: 0, top: 0, width: 400, height: 600 } as DOMRect;
    const { col, row } = pixelToGrid(110, 95, rect, 4, 80, 16);
    expect(col).toBeGreaterThanOrEqual(0);
    expect(row).toBeGreaterThanOrEqual(0);
  });
});
```

---

## Vérification

- [ ] En mode édition, la grille de fond (cellules en pointillés) est visible
- [ ] En draggant un widget, le ghost placeholder suit le curseur et snape aux cellules
- [ ] Le ghost est violet quand le placement est valide, rouge quand invalide
- [ ] Déposer un widget sur une zone vide le place à cet endroit exact
- [ ] Déposer un widget sur un widget existant pousse l'existant vers le bas
- [ ] Le compactage automatique comble les trous verticaux
- [ ] Le drag fonctionne au touch (mobile)
- [ ] Les widgets `static` ne bougent pas et ne sont pas compactés
- [ ] `npx tsc --noEmit` et `npx vitest run` passent

## Cas limites à tester

- Drag d'un widget large (6 cols) vers la dernière colonne → clampe à droite
- Drag vers une position très basse → la grille s'étend verticalement
- Deux widgets côte à côte → pas de chevauchement même en cas de reflow rapide
- Touch drag avec cooldown → pas de jitter
