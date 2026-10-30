import { useDashboardLayout, useEditMode, type GridWidget, type LayoutPanel } from '@/context/DashboardLayoutContext';
import { useState, useEffect, useLayoutEffect, useRef, createContext, useContext, memo, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { GripVertical, Minus, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useUser } from '@hakit/core';
import { Sheet } from '@/components/ds/Sheet';
import { SwitchTrack } from '@/components/ds/Switch';
import { staggerGridContainer, staggerGridItem } from '@/lib/motion-variants';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import { useIsMobile } from '@/hooks/useIsMobile';
import {
  EDIT_PANEL_EVENT,
  GRID_COL,
  GRID_GAP,
  GRID_ROW,
  PANEL_COLS_MAX,
  PANEL_COLS_MIN,
  colsThatFit,
  colsWidth,
  findWidget,
  type PanelZone,
} from '@/lib/panel-grid';
import { getMinSize, WIDGET_COMPONENTS, WIDGET_META } from '@/widgets';
import { GridItemOverlay } from './GridItemOverlay';
import { AddWidgetModal } from './AddWidgetModal';
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
import { useI18n } from '@/i18n';
import { clamp, cn } from '@/lib/utils';
import { AnimatePresence } from 'framer-motion';

export type Breakpoint = 'lg' | 'md' | 'sm';

/** Taille d'écran — ne sert plus qu'aux conditions de visibilité des cards. */
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

/** Où une tuile tombe : un panneau, son rang dedans, et la tuile devant laquelle elle se range. */
interface DropTarget {
  panelId: string;
  index: number;
  beforeId?: string;
}

/** Un panneau en cours de déplacement, et l'endroit où il tomberait. */
interface PanelDrag {
  id: string;
  target: { panelId: string; zone: PanelZone } | null;
}

/**
 * Suit le pointeur jusqu'au relâché : déplacement et redimensionnement
 * partagent le même trio d'écouteurs.
 */
function trackPointer(onMove: (e: PointerEvent) => void, onUp: () => void) {
  const up = () => {
    onUp();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
  };
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

/** Marge, en px, où le pointeur fait défiler ce qu'il survole pendant un glisser. */
const EDGE = 72;
const EDGE_STEP = 18;

/** Fait défiler le plateau et le panneau survolé quand le pointeur frôle leur bord. */
function scrollNearEdges(point: { x: number; y: number }, board: HTMLElement | null) {
  const nudge = (el: HTMLElement, vertical: boolean) => {
    const r = el.getBoundingClientRect();
    const pos = vertical ? point.y : point.x;
    const start = vertical ? r.top : r.left;
    const end = vertical ? r.bottom : r.right;
    const delta = pos < start + EDGE ? -EDGE_STEP : pos > end - EDGE ? EDGE_STEP : 0;
    if (!delta) return;
    if (vertical) el.scrollTop += delta;
    else el.scrollLeft += delta;
  };
  if (board) nudge(board, false);
  const scroller = document.elementFromPoint(point.x, point.y)?.closest<HTMLElement>('[data-panel-scroll]');
  if (scroller) nudge(scroller, true);
}

type PointerStart = { clientX: number; clientY: number };

/**
 * Un glisser de bout en bout : la cible est relue à chaque image — et non à
 * chaque mouvement —, car le défilement automatique la change sans que le
 * pointeur bouge. Au doigt, le défilement de la page est retenu pendant le geste.
 */
function dragSession(start: PointerStart, board: HTMLElement | null, update: (x: number, y: number) => void, onUp: () => void) {
  const point = { x: start.clientX, y: start.clientY };
  let raf = 0;
  const tick = () => {
    scrollNearEdges(point, board);
    update(point.x, point.y);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  const hold = (e: TouchEvent) => e.cancelable && e.preventDefault();
  window.addEventListener('touchmove', hold, { passive: false });
  trackPointer(
    e => {
      point.x = e.clientX;
      point.y = e.clientY;
    },
    () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('touchmove', hold);
      onUp();
    }
  );
}

/** Libellés i18n des widgets, par type — calculés une fois. */
const META_LABELS = new Map(WIDGET_META.map(m => [m.type, m.label]));

interface GridCtxValue {
  breakpoint: Breakpoint;
  draggingId: string | null;
  dropTarget: DropTarget | null;
  /** Commence le déplacement d'une tuile, au doigt comme à la souris. */
  startDrag: (widgetId: string, start: PointerStart) => void;
  panelDrag: PanelDrag | null;
  startPanelDrag: (panelId: string, start: PointerStart) => void;
  startResize: (widgetId: string, clientX: number, clientY: number) => void;
  motionAllowed: boolean;
}

const GridCtx = createContext<GridCtxValue | null>(null);

function useGridCtx() {
  const ctx = useContext(GridCtx);
  if (!ctx) throw new Error('useGridCtx must be used inside DashboardGrid');
  return ctx;
}

/** Colonnes réellement disponibles dans le panneau : sa largeur, ou ce que l'écran laisse. */
const PanelColsCtx = createContext(Infinity);

/** Le panneau de la tuile est-il en édition ? Hors panneau (plan) : comme la page. */
const PanelEditCtx = createContext(true);

/**
 * Permet de rendre des `GridItem` **hors de la grille**, là où l'appelant les
 * positionne lui-même — une page plan. À utiliser avec `readonly` : ni glisser
 * ni redimensionnement ici.
 *
 * `lg` : un plan n'a qu'une disposition, celle des positions en %.
 */
export function FreeGridScope({ children }: { children: ReactNode }) {
  const motionAllowed = useLowPowerMotion();
  const value = useMemo<GridCtxValue>(
    () => ({
      breakpoint: 'lg',
      draggingId: null,
      dropTarget: null,
      startDrag: () => {},
      panelDrag: null,
      startPanelDrag: () => {},
      startResize: () => {},
      motionAllowed,
    }),
    [motionAllowed]
  );
  return <GridCtx.Provider value={value}>{children}</GridCtx.Provider>;
}

// ── Sélection multiple ───────────────────────────────────────────────────────
//
// `Shift`+clic ajoute une case à la sélection. Supprimer agit alors sur tout le
// groupe.

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

/** Sous cette largeur d'écran (`md`), les panneaux s'empilent et la page défile. */
const STACK_BELOW = 768;
/** Marge intérieure d'un panneau, de chaque côté. */
const PANEL_PADDING = 22;

/**
 * Les panneaux d'une page, côte à côte comme sur l'Echo Show — défilement
 * horizontal s'ils ne tiennent pas, empilés sur un écran étroit. Chaque
 * panneau range ses tuiles dans l'ordre, sur la trame fixe : pas de
 * coordonnées, rien à tasser.
 */
export function DashboardGrid({ readonly, className }: { readonly?: boolean; className?: string }) {
  const { layout, moveWidget, movePanelTo, updateWidget, addPanel } = useDashboardLayout();
  const { isEditMode: ctxEditMode, editPanelId } = useEditMode();
  const isEditMode = ctxEditMode && !readonly;
  const { t } = useI18n();
  const outerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const motionAllowed = useLowPowerMotion();

  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const measure = (w: number) => w > 0 && setWidth(w);
    measure(el.getBoundingClientRect().width);
    const obs = new ResizeObserver(entries => measure(entries[0]?.contentRect.width ?? 0));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Sur l'écran, pas sur le plateau : les classes `md:` de la page décident du
  // même seuil, et les deux ne doivent jamais diverger.
  const stacked = useIsMobile(STACK_BELOW);
  // Colonnes qu'un panneau peut afficher sans déborder de l'écran.
  const fit = width > 0 ? colsThatFit(width - 2 * PANEL_PADDING) : PANEL_COLS_MAX;

  // ── Déplacement d'une tuile ──────────────────────────────────
  //
  // Événements pointeur et non glisser-déposer HTML5 : celui-ci ne marche pas
  // au doigt, et c'est au doigt qu'on range une tablette murale. La cible se lit
  // sous le pointeur ; la tuile ne suit pas le doigt, la cible s'éclaire.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const dropRef = useRef<DropTarget | null>(null);

  const startDrag = useCallback(
    (widgetId: string, start: PointerStart) => {
      setDraggingId(widgetId);

      const targetAt = (x: number, y: number): DropTarget | null => {
        const el = document.elementFromPoint(x, y);
        const panel = el?.closest<HTMLElement>('[data-panel-id]');
        if (!panel?.dataset.panelId) return null;
        const tiles = [...panel.querySelectorAll<HTMLElement>('[data-panel-grid] > [data-widget-id]')];
        const tile = el?.closest<HTMLElement>('[data-widget-id]');
        const at = tile ? tiles.indexOf(tile) : -1;
        if (at < 0) return { panelId: panel.dataset.panelId, index: tiles.length };
        // Moitié droite de la tuile visée : on se range après elle.
        const r = tile!.getBoundingClientRect();
        const index = at + (x > r.left + r.width / 2 ? 1 : 0);
        return { panelId: panel.dataset.panelId, index, beforeId: tiles[index]?.dataset.widgetId };
      };

      dragSession(
        start,
        outerRef.current,
        (x, y) => {
          const next = targetAt(x, y);
          const prev = dropRef.current;
          // Même cible qu'à l'image précédente : rien à redessiner.
          if (prev?.panelId === next?.panelId && prev?.index === next?.index) return;
          dropRef.current = next;
          setDropTarget(next);
        },
        () => {
          if (dropRef.current) moveWidget(widgetId, dropRef.current.panelId, dropRef.current.index);
          dropRef.current = null;
          setDraggingId(null);
          setDropTarget(null);
        }
      );
    },
    [moveWidget]
  );

  // ── Déplacement d'un panneau entier ──────────────────────────
  //
  // Sur les bords gauche et droit d'un panneau : une colonne à côté ; sur sa
  // moitié haute ou basse : dans sa colonne. Empilé (téléphone), il n'y a que
  // haut et bas.
  const [panelDrag, setPanelDrag] = useState<PanelDrag | null>(null);
  const panelDragRef = useRef<PanelDrag | null>(null);

  const startPanelDrag = useCallback(
    (panelId: string, start: PointerStart) => {
      const set = (next: PanelDrag | null) => {
        panelDragRef.current = next;
        setPanelDrag(next);
      };
      set({ id: panelId, target: null });

      const targetAt = (x: number, y: number): PanelDrag['target'] => {
        const el = document.elementFromPoint(x, y);
        const panel = el?.closest<HTMLElement>('[data-panel-id]');
        if (!panel) {
          // Sur « Ajouter un panneau » : une nouvelle colonne en fin de page.
          const last = layout.panels[layout.panels.length - 1];
          return el?.closest('[data-add-panel]') && last && last.id !== panelId ? { panelId: last.id, zone: 'right' } : null;
        }
        const id = panel.dataset.panelId!;
        if (id === panelId) return null;
        const r = panel.getBoundingClientRect();
        const fx = (x - r.left) / r.width;
        const fy = (y - r.top) / r.height;
        const zone: PanelZone = !stacked && fx < 0.22 ? 'left' : !stacked && fx > 0.78 ? 'right' : fy < 0.5 ? 'above' : 'below';
        return { panelId: id, zone };
      };

      dragSession(
        start,
        outerRef.current,
        (x, y) => {
          const next = targetAt(x, y);
          const prev = panelDragRef.current?.target;
          if (prev?.panelId === next?.panelId && prev?.zone === next?.zone) return;
          set({ id: panelId, target: next });
        },
        () => {
          const target = panelDragRef.current?.target;
          if (target) movePanelTo(panelId, target.panelId, target.zone);
          set(null);
        }
      );
    },
    [layout.panels, stacked, movePanelTo]
  );

  // ── Redimensionnement ────────────────────────────────────────
  const startResize = useCallback(
    (widgetId: string, startX: number, startY: number) => {
      const found = findWidget(layout, widgetId);
      if (!found) return;
      const { panel, widget } = found;
      const min = getMinSize(widget.type, widget.disposition);
      const maxW = Math.min(panel.cols, fit);
      let last = { w: widget.w, h: widget.h };

      trackPointer(
        ev => {
          const next = {
            w: clamp(widget.w + Math.round((ev.clientX - startX) / (GRID_COL + GRID_GAP)), Math.min(min.w, maxW), maxW),
            h: Math.max(min.h, widget.h + Math.round((ev.clientY - startY) / (GRID_ROW + GRID_GAP))),
          };
          if (next.w === last.w && next.h === last.h) return;
          last = next;
          updateWidget(widgetId, next);
        },
        () => {}
      );
    },
    [layout, fit, updateWidget]
  );

  // Le palier et non la largeur : un pixel de plus ou de moins ne doit pas
  // re-rendre toutes les tuiles.
  const breakpoint = resolveBreakpoint(width || 1200);
  const ctxValue = useMemo<GridCtxValue>(
    () => ({ breakpoint, draggingId, dropTarget, startDrag, panelDrag, startPanelDrag, startResize, motionAllowed }),
    [breakpoint, draggingId, dropTarget, startDrag, panelDrag, startPanelDrag, startResize, motionAllowed]
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

  // Colonnes : un panneau « sous le précédent » rejoint la colonne de celui-ci.
  const columns: { panel: LayoutPanel; index: number }[][] = [];
  layout.panels.forEach((panel, index) => {
    if (panel.below && columns.length) columns[columns.length - 1].push({ panel, index });
    else columns.push([{ panel, index }]);
  });

  // ── Faire glisser le plateau à la souris ─────────────────────
  //
  // Au doigt le plateau se balaie déjà ; à la souris, on le saisit par n'importe
  // quel endroit qui ne soit pas un contrôle — et le clic qui finit le geste est
  // avalé, sinon la card sous le curseur ouvrirait sa fiche.
  const onBoardPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const board = outerRef.current;
    if (!board || stacked || e.pointerType !== 'mouse' || e.button !== 0 || isEditMode) return;
    if ((e.target as Element).closest('button, a, input, select, textarea, [role="slider"], [role="switch"], [data-no-pan]')) return;
    const startX = e.clientX;
    const from = board.scrollLeft;
    let moved = false;
    trackPointer(
      ev => {
        if (!moved && Math.abs(ev.clientX - startX) < 6) return;
        moved = true;
        board.scrollLeft = from - (ev.clientX - startX);
      },
      () => {
        if (!moved) return;
        const swallow = (ev: Event) => ev.stopPropagation();
        window.addEventListener('click', swallow, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
      }
    );
  };

  return (
    <GridCtx.Provider value={ctxValue}>
      <SelectionCtx.Provider value={selectionValue}>
        <motion.div
          ref={outerRef}
          variants={motionAllowed ? staggerGridContainer : undefined}
          initial={motionAllowed ? 'hidden' : false}
          animate='visible'
          onPointerDown={onBoardPointerDown}
          // Le plateau tient dans l'écran : chaque colonne en prend toute la
          // hauteur, et ce sont les panneaux — pas la page — qui défilent.
          className={cn(
            'flex w-full gap-[22px]',
            stacked ? 'flex-col' : 'absolute inset-0 overflow-x-auto overscroll-x-contain',
            isEditMode && 'dashboard-editing',
            panelDrag && 'cursor-grabbing select-none',
            className
          )}
        >
          {columns.map(column => {
            const head = column[0].panel;
            const total = column.reduce((sum, { panel }) => sum + (panel.weight ?? 1), 0);
            return (
              <div key={head.id} className={cn('flex shrink-0 flex-col gap-[22px]', stacked && 'w-full')}>
                {column.map(({ panel, index }) => (
                  <PanelSection
                    key={panel.id}
                    panel={panel}
                    // Empilés, les panneaux d'une colonne ont la largeur de sa tête.
                    cols={Math.min(head.cols, fit)}
                    // Part de la hauteur de la colonne, hors panneau seul.
                    share={column.length > 1 ? Math.round(((panel.weight ?? 1) / total) * 100) : undefined}
                    stacked={stacked}
                    readonly={!!readonly}
                    editing={isEditMode && (!editPanelId || editPanelId === panel.id)}
                    first={index === 0}
                  />
                ))}
              </div>
            );
          })}
          {/* Un panneau seul en édition : la page, elle, ne change pas. */}
          {isEditMode && !editPanelId && (
            <button
              data-add-panel
              onClick={addPanel}
              className={cn(
                'flex shrink-0 flex-col items-center justify-center gap-2 rounded-[30px] border-2 border-dashed border-[var(--ds-surface-3)] text-[15px] font-semibold text-[var(--ds-ink-muted)]',
                stacked ? 'min-h-[160px] w-full' : 'w-[200px]'
              )}
            >
              <Plus size={28} />
              {t('layout.panel.addPanel')}
            </button>
          )}
        </motion.div>
      </SelectionCtx.Provider>
    </GridCtx.Provider>
  );
}

const ROUND = 'flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)] disabled:opacity-30';

/** Trait qui montre où le panneau glissé se rangerait : dans l'écart, côté visé. */
const DROP_BAR: Record<PanelZone, string> = {
  left: '-left-[14px] inset-y-4 w-1.5',
  right: '-right-[14px] inset-y-4 w-1.5',
  above: '-top-[14px] inset-x-4 h-1.5',
  below: '-bottom-[14px] inset-x-4 h-1.5',
};

/**
 * Un panneau : son titre et ses boutons — poignée, réglages, modification —,
 * puis ses tuiles rangées sur la trame.
 *
 * Il prend la hauteur de sa colonne (ou sa part, s'ils sont plusieurs) et ses
 * tuiles défilent à l'intérieur : la page, elle, ne défile jamais.
 *
 * Réglages et modification passent par la barre d'édition (`EDIT_PANEL_EVENT`) :
 * elle garde le code d'accès et l'enregistrement, et n'ouvre que ce panneau-là.
 */
function PanelSection({
  panel,
  cols,
  share,
  stacked,
  readonly,
  editing,
  first,
}: {
  panel: LayoutPanel;
  cols: number;
  /** Part de la hauteur de sa colonne, en % — absente d'un panneau seul. */
  share?: number;
  stacked: boolean;
  readonly: boolean;
  editing: boolean;
  first: boolean;
}) {
  const { t } = useI18n();
  const isAdmin = !!useUser()?.is_admin;
  const { dropTarget, draggingId, panelDrag, startPanelDrag } = useGridCtx();
  const [adding, setAdding] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // ⚙ hors édition : on attend d'y être entré (code éventuel) pour ouvrir.
  const [settingsWanted, setSettingsWanted] = useState(false);
  const dropAtEnd = dropTarget?.panelId === panel.id && dropTarget.index >= panel.widgets.length;
  const controls = isAdmin && !readonly;
  const dropZone = panelDrag?.target?.panelId === panel.id ? panelDrag.target.zone : null;

  useEffect(() => {
    if (!settingsWanted || !editing) return;
    setSettingsWanted(false);
    setSettingsOpen(true);
  }, [settingsWanted, editing]);

  const requestEdit = () => window.dispatchEvent(new CustomEvent(EDIT_PANEL_EVENT, { detail: panel.id }));

  return (
    <PanelColsCtx.Provider value={cols}>
      <PanelEditCtx.Provider value={editing}>
        <section
          data-panel-id={panel.id}
          style={stacked ? undefined : { flex: `${panel.weight ?? 1} 1 0%` }}
          className={cn(
            'relative flex min-h-0 w-full flex-col rounded-[30px] bg-[var(--ds-surface-1)] text-[var(--ds-ink)] transition-opacity',
            editing && 'outline-2 outline-dashed outline-[var(--ds-accent)]',
            panelDrag?.id === panel.id && 'opacity-40'
          )}
        >
          {dropZone && (
            <span
              aria-hidden='true'
              className={cn('pointer-events-none absolute z-20 rounded-full bg-[var(--ds-accent)]', DROP_BAR[dropZone])}
            />
          )}

          {/* La marge est ici et non sur le panneau : sa part de hauteur reste exacte. */}
          <div className='flex min-h-0 flex-1 flex-col gap-3.5 p-[22px]'>
            {(panel.title || controls) && (
              <div className='flex min-h-11 shrink-0 items-center gap-2'>
                {editing && controls && (
                  <button
                    onPointerDown={e => {
                      if (e.button !== 0) return;
                      e.preventDefault();
                      startPanelDrag(panel.id, e);
                    }}
                    aria-label={t('layout.panel.drag')}
                    title={t('layout.panel.drag')}
                    className={cn(ROUND, 'cursor-grab touch-none active:cursor-grabbing')}
                  >
                    <GripVertical size={18} />
                  </button>
                )}
                <h2 className='mx-1.5 min-w-0 flex-1 truncate text-xl font-semibold'>{panel.title}</h2>
                {controls && (
                  <>
                    <button
                      onClick={() => (editing ? setSettingsOpen(true) : (setSettingsWanted(true), requestEdit()))}
                      aria-label={t('layout.panel.settings')}
                      title={t('layout.panel.settings')}
                      className={ROUND}
                    >
                      <SlidersHorizontal size={18} />
                    </button>
                    {!editing && (
                      <button onClick={requestEdit} aria-label={t('layout.panel.edit')} title={t('layout.panel.edit')} className={ROUND}>
                        <Pencil size={18} />
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            <div
              data-panel-scroll
              className={cn(!stacked && '-mx-1 -mb-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-1 scrollbar-none')}
            >
              <div
                data-panel-grid
                className={cn(
                  'rounded-[var(--ds-radius-lg)]',
                  dropAtEnd && draggingId && 'outline-dashed outline-2 outline-[var(--ds-accent)]'
                )}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${cols}, ${GRID_COL}px)`,
                  gridAutoRows: `${GRID_ROW}px`,
                  // `dense` : une petite tuile comble le trou laissé par une grande.
                  gridAutoFlow: 'row dense',
                  gap: GRID_GAP,
                  // Un panneau vide garde sa largeur : on voit où déposer.
                  minWidth: colsWidth(cols),
                }}
              >
                {panel.widgets.map(widget => {
                  const Component = WIDGET_COMPONENTS[widget.type];
                  if (!Component) return null;
                  return (
                    <GridItem key={widget.id} id={widget.id} widget={widget}>
                      <Component />
                    </GridItem>
                  );
                })}
                {editing && (
                  <button
                    onClick={() => setAdding(true)}
                    aria-label={t('layout.panel.addTile')}
                    title={t('layout.panel.addTile')}
                    className='flex items-center justify-center rounded-[var(--ds-radius-lg)] border-2 border-dashed border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
                    style={{ gridColumn: `span ${Math.min(2, cols)}`, gridRow: 'span 2' }}
                  >
                    <Plus size={28} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>
        <AnimatePresence>{adding && <AddWidgetModal panelId={panel.id} onClose={() => setAdding(false)} />}</AnimatePresence>
        <PanelSettings panel={panel} open={settingsOpen} onClose={() => setSettingsOpen(false)} first={first} share={share} />
      </PanelEditCtx.Provider>
    </PanelColsCtx.Provider>
  );
}

/** Une ligne de réglage : un libellé, et son contrôle à droite. */
const SETTING_ROW = 'flex items-center justify-between gap-3 rounded-[var(--ds-radius-xl)] bg-[var(--ds-sheet-section)] p-4';

/** − valeur + : le pas de réglage commun à la largeur et à la hauteur. */
function Stepper({
  label,
  value,
  onChange,
  min,
  max,
  less,
  more,
}: {
  label: string;
  value: string;
  onChange: (delta: -1 | 1) => void;
  min: boolean;
  max: boolean;
  less: string;
  more: string;
}) {
  return (
    <div className={SETTING_ROW}>
      <span className='text-[15px] font-bold'>{label}</span>
      <div className='flex items-center gap-2'>
        <button onClick={() => onChange(-1)} disabled={min} aria-label={less} className={ROUND}>
          <Minus size={18} />
        </button>
        <span className='min-w-[9ch] text-center text-sm tabular-nums'>{value}</span>
        <button onClick={() => onChange(1)} disabled={max} aria-label={more} className={ROUND}>
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

/** Réglages d'un panneau, dans une feuille : titre, largeur, hauteur, colonne, suppression. */
function PanelSettings({
  panel,
  open,
  onClose,
  first,
  share,
}: {
  panel: LayoutPanel;
  open: boolean;
  onClose: () => void;
  first: boolean;
  share?: number;
}) {
  const { t } = useI18n();
  const { updatePanel, removePanel } = useDashboardLayout();
  const [confirming, setConfirming] = useState(false);
  const weight = panel.weight ?? 1;

  return (
    <Sheet open={open} onClose={onClose} title={panel.title || t('layout.panel.untitled')} closeLabel={t('common.close')}>
      <div className='flex flex-col gap-3'>
        <label className='flex flex-col gap-2 rounded-[var(--ds-radius-xl)] bg-[var(--ds-sheet-section)] p-4'>
          <span className='text-[15px] font-bold'>{t('layout.panel.title')}</span>
          <input
            value={panel.title ?? ''}
            onChange={e => updatePanel(panel.id, { title: e.target.value || undefined })}
            placeholder={t('layout.panel.untitled')}
            className='h-11 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-3)] px-3 text-[17px] font-semibold outline-none placeholder:text-[var(--ds-ink-muted)]'
          />
        </label>

        {/* Dans une colonne, les panneaux ont la largeur de celui du haut. */}
        {!panel.below && (
          <Stepper
            label={t('layout.panel.width_label')}
            value={t('layout.panel.width', { value: panel.cols })}
            onChange={d => updatePanel(panel.id, { cols: panel.cols + d })}
            min={panel.cols <= PANEL_COLS_MIN}
            max={panel.cols >= PANEL_COLS_MAX}
            less={t('layout.panel.narrower')}
            more={t('layout.panel.wider')}
          />
        )}

        {share !== undefined && (
          <Stepper
            label={t('layout.panel.height')}
            value={t('layout.panel.heightShare', { value: share })}
            onChange={d => updatePanel(panel.id, { weight: weight + d })}
            min={weight <= 1}
            max={weight >= 6}
            less={t('layout.panel.shorter')}
            more={t('layout.panel.taller')}
          />
        )}

        {!first && (
          <button
            role='switch'
            aria-checked={!!panel.below}
            onClick={() => updatePanel(panel.id, { below: !panel.below || undefined })}
            className={cn(SETTING_ROW, 'text-left')}
          >
            <span>
              <span className='block text-[15px] font-bold'>{t('layout.panel.below')}</span>
              <span className='block text-sm text-[var(--ds-ink-muted)]'>{t('layout.panel.belowDesc')}</span>
            </span>
            <SwitchTrack on={!!panel.below} />
          </button>
        )}

        {/* Vide, il part d'un geste ; avec des tuiles, on confirme. */}
        <button
          onClick={() => {
            if (panel.widgets.length && !confirming) return setConfirming(true);
            onClose();
            removePanel(panel.id);
          }}
          className='flex h-12 items-center justify-center gap-2 rounded-[var(--ds-radius-pill)] bg-[var(--ds-alert)] text-[15px] font-semibold text-white'
        >
          <Trash2 size={18} />
          {confirming ? t('layout.panel.removeConfirm') : t('layout.panel.remove')}
        </button>
      </div>
    </Sheet>
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
        borderRadius: 'var(--ds-radius-lg)',
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

/**
 * Une tuile : la card, ses gestes (fiche, actions, conditions, styles d'état)
 * et, en édition, le calque qui la déplace et la redimensionne. Sa place vient
 * de son rang dans le panneau ; elle n'en connaît que sa taille.
 */
export function GridItem({
  id,
  widget: given,
  children,
  readonly,
}: {
  id: string;
  /** Fourni par le panneau ; sinon cherché dans la page (plan). */
  widget?: GridWidget;
  children: ReactNode;
  readonly?: boolean;
}) {
  const { layout } = useDashboardLayout();
  const { isEditMode: ctxEditMode } = useEditMode();
  const { breakpoint, draggingId, dropTarget, startDrag, startResize, motionAllowed } = useGridCtx();
  const panelCols = useContext(PanelColsCtx);
  const panelEditing = useContext(PanelEditCtx);
  const { openMoreInfo, state: moreInfoState } = useMoreInfo();
  const { getWidgetConfig } = useWidgetConfig();
  const selection = useGridSelection();
  const { t } = useI18n();
  const isEditMode = ctxEditMode && panelEditing && !readonly;

  const widget = given ?? findWidget(layout, id)?.widget;
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
    (which: 'tapAction' | 'holdAction') => (rect: DOMRect) => {
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
  const states = useMemo(() => Object.fromEntries(watchedIds.map(eid => [eid, watched[eid]?.state])), [watchedIds, watched]);

  const visible = useMemo(() => isVisible(visibility, breakpoint, states), [visibility, breakpoint, states]);
  const styleOverride = useMemo(() => matchStateStyle(stateStyles, breakpoint, states), [stateStyles, breakpoint, states]);

  const config = getWidgetConfig(id) as CardActionsConfig | undefined;
  // Un geste reste inerte si rien n'est configuré *et* que la card n'a pas de
  // fiche : inutile de rendre le curseur cliquable pour rien.
  const hasTap = hasMoreInfo || (config?.tapAction && config.tapAction.action !== 'default');
  const hasHold = hasMoreInfo || (config?.holdAction && config.holdAction.action !== 'default');

  const memoOnClick = useMemo(() => (!isEditMode && hasTap ? makeHandler('tapAction') : undefined), [isEditMode, hasTap, makeHandler]);
  const memoOnLongPress = useMemo(
    () => (!isEditMode && hasHold ? makeHandler('holdAction') : undefined),
    [isEditMode, hasHold, makeHandler]
  );

  if (!widget) return null;

  // Masquée par ses conditions — mais **jamais en mode édition** : une card
  // invisible serait impossible à sélectionner pour corriger sa condition, et
  // on ne saurait même pas qu'elle existe. En édition elle reste là, atténuée.
  if (!visible && !isEditMode) return null;

  const isDragging = draggingId === id;
  const isSelected = selection.selected.has(id);
  // La tuile visée par un déplacement : on se rangera devant elle.
  const isDropTarget = !isDragging && dropTarget?.beforeId === id;
  const metaLabel = META_LABELS.get(widget.type);
  const label = metaLabel ? t(metaLabel) : widget.type;
  const isWidgetModalOpen = !isEditMode && moreInfoState?.widgetId === id;

  const gridStyle: React.CSSProperties = {
    // Plus large que ce que l'écran laisse au panneau : ramenée à sa largeur.
    gridColumn: `span ${Math.min(widget.w, panelCols)}`,
    gridRow: `span ${widget.h}`,
    opacity: isDragging ? 0.4 : visible ? 1 : 0.35,
    transition: 'opacity 0.2s ease, box-shadow 0.2s ease',
    boxShadow: isDropTarget ? '-6px 0 0 0 var(--ds-accent)' : isSelected ? '0 0 0 3px var(--ds-accent)' : 'none',
  };

  return (
    <motion.div
      variants={motionAllowed ? staggerGridItem : undefined}
      // `pointer-events-auto` : l'écran de veille rend la grille dans un
      // conteneur `pointer-events-none` pour laisser passer les balayages entre
      // les cards — chaque card doit y rester cliquable.
      className='relative h-full pointer-events-auto rounded-[var(--ds-radius-lg)]'
      style={gridStyle}
      data-widget-id={id}
      onClickCapture={e => {
        // `Capture` : l'overlay avale les clics. Intercepter à la descente est
        // le seul moyen de voir le geste avant lui.
        if (!isEditMode || (!e.shiftKey && !e.ctrlKey && !e.metaKey)) return;
        e.preventDefault();
        e.stopPropagation();
        selection.toggle(id);
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
      {isEditMode && <GridItemOverlay label={label} widget={widget} onDragStart={startDrag} onResizeStart={startResize} />}
    </motion.div>
  );
}
