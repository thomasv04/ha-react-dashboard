import { useRef, type PointerEvent, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { clamp, cn } from '@/lib/utils';

/** Géométrie dans un viewBox de 200 : arc + trait ≈ 95 % de la largeur. */
const RADIUS = 88;
const STROKE = 14;
const KNOB = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Ouverture de l'arc : 270°, l'espace libre en bas accueille les modes. */
const SWEEP = 270;
/** Angle où l'arc commence : l'ouverture est centrée en bas. */
const START = 90 + (360 - SWEEP) / 2;
const ARC = (CIRCUMFERENCE * SWEEP) / 360;
/**
 * Vide de part et d'autre de la pastille, le long de l'arc : rayon de la
 * pastille + espace + bout arrondi du trait. Les deux segments s'arrêtent
 * avant elle au lieu de passer dessous.
 */
const GAP = 21;

type Segment = { from: number; to: number };

/**
 * Découpe de l'arc pour une consigne : le segment coloré, la piste, et la
 * position de la pastille. En chauffage le remplissage part du début de
 * l'arc ; en clim il part de la fin. Exporté pour être testé.
 */
export function dialGeometry(value: number, min: number, max: number, mode: 'heat' | 'cool') {
  const ratio = max > min ? clamp((value - min) / (max - min), 0, 1) : 0;
  const at = ARC * ratio;
  const before: Segment = { from: 0, to: at - GAP };
  const after: Segment = { from: at + GAP, to: ARC };
  const angle = ((START + SWEEP * ratio) * Math.PI) / 180;
  return {
    fill: mode === 'heat' ? before : after,
    track: mode === 'heat' ? after : before,
    knob: { x: 100 + RADIUS * Math.cos(angle), y: 100 + RADIUS * Math.sin(angle) },
  };
}

/**
 * Un segment se place par `dashoffset`, jamais par un tiret de longueur nulle :
 * avec un bout arrondi, ce dernier dessinerait un point.
 */
function Arc({ segment, color }: { segment: Segment; color: string }) {
  const length = segment.to - segment.from;
  if (length <= 0.5) return null;
  return (
    <circle
      cx='100'
      cy='100'
      r={RADIUS}
      fill='none'
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap='round'
      strokeDasharray={`${length} ${CIRCUMFERENCE}`}
      strokeDashoffset={-segment.from}
      transform={`rotate(${START} 100 100)`}
    />
  );
}

/**
 * Valeur sous le pointeur, ou `null` hors de l'anneau (le centre et l'ouverture
 * restent à la case et aux boutons). Coordonnées dans le viewBox de 200.
 * Exporté pour être testé.
 */
export function valueAtPoint(x: number, y: number, min: number, max: number, step: number): number | null {
  if (Math.hypot(x - 100, y - 100) < RADIUS - STROKE * 1.5) return null;
  const deg = (Math.atan2(y - 100, x - 100) * 180) / Math.PI;
  let along = (((deg - START) % 360) + 360) % 360;
  // Dans l'ouverture du bas : la borne la plus proche, pour que le min et le max
  // restent atteignables d'un geste vif.
  if (along > SWEEP) along = along > SWEEP + (360 - SWEEP) / 2 ? 0 : SWEEP;
  const raw = min + (along / SWEEP) * (max - min);
  return clamp(Math.round(raw / step) * step, min, max);
}

export interface DialMode<T extends string> {
  id: T;
  label: string;
}

/**
 * Cadran de thermostat : l'arc remplit presque toute la tuile, la pastille
 * marque la consigne, le centre affiche la consigne et la mesure, les modes
 * occupent l'ouverture du bas et les flèches ajustent la consigne.
 */
export function Dial<T extends string>({
  value,
  min,
  max,
  step = 0.5,
  onChange,
  onDrag,
  mode = 'heat',
  display,
  caption,
  icon,
  modes,
  activeMode,
  onModeChange,
  labels,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Valeur suivie pendant un glisser sur l'anneau ; `onChange` part au lâcher. */
  onDrag?: (value: number) => void;
  /** Sens et couleur du remplissage */
  mode?: 'heat' | 'cool';
  /** Consigne affichée au centre (« 21° ») */
  display: string;
  /** Ligne sous la consigne (« Actuellement 19° ») */
  caption?: string;
  icon?: ReactNode;
  /** Les modes du thermostat : l'actif au centre, ses voisins au-dessus et au-dessous. */
  modes?: DialMode<T>[];
  activeMode?: T;
  onModeChange?: (mode: T) => void;
  labels: { decrease: string; increase: string; modes?: string };
}) {
  const geometry = dialGeometry(value, min, max, mode);
  const boxRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<number | null>(null);
  // Le geste en cours a-t-il commencé sur l'anneau ? Lu par le `click` qui le termine.
  const ownsGestureRef = useRef(false);
  // Valeur au début du geste : `onDrag` fait déjà suivre `value`, la comparer
  // à elle au lâcher n'enverrait jamais rien.
  const startRef = useRef(value);
  // Cadre du cadran, lu au début du geste : le relire à chaque mouvement
  // forçait un calcul de mise en page par image pendant tout le glisser.
  const rectRef = useRef<DOMRect | null>(null);

  const pointValue = (e: PointerEvent) => {
    const rect = rectRef.current ?? boxRef.current!.getBoundingClientRect();
    return valueAtPoint(((e.clientX - rect.left) / rect.width) * 200, ((e.clientY - rect.top) / rect.height) * 200, min, max, step);
  };

  // Le glisser appartient au cadran : sans `stopPropagation`, la case de la
  // grille lancerait son appui long et ouvrirait la fiche. Les boutons (modes,
  // flèches) gardent leurs appuis.
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    ownsGestureRef.current = false;
    if (e.button !== 0 || (e.target as Element).closest('button')) return;
    rectRef.current = e.currentTarget.getBoundingClientRect();
    const v = pointValue(e);
    if (v === null) return (rectRef.current = null);
    ownsGestureRef.current = true;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    startRef.current = value;
    dragRef.current = v;
    onDrag?.(v);
  };
  const onPointerMove = (e: PointerEvent) => {
    if (dragRef.current === null) return;
    const v = pointValue(e);
    if (v === null) return;
    dragRef.current = v;
    onDrag?.(v);
  };
  const onPointerUp = (e: PointerEvent) => {
    if (dragRef.current === null) return;
    e.stopPropagation();
    const v = dragRef.current;
    dragRef.current = null;
    rectRef.current = null;
    if (v !== startRef.current) onChange(v);
  };
  const color = mode === 'heat' ? 'var(--ds-heat)' : 'var(--ds-cool)';

  // L'actif et ses deux voisins : trois lignes tiennent dans l'ouverture de l'arc.
  const index = modes?.findIndex(m => m.id === activeMode) ?? -1;
  const visible = modes && index >= 0 ? [modes[index - 1], modes[index], modes[index + 1]] : [];

  const arrow =
    'absolute top-[74%] flex size-[12%] min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-[var(--ds-ink)] disabled:opacity-40';

  return (
    <div
      ref={boxRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        dragRef.current = null;
        rectRef.current = null;
      }}
      // Le `click` de fin de réglage ne doit pas remonter jusqu'à la case, qui ouvrirait la fiche.
      onClick={e => ownsGestureRef.current && e.stopPropagation()}
      className='@container relative aspect-square w-full touch-none select-none'
    >
      <svg viewBox='0 0 200 200' className='size-full' aria-hidden='true'>
        <Arc segment={geometry.track} color='var(--ds-surface-3)' />
        <Arc segment={geometry.fill} color={color} />
        <circle cx={geometry.knob.x} cy={geometry.knob.y} r={KNOB} fill={color} />
      </svg>

      <div className='absolute inset-0 flex flex-col items-center justify-center pb-[12%]' role='status'>
        {icon}
        <span
          className={cn('text-[24cqw] leading-[1.05] tracking-[-1px]', mode === 'heat' ? 'font-bold' : 'font-light')}
          style={{ color: mode === 'heat' ? 'var(--ds-heat-ink)' : 'var(--ds-ink)' }}
        >
          {display}
        </span>
        {caption && <span className='text-[max(12px,4.2cqw)] text-[var(--ds-ink-muted)]'>{caption}</span>}
      </div>

      {visible.length > 0 && (
        <div
          role='radiogroup'
          aria-label={labels.modes}
          className='absolute inset-x-0 bottom-0 flex flex-col items-center gap-px text-[max(12px,3.8cqw)]'
        >
          {visible.map((m, i) =>
            m ? (
              <button
                key={m.id}
                role='radio'
                aria-checked={i === 1}
                onClick={() => onModeChange?.(m.id)}
                className={cn(
                  i === 1
                    ? 'rounded-full bg-[var(--ds-surface-3)] px-[6.5cqw] py-[1.8cqw] text-[max(14px,4.4cqw)] font-medium text-[var(--ds-ink)]'
                    : 'text-[var(--ds-ink-muted)] opacity-60'
                )}
              >
                {m.label}
              </button>
            ) : (
              <span key={i} aria-hidden='true' className='h-[1.2em]' />
            )
          )}
        </div>
      )}

      <button
        onClick={() => onChange(clamp(value - step, min, max))}
        disabled={value <= min}
        aria-label={labels.decrease}
        title={labels.decrease}
        className={cn(arrow, '-left-[6%]')}
      >
        <ChevronDown size={20} />
      </button>
      <button
        onClick={() => onChange(clamp(value + step, min, max))}
        disabled={value >= max}
        aria-label={labels.increase}
        title={labels.increase}
        className={cn(arrow, '-right-[6%]')}
      >
        <ChevronUp size={20} />
      </button>
    </div>
  );
}
