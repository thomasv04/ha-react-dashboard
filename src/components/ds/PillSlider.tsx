import { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { clamp, cn } from '@/lib/utils';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import { hideValueBubble, readAccent, ripple, showValueBubble, valueStep, type AccentColors } from '@/lib/touch-feedback';

/**
 * Curseur en pilule : la partie remplie montre la valeur (luminosité, volume,
 * consigne). Un `<input type="range">` invisible couvre toute la pilule — le
 * glisser au doigt, le clavier et les lecteurs d'écran viennent du natif.
 *
 * Avec `bubble`, le doigt posé lance deux ondes, soulève la pilule (anneau à
 * l'accent) et une bulle montre la valeur pendant le glisser (lib/touch-feedback).
 */
export function PillSlider({
  value,
  onChange,
  onCommit,
  bubble,
  min = 0,
  max = 100,
  step = 1,
  label,
  valueText,
  icon: Icon,
  orientation = 'horizontal',
  fill = 'var(--ds-tile-on)',
  track = 'var(--ds-surface-3)',
  iconColor = 'var(--ds-tile-on-ink)',
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  /** Valeur retenue : doigt levé, ou touche du clavier (événement `change` natif) */
  onCommit?: (value: number) => void;
  /** Texte de la bulle qui suit la valeur pendant le glisser (« Ouvert 45 % ») */
  bubble?: (value: number) => string;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  /** Valeur lue par les lecteurs d'écran (« 35 % », « 21 ° ») */
  valueText?: string;
  icon?: LucideIcon;
  orientation?: 'horizontal' | 'vertical';
  fill?: string;
  track?: string;
  iconColor?: string;
  className?: string;
}) {
  const vertical = orientation === 'vertical';
  const ratioOf = (v: number) => (max > min ? clamp((v - min) / (max - min), 0, 1) : 0);
  const size = `${Math.round(ratioOf(value) * 100)}%`;

  const pillRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const motionAllowed = useLowPowerMotion();
  // Couleurs lues au doigt posé, `null` hors geste : un changement d'accent vaut dès le geste suivant.
  const gesture = useRef<AccentColors | null>(null);
  const finger = useRef({ x: 0, y: 0 });
  const [lifted, setLifted] = useState(false);

  useEffect(() => {
    const input = inputRef.current;
    if (!input || !onCommit) return;
    const commit = () => onCommit(Number(input.value));
    input.addEventListener('change', commit);
    return () => input.removeEventListener('change', commit);
  }, [onCommit]);

  // Démonté en plein geste (feuille fermée) : la bulle ne doit pas rester à l'écran.
  useEffect(
    () => () => {
      if (gesture.current) hideValueBubble();
    },
    []
  );

  const showBubble = (v: number) => {
    const pill = pillRef.current;
    if (!bubble || !gesture.current || !pill) return;
    const r = pill.getBoundingClientRect();
    const ratio = ratioOf(v);
    // Le long de la pilule, la valeur (elle s'arrête aux bouts) ; en travers, le doigt.
    const x = vertical ? finger.current.x : r.left + ratio * r.width;
    const y = vertical ? r.bottom - ratio * r.height : finger.current.y;
    showValueBubble(x, y, bubble(v), valueStep(v, min, max), gesture.current);
  };

  const release = () => {
    if (!gesture.current) return;
    gesture.current = null;
    setLifted(false);
    hideValueBubble();
  };

  return (
    <div
      ref={pillRef}
      className={cn(
        'relative overflow-hidden rounded-[var(--ds-radius-pill)]',
        vertical ? 'h-full min-h-[120px] w-24' : 'h-[52px] w-full',
        className
      )}
      style={{
        background: track,
        ...(lifted && {
          boxShadow: '0 0 0 2px var(--ds-accent), 0 10px 26px rgba(0, 0, 0, 0.35)',
          ...(motionAllowed && { transform: 'scale(1.018)' }),
        }),
        ...(motionAllowed && { transition: 'transform .18s cubic-bezier(.2,.8,.2,1), box-shadow .18s' }),
      }}
      onPointerDown={e => {
        if (!bubble) return;
        gesture.current = readAccent(e.currentTarget);
        finger.current = { x: e.clientX, y: e.clientY };
        setLifted(true);
        if (motionAllowed) ripple(e.clientX, e.clientY, gesture.current.accent);
        showBubble(value);
      }}
      onPointerMove={e => {
        if (gesture.current) finger.current = { x: e.clientX, y: e.clientY };
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      <div
        aria-hidden='true'
        className={cn(
          'absolute flex rounded-[var(--ds-radius-pill)]',
          vertical ? 'inset-x-0 bottom-0 items-end justify-center pb-5' : 'inset-y-0 left-0 items-center pl-4'
        )}
        style={{ background: fill, [vertical ? 'height' : 'width']: size }}
      >
        {Icon && <Icon size={vertical ? 30 : 20} color={iconColor} />}
      </div>
      <input
        ref={inputRef}
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => {
          const v = Number(e.target.value);
          onChange(v);
          showBubble(v);
        }}
        aria-label={label}
        aria-valuetext={valueText}
        // Un range natif vertical : `writing-mode` le couche, `direction` met le minimum en bas.
        style={vertical ? { writingMode: 'vertical-lr', direction: 'rtl' } : undefined}
        className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
      />
    </div>
  );
}
