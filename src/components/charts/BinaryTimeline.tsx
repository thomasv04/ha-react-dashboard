import { useMemo, useRef } from 'react';
import type { HistoryPoint } from '@/hooks/useEntityHistory';

interface BinaryTimelineProps {
  data: HistoryPoint[];
}

function formatRelativeTime(date: Date, now: number): string {
  const diff = now - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export function BinaryTimeline({ data }: BinaryTimelineProps) {
  const nowRef = useRef<number>(0);
  // eslint-disable-next-line react-hooks/purity
  if (nowRef.current === 0) nowRef.current = Date.now();
  const now = nowRef.current;

  const { segments, events } = useMemo(() => {
    if (data.length === 0) return { segments: [], events: [] };

    const first = data[0].time.getTime();
    const totalRange = now - first || 1;

    const segs: { start: number; end: number; on: boolean }[] = [];
    for (let i = 0; i < data.length; i++) {
      const isOn = data[i].state === 'on';
      const start = ((data[i].time.getTime() - first) / totalRange) * 100;
      const end = i < data.length - 1 ? ((data[i + 1].time.getTime() - first) / totalRange) * 100 : 100;
      segs.push({ start, end, on: isOn });
    }

    const evts = [...data]
      .reverse()
      .slice(0, 8)
      .map(p => ({ state: p.state, time: p.time, on: p.state === 'on' }));

    return { segments: segs, events: evts };
  }, [data, now]);

  if (segments.length === 0) {
    return <div className='text-white/30 text-sm text-center py-4'>Pas de données</div>;
  }

  return (
    <div className='space-y-4'>
      <div className='relative h-6 rounded-full overflow-hidden bg-white/5'>
        {segments.map((seg, i) => (
          <div
            key={i}
            className='absolute top-0 h-full'
            style={{
              left: `${seg.start}%`,
              width: `${Math.max(0.5, seg.end - seg.start)}%`,
              backgroundColor: seg.on ? '#10b981' : '#6b7280',
            }}
          />
        ))}
      </div>
      <div className='space-y-1.5'>
        {events.map((evt, i) => (
          <div key={i} className='flex items-center gap-2 text-xs'>
            <span className='w-2 h-2 rounded-full shrink-0' style={{ backgroundColor: evt.on ? '#10b981' : '#6b7280' }} />
            <span className='text-white/70 font-medium uppercase'>{evt.state}</span>
            <span className='text-white/40 ml-auto'>{formatRelativeTime(evt.time, now)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
