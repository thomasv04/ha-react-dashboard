import { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Volume2, Music } from 'lucide-react';
import { useRipple, RippleLayer } from '@/components/ui/Ripple';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { MediaPlayerCardConfig } from '@/types/widget-configs';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

function useDebouncedCallback<T extends (...args: never[]) => void>(fn: T, delay: number): T {
  const timer = useRef<ReturnType<typeof setTimeout>>(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(
    function (...args: Parameters<T>) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    } as T,
    [fn, delay]
  );
}

// ── Compact layout (small widget, ≤ 2 rows) ────────────────────────────────────
function CompactLayout({
  name,
  title,
  artist,
  cover,
  isPlaying,
  isOff,
  volume: _volume,
  onToggle,
  onNext,
  onPrev,
  onVolume: _onVolume,
}: {
  name: string;
  title?: string;
  artist?: string;
  cover?: string;
  isPlaying: boolean;
  isOff: boolean;
  volume: number;
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onVolume: (v: number) => void;
}) {
  const { t } = useI18n();
  return (
    <div className='flex items-center gap-3 h-full'>
      {/* Album art */}
      <div className='w-12 h-12 shrink-0 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center'>
        {cover ? <img src={cover} alt='cover' className='w-full h-full object-cover' /> : <Music size={20} className='text-white/20' />}
      </div>

      {/* Info + controls */}
      <div className='flex-1 min-w-0'>
        <div className='text-white/40 text-[10px] uppercase tracking-wider truncate'>{name}</div>
        {isOff ? (
          <div className='text-white/20 text-xs mt-0.5'>{t('widgets.media_player.off')}</div>
        ) : (
          <div className='text-white text-xs font-medium truncate mt-0.5'>{title || t('widgets.media_player.idle')}</div>
        )}
        {artist && !isOff && <div className='text-white/40 text-[10px] truncate'>{artist}</div>}
      </div>

      {/* Controls */}
      <div className='flex items-center gap-1 shrink-0'>
        <button onClick={onPrev} className='w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors'>
          <SkipBack size={13} className='text-white/60' />
        </button>
        <button
          onClick={onToggle}
          className='w-8 h-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 transition-colors'
        >
          {isPlaying ? <Pause size={14} className='text-white' /> : <Play size={14} className='text-white ml-0.5' />}
        </button>
        <button onClick={onNext} className='w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors'>
          <SkipForward size={13} className='text-white/60' />
        </button>
      </div>
    </div>
  );
}

