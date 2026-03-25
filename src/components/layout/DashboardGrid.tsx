import { useDashboardLayout, type GridWidget } from '@/context/DashboardLayoutContext';
import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';

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
};

// ── Drag state ────────────────────────────────────────────────────────────────
interface DragInfo {
  id: string;
  widget: GridWidget;
  mouseX: number;
  mouseY: number;
  offsetX: number;
  offsetY: number;
  elWidth: number;
  elHeight: number;
}

interface DropPos {
  x: number;
  y: number;
}

function resolveDropPos(mx: number, my: number, gridEl: HTMLElement, cols: number): DropPos {
  const rect = gridEl.getBoundingClientRect();
  const relX = mx - rect.left;
  const relY = my - rect.top;
  const colW = rect.width / cols;
  const x = Math.max(0, Math.min(Math.floor(relX / colW), cols - 1));

  const rowsStr = getComputedStyle(gridEl).gridTemplateRows;
  const rows = rowsStr
    .split(' ')
    .map(parseFloat)
    .filter(v => !isNaN(v));
  const gap = 16;
  let y = rows.length;
  let cum = 0;
  for (let i = 0; i < rows.length; i++) {
    cum += (i > 0 ? gap : 0) + rows[i];
    if (relY <= cum) {
      y = i;
      break;
    }
  }
  return { x, y };
}

// ── Fonctions de collision et compactage ──────────────────────────────────────
function hasCollision(widget1: GridWidget, widget2: GridWidget): boolean {
  return !(
    widget1.x + widget1.w <= widget2.x ||
    widget1.x >= widget2.x + widget2.w ||
    widget1.y + widget1.h <= widget2.y ||
    widget1.y >= widget2.y + widget2.h
  );
}

