import { useMemo } from 'react';

interface SparkLineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showArea?: boolean;
  strokeWidth?: number;
  id?: string;
}

function bezierPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
    path += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return path;
}

export function SparkLine({
  data,
  width = 200,
  height = 60,
  color = '#60a5fa',
  showArea = true,
  strokeWidth = 2,
  id = 'sparkline',
}: SparkLineProps) {
  const points = useMemo(() => {
    if (data.length < 2) return [];
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 4;
    return data.map((val, i) => ({
      x: padding + (i / (data.length - 1)) * (width - padding * 2),
      y: padding + (1 - (val - min) / range) * (height - padding * 2),
    }));
  }, [data, width, height]);

  if (points.length < 2) return null;

  const linePath = bezierPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className='overflow-visible w-full' preserveAspectRatio='none'>
      <defs>
        <linearGradient id={`${id}-grad`} x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor={color} stopOpacity={0.35} />
          <stop offset='100%' stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {showArea && <path d={areaPath} fill={`url(#${id}-grad)`} />}

      <path d={linePath} fill='none' stroke={color} strokeWidth={strokeWidth} strokeLinecap='round' strokeLinejoin='round' />

      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={3} fill={color} />
    </svg>
  );
}
