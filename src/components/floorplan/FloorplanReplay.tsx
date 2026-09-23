import { Pause, Play } from 'lucide-react';
import { useFormats } from '@/hooks/useFormats';
import { useI18n } from '@/i18n';

interface ReplayBarProps {
  start: number;
  end: number;
  time: number;
  running: boolean;
  onSeek: (time: number) => void;
  onToggle: () => void;
}

/** La barre de lecture des 24 dernières heures : lecture ou pause, l'instant rejoué au curseur, et son heure. */
export function ReplayBar({ start, end, time, running, onSeek, onToggle }: ReplayBarProps) {
  const { t } = useI18n();
  const { formatTime } = useFormats();
  const toggleLabel = t(running ? 'layout.floorplan.replayPause' : 'layout.floorplan.replayPlay');
  return (
    <div className='flex-1 min-w-0 flex items-center gap-2 pl-1.5 pr-3 rounded-xl gc-overlay'>
      <button
        onClick={onToggle}
        title={toggleLabel}
        aria-label={toggleLabel}
        className='p-1.5 rounded-lg text-sky-300 hover:bg-white/10 transition-colors'
      >
        {running ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <input
        type='range'
        min={start}
        max={end}
        step='any'
        value={time}
        onChange={e => onSeek(Number(e.target.value))}
        aria-label={t('layout.floorplan.replayTime')}
        className='flex-1 min-w-0 accent-sky-400'
      />
      <span className='text-sm font-medium text-white/85 tabular-nums'>{formatTime(new Date(time))}</span>
    </div>
  );
}
