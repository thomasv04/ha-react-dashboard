import { useDashboardLayout, useEditMode } from '@/context/DashboardLayoutContext';
import { useState, useEffect, useLayoutEffect, useRef, createContext, useContext, memo, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { staggerGridContainer, staggerGridItem } from '@/lib/motion-variants';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import { placeWidgetAt } from '@/lib/grid-utils';
import { getMinSize } from '@/widgets';
import { useGridDragDrop } from '@/hooks/useGridDragDrop';
import { GridItemOverlay } from './GridItemOverlay';
import { WidgetErrorBoundary } from '@/components/ui/WidgetErrorBoundary';
import { useMoreInfo } from '@/context/MoreInfoContext';
import { useWidgetConfig, WidgetConfigOverride } from '@/context/WidgetConfigContext';
import type { WidgetConfigs } from '@/types/widget-configs';
import { MORE_INFO_WIDGET_TYPES } from '@/components/modals/more-info-registry';
import { useLongPress } from '@/hooks/useLongPress';
import { useCardActions } from '@/hooks/useCardActions';
import type { CardActionsConfig } from '@/types/card-actions';
import { isVisible, visibilityEntityIds, type CardVisibilityConfig } from '@/types/card-visibility';
import { matchStateStyle, stateStyleEntityIds, type CardStateStylesConfig } from '@/types/card-state-styles';
import { useEntities } from '@/hooks/useEntities';
import { useTheme } from '@/context/ThemeContext';

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
  motionAllowed: boolean;
}

const GridCtx = createContext<GridCtxValue | null>(null);

function useGridCtx() {
  const ctx = useContext(GridCtx);
  if (!ctx) throw new Error('useGridCtx must be used inside DashboardGrid');
  return ctx;
}

// ── Sélection multiple ───────────────────────────────────────────────────────
//
// `Shift`+clic ajoute une case à la sélection. Déplacer ou supprimer agit alors
// sur tout le groupe — sans ça, réorganiser un bloc de six widgets demandait six
// glissers successifs, chacun repoussant les autres.

interface SelectionCtxValue {
  selected: ReadonlySet<string>;
  toggle: (id: string) => void;
  clear: () => void;
}

const SelectionCtx = createContext<SelectionCtxValue>({ selected: new Set(), toggle: () => {}, clear: () => {} });

export function useGridSelection() {
  return useContext(SelectionCtx);
}

// ── Widget ID context — lets each card know its own widget id ─────────────────
const WidgetIdCtx = createContext<string>('');
export function useWidgetId() {
  return useContext(WidgetIdCtx);
}
export function WidgetIdProvider({ id, children }: { id: string; children: ReactNode }) {
  return <WidgetIdCtx.Provider value={id}>{children}</WidgetIdCtx.Provider>;
}

// DashboardGrid - Pure CSS Grid + HTML5 Drag API (a la Tunet)
// ZERO per-pixel JS during drag. Browser handles ghost image natively.

