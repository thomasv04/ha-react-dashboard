import { useEffect, useState } from 'react';
import {
  ListMusic,
  Monitor,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Speaker,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useMediaBrowse } from '@/hooks/useMediaBrowse';
import { massPlay, useAutoMassPlayer, useMassEntryId, useMassLibrary } from '@/hooks/useMusicAssistant';
import { useNow } from '@/hooks/useNow';
import { useFormats } from '@/hooks/useFormats';
import { useHaUrl } from '@/hooks/useHaUrl';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useMoreInfoOptional } from '@/context/MoreInfoContext';
import { callHAService, friendlyName } from '@/lib/ha-service';
import { formatMediaTime, interpolatePosition, isMediaOff, nextRepeat, supportsMedia } from '@/lib/media-player';
import { isMassPlayer } from '@/lib/music-assistant';
import { cn } from '@/lib/utils';
import { PillSlider } from '@/components/ds/PillSlider';
import { PlayerPicker } from '@/components/music/MusicActions';
import { useI18n } from '@/i18n';
import type { MediaPlayerCardConfig } from '@/types/widget-configs';

/** Bouton rond de la maquette : verre clair sur la pochette floutée ; `active` le teinte. */
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
        'flex shrink-0 items-center justify-center rounded-full text-white transition-colors disabled:opacity-40',
        big ? 'size-[72px]' : 'size-14',
        active ? 'bg-[var(--ds-tile-on)]' : big ? 'bg-white/[0.28]' : 'bg-white/[0.14]'
      )}
    >
      {children}
    </button>
  );
}

/**
 * Le lecteur plein écran de la maquette « Lecteur musique » (et de l'Echo
 * Show) : la pochette floutée en fond, la pochette, le titre, la progression
 * sur toute la largeur, les commandes, puis « Vous aimerez aussi ».
 *
 * Un lecteur Music Assistant suit la maquette à la lettre : la pastille ouvre
 * la bibliothèque, à gauche le choix de l'enceinte, à droite la file d'attente,
 * et le volume se règle dans l'écran des enceintes. Les autres lecteurs (une
 * télé, un Chromecast) gardent sous les commandes leur volume et leurs sources,
 * que la maquette ne couvre pas.
 */
