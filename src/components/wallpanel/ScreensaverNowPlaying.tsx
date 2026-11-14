import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Pause, Play, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useHaUrl } from '@/hooks/useHaUrl';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { callHAService } from '@/lib/ha-service';
import { pickPlayingMusic } from '@/lib/media-player';
import { DURATION_ENTRANCE, EASE_OUT } from '@/lib/motion-tokens';
import { useI18n } from '@/i18n';

type Entity = { state: string; attributes?: Record<string, unknown> };
const text = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

/** Bouton de la carte : rond, sans fond ; la lecture seule en a un, blanc. */
function Control({ label, onClick, main, children }: { label: string; onClick: () => void; main?: boolean; children: React.ReactNode }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={label}
      title={label}
      className={
        main
          ? 'flex size-11 items-center justify-center rounded-full bg-white text-black'
          : 'flex size-10 items-center justify-center rounded-full text-white/85 hover:bg-white/10'
      }
    >
      {children}
    </button>
  );
}

/**
 * Ce qui joue, en bas à droite de l'écran de veille : une carte de verre
 * sombre, la pochette, le titre, précédent / lecture / suivant et le volume.
 * Elle n'apparaît que pendant la musique, et reste en pause pour qu'on puisse
 * relancer. Toucher la pochette ou le titre quitte la veille et ouvre le
 * lecteur ; les boutons ne la quittent pas.
 */
export function ScreensaverNowPlaying({ onOpen }: { onOpen: (entityId: string) => void }) {
  const { t } = useI18n();
  const helpers = useHass(s => s.helpers);
  const resolveUrl = useHaUrl();
  // Le lecteur montré reste tant qu'il est en pause : la pause ne doit pas cacher le bouton qui relance.
  const [kept, setKept] = useState<string>();
  const entityId = useHass(s => pickPlayingMusic(s.entities as Record<string, Entity>, kept));
  useEffect(() => setKept(entityId), [entityId]);
  const entity = useHass(s => (entityId ? (s.entities as Record<string, Entity>)[entityId] : undefined));
  const attrs = entity?.attributes ?? {};

  const haVolume = typeof attrs.volume_level === 'number' ? attrs.volume_level : undefined;
  const [localVolume, setLocalVolume] = useState<number | null>(null);
  useEffect(() => setLocalVolume(null), [haVolume]);
  const call = (service: string, data?: Record<string, unknown>) =>
    entityId && callHAService(helpers, 'media_player', service, { entity_id: entityId }, data);
  const sendVolume = useDebouncedCallback((v: number) => call('volume_set', { volume_level: v }), 150);

  const playing = entity?.state === 'playing';
  const title = text(attrs.media_title);
  const artist = text(attrs.media_artist);
  const cover = resolveUrl(text(attrs.entity_picture));
  const volume = localVolume ?? haVolume;
  const VolumeIcon = volume === 0 ? VolumeX : (volume ?? 0) < 0.5 ? Volume1 : Volume2;

  return (
    <AnimatePresence>
      {entityId && title && (
        <motion.div
          key='now-playing'
          data-testid='screensaver-now-playing'
          // Les gestes de la veille s'arrêtent à la carte : un appui ne la quitte pas.
          onClick={e => e.stopPropagation()}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: DURATION_ENTRANCE, ease: EASE_OUT }}
          className='pointer-events-auto absolute bottom-14 right-12 z-[201] w-[380px] rounded-[26px] bg-black/30 p-3 text-white shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-xl'
        >
          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={() => onOpen(entityId)}
              aria-label={t('widgets.music.openPlayer')}
              className='flex min-w-0 flex-1 items-center gap-3 text-left'
            >
              <span className='flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[14px] bg-white/10'>
                {cover ? (
                  <img src={cover} alt='' className='size-full object-cover' />
                ) : (
                  <Music size={24} aria-hidden='true' className='text-white/60' />
                )}
              </span>
              <span className='min-w-0'>
                <span className='block truncate text-[16px] font-semibold'>{title}</span>
                {artist && <span className='mt-0.5 block truncate text-[14px] text-white/65'>{artist}</span>}
              </span>
            </button>
            <div className='flex shrink-0 items-center gap-0.5'>
              <Control label={t('widgets.media_player.previous')} onClick={() => call('media_previous_track')}>
                <SkipBack size={18} aria-hidden='true' className='fill-current' />
              </Control>
              <Control
                main
                label={t(playing ? 'widgets.media_player.pause' : 'widgets.media_player.play')}
                onClick={() => call('media_play_pause')}
              >
                {playing ? (
                  <Pause size={20} aria-hidden='true' className='fill-current' />
                ) : (
                  <Play size={20} aria-hidden='true' className='ml-0.5 fill-current' />
                )}
              </Control>
              <Control label={t('widgets.media_player.next')} onClick={() => call('media_next_track')}>
                <SkipForward size={18} aria-hidden='true' className='fill-current' />
              </Control>
            </div>
          </div>
          {volume !== undefined && (
            <label className='mt-2.5 flex items-center gap-2.5 px-1 text-white/70'>
              <VolumeIcon size={16} aria-hidden='true' className='shrink-0' />
              {/* Un trait fin : le remplissage suit la valeur, le range natif invisible prend le doigt. */}
              <span className='relative h-1 flex-1 rounded-full bg-white/20'>
                <span className='absolute inset-y-0 left-0 rounded-full bg-white/85' style={{ width: `${Math.round(volume * 100)}%` }} />
                <input
                  type='range'
                  min={0}
                  max={100}
                  value={Math.round(volume * 100)}
                  onChange={e => {
                    const v = Number(e.target.value) / 100;
                    setLocalVolume(v);
                    sendVolume(v);
                  }}
                  aria-label={t('widgets.media_player.volume')}
                  aria-valuetext={`${Math.round(volume * 100)} %`}
                  className='absolute -inset-y-3 inset-x-0 h-auto w-full cursor-pointer opacity-0'
                />
              </span>
            </label>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
