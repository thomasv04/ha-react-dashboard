import { useDashboardLayout, useEditMode, type GridWidget, type LayoutPanel } from '@/context/DashboardLayoutContext';
import { useState, useEffect, useLayoutEffect, useRef, createContext, useContext, memo, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Minus, Pencil, Plus, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useUser } from '@hakit/core';
import { Sheet } from '@/components/ds/Sheet';
import { SwitchTrack } from '@/components/ds/Switch';
import { staggerGridContainer, staggerGridItem } from '@/lib/motion-variants';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
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

/** Libellés i18n des widgets, par type — calculés une fois. */
const META_LABELS = new Map(WIDGET_META.map(m => [m.type, m.label]));

interface GridCtxValue {
  breakpoint: Breakpoint;
  draggingId: string | null;
  dropTarget: DropTarget | null;
  /** Commence le déplacement d'une tuile, au doigt comme à la souris. */
  startDrag: (widgetId: string, e: React.PointerEvent) => void;
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

/** Sous cette largeur, les panneaux s'empilent au lieu de défiler côte à côte. */
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
  const { layout, moveWidget, updateWidget, addPanel } = useDashboardLayout();
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

  const stacked = width > 0 && width < STACK_BELOW;
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
    (widgetId: string, e: React.PointerEvent) => {
      e.preventDefault();
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

      trackPointer(
        ev => {
          const next = targetAt(ev.clientX, ev.clientY);
          const prev = dropRef.current;
          // Même cible qu'au mouvement précédent : rien à redessiner. Sans ce
          // garde, toute la page se re-rendait à chaque pixel du glisser.
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
    () => ({ breakpoint, draggingId, dropTarget, startDrag, startResize, motionAllowed }),
    [breakpoint, draggingId, dropTarget, startDrag, startResize, motionAllowed]
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

  return (
    <GridCtx.Provider value={ctxValue}>
      <SelectionCtx.Provider value={selectionValue}>
        <motion.div
          ref={outerRef}
          variants={motionAllowed ? staggerGridContainer : undefined}
          initial={motionAllowed ? 'hidden' : false}
          animate='visible'
          className={cn(
            'flex w-full gap-[22px]',
            stacked ? 'flex-col' : 'items-start overflow-x-auto pb-2',
            isEditMode && 'dashboard-editing',
            className
          )}
        >
          {columns.map(column => (
            <div key={column[0].panel.id} className={cn('flex shrink-0 flex-col gap-[22px]', stacked && 'w-full')}>
              {column.map(({ panel, index }) => (
                <PanelSection
                  key={panel.id}
                  panel={panel}
                  cols={Math.min(panel.cols, fit)}
                  readonly={!!readonly}
                  editing={isEditMode && (!editPanelId || editPanelId === panel.id)}
                  first={index === 0}
                  last={index === layout.panels.length - 1}
                />
              ))}
            </div>
          ))}
          {/* Un panneau seul en édition : la page, elle, ne change pas. */}
          {isEditMode && !editPanelId && (
            <button
              onClick={addPanel}
              className={cn(
                'flex min-h-[200px] shrink-0 flex-col items-center justify-center gap-2 rounded-[30px] border-2 border-dashed border-[var(--ds-surface-3)] text-[15px] font-semibold text-[var(--ds-ink-muted)]',
                stacked ? 'w-full' : 'w-[200px]'
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

const ROUND = 'flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)] disabled:opacity-30';

/**
 * Un panneau : son titre et ses deux boutons — réglages, modification —, puis
 * ses tuiles rangées sur la trame.
 *
 * Les deux boutons passent par la barre d'édition (`EDIT_PANEL_EVENT`) : elle
 * garde le code d'accès et l'enregistrement, et n'ouvre que ce panneau-là.
 */
function PanelSection({
  panel,
  cols,
  readonly,
  editing,
  first,
  last,
}: {
  panel: LayoutPanel;
  cols: number;
  readonly: boolean;
  editing: boolean;
  first: boolean;
  last: boolean;
}) {
  const { t } = useI18n();
  const isAdmin = !!useUser()?.is_admin;
  const { dropTarget, draggingId } = useGridCtx();
  const [adding, setAdding] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // ⚙ hors édition : on attend d'y être entré (code éventuel) pour ouvrir.
  const [settingsWanted, setSettingsWanted] = useState(false);
  const dropAtEnd = dropTarget?.panelId === panel.id && dropTarget.index >= panel.widgets.length;
  const controls = isAdmin && !readonly;

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
          className={cn(
            'flex w-full flex-col gap-3.5 rounded-[30px] bg-[var(--ds-surface-1)] p-[22px] text-[var(--ds-ink)]',
            editing && 'outline-2 outline-dashed outline-[var(--ds-accent)]'
          )}
        >
          {(panel.title || controls) && (
            <div className='flex min-h-10 items-center gap-2'>
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
        </section>
        <AnimatePresence>{adding && <AddWidgetModal panelId={panel.id} onClose={() => setAdding(false)} />}</AnimatePresence>
        <PanelSettings panel={panel} open={settingsOpen} onClose={() => setSettingsOpen(false)} first={first} last={last} />
      </PanelEditCtx.Provider>
    </PanelColsCtx.Provider>
  );
}

/** Réglages d'un panneau, dans une feuille : titre, largeur, place, suppression. */
function PanelSettings({
  panel,
  open,
  onClose,
  first,
  last,
}: {
  panel: LayoutPanel;
  open: boolean;
  onClose: () => void;
  first: boolean;
  last: boolean;
}) {
  const { t } = useI18n();
  const { updatePanel, removePanel, movePanel } = useDashboardLayout();
  const [confirming, setConfirming] = useState(false);
  const row = 'flex items-center justify-between gap-3 rounded-[var(--ds-radius-xl)] bg-[var(--ds-sheet-section)] p-4';

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

        <div className={row}>
          <span className='text-[15px] font-bold'>{t('layout.panel.width_label')}</span>
          <div className='flex items-center gap-2'>
            <button
              onClick={() => updatePanel(panel.id, { cols: panel.cols - 1 })}
              disabled={panel.cols <= PANEL_COLS_MIN}
              aria-label={t('layout.panel.narrower')}
              className={ROUND}
            >
              <Minus size={18} />
            </button>
            <span className='min-w-[10ch] text-center text-sm tabular-nums'>{t('layout.panel.width', { value: panel.cols })}</span>
            <button
              onClick={() => updatePanel(panel.id, { cols: panel.cols + 1 })}
              disabled={panel.cols >= PANEL_COLS_MAX}
              aria-label={t('layout.panel.wider')}
              className={ROUND}
            >
              <Plus size={18} />
            </button>
          </div>
        </div>

        {!first && (
          <button
            role='switch'
            aria-checked={!!panel.below}
            onClick={() => updatePanel(panel.id, { below: !panel.below || undefined })}
            className={cn(row, 'text-left')}
          >
            <span>
              <span className='block text-[15px] font-bold'>{t('layout.panel.below')}</span>
              <span className='block text-sm text-[var(--ds-ink-muted)]'>{t('layout.panel.belowDesc')}</span>
            </span>
            <SwitchTrack on={!!panel.below} />
          </button>
        )}

        <div className={row}>
          <span className='text-[15px] font-bold'>{t('layout.panel.order')}</span>
          <div className='flex items-center gap-2'>
            <button onClick={() => movePanel(panel.id, -1)} disabled={first} aria-label={t('layout.panel.moveLeft')} className={ROUND}>
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => movePanel(panel.id, 1)} disabled={last} aria-label={t('layout.panel.moveRight')} className={ROUND}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

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
