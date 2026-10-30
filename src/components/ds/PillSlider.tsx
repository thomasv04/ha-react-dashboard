import type { LucideIcon } from 'lucide-react';
import { clamp, cn } from '@/lib/utils';

/**
 * Curseur en pilule : la partie remplie montre la valeur (luminosité, volume,
 * consigne). Un `<input type="range">` invisible couvre toute la pilule — le
 * glisser au doigt, le clavier et les lecteurs d'écran viennent du natif.
 */
export function PillSlider({
  value,
  onChange,
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
  const ratio = max > min ? clamp((value - min) / (max - min), 0, 1) : 0;
  const size = `${Math.round(ratio * 100)}%`;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--ds-radius-pill)]',
        vertical ? 'h-full min-h-[120px] w-24' : 'h-[52px] w-full',
        className
      )}
      style={{ background: track }}
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
        type='range'
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        aria-label={label}
        aria-valuetext={valueText}
        // Un range natif vertical : `writing-mode` le couche, `direction` met le minimum en bas.
        style={vertical ? { writingMode: 'vertical-lr', direction: 'rtl' } : undefined}
        className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
      />
    </div>
  );
}
