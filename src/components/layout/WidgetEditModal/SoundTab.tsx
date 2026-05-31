import { useState, useCallback } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { playSound, PRESETS, type SoundPreset } from '@/lib/sounds';
import { WIDGET_SOUND_ACTIONS, type WidgetSoundAction } from '@/config/widget-sound-actions';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

/** All available presets for the selector */
const ALL_PRESETS: SoundPreset[] = [
  'none',
  'notification',
  'alert',
  'success',
  'warning',
  'error',
  'click',
  'pop',
  'toggle_on',
  'toggle_off',
  'arm',
  'disarm',
  'slider_tick',
  'door_open',
  'door_close',
  'lock',
  'unlock',
  'motion',
  'media_play',
  'media_pause',
  'media_next',
  'vacuum_start',
  'vacuum_dock',
  'temperature_up',
  'temperature_down',
  'brightness_up',
  'brightness_down',
  'water',
  'battery_low',
  'chime',
];

interface SoundTabProps {
  widgetType: string;
  soundOverrides: Record<string, SoundPreset> | undefined;
  onChange: (overrides: Record<string, SoundPreset>) => void;
}

export function SoundTab({ widgetType, soundOverrides, onChange }: SoundTabProps) {
  const { t } = useI18n();
  const actions = WIDGET_SOUND_ACTIONS[widgetType];

  if (!actions || actions.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-10 text-white/30 text-sm'>
        <VolumeX size={24} className='mb-2 opacity-50' />
        <p>{t('layout.soundTab.noActions')}</p>
      </div>
    );
  }

  return (
    <div className='space-y-1'>
      <p className='text-white/40 text-xs mb-4'>{t('layout.soundTab.intro')}</p>
      {actions.map(action => (
        <SoundActionRow
          key={action.action}
          action={action}
          current={soundOverrides?.[action.action]}
          onChange={preset => {
            const next = { ...(soundOverrides ?? {}) };
            if (preset === action.defaultSound) {
              delete next[action.action];
            } else {
              next[action.action] = preset;
            }
            onChange(next);
          }}
        />
      ))}
    </div>
  );
}

function SoundActionRow({
  action,
  current,
  onChange,
}: {
  action: WidgetSoundAction;
  current: SoundPreset | undefined;
  onChange: (preset: SoundPreset) => void;
}) {
  const { t } = useI18n();
  const resolved = current ?? action.defaultSound;
  const isDefault = !current;
  const [playing, setPlaying] = useState(false);

  const handlePreview = useCallback(() => {
    if (resolved === 'none') return;
    setPlaying(true);
    playSound(resolved);
    const notes = PRESETS[resolved as keyof typeof PRESETS];
    const dur = notes ? Math.max(...notes.map(n => n.start + n.duration)) : 0.3;
    setTimeout(() => setPlaying(false), dur * 1000 + 200);
  }, [resolved]);

  return (
    <div className='flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors'>
      {/* Action label */}
      <div className='flex-1 min-w-0'>
        <span className='text-xs text-white/70 font-medium'>{t(`layout.soundTab.actions.${action.action}`)}</span>
        {isDefault && <span className='ml-1.5 text-[10px] text-white/25'>({t('layout.soundTab.default')})</span>}
      </div>

      {/* Sound selector */}
      <select
        value={resolved}
        onChange={e => onChange(e.target.value as SoundPreset)}
        className='px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] text-white/70 outline-none focus:border-blue-500/50 cursor-pointer max-w-[140px]'
        style={{ colorScheme: 'dark' }}
      >
        {ALL_PRESETS.map(p => (
          <option key={p} value={p} className='bg-[#0c1028]'>
            {p === 'none' ? t('layout.soundTab.none') : p.replace(/_/g, ' ')}
          </option>
        ))}
      </select>

      {/* Preview button */}
      <button
        onClick={handlePreview}
        disabled={resolved === 'none'}
        className={cn(
          'p-1.5 rounded-lg transition-all',
          resolved === 'none'
            ? 'text-white/15 cursor-not-allowed'
            : playing
              ? 'text-blue-400 bg-blue-500/20 scale-95'
              : 'text-white/40 hover:text-white/70 hover:bg-white/10 cursor-pointer'
        )}
        title={t('layout.soundTab.preview')}
      >
        {playing ? <Volume2 size={14} /> : <Play size={14} />}
      </button>
    </div>
  );
}