export function DashboardGrid({ children, readonly, className }: { children: ReactNode; readonly?: boolean; className?: string }) {
  const { layoutSettings } = useTheme();
  const GAP = layoutSettings.gridGap;
  const ROW_HEIGHT_VAL = layoutSettings.rowHeight;
  const { layout, setLayout } = useDashboardLayout();
  const { isEditMode: ctxEditMode } = useEditMode();
  const isEditMode = ctxEditMode && !readonly;
  const outerRef = useRef<HTMLDivElement>(null);
  const [bp, setBp] = useState<Breakpoint>('lg');
  const motionAllowed = useLowPowerMotion();

  const [gridWidth, setGridWidth] = useState(0);

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = (w: number) => {
      if (w > 0) {
        setBp(resolveBreakpoint(w));
        setGridWidth(w);
      }
    };
    measure(el.getBoundingClientRect().width);
    const obs = new ResizeObserver(entries => measure(entries[0]?.contentRect.width ?? 0));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const widgets = layout.widgets[bp];
  const cols = layout.cols[bp];

  /**
   * Largeur de colonne en pixels **entiers**, au lieu de `1fr`.
   *
   * Avec `1fr`, une largeur de conteneur qui ne se divise pas également donne
   * des pistes fractionnaires (554,5 px) : les cards atterrissent alors sur des
   * demi-pixels. Le compositeur aligne la couche sur des pixels entiers mais
   * calcule la zone échantillonnée par `backdrop-filter` d'après le rectangle
   * fractionnaire — d'où un liseré d'un demi-pixel sur les bords, qui
   * apparaît et disparaît au gré des repeints. C'est l'origine des traits
   * aléatoires sur l'interface.
   *
   * Le reliquat (au pire `cols - 1` px) reste inutilisé à droite : invisible.
   */
  const colWidth = useMemo(() => {
    if (gridWidth <= 0) return null;
    const available = gridWidth - (cols - 1) * GAP;
    return Math.max(1, Math.floor(available / cols));
  }, [gridWidth, cols, GAP]);

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
    gap: GAP,
    rowHeight: ROW_HEIGHT_VAL,
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
        const cellHeight = ROW_HEIGHT_VAL;

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
    [widgets, cols, bp, setLayout, layout, GAP, ROW_HEIGHT_VAL]
  );

  const ctxValue = useMemo<GridCtxValue>(
    () => ({ breakpoint: bp, draggingId, dropTargetId, ghostPosition, drag, startResize, motionAllowed }),
    [bp, draggingId, dropTargetId, ghostPosition, drag, startResize, motionAllowed]
  );

  // ── Sélection multiple ─────────────────────────────────────
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());

  const selectionValue = useMemo<SelectionCtxValue>(
    () => ({
      selected,
      toggle: (id: string) =>
        setSelected(prev => {
          const next = new Set(prev);
          if (!next.delete(id)) next.add(id);
          return next;
        }),
      clear: () => setSelected(new Set()),
    }),
    [selected]
  );

  // Quitter le mode édition vide la sélection : un contour de sélection
  // survivant en mode consultation n'aurait plus aucune action derrière lui.
  useEffect(() => {
    if (!isEditMode) setSelected(new Set());
  }, [isEditMode]);

  // Extra rows for the grid background
  const displayRows = maxRow + 2;

  return (
    <GridCtx.Provider value={ctxValue}>
      <SelectionCtx.Provider value={selectionValue}>
      <motion.div
        ref={outerRef}
        variants={motionAllowed ? staggerGridContainer : undefined}
        initial={motionAllowed ? 'hidden' : false}
        animate='visible'
        className={[isEditMode ? 'dashboard-editing' : '', className].filter(Boolean).join(' ') || undefined}
        style={{
          display: 'grid',
          // Pistes en px entiers dès que la largeur est connue ; `1fr` sur le
          // tout premier rendu, avant mesure.
          gridTemplateColumns: colWidth ? `repeat(${cols}, ${colWidth}px)` : `repeat(${cols}, 1fr)`,
          gridAutoRows: `${ROW_HEIGHT_VAL}px`,
          gap: `${GAP}px`,
          minHeight: maxRow * ROW_HEIGHT_VAL + Math.max(0, maxRow - 1) * GAP,
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
      </motion.div>
      </SelectionCtx.Provider>
    </GridCtx.Provider>
  );
}

/**
 * Applique l'icône et la couleur d'une règle d'état, si l'une est satisfaite.
 *
 * Sans règle active, rend les enfants tels quels : pas de fournisseur inutile
 * dans l'arbre pour les cards — la quasi-totalité — qui n'en configurent aucune.
 */
function StateStyled({
  id,
  override,
  config,
  children,
}: {
  id: string;
  override: { icon?: string; color?: string } | null;
  config: Record<string, unknown> | undefined;
  children: ReactNode;
}) {
  const merged = useMemo(() => {
    if (!override || !config) return null;
    return {
      [id]: {
        ...config,
        ...(override.icon ? { icon: override.icon } : {}),
        ...(override.color ? { iconColor: override.color } : {}),
      },
    } as unknown as WidgetConfigs;
  }, [id, override, config]);

  if (!merged) return children;
  return <WidgetConfigOverride configs={merged}>{children}</WidgetConfigOverride>;
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
  const { handlers: longPressHandlers, moved } = useLongPress(() => {
    if (onLongPress && ref.current) onLongPress(ref.current.getBoundingClientRect());
  }, 500);
  return (
    <div
      ref={ref}
      className={`h-full overflow-hidden${isEditMode ? ' pointer-events-none select-none' : ''}${onClick && !isEditMode ? ' cursor-pointer' : ''}`}
      onClick={() => {
        // Un glissement (jauge de thermostat, curseur de luminosité) se termine
        // par un `click` sur la card : il ne doit pas ouvrir la fiche.
        if (moved.current) return;
        if (onClick && ref.current) onClick(ref.current.getBoundingClientRect());
      }}
      {...(onLongPress && !isEditMode ? longPressHandlers : {})}
      style={{
        borderRadius: 'var(--dash-card-radius, 24px)',
        opacity: dimmed ? 0 : 1,
        transition: 'opacity 0.25s ease',
        // Isole chaque widget : un re-rendu dans une card (une valeur de
        // capteur qui bouge) ne peut plus invalider le layout ni le paint des
        // autres. `paint` est sans effet visuel ici, l'élément est déjà
        // `overflow-hidden`.
        contain: 'layout paint style',
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
  const { breakpoint, draggingId, dropTargetId, drag, startResize, motionAllowed } = useGridCtx();
  const { openMoreInfo, state: moreInfoState } = useMoreInfo();
  const { getWidgetConfig } = useWidgetConfig();
  const selection = useGridSelection();
  const isEditMode = ctxEditMode && !readonly;

  const widget = layout.widgets[breakpoint]?.find(w => w.id === id);
  const hasMoreInfo = widget ? MORE_INFO_WIDGET_TYPES.includes(widget.type) : false;

  const handleMoreInfoClick = useCallback(
    (rect: DOMRect) => {
      if (!widget) return;
      const config = getWidgetConfig(id) as Record<string, unknown> | undefined;
      // Ne prendre que `entityId` : le repli « premier champ qui ressemble à une
      // entité » attrapait des entités annexes (le `selectorEntity` d'une card
      // caméra, par exemple). Les modales qui n'ont pas d'`entityId` en config
      // résolvent déjà la leur depuis `widgetId`.
      const entityId = typeof config?.entityId === 'string' ? config.entityId : '';
      openMoreInfo(id, widget.type, entityId, rect);
    },
    [id, widget, getWidgetConfig, openMoreInfo]
  );

  // ── Actions configurables (tap / hold) ──────────────────────────────────────
  //
  // Branché **ici**, et pas dans chaque card : les trente composants n'ont rien
  // à savoir de la navigation ni des appels de service, et une action ajoutée à
  // `useCardActions` vaut aussitôt pour tous.
  const runAction = useCardActions();

  const makeHandler = useCallback(
    (which: 'tapAction' | 'holdAction') =>
      (rect: DOMRect) => {
        const config = getWidgetConfig(id) as (Record<string, unknown> & CardActionsConfig) | undefined;
        const entityId = typeof config?.entityId === 'string' ? config.entityId : '';
        // `false` = action non prise en charge (`default`, ou `more-info` qui a
        // besoin du cadre de la card pour s'animer).
        if (runAction(config?.[which], entityId)) return;
        if (hasMoreInfo) handleMoreInfoClick(rect);
      },
    [id, getWidgetConfig, runAction, hasMoreInfo, handleMoreInfoClick]
  );

  // ── Visibilité conditionnelle et styles d'état ──────────────────────────────
  //
  // Un seul abonnement pour les deux : ce sont le plus souvent les mêmes
  // entités, et deux abonnements doubleraient les rendus sans rien apporter.
  const conditionalConfig = getWidgetConfig(id) as (Record<string, unknown> & CardVisibilityConfig & CardStateStylesConfig) | undefined;
  const visibility = conditionalConfig?.visibility;
  const stateStyles = conditionalConfig?.stateStyles;

  const watchedIds = useMemo(
    () => [...new Set([...visibilityEntityIds(visibility), ...stateStyleEntityIds(stateStyles)])],
    [visibility, stateStyles]
  );
  const watched = useEntities(watchedIds);
  const states = useMemo(
    () => Object.fromEntries(watchedIds.map(eid => [eid, watched[eid]?.state])),
    [watchedIds, watched]
  );

  const visible = useMemo(() => isVisible(visibility, breakpoint, states), [visibility, breakpoint, states]);
  const styleOverride = useMemo(() => matchStateStyle(stateStyles, breakpoint, states), [stateStyles, breakpoint, states]);

  const config = getWidgetConfig(id) as CardActionsConfig | undefined;
  // Un geste reste inerte si rien n'est configuré *et* que la card n'a pas de
  // fiche : inutile de rendre le curseur cliquable pour rien.
  const hasTap = hasMoreInfo || (config?.tapAction && config.tapAction.action !== 'default');
  const hasHold = hasMoreInfo || (config?.holdAction && config.holdAction.action !== 'default');

  const memoOnClick = useMemo(() => (!isEditMode && hasTap ? makeHandler('tapAction') : undefined), [isEditMode, hasTap, makeHandler]);
  const memoOnLongPress = useMemo(() => (!isEditMode && hasHold ? makeHandler('holdAction') : undefined), [isEditMode, hasHold, makeHandler]);

  if (!widget) return null;

  // Masquée par ses conditions — mais **jamais en mode édition** : une card
  // invisible serait impossible à sélectionner pour corriger sa condition, et
  // on ne saurait même pas qu'elle existe. En édition elle reste là, atténuée.
  if (!visible && !isEditMode) return null;

  const isDragging = draggingId === id;
  const isDropTarget = dropTargetId === id;
  const isSelected = selection.selected.has(id);
  const label = WIDGET_LABELS[widget.type] ?? widget.type;
  const isWidgetModalOpen = !isEditMode && moreInfoState?.widgetId === id;
  const isStatic = widget.static ?? false;
  const canDrag = isEditMode && !isStatic;

  const gridStyle: React.CSSProperties = {
    gridColumnStart: widget.x + 1,
    gridRowStart: widget.y + 1,
    gridColumnEnd: `span ${widget.w}`,
    gridRowEnd: `span ${widget.h}`,
    transform: isDragging ? 'scale(1.05)' : 'none',
    opacity: isDragging ? 0.6 : visible ? 1 : 0.35,
    zIndex: isDragging ? 50 : 1,
    transition: 'transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease',
    boxShadow: isDragging
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      : isDropTarget
        ? '0 0 0 2px rgba(139, 92, 246, 0.6), 0 0 30px rgba(139, 92, 246, 0.3)'
        : isSelected
          ? '0 0 0 2px rgba(59, 130, 246, 0.9)'
          : 'none',
  };

  return (
    <motion.div
      variants={motionAllowed ? staggerGridItem : undefined}
      className='relative h-full'
      style={gridStyle}
      data-widget-id={id}
      onClickCapture={e => {
        // `Capture` : la case entière est un handle de glisser, et l'overlay
        // avale les clics. Intercepter à la descente est le seul moyen de voir
        // le geste avant eux.
        if (!isEditMode || (!e.shiftKey && !e.ctrlKey && !e.metaKey)) return;
        e.preventDefault();
        e.stopPropagation();
        selection.toggle(id);
      }}
      draggable={canDrag}
      onDragStart={e => {
        if (!canDrag) {
          e.preventDefault();
          return;
        }
        // framer-motion type `onDragStart` avec une union d'events natifs ;
        // le handler attend un DragEvent React, seul cas réel ici.
        drag.onItemDragStart(e as unknown as React.DragEvent<Element>, id);
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
        {/* Style d'état : la config vue par la card est celle de l'utilisateur
            avec l'icône et la couleur de la règle satisfaite par-dessus. Passer
            par la surcharge de config déjà en place évite d'inventer un second
            canal, et laisse les trente composants inchangés. */}
        <StateStyled id={id} override={styleOverride} config={conditionalConfig}>
          <WidgetErrorBoundary label={label}>
          <MemoChildren isEditMode={isEditMode} dimmed={isWidgetModalOpen} onClick={memoOnClick} onLongPress={memoOnLongPress}>
            {children}
          </MemoChildren>
          </WidgetErrorBoundary>
        </StateStyled>
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
    </motion.div>
  );
}
