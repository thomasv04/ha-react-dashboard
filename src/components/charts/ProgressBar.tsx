interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  showValue?: boolean;
  height?: number;
}

export function ProgressBar({ value, max = 100, color = '#60a5fa', showValue = false, height = 6 }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className='flex items-center gap-2'>
      <div className='flex-1 rounded-full overflow-hidden' style={{ height, backgroundColor: 'rgba(255,255,255,0.08)' }}>
        <div className='h-full rounded-full transition-all duration-500 ease-out' style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      {showValue && <span className='text-white/50 text-xs font-medium min-w-[3ch] text-right'>{Math.round(pct)}%</span>}
    </div>
  );
}