function compactLayout(widgets: GridWidget[]): GridWidget[] {
  const sorted = [...widgets].sort((a, b) => {
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  const compacted: GridWidget[] = [];

  sorted.forEach(widget => {
    if (widget.static) {
      compacted.push(widget);
      return;
    }

    let newY = 0;
    let hasCollisionAtY = true;

    while (hasCollisionAtY) {
      hasCollisionAtY = false;
      const testWidget = { ...widget, y: newY };

      for (const other of compacted) {
        if (hasCollision(testWidget, other)) {
          hasCollisionAtY = true;
          newY = other.y + other.h;
          break;
        }
      }
    }

    compacted.push({ ...widget, y: newY });
  });

  return compacted;
}

// ── Grid Context ──────────────────────────────────────────────────────────────
interface GridCtxValue {
  breakpoint: Breakpoint;
  dragId: string | null;
  startDrag: (id: string, widget: GridWidget, e: React.MouseEvent) => void;
}

const GridCtx = createContext<GridCtxValue | null>(null);

function useGridCtx() {
  const ctx = useContext(GridCtx);
  if (!ctx) throw new Error('useGridCtx must be used inside DashboardGrid');
  return ctx;
}

// ── DashboardGrid ─────────────────────────────────────────────────────────────
export function DashboardGrid({ children }: { children: React.ReactNode }) {
  const { layout, updateWidget, setLayout } = useDashboardLayout();
  const [bp, setBp] = useState<Breakpoint>(resolveBreakpoint(window.innerWidth));
  const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragInfo | null>(null);
  const [dropPos, setDropPos] = useState<DropPos | null>(null);

  useEffect(() => {
    const onResize = () => setBp(resolveBreakpoint(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const startDrag = useCallback((id: string, widget: GridWidget, e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.querySelector(`[data-widget-id="${id}"]`) as HTMLElement | null;
    const rect = el?.getBoundingClientRect();
    setDrag({
      id,
      widget,
      mouseX: e.clientX,
      mouseY: e.clientY,
      offsetX: rect ? e.clientX - rect.left : 0,
      offsetY: rect ? e.clientY - rect.top : 0,
      elWidth: rect?.width ?? 200,
      elHeight: rect?.height ?? 100,
    });
  }, []);

  // ✅ Fonction de gestion du drop avec collision et swap
  const handleDropInternal = useCallback(
    (draggedWidget: GridWidget, newX: number, newY: number) => {
      const updatedWidget = { ...draggedWidget, x: newX, y: newY };

      // Trouver le widget en collision
      const collidingWidget = layout.widgets[bp].find(w => w.id !== draggedWidget.id && hasCollision(updatedWidget, w));

      if (collidingWidget) {
        // Swap : échanger les positions
        const tempX = collidingWidget.x;
        const tempY = collidingWidget.y;

        updateWidget(
          collidingWidget.id,
          {
            x: draggedWidget.x,
            y: draggedWidget.y,
          },
          bp
        );

        updateWidget(
          draggedWidget.id,
          {
            x: tempX,
            y: tempY,
          },
          bp
        );
      } else {
        // Pas de collision : mise à jour simple
        updateWidget(draggedWidget.id, { x: newX, y: newY }, bp);
      }

      // Compacter le layout après un court délai
      setTimeout(() => {
        const currentWidgets = layout.widgets[bp];
        const compacted = compactLayout(currentWidgets);
        setLayout({
          ...layout,
          widgets: { ...layout.widgets, [bp]: compacted },
        });
      }, 50);
    },
    [layout, bp, updateWidget, setLayout]
  );

  // Drag + mouse tracking
  useEffect(() => {
    if (!drag) return;

    const onMove = (e: MouseEvent) => {
      setDrag(d => (d ? { ...d, mouseX: e.clientX, mouseY: e.clientY } : null));
      if (gridEl) {
        setDropPos(resolveDropPos(e.clientX, e.clientY, gridEl, layout.cols[bp]));
      }
    };

    const onUp = () => {
      if (drag && dropPos) {
        const cols = layout.cols[bp];
        const nx = Math.max(0, Math.min(dropPos.x, cols - Math.ceil(drag.widget.w)));
        const ny = dropPos.y;

        // ✅ Appel de la fonction avec gestion des collisions
        handleDropInternal(drag.widget, nx, ny);
      }
      setDrag(null);
      setDropPos(null);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, dropPos, bp, layout.cols, gridEl, handleDropInternal]);

  const cols = layout.cols[bp];

  return (
    <GridCtx.Provider value={{ breakpoint: bp, dragId: drag?.id ?? null, startDrag }}>
      <div
        ref={setGridEl}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          gridAutoRows: 'auto',
          gap: '1rem',
          backgroundImage: `linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)`,
          backgroundSize: `calc(100% / ${cols}) 100%`,
        }}
      >
        {children}
      </div>

      {/* Drop highlight */}
      {drag && dropPos && gridEl && <DropHighlight gridEl={gridEl} pos={dropPos} w={drag.widget.w} h={drag.widget.h} cols={cols} />}

      {/* Drag ghost */}
      {drag && (
        <motion.div
          className='fixed pointer-events-none z-[100] rounded-2xl border border-purple-400/50 bg-purple-600/15 flex items-center justify-center'
          style={{
            left: drag.mouseX - drag.offsetX,
            top: drag.mouseY - drag.offsetY,
            width: drag.elWidth,
            height: drag.elHeight,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ duration: 0.1 }}
        >
          <div className='flex flex-col items-center gap-1.5'>
            <GripVertical size={18} className='text-purple-300/60' />
            <span className='text-white/50 text-xs font-medium'>{WIDGET_LABELS[drag.widget.type]}</span>
          </div>
        </motion.div>
      )}
    </GridCtx.Provider>
  );
}

// ── Drop highlight ────────────────────────────────────────────────────────────
function DropHighlight({
  gridEl,
  pos,
  w,
  h, // ✅ AJOUT : hauteur du widget en lignes
  cols,
}: {
  gridEl: HTMLElement;
  pos: DropPos;
  w: number;
  h: number; // ✅ AJOUT
  cols: number;
}) {
  const rect = gridEl.getBoundingClientRect();
  const gap = 16;
  const colW = (rect.width - (cols - 1) * gap) / cols;

  // Récupérer toutes les hauteurs de lignes
  const rows = getComputedStyle(gridEl)
    .gridTemplateRows.split(' ')
    .map(parseFloat)
    .filter(v => !isNaN(v));

  // ✅ Calculer la position Y de départ
  let top = rect.top;
  for (let i = 0; i < pos.y && i < rows.length; i++) {
    top += rows[i] + gap;
  }

  // ✅ Calculer la hauteur totale (plusieurs lignes + gaps)
  let totalHeight = 0;
  const endRow = Math.min(pos.y + Math.ceil(h), rows.length);

  for (let i = pos.y; i < endRow; i++) {
    totalHeight += rows[i] ?? 100; // Hauteur par défaut si ligne inexistante
    if (i < endRow - 1) {
      totalHeight += gap; // Ajouter le gap entre les lignes
    }
  }

  // ✅ Calculer la largeur (peut s'étendre sur plusieurs colonnes)
  const effectiveW = Math.min(Math.ceil(w), cols - pos.x);
  const left = rect.left + pos.x * (colW + gap);
  const width = effectiveW * colW + (effectiveW - 1) * gap;

  return (
    <div
      className='fixed pointer-events-none z-40 rounded-2xl border-2 border-dashed border-purple-400/50 bg-purple-500/8 transition-all duration-100'
      style={{
        left,
        top,
        width,
        height: totalHeight, // ✅ Hauteur correcte
      }}
    />
  );
}

// ── GridItem ──────────────────────────────────────────────────────────────────
export function GridItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { layout, isEditMode, removeWidget } = useDashboardLayout();
  const { breakpoint, dragId, startDrag } = useGridCtx();

  const widget = layout.widgets[breakpoint]?.find(w => w.id === id);
  if (!widget) {
    console.warn(`Widget "${id}" not found for breakpoint "${breakpoint}"`);
    return null;
  }

  const gridColumn = `${Math.ceil(widget.x) + 1} / span ${Math.ceil(widget.w)}`;
  const gridRow = `${Math.ceil(widget.y) + 1} / span ${Math.ceil(widget.h)}`;
  const isDragging = dragId === id;
  const label = WIDGET_LABELS[widget.type] ?? widget.type;

  return (
    <div
      data-widget-id={id}
      className='relative h-full'
      style={{
        gridColumn,
        gridRow,
        opacity: isDragging ? 0.3 : 1,
        transition: 'opacity 0.15s',
      }}
    >
      <div className={`h-full${isEditMode ? ' pointer-events-none select-none' : ''}`}>{children}</div>

      <AnimatePresence>
        {isEditMode &&
          (widget.static ? (
            <motion.div
              key={`badge-${id}`}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.12 }}
              className='absolute top-2 right-2 z-10 p-1.5 rounded-lg bg-black/30 border border-white/10 text-white/35'
              title={`${label} — widget fixe`}
            >
              <Pencil size={11} />
            </motion.div>
          ) : (
            <motion.div
              key={`overlay-${id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className='absolute inset-0 z-10 rounded-2xl overflow-hidden flex flex-col'
              style={{ backdropFilter: 'blur(2px)', background: 'rgba(8, 12, 35, 0.50)' }}
            >
              <div className='flex items-center justify-between px-3 pt-2.5'>
                <span className='text-[11px] font-medium text-white/45'>{label}</span>
                <button
                  onClick={() => removeWidget(id)}
                  className='p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/35 text-red-400/70 hover:text-red-300 transition-colors'
                  title='Retirer du dashboard'
                >
                  <Trash2 size={12} />
                </button>
              </div>

              <div className='flex-1 flex items-center justify-center'>
                <div
                  onMouseDown={e => startDrag(id, widget, e)}
                  className='p-2.5 rounded-xl bg-white/8 border border-white/12 cursor-grab active:cursor-grabbing select-none hover:bg-white/15 hover:border-white/22 transition-all group'
                >
                  <GripVertical size={18} className='text-white/40 group-hover:text-white/65 transition-colors' />
                </div>
              </div>

              <div className='px-3 pb-2'>
                <span className='text-[10px] text-white/25'>
                  {widget.w}c × {widget.h}r
                </span>
              </div>
            </motion.div>
          ))}
      </AnimatePresence>
    </div>
  );
}
