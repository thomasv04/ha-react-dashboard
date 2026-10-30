import { SwitchTrack } from '@/components/ds/Switch';
import { SETTINGS_CARD } from './typography';
import { cn } from '@/lib/utils';

/** Une ligne à interrupteur : un bloc, son intitulé, ce qu'il fait, et l'interrupteur. */
export function PerfToggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      role='switch'
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(SETTINGS_CARD, 'flex w-full items-center justify-between gap-4 text-left')}
    >
      <span className='min-w-0'>
        <span className='block text-lg font-semibold text-[var(--ds-ink)]'>{label}</span>
        {description && <span className='mt-0.5 block text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{description}</span>}
      </span>
      <SwitchTrack on={checked} />
    </button>
  );
}
