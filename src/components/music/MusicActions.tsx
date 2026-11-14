import { useState } from 'react';
import { AudioLines, ChevronLeft, ChevronRight, ListEnd, ListPlus, Play, Speaker, X, type LucideIcon } from 'lucide-react';
import { useHass } from '@hakit/core';
import { friendlyName } from '@/lib/ha-service';
import { isMassPlayer, itemSubtitle, type MassEnqueue, type MassItem } from '@/lib/music-assistant';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { MusicCover } from './MusicCover';

/**
 * Fenêtre centrée des maquettes « Actions sur un élément » et « Lire sur… » :
 * 560 px, surface surélevée, voile sombre derrière ; un appui à côté la ferme.
 */
function MusicDialog({ label, onClose, children }: { label: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div
      className='fixed inset-0 z-[70] flex items-center justify-center bg-[color-mix(in_srgb,var(--ds-ground)_76%,transparent)] p-4'
      onClick={onClose}
    >
      <div
        role='dialog'
        aria-modal='true'
        aria-label={label}
        onClick={e => e.stopPropagation()}
        className='w-full max-w-[560px] overflow-hidden rounded-[32px] bg-[var(--music-raised)] shadow-[0_30px_80px_rgba(0,0,0,0.6)]'
      >
        {children}
      </div>
    </div>
  );
}

function RoundButton({ label, onClick, icon: Icon }: { label: string; onClick: () => void; icon: LucideIcon }) {
  return (
    <button
      type='button'
      onClick={onClick}
      aria-label={label}
      className='flex size-[52px] shrink-0 items-center justify-center rounded-full bg-[var(--music-raised-2)]'
    >
      <Icon size={20} aria-hidden='true' />
    </button>
  );
}

function DialogHeader({
  title,
  subtitle,
  big,
  onBack,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  /** Titre d'un écran (« Lire sur… ») plutôt que nom d'un élément. */
  big?: boolean;
  onBack?: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}) {
  const { t } = useI18n();
  return (
    <>
      <div className='flex items-center gap-[18px] px-[22px] pb-[18px] pt-[22px]'>
        {onBack && <RoundButton label={t('widgets.music.back')} onClick={onBack} icon={ChevronLeft} />}
        {children}
        <div className='min-w-0 flex-1'>
          <p className={cn('truncate font-semibold', big ? 'text-[26px]' : 'text-[24px]')}>{title}</p>
          {subtitle && <p className='truncate text-[17px] text-[var(--ds-ink-muted)]'>{subtitle}</p>}
        </div>
        <RoundButton label={t('common.close')} onClick={onClose} icon={X} />
      </div>
      <div className='mx-[22px] h-px bg-[var(--music-raised-2)]' />
    </>
  );
}

function ActionRow({
  icon: Icon,
  onClick,
  children,
  end,
}: {
  icon: LucideIcon;
  onClick: () => void;
  children: React.ReactNode;
  end?: React.ReactNode;
}) {
  return (
    <button type='button' onClick={onClick} className='flex h-[68px] w-full items-center gap-[18px] rounded-[18px] px-4 text-left'>
      <Icon size={28} aria-hidden='true' className='shrink-0' />
      <span className='min-w-0 flex-1 truncate text-[21px] font-medium'>{children}</span>
      {end}
    </button>
  );
}

