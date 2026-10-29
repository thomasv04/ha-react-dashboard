import { memo, useState } from 'react';
import { Copy, Lock, MoveDiagonal, Settings, Trash2 } from 'lucide-react';
import { useDashboardLayout, useSizePresets, type GridWidget } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { WIDGET_DISPOSITIONS } from '@/widgets';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

interface GridItemOverlayProps {
  id: string;
  label: string;
  widget: GridWidget;
  /** Appui sur le fond du calque : la tuile se déplace. */
  onDragStart: (e: React.PointerEvent) => void;
  onResizeStart: (clientX: number, clientY: number) => void;
}

const ROUND = 'flex size-9 items-center justify-center rounded-full';

/**
 * Calque d'édition d'une tuile. Son fond se saisit pour la déplacer ; ses
 * boutons — qui gardent leur geste pour eux — la configurent, la dupliquent, la
 * suppriment, et son coin la redimensionne.
 */
function GridItemOverlayInner({ id, label, widget, onDragStart, onResizeStart }: GridItemOverlayProps) {
  const { t } = useI18n();
  const { removeWidget, duplicateWidget } = useDashboardLayout();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const { cycleSize, getCurrentPresetName } = useSizePresets();
  const { setEditingWidgetId } = useWidgetConfig();
  const hasDispositions = !!WIDGET_DISPOSITIONS[widget.type]?.length;
  const keep = (e: React.PointerEvent) => e.stopPropagation();

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
        <span className={cn(ROUND, 'bg-black/45 text-white')} title={label}>
          <Lock size={14} />
        </span>
      </div>
    );
  }

  return (
    <div
      onPointerDown={onDragStart}
      title={t('layout.panel.moveTile')}
      // `touch-none` : au doigt, le navigateur défilerait la page au lieu de
      // laisser glisser la tuile.
      className='absolute inset-0 z-10 flex cursor-grab touch-none flex-col rounded-[var(--ds-radius-lg)] bg-black/65 text-white outline-2 outline-dashed outline-white/40 active:cursor-grabbing'
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
            className={cn(ROUND, 'bg-white/20')}
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
        <div
          className='mx-2 flex flex-col gap-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-1)] p-3 text-[var(--ds-ink)]'
          onPointerDown={keep}
        >
          <span className='text-sm font-semibold'>{t('layout.removeWidgetConfirm')}</span>
          <div className='flex gap-2'>
            <button
              onClick={() => setConfirmingDelete(false)}
              className='h-9 flex-1 rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] text-sm font-semibold'
            >
              {t('layout.removeWidgetCancel')}
            </button>
            <button
              onClick={() => removeWidget(id)}
              className='h-9 flex-1 rounded-[var(--ds-radius-pill)] bg-[var(--ds-alert)] text-sm font-semibold text-white'
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
          className='flex h-9 items-center gap-1.5 rounded-[var(--ds-radius-pill)] bg-white/20 px-3 text-sm font-semibold'
          title={hasDispositions ? t('layout.layout') : t('layout.changeSize')}
        >
          <MoveDiagonal size={14} />
          {hasDispositions ? `${widget.w}×${widget.h}` : (getCurrentPresetName(id) ?? t('layout.sizeNormal'))}
        </button>
        <span
          role='button'
          aria-label={t('layout.panel.resize')}
          title={t('layout.panel.resize')}
          className={cn(ROUND, 'cursor-se-resize bg-white/20')}
          onPointerDown={e => {
            e.stopPropagation();
            e.preventDefault();
            onResizeStart(e.clientX, e.clientY);
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

export const GridItemOverlay = memo(GridItemOverlayInner);
