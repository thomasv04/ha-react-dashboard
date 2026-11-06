import { useState, useCallback } from 'react';
import { Play, Volume2, VolumeX } from 'lucide-react';
import { playSound, PRESETS, type SoundPreset } from '@/lib/sounds';
import { WIDGET_SOUND_ACTIONS, type WidgetSoundAction } from '@/config/widget-sound-actions';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { FIELD_CARD, INTRO, ROUND } from './ui';

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
      <div className='flex flex-col items-center justify-center py-10 text-[var(--ds-ink-muted)] text-sm'>
        <VolumeX size={24} className='mb-2 opacity-50' />
        <p>{t('layout.soundTab.noActions')}</p>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <p className={INTRO}>{t('layout.soundTab.intro')}</p>
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
    <div className={cn(FIELD_CARD, 'flex items-center gap-3')}>
      {/* Action label */}
      <div className='flex-1 min-w-0'>
        <span className='block text-base font-semibold'>{t(`layout.soundTab.actions.${action.action}`)}</span>
        {isDefault && <span className='block text-sm text-[var(--ds-ink-muted)]'>{t('layout.soundTab.default')}</span>}
      </div>

      {/* Sound selector */}
      <select
        value={resolved}
        onChange={e => onChange(e.target.value as SoundPreset)}
        aria-label={t(`layout.soundTab.actions.${action.action}`)}
        className='h-11 max-w-[160px] cursor-pointer rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-3 text-base text-[var(--ds-ink)] outline-none focus:outline-2 focus:outline-[var(--ds-accent)]'
      >
        {ALL_PRESETS.map(p => (
          <option key={p} value={p}>
            {p === 'none' ? t('layout.soundTab.none') : p.replace(/_/g, ' ')}
          </option>
        ))}
      </select>

      {/* Preview button */}
      <button
        onClick={handlePreview}
        disabled={resolved === 'none'}
        className={cn(
          ROUND,
          'size-11 transition-all',
          resolved === 'none'
            ? 'cursor-not-allowed text-[var(--ds-ink-muted)] opacity-40'
            : playing
              ? 'scale-95 bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]'
              : 'text-[var(--ds-ink)]'
        )}
        title={t('layout.soundTab.preview')}
        aria-label={t('layout.soundTab.preview')}
      >
        {playing ? <Volume2 size={18} /> : <Play size={18} />}
      </button>
    </div>
  );
}
