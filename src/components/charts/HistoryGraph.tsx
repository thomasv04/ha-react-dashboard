import { useMemo } from 'react';
import type { HistoryPoint } from '@/hooks/useEntityHistory';

interface HistoryGraphProps {
  data: HistoryPoint[];
  height?: number;
  color?: string;
}

const W = 600;
const PADDING_LEFT = 50;
const PADDING_RIGHT = 10;
const PADDING_TOP = 10;
const PADDING_BOTTOM = 30;

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

function formatTime(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export function HistoryGraph({ data, height = 350, color = '#60a5fa' }: HistoryGraphProps) {
  const graphWidth = W - PADDING_LEFT - PADDING_RIGHT;
  const graphHeight = height - PADDING_TOP - PADDING_BOTTOM;

  const { points, yLabels, xLabels, linePath, areaPath } = useMemo(() => {
    const numericData = data.filter(p => !isNaN(p.value));
    if (numericData.length < 2) return { points: [], yLabels: [], xLabels: [], linePath: '', areaPath: '' };

    const values = numericData.map(p => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const timeMin = numericData[0].time.getTime();
    const timeMax = numericData[numericData.length - 1].time.getTime();
    const timeRange = timeMax - timeMin || 1;

    const pts = numericData.map(p => ({
      x: PADDING_LEFT + ((p.time.getTime() - timeMin) / timeRange) * graphWidth,
      y: PADDING_TOP + (1 - (p.value - min) / range) * graphHeight,
    }));

    const line = bezierPath(pts);
    const area = `${line} L ${pts[pts.length - 1].x} ${PADDING_TOP + graphHeight} L ${pts[0].x} ${PADDING_TOP + graphHeight} Z`;

    // Y-axis labels: min, mid, max
    const mid = (min + max) / 2;
    const yLbls = [
      { value: max.toFixed(1), y: PADDING_TOP },
      { value: mid.toFixed(1), y: PADDING_TOP + graphHeight / 2 },
      { value: min.toFixed(1), y: PADDING_TOP + graphHeight },
    ];

    // X-axis labels: 5 evenly spaced
    const xLbls: { label: string; x: number }[] = [];
    for (let i = 0; i < 5; i++) {
      const t = timeMin + (timeRange * i) / 4;
      xLbls.push({
        label: formatTime(new Date(t)),
        x: PADDING_LEFT + (graphWidth * i) / 4,
      });
    }

    return { points: pts, yLabels: yLbls, xLabels: xLbls, linePath: line, areaPath: area };
  }, [data, graphWidth, graphHeight]);

  if (points.length < 2) {
    return (
      <div className='flex items-center justify-center text-white/30 text-sm' style={{ height }}>
        Pas assez de données
      </div>
    );
  }

  return (
    <svg width={W} height={height} viewBox={`0 0 ${W} ${height}`} className='w-full overflow-visible' preserveAspectRatio='xMidYMid meet'>
      <defs>
        <linearGradient id='history-grad' x1='0' y1='0' x2='0' y2='1'>
          <stop offset='0%' stopColor={color} stopOpacity={0.3} />
          <stop offset='100%' stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Y-axis labels */}
      {yLabels.map((lbl, i) => (
        <text
          key={`y-${i}`}
          x={PADDING_LEFT - 8}
          y={lbl.y + 4}
          textAnchor='end'
          fill='rgba(255,255,255,0.35)'
          fontSize={10}
          fontFamily='monospace'
        >
          {lbl.value}
        </text>
      ))}

      {/* X-axis labels */}
      {xLabels.map((lbl, i) => (
        <text
          key={`x-${i}`}
          x={lbl.x}
          y={height - 5}
          textAnchor='middle'
          fill='rgba(255,255,255,0.35)'
          fontSize={10}
          fontFamily='monospace'
        >
          {lbl.label}
        </text>
      ))}

      {/* Grid lines */}
      {yLabels.map((lbl, i) => (
        <line
          key={`grid-${i}`}
          x1={PADDING_LEFT}
          y1={lbl.y}
          x2={W - PADDING_RIGHT}
          y2={lbl.y}
          stroke='rgba(255,255,255,0.05)'
          strokeWidth={1}
        />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill='url(#history-grad)' />

      {/* Line */}
      <path d={linePath} fill='none' stroke={color} strokeWidth={2} strokeLinecap='round' strokeLinejoin='round' />

      {/* Current value dot */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={4} fill={color} />
    </svg>
  );
}