/** Les lecteurs Music Assistant, avec leur état ; un lecteur hors ligne ne se choisit pas. */
function PlayerList({ current, onPick }: { current: string; onPick: (entityId: string) => void }) {
  const { t } = useI18n();
  const entities = useHass(s => s.entities) as Record<string, { state: string; attributes?: Record<string, unknown> }>;
  const players = Object.entries(entities)
    .filter(([id, e]) => id.startsWith('media_player.') && isMassPlayer(e))
    .map(([id, e]) => ({ id, e, name: friendlyName(e) ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className='flex max-h-[60vh] flex-col gap-0.5 overflow-y-auto px-3 pb-3.5 pt-2.5'>
      {players.map(({ id, e, name }) => {
        const offline = e.state === 'unavailable';
        const title = e.attributes?.media_title;
        const status = offline
          ? t('widgets.music.playerOffline')
          : e.state === 'playing'
            ? typeof title === 'string'
              ? t('widgets.music.playerPlaying', { title })
              : t('widgets.music.playerPlayingShort')
            : t('widgets.music.playerAvailable');
        return (
          <button
            key={id}
            type='button'
            onClick={() => onPick(id)}
            disabled={offline}
            aria-current={id === current || undefined}
            className={cn(
              'flex h-[72px] w-full shrink-0 items-center gap-4 rounded-[18px] px-4 text-left disabled:opacity-45',
              id === current && 'bg-[var(--music-highlight-soft)]'
            )}
          >
            <span className='flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--music-raised-2)]'>
              <Speaker size={24} aria-hidden='true' />
            </span>
            <span className='min-w-0 flex-1'>
              <span className='block truncate text-[21px] font-semibold'>{name}</span>
              <span className='mt-px block truncate text-[16px] text-[var(--ds-ink-muted)]'>{status}</span>
            </span>
            {e.state === 'playing' && <AudioLines size={24} aria-hidden='true' className='shrink-0 text-[var(--music-highlight)]' />}
          </button>
        );
      })}
    </div>
  );
}

/** Choisir l'enceinte de l'appli, sans rien lancer. */
export function PlayerPicker({ current, onPick, onClose }: { current: string; onPick: (entityId: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  return (
    <MusicDialog label={t('widgets.music.choosePlayer')} onClose={onClose}>
      <DialogHeader big title={t('widgets.music.choosePlayer')} onClose={onClose} />
      <PlayerList
        current={current}
        onPick={id => {
          onPick(id);
          onClose();
        }}
      />
    </MusicDialog>
  );
}

/**
 * Les actions d'un élément : le lancer tout de suite, juste après le titre en
 * cours, en fin de file, ou sur une autre enceinte — qui devient alors celle
 * de l'appli. « Ajouter aux favoris » de la maquette n'y est pas : HA n'expose
 * aucun service pour marquer un élément quelconque en favori.
 */
export function MusicActions({
  item,
  player,
  onPlay,
  onPlayerChange,
  onClose,
}: {
  item: MassItem;
  player: string;
  onPlay: (item: MassItem, enqueue: MassEnqueue, target: string) => void;
  onPlayerChange: (entityId: string) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [view, setView] = useState<'menu' | 'players'>('menu');
  const playerName = useHass(s => friendlyName(s.entities[player]) ?? player);
  const run = (enqueue: MassEnqueue, target = player) => {
    onPlay(item, enqueue, target);
    onClose();
  };
  const subtitle = itemSubtitle(item, t);

  return (
    <MusicDialog label={item.name} onClose={onClose}>
      {view === 'menu' ? (
        <>
          <DialogHeader title={item.name} subtitle={subtitle} onClose={onClose}>
            <MusicCover image={item.image} name={item.name} type={item.media_type} small className='w-[76px] rounded-[16px]' />
          </DialogHeader>
          <div className='flex flex-col gap-0.5 px-3 pb-3.5 pt-2.5'>
            <ActionRow icon={Play} onClick={() => run('play')}>
              {t('widgets.music.playNow')}
            </ActionRow>
            <ActionRow icon={ListPlus} onClick={() => run('next')}>
              {t('widgets.music.playNext')}
            </ActionRow>
            <ActionRow icon={ListEnd} onClick={() => run('add')}>
              {t('widgets.music.addToQueue')}
            </ActionRow>
            <div className='mx-4 my-1 h-px bg-[var(--music-raised-2)]' />
            <ActionRow
              icon={Speaker}
              onClick={() => setView('players')}
              end={
                <span className='flex shrink-0 items-center gap-1.5 text-[18px] font-medium text-[var(--ds-ink-muted)]'>
                  {playerName}
                  <ChevronRight size={22} aria-hidden='true' />
                </span>
              }
            >
              {t('widgets.music.playOn')}
            </ActionRow>
          </div>
        </>
      ) : (
        <>
          <DialogHeader
            big
            title={t('widgets.music.playOn')}
            subtitle={[item.name, subtitle].filter(Boolean).join(' · ')}
            onBack={() => setView('menu')}
            onClose={onClose}
          />
          <PlayerList
            current={player}
            onPick={id => {
              onPlayerChange(id);
              run('play', id);
            }}
          />
        </>
      )}
    </MusicDialog>
  );
}
