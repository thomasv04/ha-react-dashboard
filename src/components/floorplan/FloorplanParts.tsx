import { AppWindow, ArrowLeftRight, Blinds, DoorOpen, Trash2, Warehouse, X, type LucideIcon } from 'lucide-react';
import { useHass } from '@hakit/core';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { useEntities } from '@/hooks/useEntities';
import { guessPartKind, type FloorplanPart, type PartKind } from '@/lib/floorplan';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

const PART_ICONS: Record<PartKind, LucideIcon> = { door: DoorOpen, window: AppWindow, shutter: Blinds, garage: Warehouse };
const KINDS = Object.keys(PART_ICONS) as PartKind[];

/**
 * Élément tout juste dessiné : son entité, son type — deviné d'après elle —
 * et son côté. L'aperçu, dans la maquette, suit chaque choix.
 */
export function PartPopover({
  part,
  around,
  onChange,
  onAdd,
  onCancel,
}: {
  part: FloorplanPart;
  /** Emprise de l'élément à l'écran, en % du plan : la fenêtre s'ouvre à côté, pas dessus — on doit voir l'aperçu. */
  around: { left: number; right: number; y: number };
  onChange: (part: FloorplanPart) => void;
  onAdd: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();

  const choose = (entityId: string) => {
    const deviceClass = useHass.getState().entities?.[entityId]?.attributes?.device_class;
    onChange({ ...part, entityId, kind: guessPartKind(entityId, deviceClass) });
  };

  // Du côté où il reste le plus de place.
  const toRight = 100 - around.right > around.left;

  return (
    <div
      role='dialog'
      aria-label={t('layout.floorplan.partTitle')}
      onClick={e => e.stopPropagation()}
      className='absolute z-40 w-64 p-2 rounded-xl gc-overlay cursor-default flex flex-col gap-2'
      style={{
        ...(toRight ? { left: `calc(${around.right}% + 2rem)` } : { right: `calc(${100 - around.left}% + 2rem)` }),
        top: `clamp(0.5rem, calc(${around.y}% - 6rem), calc(100% - 15rem))`,
      }}
    >
      <div className='flex items-center justify-between px-1'>
        <span className='text-[11px] text-white/50'>{t('layout.floorplan.partTitle')}</span>
        <button onClick={onCancel} aria-label={t('common.cancel')} className='p-0.5 rounded text-white/40 hover:text-white'>
          <X size={12} />
        </button>
      </div>
      <EntityPicker autoOpen label='' value={part.entityId} domain={['cover', 'binary_sensor']} onChange={choose} />
      <div className='grid grid-cols-4 gap-1'>
        {KINDS.map(kind => {
          const Icon = PART_ICONS[kind];
          return (
            <button
              key={kind}
              onClick={() => onChange({ ...part, kind })}
              aria-pressed={part.kind === kind}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] border transition-colors',
                part.kind === kind
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-200'
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              )}
            >
              <Icon size={14} />
              {t(`layout.floorplan.partKinds.${kind}`)}
            </button>
          );
        })}
      </div>
      <div className='flex items-center gap-2'>
        <button
          onClick={() => onChange({ ...part, side: part.side === 1 ? -1 : 1 })}
          className='flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs bg-white/5 border border-white/10 text-white/70 hover:text-white'
        >
          <ArrowLeftRight size={12} /> {t('layout.floorplan.partFlip')}
        </button>
        <button
          onClick={onAdd}
          disabled={!part.entityId}
          className='ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/80 text-white hover:bg-blue-500 disabled:opacity-40'
        >
          {t('common.add')}
        </button>
      </div>
    </div>
  );
}

/** Éléments posés sur la maquette, pour les retirer. */
export function PartList({ parts, onRemove }: { parts: FloorplanPart[]; onRemove: (id: string) => void }) {
  const { t } = useI18n();
  const entities = useEntities(parts.map(p => p.entityId));
  if (!parts.length) return null;
  return (
    <div className='flex flex-col gap-1'>
      <span className='text-[11px] text-white/40 px-0.5'>{t('layout.floorplan.parts')}</span>
      {parts.map(part => {
        const Icon = PART_ICONS[part.kind];
        const name = entities[part.entityId]?.attributes?.friendly_name;
        return (
          <div key={part.id} className='flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 text-xs text-white/70'>
            <Icon size={13} className='text-white/40 shrink-0' />
            <span className='flex-1 truncate'>{typeof name === 'string' ? name : part.entityId}</span>
            <button
              onClick={() => onRemove(part.id)}
              title={t('layout.floorplan.partRemove')}
              aria-label={t('layout.floorplan.partRemove')}
              className='text-red-400/70 hover:text-red-400'
            >
              <Trash2 size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
