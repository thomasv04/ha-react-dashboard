import { useState } from 'react';
import { useDrag } from '@use-gesture/react';
import { Copy, Lock, MoveDiagonal, Settings, Trash2 } from 'lucide-react';
import { useDashboardLayout, useSizePresets, type GridWidget } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { WIDGET_DISPOSITIONS } from '@/widgets';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

interface GridItemOverlayProps {
  label: string;
  widget: GridWidget;
  /** Appui sur le fond du calque : la tuile se déplace. */
  onDragStart: (widgetId: string, start: { clientX: number; clientY: number }) => void;
  onResizeStart: (widgetId: string, clientX: number, clientY: number) => void;
}

const ROUND = 'flex size-10 items-center justify-center rounded-full';

/** Appui prolongé, en ms, avant qu'une tuile se laisse saisir au doigt. */
const TOUCH_HOLD = 220;
/** Mouvement, en px, avant que le geste ne choisisse son axe pendant cet appui. */
const TOUCH_SLOP = 8;

/**
 * Calque d'édition d'une tuile. Son fond se saisit pour la déplacer ; ses
 * boutons — qui gardent leur geste pour eux — la configurent, la dupliquent, la
 * suppriment, et son coin la redimensionne.
 */
export function GridItemOverlay({ label, widget, onDragStart, onResizeStart }: GridItemOverlayProps) {
  const id = widget.id;
  const { t } = useI18n();
  const { removeWidget, duplicateWidget } = useDashboardLayout();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { cycleSize, getCurrentPresetName } = useSizePresets();
  const { setEditingWidgetId } = useWidgetConfig();
  const hasDispositions = !!WIDGET_DISPOSITIONS[widget.type]?.length;
  const keep = (e: React.PointerEvent) => e.stopPropagation();

  /**
   * À la souris, la tuile se saisit aussitôt. Au doigt, il faut la tenir un
   * instant — ou la tirer de côté : sans ça, poser le doigt pour faire défiler
   * le panneau déplacerait une tuile à chaque fois. `preventScroll` tranche :
   * avant `TOUCH_HOLD`, un geste vertical rend la main au défilement, un geste
   * horizontal saisit la tuile. Seul le départ compte ici, `dragSession` suit.
   */
  const bind = useDrag(({ first, xy: [clientX, clientY] }) => first && onDragStart(id, { clientX, clientY }), {
    preventScroll: TOUCH_HOLD,
    preventScrollAxis: 'y',
    axisThreshold: { touch: TOUCH_SLOP },
  });

  if (widget.static) {
    return (
      <div className='absolute right-2 top-2 z-10 flex items-center gap-1.5'>
        <button
          onClick={() => setEditingWidgetId(id)}
          className={cn(ROUND, 'bg-[var(--ds-accent)] text-white')}
          title={t('layout.configureWidget')}
          aria-label={t('layout.configureWidget')}
        >
          <Settings size={16} />
        </button>
        <span className={cn(ROUND, 'bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]')} title={label}>
          <Lock size={14} />
        </span>
      </div>
    );
  }

  // `touch-pan-y` : le navigateur tranche entre défilement et glisser-déposer au
  // premier mouvement du doigt, avant que notre appui prolongé n'ait pu parler.
  // Un geste horizontal sur une tuile ne doit donc pas faire glisser le plateau
  // (il le fait en lecture) : il appartient au déplacement de la tuile.
  return (
    <div
      {...bind()}
      title={t('layout.panel.moveTile')}
      className='absolute inset-0 z-10 flex cursor-grab touch-pan-y select-none flex-col rounded-[var(--ds-radius-lg)] bg-[color-mix(in_srgb,var(--ds-surface-3)_94%,transparent)] text-[var(--ds-ink)] outline-2 outline-dashed outline-[var(--ds-ink-muted)] active:cursor-grabbing'
    >
      <div className='flex items-start justify-between gap-2 p-2'>
        <span className='truncate pl-1 pt-1.5 text-sm font-semibold'>{label}</span>
        <div className='flex shrink-0 items-center gap-1.5' onPointerDown={keep}>
          <button
            onClick={() => setEditingWidgetId(id)}
            className={cn(ROUND, 'bg-[var(--ds-accent)]')}
            title={t('layout.configureWidget')}
            aria-label={t('layout.configureWidget')}
          >
            <Settings size={16} />
          </button>
          {/* Dupliquer — reprend aussi la configuration. Refaire à la main un
              thermostat ou un graphe finement réglé était le geste le plus
              fastidieux du mode édition. */}
          <button
            onClick={() => duplicateWidget(id)}
            className={cn(ROUND, 'bg-[var(--ds-surface-1)]')}
            title={t('layout.duplicateWidget')}
            aria-label={t('layout.duplicateWidget')}
          >
            <Copy size={16} />
          </button>
          <button
            onClick={() => setConfirmingDelete(true)}
            className={cn(ROUND, 'bg-[var(--ds-alert)]')}
            title={t('layout.removeWidget')}
            aria-label={t('layout.removeWidget')}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {confirmingDelete && (
        // Recouvre toute la tuile : sur une tuile d'une rangée, une boîte posée dans
        // le flux débordait sous le calque des voisines, qui interceptaient les appuis.
        <div
          className='absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-1)] p-2 text-[var(--ds-ink)]'
          onPointerDown={keep}
        >
          <span className='text-center text-sm font-semibold'>{t('layout.removeWidgetConfirm')}</span>
          <div className='flex gap-2'>
            <button
              onClick={() => setConfirmingDelete(false)}
              className='h-8 rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-4 text-sm font-semibold'
            >
              {t('layout.removeWidgetCancel')}
            </button>
            <button
              onClick={() => removeWidget(id)}
              className='h-8 rounded-[var(--ds-radius-pill)] bg-[var(--ds-alert)] px-4 text-sm font-semibold text-white'
            >
              {t('layout.removeWidgetConfirmBtn')}
            </button>
          </div>
        </div>
      )}

      <div className='mt-auto flex items-end justify-between gap-2 p-2'>
        {/* Une disposition se choisit dans la fiche ; sinon, les trois tailles prédéfinies tournent. */}
        <button
          onPointerDown={keep}
          onClick={() => (hasDispositions ? setEditingWidgetId(id) : cycleSize(id))}
          className='flex h-9 items-center gap-1.5 rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-1)] px-3 text-sm font-semibold'
          title={hasDispositions ? t('layout.layout') : t('layout.changeSize')}
        >
          <MoveDiagonal size={14} />
          {hasDispositions ? `${widget.w}×${widget.h}` : (getCurrentPresetName(id) ?? t('layout.sizeNormal'))}
        </button>
        <span
          role='button'
          aria-label={t('layout.panel.resize')}
          title={t('layout.panel.resize')}
          className={cn(ROUND, 'cursor-se-resize touch-none bg-[var(--ds-surface-1)]')}
          onPointerDown={e => {
            e.stopPropagation();
            e.preventDefault();
            onResizeStart(id, e.clientX, e.clientY);
          }}
        >
          <svg width='12' height='12' viewBox='0 0 10 10' aria-hidden='true'>
            <line x1='9' y1='1' x2='1' y2='9' stroke='currentColor' strokeWidth='1.5' />
            <line x1='9' y1='4' x2='4' y2='9' stroke='currentColor' strokeWidth='1.5' />
            <line x1='9' y1='7' x2='7' y2='9' stroke='currentColor' strokeWidth='1.5' />
          </svg>
        </span>
      </div>
    </div>
  );
}
