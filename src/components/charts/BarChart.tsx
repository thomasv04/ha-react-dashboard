import { useMemo } from 'react';

interface BarChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export function BarChart({ data, color = '#60a5fa', height = 40 }: BarChartProps) {
  const bars = useMemo(() => {
    if (data.length < 2) return [];
    const max = Math.max(...data) || 1;
    return data.map(v => Math.max(4, (v / max) * height));
  }, [data, height]);

  if (bars.length < 2) return null;

  const gap = 2;
  const totalGap = gap * (bars.length - 1);
  const barWidth = (200 - totalGap) / bars.length;

  return (
    <svg viewBox={`0 0 200 ${height}`} className='w-full overflow-visible' preserveAspectRatio='none'>
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * (barWidth + gap)}
          y={height - h}
          width={barWidth}
          height={h}
          rx={2}
          fill={color}
          opacity={0.4 + 0.6 * (h / height)}
        />
      ))}
    </svg>
  );
}
