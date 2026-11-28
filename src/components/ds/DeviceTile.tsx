import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import { hideValueBubble, readAccent, ripple, showValueBubble, tileValueAt, valueStep, type AccentColors } from '@/lib/touch-feedback';

/** Déplacement horizontal avant qu'un appui devienne un réglage (Paddock : 8 px). */
const DRAG_THRESHOLD_PX = 8;

/** Réglage au doigt d'une tuile en rangée : glisser à l'horizontale pose la valeur 0–100. */
export interface TileDrag {
  value: number;
  /** Pendant le glisser */
  onChange: (value: number) => void;
  /** Doigt levé, avec la dernière valeur */
  onCommit?: (value: number) => void;
  /** Texte de la bulle qui suit le doigt */
  bubble: (value: number) => string;
  /** Marge inerte de chaque côté, en px */
  inset?: number;
  step?: number;
  /** Bord gauche = 0 (lumière éteinte), ailleurs au moins 1 */
  offEdge?: boolean;
}

/**
 * Tuile d'appareil : nom, état, icône. Un appui bascule l'appareil ; allumé,
 * verrouillé ou en marche, la tuile passe en `tile-on`. Le menu ⋮ ouvre le
 * réglage détaillé quand `onMore` est fourni ; `children` porte les réglages
 * secondaires (vitesse, oscillation…) sous la zone d'appui.
 *
 * `layout="row"` : icône à gauche, texte à droite — pour une case d'une seule
 * rangée, où l'empilement déborderait. Avec `drag`, glisser à l'horizontale y
 * règle la valeur (ondes, tuile soulevée, bulle, vibration par cran —
 * lib/touch-feedback) ; un appui sans glisser bascule toujours.
 */
export function DeviceTile({
  name,
  state,
  icon: Icon,
  active,
  onToggle,
  onMore,
  moreLabel,
  moreAt = 'top',
  layout = 'stack',
  drag,
  children,
  className,
}: {
  name: string;
  state?: string;
  icon: LucideIcon;
  active: boolean;
  onToggle: () => void;
  onMore?: () => void;
  moreLabel?: string;
  /** Coin du menu ⋮ : en haut, ou en bas — la tuile compacte de l'Echo Show l'y place. */
  moreAt?: 'top' | 'bottom';
  layout?: 'stack' | 'row';
  /** Réglage au doigt, en `layout="row"` seulement */
  drag?: TileDrag;
  children?: ReactNode;
  className?: string;
}) {
  const row = layout === 'row';
  const draggable = row && drag;
  const motionAllowed = useLowPowerMotion();
  const [lifted, setLifted] = useState(false);
  // Geste en cours : couleurs lues au doigt posé, jamais en cache (l'accent suit les Paramètres).
  const gesture = useRef<{ x0: number; colors: AccentColors; moved: boolean; value: number } | null>(null);
  // Le `click` qui suit un glisser ne doit pas basculer l'appareil.
  const dragged = useRef(false);

  // Démontée en plein geste : la bulle ne doit pas rester à l'écran.
  useEffect(
    () => () => {
      if (gesture.current?.moved) hideValueBubble();
    },
    []
  );

  const end = (commit: boolean) => {
    const g = gesture.current;
    gesture.current = null;
    if (!g?.moved || !drag) return;
    setLifted(false);
    hideValueBubble();
    if (commit) drag.onCommit?.(g.value);
  };

  const dragHandlers = draggable
    ? {
        onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
          if (e.button !== 0) return;
          dragged.current = false;
          const colors = readAccent(e.currentTarget);
          gesture.current = { x0: e.clientX, colors, moved: false, value: drag.value };
          if (motionAllowed) ripple(e.clientX, e.clientY, colors.accent);
        },
        onPointerMove: (e: React.PointerEvent<HTMLButtonElement>) => {
          const g = gesture.current;
          if (!g) return;
          if (!g.moved) {
            if (Math.abs(e.clientX - g.x0) < DRAG_THRESHOLD_PX) return;
            g.moved = dragged.current = true;
            e.currentTarget.setPointerCapture?.(e.pointerId);
            setLifted(true);
          }
          const r = e.currentTarget.getBoundingClientRect();
          g.value = tileValueAt(e.clientX, r.left, r.width, drag);
          // Cran -1 pour « éteinte » : passer le bord gauche vibre toujours.
          const step = drag.offEdge && g.value === 0 ? -1 : valueStep(g.value, 0, 100);
          showValueBubble(e.clientX, e.clientY, drag.bubble(g.value), step, g.colors);
          drag.onChange(g.value);
        },
        onPointerUp: () => end(true),
        onPointerCancel: () => end(true),
        onLostPointerCapture: () => end(true),
      }
    : undefined;

  return (
    <div
      className={cn(
        'relative flex h-full flex-col overflow-hidden rounded-[var(--ds-radius-lg)] transition-colors select-none',
        active ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-2)] text-[var(--ds-ink)]',
        className
      )}
      style={
        draggable
          ? {
              ...(lifted && {
                boxShadow: '0 0 0 2px var(--ds-accent), 0 10px 26px rgba(0, 0, 0, 0.35)',
                ...(motionAllowed && { transform: 'scale(1.018)' }),
              }),
              ...(motionAllowed && { transition: 'background-color .15s, transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s' }),
            }
          : undefined
      }
    >
      <button
        onClick={() => {
          if (dragged.current) dragged.current = false;
          else onToggle();
        }}
        aria-pressed={active}
        {...dragHandlers}
        // Le glisser horizontal est à la tuile ; le défilement vertical reste à la page.
        style={draggable ? { touchAction: 'pan-y' } : undefined}
        className={cn(
          'flex min-h-0 flex-1 text-left transition-transform active:scale-[0.98]',
          row ? 'flex-row-reverse items-center justify-end gap-3 px-4' : 'flex-col justify-between p-[var(--ds-space-4)]'
        )}
      >
        <span className='min-w-0'>
          {name && <span className='block truncate text-[17px] font-semibold leading-tight'>{name}</span>}
          {state && (
            <span className={cn('block truncate text-sm', active ? 'text-[var(--ds-tile-on-muted)]' : 'text-[var(--ds-ink-muted)]')}>
              {state}
            </span>
          )}
        </span>
        <Icon size={22} aria-hidden='true' className='shrink-0' />
      </button>
      {children && <div className='flex shrink-0 flex-col gap-2 px-[var(--ds-space-4)] pb-[var(--ds-space-4)]'>{children}</div>}
      {onMore && moreLabel && (
        <button
          onClick={onMore}
          aria-label={moreLabel}
          title={moreLabel}
          className={cn(
            'absolute right-1 flex size-11 items-center justify-center rounded-full',
            moreAt === 'bottom' ? 'bottom-1' : 'top-1'
          )}
        >
          <MoreVertical size={18} />
        </button>
      )}
    </div>
  );
}
