import { useState, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Music } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { MediaPlayerCardConfig } from '@/types/widget-configs';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { cn } from '@/lib/utils';
import { friendlyName } from '@/lib/ha-service';
import { PillSlider } from '@/components/ds/PillSlider';

interface PlayerProps {
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
}

function Cover({ cover, className, iconSize }: { cover?: string; className: string; iconSize: number }) {
  return (
    <div className={cn('flex shrink-0 items-center justify-center overflow-hidden bg-[var(--ds-surface-3)]', className)}>
      {cover ? (
        <img src={cover} alt='' className='size-full object-cover' />
      ) : (
        <Music size={iconSize} aria-hidden='true' className='text-[var(--ds-ink-muted)]' />
      )}
    </div>
  );
}

/** Précédent, lecture/pause en grand, suivant — boutons ronds. */
function Controls({
  isPlaying,
  onToggle,
  onNext,
  onPrev,
  big,
}: Pick<PlayerProps, 'isPlaying' | 'onToggle' | 'onNext' | 'onPrev'> & { big?: boolean }) {
  const { t } = useI18n();
  const side = cn('flex shrink-0 items-center justify-center rounded-full', big ? 'size-12' : 'size-10');
  return (
    <div className='flex shrink-0 items-center gap-2'>
      <button onClick={onPrev} aria-label={t('widgets.media_player.previous')} title={t('widgets.media_player.previous')} className={side}>
        <SkipBack size={big ? 22 : 18} fill='currentColor' />
      </button>
      <button
        onClick={onToggle}
        aria-label={isPlaying ? t('widgets.media_player.pause') : t('widgets.media_player.play')}
        title={isPlaying ? t('widgets.media_player.pause') : t('widgets.media_player.play')}
        className={cn('flex shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)]', big ? 'size-16' : 'size-12')}
      >
        {isPlaying ? (
          <Pause size={big ? 26 : 20} fill='currentColor' />
        ) : (
          <Play size={big ? 26 : 20} fill='currentColor' className='ml-0.5' />
        )}
      </button>
      <button onClick={onNext} aria-label={t('widgets.media_player.next')} title={t('widgets.media_player.next')} className={side}>
        <SkipForward size={big ? 22 : 18} fill='currentColor' />
      </button>
    </div>
  );
}

function Progress({ progress, duration }: { progress: number; duration: number }) {
  if (duration <= 0) return null;
  const pct = Math.min(100, (progress / duration) * 100);
  return (
    <div aria-hidden='true' className='h-1.5 shrink-0 overflow-hidden rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)]'>
      <div
        className='h-full rounded-[var(--ds-radius-pill)] bg-[var(--ds-ink)] transition-[width] duration-1000'
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Volume({ volume, onVolume }: Pick<PlayerProps, 'volume' | 'onVolume'>) {
  const { t } = useI18n();
  const pct = Math.round(volume * 100);
  return (
    <PillSlider
      value={pct}
      onChange={v => onVolume(v / 100)}
      label={t('widgets.media_player.volume')}
      valueText={`${pct} %`}
      icon={Volume2}
      className='h-11 shrink-0'
    />
  );
}

function TrackInfo({ name, title, artist, isOff }: Pick<PlayerProps, 'name' | 'title' | 'artist' | 'isOff'>) {
  const { t } = useI18n();
  return (
    <div className='min-w-0'>
      <div className='truncate text-[17px] font-semibold leading-tight'>{isOff ? name : title || t('widgets.media_player.idle')}</div>
      <div className='truncate text-sm text-[var(--ds-ink-muted)]'>
        {isOff ? t('widgets.media_player.off') : [artist, name].filter(Boolean).join(' · ')}
      </div>
    </div>
  );
}

// ── Compact layout (small widget, ≤ 2 rows) ────────────────────────────────────
function CompactLayout(p: PlayerProps) {
  return (
    <div className='flex h-full items-center gap-3 px-4'>
      <Cover cover={p.cover} className='size-14 rounded-[var(--ds-radius-md)]' iconSize={22} />
      <div className='min-w-0 flex-1'>
        <TrackInfo {...p} />
      </div>
      <Controls {...p} />
    </div>
  );
}

// ── Normal horizontal layout ───────────────────────────────────────────────────
function HorizontalLayout(p: PlayerProps) {
  return (
    <div className='flex h-full flex-col justify-between gap-3 p-[var(--ds-space-4)]'>
      <div className='flex min-h-0 items-center gap-4'>
        <Cover cover={p.cover} className='size-20 rounded-[var(--ds-radius-md)]' iconSize={30} />
        <div className='min-w-0 flex-1'>
          <TrackInfo {...p} />
        </div>
        <Controls {...p} />
      </div>
      {!p.isOff && <Progress progress={p.progress} duration={p.duration} />}
      <Volume volume={p.volume} onVolume={p.onVolume} />
    </div>
  );
}

// ── Large vertical layout ──────────────────────────────────────────────────────
function VerticalLayout(p: PlayerProps) {
  return (
    <div className='flex h-full flex-col gap-3 p-[var(--ds-space-4)]'>
      <Cover cover={p.cover} className='min-h-0 w-full flex-1 rounded-[var(--ds-radius-lg)]' iconSize={48} />
      <TrackInfo {...p} />
      {!p.isOff && <Progress progress={p.progress} duration={p.duration} />}
      <div className='flex shrink-0 justify-center'>
        <Controls {...p} big />
      </div>
      <Volume volume={p.volume} onVolume={p.onVolume} />
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
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();

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
      <div className='rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)] flex h-full items-center justify-center p-5'>
        <span className='text-sm text-[var(--ds-ink-muted)]'>{t('widgets.media_player.notFound')}</span>
      </div>
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
  const name = config?.name ?? friendlyName({ attributes: attrs }) ?? entityId;

  const handleToggle = () => {
    helpers.callService({ domain: 'media_player', service: 'media_play_pause', target: { entity_id: entityId } });
    playFeedback(isPlaying ? 'media_pause' : 'media_play');
  };
  const handleNext = () => {
    helpers.callService({ domain: 'media_player', service: 'media_next_track', target: { entity_id: entityId } });
    playFeedback('media_next');
  };
  const handlePrev = () => {
    helpers.callService({ domain: 'media_player', service: 'media_previous_track', target: { entity_id: entityId } });
    playFeedback('media_next');
  };
  const handleVolume = (v: number) => {
    setLocalVolume(v);
    sendVolume(v);
  };

  const disposition = config?.disposition ?? 'horizontal';
  const isCompact = config?.compact === true;

  const props: PlayerProps = {
    name,
    title,
    artist,
    cover,
    isPlaying,
    isOff,
    volume,
    progress: position,
    duration,
    onToggle: handleToggle,
    onNext: handleNext,
    onPrev: handlePrev,
    onVolume: handleVolume,
  };

  return (
    <div className='h-full overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)]'>
      {isCompact || disposition === 'compact' ? (
        <CompactLayout {...props} />
      ) : disposition === 'vertical' ? (
        <VerticalLayout {...props} />
      ) : (
        <HorizontalLayout {...props} />
      )}
    </div>
  );
}
