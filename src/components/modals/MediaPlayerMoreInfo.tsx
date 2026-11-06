import { useEffect, useState } from 'react';
import { ListMusic, Music, Pause, Play, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Speaker, Volume2, VolumeX } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useMediaBrowse } from '@/hooks/useMediaBrowse';
import { useNow } from '@/hooks/useNow';
import { useFormats } from '@/hooks/useFormats';
import { useHaUrl } from '@/hooks/useHaUrl';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { callHAService, friendlyName } from '@/lib/ha-service';
import { formatMediaTime, interpolatePosition, isMediaOff, nextRepeat, supportsMedia } from '@/lib/media-player';
import { cn } from '@/lib/utils';
import { PillSlider } from '@/components/ds/PillSlider';
import { useI18n } from '@/i18n';
import type { MediaPlayerCardConfig } from '@/types/widget-configs';

/** Bouton rond ≥ 44 px ; `active` le teinte (aléatoire, répétition, coupure du son). */
function RoundButton({
  label,
  onClick,
  active,
  big,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  big?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type='button'
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40',
        big ? 'size-16' : 'size-12',
        active ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]'
      )}
    >
      {children}
    </button>
  );
}

export default function MediaPlayerMoreInfo({ entityId, widgetId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<MediaPlayerCardConfig>(widgetId);
  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const resolveUrl = useHaUrl();
  const playFeedback = useSoundFeedback();
  const { formatTime } = useFormats();

  const state = entity?.state ?? 'unavailable';
  const attrs = (entity?.attributes ?? {}) as Record<string, unknown>;
  const isPlaying = state === 'playing';
  const isOff = isMediaOff(state);
  const features = attrs.supported_features;
  const can = (f: Parameters<typeof supportsMedia>[1]) => supportsMedia(features, f);

  // La bibliothèque du lecteur : la rangée « À écouter », comme sur l'Echo Show.
  const library = useMediaBrowse(entityId, !!entity && can('BROWSE_MEDIA') && can('PLAY_MEDIA'));
  // Une seule horloge : l'heure de l'en-tête, et la progression qui avance
  // chaque seconde pendant la lecture.
  const clock = useNow(isPlaying);
  const now = clock.getTime();

  const haVolume = typeof attrs.volume_level === 'number' ? attrs.volume_level : 0;
  const [localVolume, setLocalVolume] = useState<number | null>(null);
  const [seekValue, setSeekValue] = useState<number | null>(null);
  useEffect(() => setLocalVolume(null), [haVolume]);
  useEffect(() => setSeekValue(null), [attrs.media_position, attrs.media_position_updated_at]);

  const call = (service: string, data?: Record<string, unknown>) =>
    callHAService(helpers, 'media_player', service, { entity_id: entityId }, data);
  const sendVolume = useDebouncedCallback((v: number) => call('volume_set', { volume_level: v }), 150);
  const sendSeek = useDebouncedCallback((s: number) => call('media_seek', { seek_position: s }), 250);

  if (!entity) return <div className='p-12 text-center text-[var(--ds-ink-muted)]'>{t('common.entityNotFound')}</div>;

  const name = config?.name ?? friendlyName(entity) ?? entityId;
  const title = typeof attrs.media_title === 'string' ? attrs.media_title : undefined;
  const artist = typeof attrs.media_artist === 'string' ? attrs.media_artist : undefined;
  const album = typeof attrs.media_album_name === 'string' ? attrs.media_album_name : undefined;
  const playlist = typeof attrs.media_playlist === 'string' ? attrs.media_playlist : undefined;
  const cover = resolveUrl(typeof attrs.entity_picture === 'string' ? attrs.entity_picture : undefined);
  const duration = typeof attrs.media_duration === 'number' ? attrs.media_duration : 0;
  const position = seekValue ?? interpolatePosition(attrs, isPlaying, now);
  const volume = localVolume ?? haVolume;
  const muted = attrs.is_volume_muted === true;
  const shuffle = attrs.shuffle === true;
  const repeat = typeof attrs.repeat === 'string' ? attrs.repeat : 'off';
  const source = typeof attrs.source === 'string' ? attrs.source : undefined;
  const sources = Array.isArray(attrs.source_list) ? attrs.source_list.filter((s): s is string => typeof s === 'string') : [];

  const repeatLabel =
    repeat === 'one'
      ? t('widgets.media_player.repeatOne')
      : repeat === 'all'
        ? t('widgets.media_player.repeatAll')
        : t('widgets.media_player.repeatOff');

  return (
    <div
      className='relative isolate -mt-4 flex min-h-full flex-col overflow-hidden px-6 pb-8 pt-6 sm:px-12'
      data-testid='media-player-more-info'
    >
      {/* Fond : la pochette, floutée et assombrie. */}
      {cover && (
        <img
          src={cover}
          alt=''
          aria-hidden='true'
          data-testid='media-backdrop'
          className='pointer-events-none absolute inset-0 -z-10 size-full scale-125 object-cover opacity-45 blur-3xl'
        />
      )}

      {/* Le lecteur à gauche, l'heure à droite — la croix de la fiche est tout à droite. */}
      <div className='mb-6 flex items-center justify-between gap-4 pr-16'>
        <span className='truncate rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-5 py-3 text-[17px] font-semibold'>
          {name}
        </span>
        <time className='shrink-0 text-[40px] font-medium leading-none tabular-nums'>{formatTime(clock)}</time>
      </div>

      <div className='mx-auto flex w-full max-w-5xl flex-col'>
        <div className='mx-auto flex aspect-square w-full max-w-[300px] items-center justify-center overflow-hidden rounded-[var(--ds-radius-xl)] bg-[var(--ds-surface-3)] shadow-[var(--ds-shadow-sheet)]'>
          {cover ? (
            <img src={cover} alt='' data-testid='media-cover' className='size-full object-cover' />
          ) : (
            <Music size={64} aria-hidden='true' className='text-[var(--ds-ink-muted)]' />
          )}
        </div>

        <div className='mt-5 min-w-0 text-center'>
          <h2 className='truncate text-[22px] font-bold leading-tight'>
            {isOff ? t('widgets.media_player.off') : title || t('widgets.media_player.nothingPlaying')}
          </h2>
          {!isOff && artist && <p className='truncate text-[15px] text-[var(--ds-ink-muted)]'>{artist}</p>}
          {!isOff && album && <p className='truncate text-sm text-[var(--ds-ink-muted)]'>{album}</p>}
          {!isOff && playlist && (
            <p className='mt-1 flex items-center justify-center gap-1.5 truncate text-sm text-[var(--ds-ink-muted)]'>
              <ListMusic size={14} aria-hidden='true' />
              <span className='truncate'>
                {t('widgets.media_player.playlist')} · {playlist}
              </span>
            </p>
          )}
        </div>

        {/* Progression */}
        {!isOff && duration > 0 && (
          <div className='mt-5'>
            <PillSlider
              value={Math.round(position)}
              min={0}
              max={Math.round(duration)}
              onChange={v => {
                setSeekValue(v);
                sendSeek(v);
              }}
              label={t('widgets.media_player.position')}
              valueText={`${formatMediaTime(position)} / ${formatMediaTime(duration)}`}
              className='h-3'
              fill='var(--ds-ink)'
            />
            <div className='mt-1.5 flex justify-between text-xs tabular-nums text-[var(--ds-ink-muted)]'>
              <span>{formatMediaTime(position)}</span>
              <span>{formatMediaTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Contrôles */}
        <div className='mt-5 flex items-center justify-center gap-3'>
          {can('SHUFFLE_SET') && (
            <RoundButton
              label={t('widgets.media_player.shuffle')}
              active={shuffle}
              onClick={() => call('shuffle_set', { shuffle: !shuffle })}
            >
              <Shuffle size={20} />
            </RoundButton>
          )}
          <RoundButton label={t('widgets.media_player.previous')} onClick={() => call('media_previous_track')}>
            <SkipBack size={20} fill='currentColor' />
          </RoundButton>
          <RoundButton
            big
            label={isPlaying ? t('widgets.media_player.pause') : t('widgets.media_player.play')}
            onClick={() => {
              call('media_play_pause');
              playFeedback(isPlaying ? 'media_pause' : 'media_play');
            }}
          >
            {isPlaying ? <Pause size={28} fill='currentColor' /> : <Play size={28} fill='currentColor' className='ml-0.5' />}
          </RoundButton>
          <RoundButton label={t('widgets.media_player.next')} onClick={() => call('media_next_track')}>
            <SkipForward size={20} fill='currentColor' />
          </RoundButton>
          {can('REPEAT_SET') && (
            <RoundButton label={repeatLabel} active={repeat !== 'off'} onClick={() => call('repeat_set', { repeat: nextRepeat(repeat) })}>
              {repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </RoundButton>
          )}
        </div>

        {/* Volume */}
        {can('VOLUME_SET') && (
          <div className='mt-6 flex items-center gap-3'>
            {can('VOLUME_MUTE') && (
              <RoundButton
                label={muted ? t('widgets.media_player.unmute') : t('widgets.media_player.mute')}
                active={muted}
                onClick={() => call('volume_mute', { is_volume_muted: !muted })}
              >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </RoundButton>
            )}
            <PillSlider
              value={Math.round(volume * 100)}
              onChange={v => {
                setLocalVolume(v / 100);
                sendVolume(v / 100);
              }}
              label={t('widgets.media_player.volume')}
              valueText={`${Math.round(volume * 100)} %`}
              icon={muted ? VolumeX : Volume2}
              className='h-12 flex-1'
            />
          </div>
        )}

        {/* Source / sortie */}
        {can('SELECT_SOURCE') && sources.length > 0 && (
          <div className='mt-6'>
            <h3 className='mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--ds-ink-muted)]'>
              <Speaker size={16} aria-hidden='true' />
              {t('widgets.media_player.source')}
            </h3>
            <div className='flex flex-wrap gap-2' role='group' aria-label={t('widgets.media_player.source')}>
              {sources.map(s => (
                <button
                  key={s}
                  type='button'
                  aria-pressed={s === source}
                  onClick={() => call('select_source', { source: s })}
                  className={cn(
                    'min-h-11 rounded-[var(--ds-radius-pill)] px-4 text-[15px] font-semibold',
                    s === source ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* À écouter : la bibliothèque du lecteur, un appui lance l'élément. */}
      {library.length > 0 && (
        <section className='mt-8'>
          <h3 className='mb-3 text-[17px] font-semibold'>{t('widgets.media_player.library')}</h3>
          <div className='-mx-1 flex gap-4 overflow-x-auto px-1 pb-1' style={{ scrollbarWidth: 'none' }}>
            {library.map(item => {
              const thumb = resolveUrl(item.thumbnail ?? undefined);
              return (
                <button
                  key={item.media_content_id}
                  type='button'
                  onClick={() =>
                    call('play_media', { media_content_id: item.media_content_id, media_content_type: item.media_content_type })
                  }
                  className='flex w-40 shrink-0 flex-col gap-2 text-left'
                >
                  <span className='flex aspect-square w-full items-center justify-center overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-3)]'>
                    {thumb ? (
                      <img src={thumb} alt='' className='size-full object-cover' />
                    ) : (
                      <Music size={36} aria-hidden='true' className='text-[var(--ds-ink-muted)]' />
                    )}
                  </span>
                  <span className='line-clamp-2 text-sm font-semibold'>{item.title}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
