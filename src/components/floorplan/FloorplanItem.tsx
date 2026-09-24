import { memo, useState, type RefObject } from 'react';
import { Settings, Trash2 } from 'lucide-react';
import { GridItem, WidgetIdProvider, WIDGET_LABELS } from '@/components/layout/DashboardGrid';
import { WidgetErrorBoundary } from '@/components/ui/WidgetErrorBoundary';
import { useDashboardLayout, type FloorplanPos, type GridWidget } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { WIDGET_COMPONENTS } from '@/widgets';
import { MIN_PLAN_WIDTH, movePos, normalizePos, resizePos } from '@/lib/floorplan';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface FloorplanItemProps {
  widget: GridWidget;
  isEditMode: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
  /** Le plan : les gestes se mesurent en % de sa taille */
  planRef: RefObject<HTMLDivElement | null>;
  /** Position imposée, en % — la projection d'un point de la maquette 3D. */
  projected?: { x: number; y: number };
  /** Fin de glisser ; par défaut la position est enregistrée telle quelle. */
  onCommit?: (next: FloorplanPos, clientX: number, clientY: number) => void;
  /** Estompé, et inerte : le toucher passe au travers, jusqu'à la maquette. */
  faded?: boolean;
  /** Caché par la maquette : effacé, et inerte. */
  hidden?: boolean;
  /** Quelqu'un est là (mouvement, présence) : une lueur respire sous la pastille. */
  breathing?: boolean;
}

/**
 * Le widget lui-même, sans sa position : quand la maquette tourne, elle
 * change à chaque image, lui non — il ne se redessine pas pour autant.
 *
 * Hors édition, c'est un `GridItem` comme sur la grille — fiche au tap,
 * actions, visibilité conditionnelle, styles d'état et frontière d'erreur
 * compris. En édition, il est inerte.
 */
const ItemContent = memo(function ItemContent({ id, type, isEditMode }: { id: string; type: GridWidget['type']; isEditMode: boolean }) {
  const Component = WIDGET_COMPONENTS[type];
  if (!Component) return null;
  return isEditMode ? (
    <WidgetErrorBoundary label={WIDGET_LABELS[type] ?? type}>
      <WidgetIdProvider id={id}>
        <div className='h-full pointer-events-none select-none'>
          <Component />
        </div>
      </WidgetIdProvider>
    </WidgetErrorBoundary>
  ) : (
    <GridItem id={id} readonly>
      <Component />
    </GridItem>
  );
});

/** Un widget posé sur le plan, centré sur `pos` ; en édition, sous un calque qui le déplace. */
export function FloorplanItem({
  widget,
  isEditMode,
  selected,
  onSelect,
  planRef,
  projected,
  onCommit,
  faded,
  hidden,
  breathing,
}: FloorplanItemProps) {
  const { t } = useI18n();
  const { updateWidget, removeWidget } = useDashboardLayout();
  const { setEditingWidgetId } = useWidgetConfig();
  // Une pastille prend la taille de son contenu ; un widget a la sienne.
  const sized = widget.type !== 'chip';
  const saved = { ...normalizePos(widget.pos, sized), ...projected };
  // Pendant un geste la position vit ici, et n'est validée qu'au relâchement :
  // un geste égale un point d'annulation, pas un par pixel.
  const [live, setLive] = useState<FloorplanPos | null>(null);
  const pos = live ?? saved;
  // Une maquette 3D suit l'écran, sans largeur minimale : une card n'y descend
  // pas sous la taille qu'elle aurait sur le plus petit plan en image — elle
  // reste lisible sur un téléphone —, et reste dans le plan.
  const floor = sized ? ((pos.w ?? 0) * MIN_PLAN_WIDTH) / 100 : 0;
  const half = `min(50%, max(${(pos.w ?? 0) / 2}%, ${floor / 2}px))`;

  if (!WIDGET_COMPONENTS[widget.type]) return null;

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
    const onEnd = (ev: PointerEvent) => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onEnd);
      target.removeEventListener('pointercancel', onEnd);
      setLive(null);
      // Un simple clic sélectionne sans rien écrire.
      if (last === saved) return;
      // `...widget.pos` : garde le point d'accroche d'une maquette 3D, que le
      // plan en image ne connaît pas.
      if (onCommit) onCommit(last, ev.clientX, ev.clientY);
      else updateWidget(widget.id, { pos: { ...widget.pos, ...last } }, 'lg');
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
      className={cn('absolute pointer-events-auto transition-opacity duration-500', faded && 'opacity-20', hidden && 'opacity-0')}
      inert={faded || hidden}
      onClick={e => e.stopPropagation()}
      style={{
        left: sized ? `clamp(${half}, ${pos.x}%, calc(100% - ${half}))` : `${pos.x}%`,
        top: `${pos.y}%`,
        width: sized ? `min(100%, max(${pos.w}%, ${floor}px))` : undefined,
        height: sized ? `${pos.h}%` : undefined,
        translate: '-50% -50%',
        // Les pastilles au-dessus des cards : posées sur une card, elles doivent
        // rester atteignables.
        zIndex: selected ? 20 : sized ? 1 : 2,
      }}
    >
      {/* Ici plutôt que dans la pastille : la case d'un widget rogne ce qui en dépasse. */}
      {breathing && <span aria-hidden className='fp-breathe rounded-full' />}
      <ItemContent id={widget.id} type={widget.type} isEditMode={isEditMode} />
      {isEditMode && (
        <>
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
      )}
    </div>
  );
}