export default function MediaPlayerMoreInfo({ entityId: givenId, widgetId }: { entityId: string; widgetId: string }) {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const config = getWidgetConfig<MediaPlayerCardConfig>(widgetId);
  // Ouvert depuis une card en automatique : le lecteur suit l'enceinte Music Assistant qui joue.
  const auto = config?.source === 'music_assistant';
  const autoId = useAutoMassPlayer(auto);
  const entityId = (auto ? autoId : undefined) ?? givenId;
  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const moreInfo = useMoreInfoOptional();
  const resolveUrl = useHaUrl();
  const playFeedback = useSoundFeedback();
  const { formatTime } = useFormats();
  const [picking, setPicking] = useState(false);

  const state = entity?.state ?? 'unavailable';
  const attrs = (entity?.attributes ?? {}) as Record<string, unknown>;
  const isPlaying = state === 'playing';
  const isOff = isMediaOff(state);
  const features = attrs.supported_features;
  const can = (f: Parameters<typeof supportsMedia>[1]) => supportsMedia(features, f);
  const mass = isMassPlayer(entity);

  // « Vous aimerez aussi » : des albums de la bibliothèque MA, tirés au hasard ; sinon la
  // bibliothèque du lecteur (« À écouter »).
  const { entryId } = useMassEntryId(mass ? entityId : undefined);
  const suggestions = useMassLibrary(mass ? entryId : null, { mediaType: 'album', orderBy: 'random', limit: 12 });
  const library = useMediaBrowse(entityId, !mass && !!entity && can('BROWSE_MEDIA') && can('PLAY_MEDIA'));
  // Une seule horloge : l'heure de l'en-tête, et la progression qui avance chaque seconde.
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
  /** Ouvre l'appli Musique sur cet écran (`music`, `music:queue`, `music:speakers`). */
  const openMusic = (screen?: 'queue' | 'speakers') => moreInfo?.openMoreInfo(screen ? `music:${screen}` : 'music', 'music', entityId);

  if (!entity) return <div className='p-12 text-center text-[var(--ds-ink-muted)]'>{t('common.entityNotFound')}</div>;

  const name = (auto ? undefined : config?.name) ?? friendlyName(entity) ?? entityId;
  const title = typeof attrs.media_title === 'string' ? attrs.media_title : undefined;
  const artist = typeof attrs.media_artist === 'string' ? attrs.media_artist : undefined;
  const album = typeof attrs.media_album_name === 'string' ? attrs.media_album_name : undefined;
  const cover = resolveUrl(typeof attrs.entity_picture === 'string' ? attrs.entity_picture : undefined);
  const duration = typeof attrs.media_duration === 'number' ? attrs.media_duration : 0;
  const position = seekValue ?? interpolatePosition(attrs, isPlaying, now);
  const volume = localVolume ?? haVolume;
  const muted = attrs.is_volume_muted === true;
  const shuffle = attrs.shuffle === true;
  const repeat = typeof attrs.repeat === 'string' ? attrs.repeat : 'off';
  const source = typeof attrs.source === 'string' ? attrs.source : undefined;
  const sources = Array.isArray(attrs.source_list) ? attrs.source_list.filter((s): s is string => typeof s === 'string') : [];
  // Une enceinte qui en a joint d'autres : « Salon + 2 » ; un groupe défini dans MA se nomme lui-même.
  const members = attrs.mass_player_type !== 'group' && Array.isArray(attrs.group_members) ? attrs.group_members.length : 0;
  const speaker = members > 1 ? `${name} + ${members - 1}` : name;

  const repeatLabel =
    repeat === 'one'
      ? t('widgets.media_player.repeatOne')
      : repeat === 'all'
        ? t('widgets.media_player.repeatAll')
        : t('widgets.media_player.repeatOff');

  const row = mass
    ? (suggestions.data?.items ?? []).map(i => ({
        key: i.uri,
        title: i.name,
        image: i.image,
        play: () => massPlay(helpers, entityId, i),
      }))
    : library.map(i => ({
        key: i.media_content_id,
        title: i.title,
        image: i.thumbnail,
        play: () => call('play_media', { media_content_id: i.media_content_id, media_content_type: i.media_content_type }),
      }));

  return (
    <div
      className='music-theme relative isolate -mt-4 flex min-h-full flex-col overflow-hidden pb-10 leading-[normal] text-white'
      data-testid='media-player-more-info'
    >
      {/* Fond : la pochette, floutée et assombrie ; sans pochette, le dégradé de la maquette. */}
      {cover ? (
        <>
          <img
            src={cover}
            alt=''
            aria-hidden='true'
            data-testid='media-backdrop'
            className='pointer-events-none absolute inset-0 -z-20 size-full scale-125 object-cover blur-[70px]'
          />
          <div aria-hidden='true' className='pointer-events-none absolute inset-0 -z-10 bg-black/45' />
        </>
      ) : (
        <div
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(at_50%_30%,#6b5a5e_0%,#3e3a40_55%,#2a2a30_100%)]'
        />
      )}

      {/* La poignée du haut : la toucher ferme le lecteur. */}
      <button
        type='button'
        onClick={moreInfo?.closeMoreInfo}
        aria-label={t('common.close')}
        className='absolute left-1/2 top-2 flex h-8 w-[130px] -translate-x-1/2 items-start justify-center pt-2.5'
      >
        <span className='h-1.5 w-[90px] rounded-[3px] bg-[var(--music-highlight)]' />
      </button>

      <header className='flex items-start justify-between pl-14 pr-16 pt-11'>
        {mass ? (
          <button
            type='button'
            onClick={() => openMusic()}
            className='h-[52px] rounded-[26px] bg-white/[0.14] px-[22px] text-[19px] font-semibold'
          >
            {t('widgets.music.title')}
          </button>
        ) : (
          <span className='flex h-[52px] items-center rounded-[26px] bg-white/[0.14] px-[22px] text-[19px] font-semibold'>{name}</span>
        )}
        <time className='text-[44px] font-medium'>{formatTime(clock)}</time>
      </header>

      <div className='mt-11 flex flex-col items-center px-14 text-center'>
        <div className='flex size-[300px] items-center justify-center overflow-hidden rounded-[28px] bg-white/10 shadow-[0_24px_60px_rgba(0,0,0,0.4)]'>
          {cover ? (
            <img src={cover} alt='' data-testid='media-cover' className='size-full object-cover' />
          ) : (
            <Music size={72} aria-hidden='true' className='text-white/60' />
          )}
        </div>
        <h2 className='mt-8 max-w-full truncate text-[34px] font-medium'>
          {isOff ? t('widgets.media_player.off') : title || t('widgets.media_player.nothingPlaying')}
        </h2>
        {!isOff && (artist || album) && (
          <p className='mt-2.5 max-w-full truncate text-[20px] text-white/[0.84]'>
            {artist && <span>{artist}</span>}
            {artist && album && ' · '}
            {album && <span>{album}</span>}
          </p>
        )}
        <p className='mt-2.5 text-[16px] text-white/[0.76]'>{speaker}</p>
      </div>

      {/* Progression : un trait sur toute la largeur ; un curseur natif invisible le rend réglable. */}
      <div className={cn('mt-[74px] px-14', (isOff || duration <= 0) && 'invisible')}>
        <div className='relative h-1.5 rounded-[3px] bg-white/25'>
          <div
            className='h-full rounded-[3px] bg-white'
            style={{ width: `${duration > 0 ? Math.min(100, (position / duration) * 100) : 0}%` }}
          />
          <input
            type='range'
            min={0}
            max={Math.round(duration) || 1}
            value={Math.round(position)}
            onChange={e => {
              const v = Number(e.target.value);
              setSeekValue(v);
              sendSeek(v);
            }}
            disabled={!can('SEEK')}
            aria-label={t('widgets.media_player.position')}
            aria-valuetext={`${formatMediaTime(position)} / ${formatMediaTime(duration)}`}
            className='absolute -inset-y-4 inset-x-0 h-auto w-full cursor-pointer opacity-0'
          />
        </div>
        <div className='mt-2.5 flex justify-between text-[15px] tabular-nums text-white/[0.84]'>
          <span>{formatMediaTime(position)}</span>
          <span>{formatMediaTime(duration)}</span>
        </div>
      </div>

      {/* Commandes : l'enceinte à gauche, la file à droite (Music Assistant), le reste au centre. */}
      <div className='mt-[26px] flex h-[72px] items-center px-14'>
        <div className='w-14 shrink-0'>
          {mass && (
            <RoundButton label={t('widgets.music.choosePlayer')} onClick={() => setPicking(true)}>
              <Monitor size={22} aria-hidden='true' />
            </RoundButton>
          )}
        </div>
        <div className='flex flex-1 items-center justify-center gap-[18px]'>
          {can('SHUFFLE_SET') && (
            <RoundButton
              label={t('widgets.media_player.shuffle')}
              active={shuffle}
              onClick={() => call('shuffle_set', { shuffle: !shuffle })}
            >
              <Shuffle size={22} aria-hidden='true' />
            </RoundButton>
          )}
          <RoundButton label={t('widgets.media_player.previous')} onClick={() => call('media_previous_track')}>
            <SkipBack size={22} aria-hidden='true' className='fill-current' />
          </RoundButton>
          <RoundButton
            big
            label={isPlaying ? t('widgets.media_player.pause') : t('widgets.media_player.play')}
            onClick={() => {
              call('media_play_pause');
              playFeedback(isPlaying ? 'media_pause' : 'media_play');
            }}
          >
            {isPlaying ? (
              <Pause size={28} strokeWidth={2.5} aria-hidden='true' />
            ) : (
              <Play size={28} aria-hidden='true' className='ml-0.5 fill-current' />
            )}
          </RoundButton>
          <RoundButton label={t('widgets.media_player.next')} onClick={() => call('media_next_track')}>
            <SkipForward size={22} aria-hidden='true' className='fill-current' />
          </RoundButton>
          {can('REPEAT_SET') && (
            <RoundButton label={repeatLabel} active={repeat !== 'off'} onClick={() => call('repeat_set', { repeat: nextRepeat(repeat) })}>
              {repeat === 'one' ? <Repeat1 size={22} aria-hidden='true' /> : <Repeat size={22} aria-hidden='true' />}
            </RoundButton>
          )}
        </div>
        <div className='w-14 shrink-0'>
          {mass && (
            <RoundButton label={t('widgets.music.queue')} onClick={() => openMusic('queue')}>
              <ListMusic size={22} aria-hidden='true' />
            </RoundButton>
          )}
        </div>
      </div>

      {/* Hors Music Assistant : le volume et la sortie, que la maquette musique ne prévoit pas. */}
      {!mass && (can('VOLUME_SET') || (can('SELECT_SOURCE') && sources.length > 0)) && (
        <div className='mt-8 flex flex-col gap-5 px-14'>
          {can('VOLUME_SET') && (
            <div className='flex items-center gap-3'>
              {can('VOLUME_MUTE') && (
                <RoundButton
                  label={muted ? t('widgets.media_player.unmute') : t('widgets.media_player.mute')}
                  active={muted}
                  onClick={() => call('volume_mute', { is_volume_muted: !muted })}
                >
                  {muted ? <VolumeX size={22} aria-hidden='true' /> : <Volume2 size={22} aria-hidden='true' />}
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
                track='rgba(255,255,255,0.14)'
                className='h-14 flex-1'
              />
            </div>
          )}
          {can('SELECT_SOURCE') && sources.length > 0 && (
            <div className='flex flex-wrap items-center gap-2' role='group' aria-label={t('widgets.media_player.source')}>
              <Speaker size={18} aria-hidden='true' className='mr-1 text-white/75' />
              {sources.map(s => (
                <button
                  key={s}
                  type='button'
                  aria-pressed={s === source}
                  onClick={() => call('select_source', { source: s })}
                  className={cn(
                    'h-11 rounded-[22px] px-4 text-[15px] font-semibold',
                    s === source ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-white/[0.14]'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {row.length > 0 && (
        <section className='mt-9 pl-14'>
          <h3 className='mb-3.5 text-[19px] font-medium text-white/90'>
            {mass ? t('widgets.music.youMayLike') : t('widgets.media_player.library')}
          </h3>
          <div className='flex gap-6 overflow-x-auto pr-14' style={{ scrollbarWidth: 'none' }}>
            {row.map(item => {
              const thumb = resolveUrl(item.image ?? undefined);
              return (
                <button
                  key={item.key}
                  type='button'
                  onClick={item.play}
                  aria-label={item.title}
                  title={item.title}
                  className='flex size-[200px] shrink-0 items-center justify-center overflow-hidden rounded-[22px] bg-white/10'
                >
                  {thumb ? (
                    <img src={thumb} alt='' loading='lazy' className='size-full object-cover' />
                  ) : (
                    <Music size={40} aria-hidden='true' className='text-white/60' />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {picking && (
        <PlayerPicker
          current={entityId}
          onPick={id => moreInfo?.openMoreInfo(id, 'media_player', id)}
          onGroup={() => openMusic('speakers')}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}
