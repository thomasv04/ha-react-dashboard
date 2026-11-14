import { Music, Pause, Play, SkipForward, Speaker } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useMoreInfoOptional } from '@/context/MoreInfoContext';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useHaUrl } from '@/hooks/useHaUrl';
import { useNow } from '@/hooks/useNow';
import { callHAService, friendlyName } from '@/lib/ha-service';
import { interpolatePosition, isMediaOff, supportsMedia } from '@/lib/media-player';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

const text = (v: unknown) => (typeof v === 'string' && v ? v : undefined);

/**
 * Le mini-lecteur de la maquette « Mini-lecteur — états » : collé en bas de
 * l'appli, au-dessus d'un fondu vers le fond. Un appui sur la barre ouvre le
 * lecteur plein écran. Rien à montrer (lecteur éteint, rien de chargé) : pas de
 * barre.
 *
 * Sur un téléphone (maquette « Mini-lecteur — états » du téléphone), elle
 * est plus basse, posée au-dessus de la barre d'onglets, et l'enceinte passe
 * dans la seconde ligne.
 *
 * Une radio n'a pas de durée : « En direct » remplace la progression, et le
 * titre suivant est grisé.
 */
export function MusicMiniPlayer({ entityId }: { entityId: string }) {
  const { t } = useI18n();
  const helpers = useHass(s => s.helpers);
  const moreInfo = useMoreInfoOptional();
  const entity = useSafeEntity(entityId);
  const resolveUrl = useHaUrl();
  const attrs = (entity?.attributes ?? {}) as Record<string, unknown>;
  const playing = entity?.state === 'playing';
  const now = useNow(playing).getTime();

  const title = text(attrs.media_title);
  if (!entity || isMediaOff(entity.state) || !title) return null;

  const artist = text(attrs.media_artist);
  const cover = resolveUrl(text(attrs.entity_picture));
  const duration = typeof attrs.media_duration === 'number' ? attrs.media_duration : 0;
  const live = duration <= 0;
  const progress = live ? 0 : Math.min(1, interpolatePosition(attrs, playing, now) / duration);
  // Une enceinte qui en a joint d'autres : « Salon + 2 ». Un groupe défini dans MA (« Maison ») se
  // nomme déjà lui-même.
  const members = attrs.mass_player_type !== 'group' && Array.isArray(attrs.group_members) ? attrs.group_members.length : 0;
  const name = friendlyName(entity) ?? entityId;
  const speaker = members > 1 ? `${name} + ${members - 1}` : name;
  const canNext = !live && supportsMedia(attrs.supported_features, 'NEXT_TRACK');
  const call = (service: string) => callHAService(helpers, 'media_player', service, { entity_id: entityId });

  return (
    <>
      {/* Le fondu sous la barre : la grille s'efface au lieu de passer dessous en net. */}
      <div
        aria-hidden='true'
        className='pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[190px] max-sm:h-[220px] bg-[linear-gradient(color-mix(in_srgb,var(--ds-ground)_0%,transparent),var(--ds-ground)_72%)]'
      />
      <div
        data-testid='music-mini-player'
        className='fixed inset-x-10 bottom-7 z-20 flex h-24 items-center overflow-hidden rounded-[28px] max-sm:inset-x-2 max-sm:bottom-[calc(env(safe-area-inset-bottom)+100px)] max-sm:h-16 max-sm:rounded-[20px] bg-[var(--music-raised)] shadow-[0_18px_50px_rgba(0,0,0,0.55),inset_0_0_0_1px_rgba(255,255,255,0.07)]'
      >
        <button
          type='button'
          onClick={() => moreInfo?.openMoreInfo(entityId, 'media_player', entityId)}
          aria-label={t('widgets.music.openPlayer')}
          className='flex h-full min-w-0 flex-1 items-center gap-[18px] pl-3 pr-5 text-left max-sm:gap-3 max-sm:pl-2 max-sm:pr-1'
        >
          <span className='flex size-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-[var(--ds-surface-3)] max-sm:size-12 max-sm:rounded-[12px]'>
            {cover ? (
              <img src={cover} alt='' className='size-full object-cover' />
            ) : (
              <Music size={30} strokeWidth={1.8} aria-hidden='true' className='text-[var(--ds-ink-muted)]' />
            )}
          </span>
          <span className='flex min-w-0 flex-1 flex-col gap-[3px] max-sm:gap-0.5'>
            <span className='truncate text-[21px] font-semibold max-sm:text-[15px]'>{title}</span>
            {/* Téléphone : l'enceinte et l'artiste sur une ligne. */}
            <span className='flex min-w-0 items-center gap-1.5 text-[13px] text-[var(--ds-ink-muted)] sm:hidden'>
              {live ? (
                <span aria-hidden='true' className='size-2 shrink-0 rounded-full bg-[var(--music-love)]' />
              ) : (
                <Speaker size={12} aria-hidden='true' className='shrink-0' />
              )}
              <span className='truncate'>{[speaker, live ? t('widgets.music.live') : artist].filter(Boolean).join(' · ')}</span>
            </span>
            {live ? (
              <span className='flex items-center gap-2 text-[16px] text-[var(--ds-ink-muted)] max-sm:hidden'>
                <span aria-hidden='true' className='size-2.5 rounded-full bg-[var(--music-love)]' />
                {t('widgets.music.live')}
              </span>
            ) : (
              artist && <span className='truncate text-[16px] text-[var(--ds-ink-muted)] max-sm:hidden'>{artist}</span>
            )}
          </span>
          <span className='flex h-11 shrink-0 items-center gap-2.5 rounded-[22px] bg-[var(--music-raised-2)] px-[18px] text-[17px] font-semibold max-sm:hidden'>
            <Speaker size={20} aria-hidden='true' />
            {speaker}
          </span>
        </button>
        <div className='flex shrink-0 items-center gap-3.5 pr-6 max-sm:gap-2 max-sm:pr-2.5'>
          <button
            type='button'
            onClick={() => call('media_play_pause')}
            aria-label={t(playing ? 'widgets.media_player.pause' : 'widgets.media_player.play')}
            className='flex size-16 items-center justify-center rounded-full bg-[var(--ds-ink)] text-[var(--ds-ground)] max-sm:size-11'
          >
            {playing ? (
              <Pause size={28} strokeWidth={3.4} aria-hidden='true' className='max-sm:size-5' />
            ) : (
              <Play size={28} aria-hidden='true' className='ml-0.5 fill-current max-sm:size-5' />
            )}
          </button>
          <button
            type='button'
            onClick={() => call('media_next_track')}
            disabled={!canNext}
            aria-label={t('widgets.media_player.next')}
            className={cn(
              'flex size-14 items-center justify-center rounded-full bg-[var(--music-raised-2)] max-sm:size-10',
              !canNext && 'opacity-[0.38]'
            )}
          >
            <SkipForward size={22} aria-hidden='true' className='fill-current max-sm:size-4' />
          </button>
        </div>
        {!live && (
          <div aria-hidden='true' className='absolute inset-x-0 bottom-0 h-1 bg-white/[0.14] max-sm:h-[3px]'>
            <div className='h-full bg-[var(--music-highlight)]' style={{ width: `${progress * 100}%` }} />
          </div>
        )}
      </div>
    </>
  );
}
