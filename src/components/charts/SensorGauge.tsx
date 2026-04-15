interface SensorGaugeProps {
  value: number;
  min?: number;
  max?: number;
  unit?: string;
  color?: string;
  size?: number;
  label?: string;
}

export function SensorGauge({ value, min = 0, max = 100, unit = '', color = '#60a5fa', size = 120, label }: SensorGaugeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 10;
  const strokeW = 8;

  const startAngle = Math.PI;
  const endAngle = 2 * Math.PI;
  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const valueAngle = startAngle + fraction * (endAngle - startAngle);

  const toXY = (angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const arcStart = toXY(startAngle);
  const arcEnd = toXY(endAngle);
  const arcValue = toXY(valueAngle);

  const bgArc = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`;
  const largeArc = fraction > 0.5 ? 1 : 0;
  const valueArc = fraction > 0 ? `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 1 ${arcValue.x} ${arcValue.y}` : '';

  const displayValue = Number.isInteger(value) ? value : value.toFixed(1);

  return (
    <div className='flex flex-col items-center'>
      <svg width={size} height={size / 2 + 15} viewBox={`0 0 ${size} ${size / 2 + 15}`}>
        <path d={bgArc} fill='none' stroke='rgba(255,255,255,0.08)' strokeWidth={strokeW} strokeLinecap='round' />
        {valueArc && <path d={valueArc} fill='none' stroke={color} strokeWidth={strokeW} strokeLinecap='round' />}
        <text x={cx} y={cy - 2} textAnchor='middle' dominantBaseline='middle' fill='white' fontWeight='bold' fontSize={size * 0.22}>
          {displayValue}
          {unit && (
            <tspan fill='rgba(255,255,255,0.4)' fontSize={size * 0.12}>
              {' '}
              {unit}
            </tspan>
          )}
        </text>
      </svg>
      {label && <span className='text-white/40 text-xs uppercase tracking-wider -mt-1'>{label}</span>}
    </div>
  );
}
