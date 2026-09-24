import { ArrowLeftRight, BatteryCharging, House, Sun, Zap, type LucideIcon } from 'lucide-react';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { useEntities } from '@/hooks/useEntities';
import { useFormats } from '@/hooks/useFormats';
import { CABLE_COLORS, CABLE_KINDS, DRAFT_COLOR, guessCableKind, type CableKind, type FloorplanCable } from '@/lib/floorplan';
import { friendlyName } from '@/lib/ha-service';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { DraftPopover, DrawnList, KindGrid } from './FloorplanDrawn';

/** Celles de la card « Flux d'énergie ». */
const CABLE_ICONS: Record<CableKind, LucideIcon> = { solar: Sun, grid: Zap, home: House, battery: BatteryCharging };

type Point = { x: number; y: number };

/** Une puissance lisible : en W, en kW au-delà de mille. */
function power(watts: number, locale: string) {
  const w = Math.abs(watts);
  return w >= 1000 ? `${(w / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} kW` : `${Math.round(w)} W`;
}

/**
 * Par-dessus la maquette, ce qui ne se dessine pas en 3D : la puissance de
 * chaque câble, à mi-longueur (`at`, en % du plan), et le trajet qu'on trace,
 * en pixels — le câble, lui, est un tube de la scène (`cables3d`).
 */
export function CableOverlay({
  labels,
  draft,
}: {
  labels: { id: string; kind: CableKind; watts: number | null; at: Point | null }[];
  draft: Point[] | null;
}) {
  const { locale } = useFormats();
  return (
    <div className='absolute inset-0 pointer-events-none'>
      {draft && draft.length > 1 && (
        <svg className='absolute inset-0 w-full h-full overflow-visible'>
          <polyline
            points={draft.map(p => `${p.x},${p.y}`).join(' ')}
            fill='none'
            stroke={DRAFT_COLOR}
            strokeWidth={2.5}
            strokeDasharray='6 5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      )}
      {labels.map(({ id, kind, watts, at }) => {
        if (!at || watts === null) return null;
        const Icon = CABLE_ICONS[kind];
        return (
          <span
            key={id}
            data-floorplan-cable={id}
            className='absolute flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full bg-black/65 backdrop-blur-sm text-[11px] font-semibold text-white tabular-nums whitespace-nowrap shadow-lg'
            style={{ left: `${at.x}%`, top: `${at.y}%`, translate: '-50% -50%' }}
          >
            <Icon size={12} style={{ color: CABLE_COLORS[kind] }} />
            {power(watts, locale)}
          </span>
        );
      })}
    </div>
  );
}

/**
 * Câble tout juste tracé : son entité, sa sorte — devinée d'après elle — et
 * son sens. L'aperçu, sur la maquette, suit chaque choix.
 */
export function CablePopover({
  cable,
  at,
  onChange,
  onAdd,
  onCancel,
}: {
  cable: FloorplanCable;
  /** Le bout du câble, en % du plan : la fenêtre s'ouvre juste en dessous. */
  at: { x: number; y: number };
  onChange: (cable: FloorplanCable) => void;
  onAdd: () => void;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  return (
    <DraftPopover
      title={t('layout.floorplan.cableTitle')}
      onCancel={onCancel}
      style={{
        left: `clamp(8rem, ${at.x}%, calc(100% - 8rem))`,
        top: `clamp(0.5rem, calc(${at.y}% + 1.5rem), calc(100% - 16rem))`,
        translate: '-50% 0',
      }}
    >
      <EntityPicker
        autoOpen
        label=''
        value={cable.entityId}
        domain='sensor'
        onChange={entityId => onChange({ ...cable, entityId, kind: guessCableKind(entityId) })}
      />
      {/* Les sortes, dans les mots et les couleurs de la card « Flux d'énergie ». */}
      <KindGrid
        kinds={CABLE_KINDS}
        value={cable.kind}
        onChange={kind => onChange({ ...cable, kind })}
        icons={CABLE_ICONS}
        colors={CABLE_COLORS}
        label={kind => t(`widgets.energy_flow.${kind}`)}
      />
      <div className='flex items-center gap-2'>
        <button
          onClick={() => onChange({ ...cable, invert: !cable.invert })}
          aria-pressed={!!cable.invert}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs border transition-colors',
            cable.invert ? 'bg-white/12 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
          )}
        >
          <ArrowLeftRight size={12} /> {t('layout.floorplan.cableInvert')}
        </button>
        <button
          onClick={onAdd}
          disabled={!cable.entityId}
          className='ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/80 text-white hover:bg-blue-500 disabled:opacity-40'
        >
          {t('common.add')}
        </button>
      </div>
    </DraftPopover>
  );
}

/** Câbles tracés sur la maquette, pour les retirer. */
export function CableList({ cables, onRemove }: { cables: FloorplanCable[]; onRemove: (id: string) => void }) {
  const { t } = useI18n();
  const entities = useEntities(cables.map(c => c.entityId));
  return (
    <DrawnList
      title={t('layout.floorplan.cables')}
      removeLabel={t('layout.floorplan.cableRemove')}
      items={cables.map(c => ({
        id: c.id,
        label: friendlyName(entities[c.entityId]) ?? c.entityId,
        icon: CABLE_ICONS[c.kind],
        color: CABLE_COLORS[c.kind],
      }))}
      onRemove={onRemove}
    />
  );
}
