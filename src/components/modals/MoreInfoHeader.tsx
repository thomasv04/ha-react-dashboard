import type { LucideIcon } from 'lucide-react';

interface MoreInfoHeaderProps {
  icon: LucideIcon;
  name: string;
  state: string;
  unit?: string;
  stateColor?: string;
  /** Optional image URL (e.g. person avatar) */
  image?: string;
}

export function MoreInfoHeader({ icon: Icon, name, state, unit, stateColor = '#10b981', image }: MoreInfoHeaderProps) {
  return (
    <div className='flex items-center gap-4 mb-6'>
      {image ? (
        <div className='w-14 h-14 rounded-full overflow-hidden ring-2 ring-white/10 shrink-0'>
          <img src={image} alt={name} className='w-full h-full object-cover' />
        </div>
      ) : (
        <div className='w-14 h-14 rounded-full flex items-center justify-center shrink-0' style={{ backgroundColor: `${stateColor}20` }}>
          <Icon size={24} style={{ color: stateColor }} />
        </div>
      )}
      <div className='min-w-0'>
        <h2 className='text-sm font-semibold uppercase tracking-wider text-white/80 truncate'>{name}</h2>
        <div className='flex items-center gap-2 mt-1'>
          <span
            className='inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full'
            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
          >
            <span className='w-1.5 h-1.5 rounded-full' style={{ backgroundColor: stateColor }} />
            {state}
            {unit && <span className='text-white/50'>{unit}</span>}
          </span>
        </div>
      </div>
    </div>
  );
}
