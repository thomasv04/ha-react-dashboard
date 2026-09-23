import { ArrowLeftRight, BatteryCharging, House, Sun, Trash2, X, Zap, type LucideIcon } from 'lucide-react';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { useEntities } from '@/hooks/useEntities';
import { useFormats } from '@/hooks/useFormats';
import { CABLE_COLORS, CABLE_KINDS, guessCableKind, polylineMidpoint, type CableKind, type FloorplanCable } from '@/lib/floorplan';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

const CABLE_ICONS: Record<CableKind, LucideIcon> = { solar: Sun, grid: Zap, home: House, battery: BatteryCharging };

/** Le trajet qu'on trace : ambre, comme les autres dessins en cours. */
const DRAFT_COLOR = '#fbbf24';
/** Rayon des coudes, en px : un câble ne fait pas d'angle vif. */
const ELBOW = 14;

type Point = { x: number; y: number };

/** Un câble et son tracé à l'écran, en pixels du plan. */
export type CableOnScreen = FloorplanCable & { screen: Point[] };

/** Une puissance lisible : en W, en kW au-delà de mille. */
function power(watts: number, locale: string) {
  const w = Math.abs(watts);
  return w >= 1000 ? `${(w / 1000).toLocaleString(locale, { maximumFractionDigits: 1 })} kW` : `${Math.round(w)} W`;
}

const xy = (p: Point) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;

/** Le tracé d'un câble, ses coudes arrondis. */
function pathOf(points: Point[]) {
  let d = `M ${xy(points[0])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [a, b, c] = [points[i - 1], points[i], points[i + 1]];
    const into = Math.hypot(b.x - a.x, b.y - a.y);
    const out = Math.hypot(c.x - b.x, c.y - b.y);
    const r = Math.min(ELBOW, into / 2, out / 2);
    if (!r) {
      d += ` L ${xy(b)}`;
      continue;
    }
    const before = { x: b.x - ((b.x - a.x) / into) * r, y: b.y - ((b.y - a.y) / into) * r };
    const after = { x: b.x + ((c.x - b.x) / out) * r, y: b.y + ((c.y - b.y) / out) * r };
    d += ` L ${xy(before)} Q ${xy(b)} ${xy(after)}`;
  }
  return `${d} L ${xy(points[points.length - 1])}`;
}

/**
 * Par-dessus la maquette, ce qui ne se dessine pas en 3D : la puissance de
 * chaque câble, à mi-longueur, et le trajet qu'on trace — le câble, lui, est
 * un tube de la scène (`cables3d`).
 */
export function CableOverlay({ cables, draft }: { cables: (CableOnScreen & { watts: number | null })[]; draft: Point[] | null }) {
  const { locale } = useFormats();
  return (
    <div className='absolute inset-0 pointer-events-none'>
      {draft && draft.length > 1 && (
        <svg className='absolute inset-0 w-full h-full overflow-visible'>
          <path
            d={pathOf(draft)}
            fill='none'
            stroke={DRAFT_COLOR}
            strokeWidth={2.5}
            strokeDasharray='6 5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      )}
      {cables.map(cable => {
        const middle = polylineMidpoint(cable.screen);
        if (!middle || cable.watts === null) return null;
        const Icon = CABLE_ICONS[cable.kind];
        return (
          <span
            key={cable.id}
            data-floorplan-cable={cable.id}
            className='absolute flex items-center gap-1 pl-1.5 pr-2 py-0.5 rounded-full bg-black/65 backdrop-blur-sm text-[11px] font-semibold text-white tabular-nums whitespace-nowrap shadow-lg'
            style={{ left: middle.x, top: middle.y, translate: '-50% -50%' }}
          >
            <Icon size={12} style={{ color: CABLE_COLORS[cable.kind] }} />
            {power(cable.watts, locale)}
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
    <div
      role='dialog'
      aria-label={t('layout.floorplan.cableTitle')}
      onClick={e => e.stopPropagation()}
      className='absolute z-40 w-64 p-2 rounded-xl gc-overlay cursor-default flex flex-col gap-2'
      style={{
        left: `clamp(8rem, ${at.x}%, calc(100% - 8rem))`,
        top: `clamp(0.5rem, calc(${at.y}% + 1.5rem), calc(100% - 16rem))`,
        translate: '-50% 0',
      }}
    >
      <div className='flex items-center justify-between px-1'>
        <span className='text-[11px] text-white/50'>{t('layout.floorplan.cableTitle')}</span>
        <button onClick={onCancel} aria-label={t('common.cancel')} className='p-0.5 rounded text-white/40 hover:text-white'>
          <X size={12} />
        </button>
      </div>
      <EntityPicker
        autoOpen
        label=''
        value={cable.entityId}
        domain='sensor'
        onChange={entityId => onChange({ ...cable, entityId, kind: guessCableKind(entityId) })}
      />
      <div className='grid grid-cols-4 gap-1'>
        {CABLE_KINDS.map(kind => {
          const Icon = CABLE_ICONS[kind];
          return (
            <button
              key={kind}
              onClick={() => onChange({ ...cable, kind })}
              aria-pressed={cable.kind === kind}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 rounded-lg text-[10px] border transition-colors',
                cable.kind === kind ? 'bg-white/12 border-white/30 text-white' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              )}
            >
              <Icon size={14} style={{ color: CABLE_COLORS[kind] }} />
              {t(`layout.floorplan.cableKinds.${kind}`)}
            </button>
          );
        })}
      </div>
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
    </div>
  );
}

/** Câbles tracés sur la maquette, pour les retirer. */
export function CableList({ cables, onRemove }: { cables: FloorplanCable[]; onRemove: (id: string) => void }) {
  const { t } = useI18n();
  const entities = useEntities(cables.map(c => c.entityId));
  if (!cables.length) return null;
  return (
    <div className='flex flex-col gap-1'>
      <span className='text-[11px] text-white/40 px-0.5'>{t('layout.floorplan.cables')}</span>
      {cables.map(cable => {
        const Icon = CABLE_ICONS[cable.kind];
        const name = entities[cable.entityId]?.attributes?.friendly_name;
        return (
          <div key={cable.id} className='flex items-center gap-2 px-2 py-1 rounded-lg bg-white/5 text-xs text-white/70'>
            <Icon size={13} className='shrink-0' style={{ color: CABLE_COLORS[cable.kind] }} />
            <span className='flex-1 truncate'>{typeof name === 'string' ? name : cable.entityId}</span>
            <button
              onClick={() => onRemove(cable.id)}
              title={t('layout.floorplan.cableRemove')}
              aria-label={t('layout.floorplan.cableRemove')}
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
