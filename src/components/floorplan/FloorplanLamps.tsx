import { Lightbulb, Plus } from 'lucide-react';
import { useEntities } from '@/hooks/useEntities';
import { lightColor } from '@/lib/floorplan';
import { friendlyName } from '@/lib/ha-service';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { DrawnList } from './FloorplanDrawn';

/**
 * Les lampes de la page — les pastilles d'une lumière, qui éclairent la
 * maquette —, et de quoi en poser une : l'outil « Pastille », qui ne propose
 * alors que des lumières.
 */
export function LampList({
  lamps,
  armed,
  onArm,
  onRemove,
}: {
  lamps: { id: string; entityId: string }[];
  /** Le prochain clic sur la maquette pose une lampe. */
  armed: boolean;
  onArm: () => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  const entities = useEntities(lamps.map(l => l.entityId));
  return (
    <DrawnList
      title={t('layout.floorplan.lamps')}
      removeLabel={t('layout.floorplan.lampRemove')}
      items={lamps.map(l => {
        const entity = entities[l.entityId];
        // Allumée, l'ampoule prend sa couleur.
        const color = lightColor(entity?.state, entity?.attributes);
        return {
          id: l.id,
          label: friendlyName(entity) ?? l.entityId,
          icon: Lightbulb,
          ...(color && { color: `rgb(${color.join(' ')})` }),
        };
      })}
      onRemove={onRemove}
      action={
        <button
          onClick={onArm}
          aria-pressed={armed}
          className={cn(
            'flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors',
            armed ? 'bg-amber-500/20 border-amber-500/40 text-amber-200' : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
          )}
        >
          <Plus size={13} /> {t('layout.floorplan.lampAdd')}
        </button>
      }
    />
  );
}
