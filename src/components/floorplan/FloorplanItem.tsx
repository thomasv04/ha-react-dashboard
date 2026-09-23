import { useState, type RefObject } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { GridItem, WidgetIdProvider, WIDGET_LABELS } from '@/components/layout/DashboardGrid';
import { WidgetErrorBoundary } from '@/components/ui/WidgetErrorBoundary';
import { useDashboardLayout, type FloorplanPos, type GridWidget } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { WIDGET_COMPONENTS } from '@/widgets';
import { movePos, normalizePos, resizePos } from '@/lib/floorplan';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface FloorplanItemProps {
  widget: GridWidget;
  isEditMode: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  /** Le plan : les gestes se mesurent en % de sa taille */
  planRef: RefObject<HTMLDivElement | null>;
}

/**
 * Un widget posé sur le plan, centré sur `pos`.
 *
 * Hors édition, c'est un `GridItem` comme sur la grille — fiche au tap,
 * actions, visibilité conditionnelle, styles d'état et frontière d'erreur
 * compris. En édition, le widget est inerte sous un calque qui le déplace.
 */
export function FloorplanItem({ widget, isEditMode, selected, onSelect, planRef }: FloorplanItemProps) {
  const { t } = useI18n();
  const { updateWidget, removeWidget } = useDashboardLayout();
  const { setEditingWidgetId } = useWidgetConfig();
  // Une pastille prend la taille de son contenu ; un widget a la sienne.
  const sized = widget.type !== 'chip';
  const saved = normalizePos(widget.pos, sized);
  // Pendant un geste la position vit ici, et n'est validée qu'au relâchement :
  // un geste égale un point d'annulation, pas un par pixel.
  const [live, setLive] = useState<FloorplanPos | null>(null);
  const pos = live ?? saved;

  const Component = WIDGET_COMPONENTS[widget.type];
  if (!Component) return null;
  const label = WIDGET_LABELS[widget.type] ?? widget.type;

  const startGesture = (e: React.PointerEvent<HTMLElement>, apply: typeof movePos) => {
    const rect = planRef.current?.getBoundingClientRect();
    if (!rect || (e.button !== undefined && e.button !== 0)) return;
    e.stopPropagation();
    onSelect(widget.id);

    const target = e.currentTarget;
    target.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    const y0 = e.clientY;
    let last = saved;

    const onMove = (ev: PointerEvent) => {
      last = apply(saved, ev.clientX - x0, ev.clientY - y0, rect);
      setLive(last);
    };
    const onEnd = () => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onEnd);
      target.removeEventListener('pointercancel', onEnd);
      setLive(null);
      // Un simple clic sélectionne sans rien écrire.
      if (last !== saved) updateWidget(widget.id, { pos: last }, 'lg');
    };
    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onEnd);
    target.addEventListener('pointercancel', onEnd);
  };

  return (
    <div
      data-floorplan-item={widget.id}
      // Le calque des éléments laisse passer les clics vers le plan ; chaque
      // élément les reprend. Le clic s'arrête ici : sinon, sur le plan, il
      // poserait une pastille en plus.
      className='absolute pointer-events-auto'
      onClick={e => e.stopPropagation()}
      style={{
        left: `${pos.x}%`,
        top: `${pos.y}%`,
        width: sized ? `${pos.w}%` : undefined,
        height: sized ? `${pos.h}%` : undefined,
        translate: '-50% -50%',
        // Les pastilles au-dessus des cards : posées sur une card, elles doivent
        // rester atteignables.
        zIndex: selected ? 20 : sized ? 1 : 2,
      }}
    >
      {isEditMode ? (
        <>
          <WidgetErrorBoundary label={label}>
            <WidgetIdProvider id={widget.id}>
              <div className='h-full pointer-events-none select-none'>
                <Component />
              </div>
            </WidgetIdProvider>
          </WidgetErrorBoundary>

          <div
            data-drag-handle
            onPointerDown={e => startGesture(e, movePos)}
            className={cn(
              'absolute -inset-1 cursor-grab active:cursor-grabbing touch-none outline-2 outline-offset-2',
              sized ? 'rounded-[calc(var(--dash-card-radius,24px)+4px)]' : 'rounded-full',
              selected ? 'outline-blue-400' : 'outline-dashed outline-white/35'
            )}
          />

          {selected && (
            <div className='absolute left-1/2 -translate-x-1/2 bottom-full mb-2.5 flex items-center gap-1 p-1 rounded-xl gc-overlay'>
              <button
                onClick={() => setEditingWidgetId(widget.id)}
                title={t('layout.configureWidget')}
                aria-label={t('layout.configureWidget')}
                className='p-1.5 rounded-lg text-blue-300 hover:bg-blue-500/25 transition-colors'
              >
                <Settings size={13} />
              </button>
              <button
                onClick={() => removeWidget(widget.id)}
                title={t('layout.removeWidget')}
                aria-label={t('layout.removeWidget')}
                className='p-1.5 rounded-lg text-red-300 hover:bg-red-500/25 transition-colors'
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}

          {sized && (
            <div
              onPointerDown={e => startGesture(e, resizePos)}
              title={t('layout.floorplan.resize')}
              className='absolute -right-2 -bottom-2 w-4 h-4 rounded-full bg-blue-400 border-2 border-white/80 cursor-se-resize touch-none shadow'
            />
          )}
        </>
      ) : (
        <GridItem id={widget.id} readonly>
          <Component />
        </GridItem>
      )}
    </div>
  );
}