// ── Normal horizontal layout ───────────────────────────────────────────────────
function HorizontalLayout({
  name,
  title,
  artist,
  cover,
  isPlaying,
  isOff,
  volume,
  progress,
  duration,
  onToggle,
  onNext,
  onPrev,
  onVolume,
}: {
  name: string;
  title?: string;
  artist?: string;
  cover?: string;
  isPlaying: boolean;
  isOff: boolean;
  volume: number;
  progress: number;
  duration: number;
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onVolume: (v: number) => void;
}) {
  const { t } = useI18n();
  const progressPct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className='flex gap-4 h-full'>
      {/* Album art */}
      <div className='w-full max-w-[120px] aspect-square shrink-0 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center self-center'>
        {cover ? <img src={cover} alt='cover' className='w-full h-full object-cover' /> : <Music size={36} className='text-white/20' />}
      </div>

      {/* Right side */}
      <div className='flex flex-col justify-between flex-1 min-w-0 py-1'>
        <div className='text-white/40 text-[10px] uppercase tracking-wider truncate'>{name}</div>

        {isOff ? (
          <div className='text-white/30 text-sm'>{t('widgets.media_player.off')}</div>
        ) : (
          <div>
            <div className='text-white font-semibold truncate text-sm'>{title || t('widgets.media_player.idle')}</div>
            {artist && <div className='text-white/50 text-xs truncate mt-0.5'>{artist}</div>}
          </div>
        )}

        {/* Progress bar */}
        {!isOff && duration > 0 && (
          <div className='h-1 rounded-full bg-white/10 overflow-hidden'>
            <div className='h-full rounded-full bg-white/60 transition-all duration-1000' style={{ width: `${progressPct}%` }} />
          </div>
        )}

        {/* Controls */}
        <div className='flex items-center gap-2'>
          <button onClick={onPrev} className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors'>
            <SkipBack size={15} className='text-white/60' />
          </button>
          <button
            onClick={onToggle}
            className='w-9 h-9 flex items-center justify-center rounded-xl bg-white/15 hover:bg-white/25 transition-colors'
          >
            {isPlaying ? <Pause size={16} className='text-white' /> : <Play size={16} className='text-white ml-0.5' />}
          </button>
          <button onClick={onNext} className='w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors'>
            <SkipForward size={15} className='text-white/60' />
          </button>

          {/* Volume */}
          <div className='flex items-center gap-1.5 ml-auto'>
            <Volume2 size={12} className='text-white/30 shrink-0' />
            <input
              type='range'
              min={0}
              max={100}
              value={Math.round(volume * 100)}
              onChange={e => onVolume(parseInt(e.target.value, 10) / 100)}
              onClick={e => e.stopPropagation()}
              className='w-16 h-1 rounded-full appearance-none cursor-pointer bg-white/10
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-white/80'
              style={{
                background: `linear-gradient(to right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.4) ${Math.round(volume * 100)}%, rgba(255,255,255,0.1) ${Math.round(volume * 100)}%, rgba(255,255,255,0.1) 100%)`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Large vertical layout ──────────────────────────────────────────────────────
function VerticalLayout({
  name,
  title,
  artist,
  cover,
  isPlaying,
  isOff,
  volume,
  progress,
  duration,
  onToggle,
  onNext,
  onPrev,
  onVolume,
}: {
  name: string;
  title?: string;
  artist?: string;
  cover?: string;
  isPlaying: boolean;
  isOff: boolean;
  volume: number;
  progress: number;
  duration: number;
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onVolume: (v: number) => void;
}) {
  const { t } = useI18n();
  const progressPct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className='flex flex-col h-full gap-3'>
      {/* Album art — full width */}
      <div className='w-full flex-1 min-h-0 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center'>
        {cover ? <img src={cover} alt='cover' className='w-full h-full object-cover' /> : <Music size={48} className='text-white/20' />}
      </div>

      {/* Track info */}
      <div className='shrink-0'>
        <div className='text-white/40 text-[10px] uppercase tracking-wider truncate'>{name}</div>
        {isOff ? (
          <div className='text-white/30 text-sm mt-1'>{t('widgets.media_player.off')}</div>
        ) : (
          <>
            <div className='text-white font-semibold truncate text-sm mt-0.5'>{title || t('widgets.media_player.idle')}</div>
            {artist && <div className='text-white/50 text-xs truncate'>{artist}</div>}
          </>
        )}
      </div>

      {/* Progress */}
      {!isOff && (
        <div className='h-1 rounded-full bg-white/10 overflow-hidden shrink-0'>
          <div className='h-full rounded-full bg-white/60 transition-all duration-1000' style={{ width: `${progressPct}%` }} />
        </div>
      )}

      {/* Controls row */}
      <div className='flex items-center justify-between shrink-0'>
        <button onClick={onPrev} className='w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors'>
          <SkipBack size={18} className='text-white/60' />
        </button>
        <button
          onClick={onToggle}
          className='w-12 h-12 flex items-center justify-center rounded-2xl bg-white/15 hover:bg-white/25 transition-colors'
        >
          {isPlaying ? <Pause size={20} className='text-white' /> : <Play size={20} className='text-white ml-0.5' />}
        </button>
        <button onClick={onNext} className='w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors'>
          <SkipForward size={18} className='text-white/60' />
        </button>
      </div>

      {/* Volume */}
      <div className='flex items-center gap-2 shrink-0'>
        <Volume2 size={12} className='text-white/30 shrink-0' />
        <input
          type='range'
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={e => onVolume(parseInt(e.target.value, 10) / 100)}
          onClick={e => e.stopPropagation()}
          className='flex-1 h-1 rounded-full appearance-none cursor-pointer bg-white/10
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white/80'
          style={{
            background: `linear-gradient(to right, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.4) ${Math.round(volume * 100)}%, rgba(255,255,255,0.1) ${Math.round(volume * 100)}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
      </div>
    </div>
  );
}

// ── Main widget ────────────────────────────────────────────────────────────────
export function MediaPlayerCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<MediaPlayerCardConfig>(widgetId || 'media_player');
  const entityId = config?.entityId ?? 'media_player.unknown';

  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();
  const { ripples, trigger: triggerRipple } = useRipple();

  const haVolume = (entity?.attributes.volume_level as number | undefined) ?? 0;
  const [localVolume, setLocalVolume] = useState<number | null>(null);

  useEffect(() => {
    setLocalVolume(null);
  }, [haVolume]);

  const sendVolume = useDebouncedCallback((v: number) => {
    helpers.callService({
      domain: 'media_player',
      service: 'volume_set',
      target: { entity_id: entityId },
      serviceData: { volume_level: v },
    });
  }, 150);

  if (!entity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className='gc rounded-3xl p-5 flex items-center justify-center h-full'
      >
        <span className='text-white/30 text-sm'>{t('widgets.media_player.notFound')}</span>
      </motion.div>
    );
  }

  const state = entity.state as string;
  const isPlaying = state === 'playing';
  const isOff = state === 'off' || state === 'unavailable' || state === 'standby';

  const attrs = entity.attributes as Record<string, unknown>;
  const title = attrs.media_title as string | undefined;
  const artist = attrs.media_artist as string | undefined;
  const rawCover = attrs.entity_picture as string | undefined;
  const cover = rawCover ? (rawCover.startsWith('http') ? rawCover : `http://homeassistant.local:8123${rawCover}`) : undefined;
  const position = (attrs.media_position as number | undefined) ?? 0;
  const duration = (attrs.media_duration as number | undefined) ?? 0;
  const volume = localVolume ?? haVolume;
  const name = config?.name ?? (attrs.friendly_name as string) ?? entityId;

  const handleToggle = () => {
    helpers.callService({ domain: 'media_player', service: 'media_play_pause', target: { entity_id: entityId } });
  };
  const handleNext = () => {
    helpers.callService({ domain: 'media_player', service: 'media_next_track', target: { entity_id: entityId } });
  };
  const handlePrev = () => {
    helpers.callService({ domain: 'media_player', service: 'media_previous_track', target: { entity_id: entityId } });
  };
  const handleVolume = (v: number) => {
    setLocalVolume(v);
    sendVolume(v);
  };

  const disposition = config?.disposition ?? 'horizontal';
  const isCompact = config?.compact === true;

  const sharedProps = {
    name,
    title,
    artist,
    cover,
    isPlaying,
    isOff,
    volume,
    onToggle: handleToggle,
    onNext: handleNext,
    onPrev: handlePrev,
    onVolume: handleVolume,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onPointerDown={triggerRipple}
      className={cn('gc rounded-3xl p-4 h-full relative overflow-hidden', isPlaying && 'ring-1 ring-white/10')}
    >
      <RippleLayer ripples={ripples} color='rgba(255,255,255,0.05)' />

      {isCompact || disposition === 'compact' ? (
        <CompactLayout {...sharedProps} />
      ) : disposition === 'vertical' ? (
        <VerticalLayout {...sharedProps} progress={position} duration={duration} />
      ) : (
        <HorizontalLayout {...sharedProps} progress={position} duration={duration} />
      )}
    </motion.div>
  );
}
