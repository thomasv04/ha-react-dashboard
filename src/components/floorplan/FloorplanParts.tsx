import { AppWindow, ArrowLeftRight, Blinds, DoorOpen, Warehouse, type LucideIcon } from 'lucide-react';
import { useHass } from '@hakit/core';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { useEntities } from '@/hooks/useEntities';
import { guessPartKind, PART_KINDS, type FloorplanPart, type PartKind } from '@/lib/floorplan';
import { friendlyName } from '@/lib/ha-service';
import { useI18n } from '@/i18n';
import { DraftPopover, DrawnList, KindGrid } from './FloorplanDrawn';

const PART_ICONS: Record<PartKind, LucideIcon> = { door: DoorOpen, window: AppWindow, shutter: Blinds, garage: Warehouse };

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
    <DraftPopover
      title={t('layout.floorplan.partTitle')}
      onCancel={onCancel}
      style={{
        ...(toRight ? { left: `calc(${around.right}% + 2rem)` } : { right: `calc(${100 - around.left}% + 2rem)` }),
        top: `clamp(0.5rem, calc(${around.y}% - 6rem), calc(100% - 15rem))`,
      }}
    >
      <EntityPicker autoOpen label='' value={part.entityId} domain={['cover', 'binary_sensor']} onChange={choose} />
      <KindGrid
        kinds={PART_KINDS}
        value={part.kind}
        onChange={kind => onChange({ ...part, kind })}
        icons={PART_ICONS}
        label={kind => t(`layout.floorplan.partKinds.${kind}`)}
      />
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
    </DraftPopover>
  );
}

/** Éléments posés sur la maquette, pour les retirer. */
export function PartList({ parts, onRemove }: { parts: FloorplanPart[]; onRemove: (id: string) => void }) {
  const { t } = useI18n();
  const entities = useEntities(parts.map(p => p.entityId));
  return (
    <DrawnList
      title={t('layout.floorplan.parts')}
      removeLabel={t('layout.floorplan.partRemove')}
      items={parts.map(p => ({ id: p.id, label: friendlyName(entities[p.entityId]) ?? p.entityId, icon: PART_ICONS[p.kind] }))}
      onRemove={onRemove}
    />
  );
}
