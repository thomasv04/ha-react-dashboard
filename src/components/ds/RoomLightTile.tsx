import { Lightbulb, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Tuile de pièce : l'interrupteur des lumières et la luminosité, séparés. La
 * moitié gauche allume ou éteint ; la droite, plus sombre, se fait glisser
 * pour régler la luminosité (un range natif invisible la recouvre).
 */
export function RoomLightTile({
  room,
  on,
  brightness,
  onToggle,
  onBrightness,
  labels,
  onMore,
}: {
  room: string;
  on: boolean;
  /** 0–100 */
  brightness: number;
  onToggle: () => void;
  onBrightness: (value: number) => void;
  labels: { toggle: string; brightness: string; more?: string };
  onMore?: () => void;
}) {
  return (
    <div className='flex flex-col gap-10 rounded-[var(--ds-radius-2xl)] bg-[var(--ds-surface-2)] p-[26px]'>
      <div className='flex items-center justify-between'>
        <span className={cn('truncate text-4xl', on ? 'text-[var(--ds-accent)]' : 'text-[var(--ds-ink)]')}>{room}</span>
        {onMore && labels.more && (
          <button
            onClick={onMore}
            aria-label={labels.more}
            title={labels.more}
            className='flex size-11 shrink-0 items-center justify-center rounded-full text-[var(--ds-ink-muted)]'
          >
            <MoreVertical size={24} />
          </button>
        )}
      </div>
      <div className='flex h-24 gap-2.5'>
        <button
          onClick={onToggle}
          aria-label={labels.toggle}
          aria-pressed={on}
          className={cn(
            'flex basis-[56%] items-center rounded-[48px_30px_30px_48px] pl-10 transition-colors',
            on ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
          )}
        >
          <Lightbulb size={36} fill={on ? 'currentColor' : 'none'} />
        </button>
        <div className='relative flex-1 overflow-hidden rounded-[30px_48px_48px_30px] bg-[var(--ds-surface-3)]'>
          <div
            aria-hidden='true'
            className='absolute inset-y-0 left-0 bg-[var(--ds-tile-on)] opacity-40'
            style={{ width: on ? `${Math.min(100, Math.max(0, brightness))}%` : 0 }}
          />
          <input
            type='range'
            min={0}
            max={100}
            value={brightness}
            onChange={e => onBrightness(Number(e.target.value))}
            aria-label={labels.brightness}
            aria-valuetext={`${brightness} %`}
            className='absolute inset-0 size-full cursor-pointer opacity-0'
          />
        </div>
      </div>
    </div>
  );
}
