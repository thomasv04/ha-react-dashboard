import { useEffect, useState } from 'react';
import { Check, Volume2 } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { callHAService, friendlyName } from '@/lib/ha-service';
import { groupVolume, shiftVolumes } from '@/lib/music-assistant';
import { cn } from '@/lib/utils';
import { PillSlider } from '@/components/ds/PillSlider';
import { useI18n } from '@/i18n';

type Entity = { state: string; attributes?: Record<string, unknown> };

const volumeOf = (e: Entity | undefined) => (typeof e?.attributes?.volume_level === 'number' ? e.attributes.volume_level : 0);
const membersOf = (e: Entity | undefined) =>
  Array.isArray(e?.attributes?.group_members)
    ? (e.attributes.group_members as unknown[]).filter((m): m is string => typeof m === 'string')
    : [];

/**
 * Les enceintes Music Assistant et le groupe de l'appli (maquette « Enceintes
 * — choix et groupe »). L'enceinte de l'appli mène le groupe : cocher une
 * autre enceinte la joint (`media_player.join`), la décocher l'en retire
 * (`unjoin`). Chaque enceinte a son volume ; celui du groupe décale toutes
 * les enceintes d'autant, en gardant l'écart entre elles.
 *
 * Seuls les lecteurs MA simples se groupent : un groupe MA déjà défini
 * (« Maison ») a ses membres fixés dans Music Assistant.
 */
export function MusicSpeakers({ player, onDone }: { player: string; onDone: () => void }) {
  const { t } = useI18n();
  const helpers = useHass(s => s.helpers);
  const entities = useHass(s => s.entities) as Record<string, Entity>;

  // HA liste le meneur en premier : si l'enceinte de l'appli suit un autre groupe, c'est lui qui mène.
  const leader = membersOf(entities[player])[0] ?? player;
  const group = [leader, ...membersOf(entities[leader]).filter(id => id !== leader)];
  const speakers = Object.entries(entities)
    .filter(([id, e]) => id.startsWith('media_player.') && e.attributes?.mass_player_type === 'player')
    .map(([id, e]) => ({ id, e, name: friendlyName(e) ?? id }))
    .sort((a, b) => Number(b.id === leader) - Number(a.id === leader) || a.name.localeCompare(b.name));

  // Le curseur suit le doigt ; HA reprend la main dès qu'il publie un nouveau volume.
  const [local, setLocal] = useState<Record<string, number>>({});
  const haVolumes = speakers.map(s => `${s.id}=${volumeOf(s.e)}`).join(',');
  useEffect(() => setLocal({}), [haVolumes]);
  const volume = (id: string) => local[id] ?? volumeOf(entities[id]);
  const send = useDebouncedCallback((volumes: Record<string, number>) => {
    for (const [id, v] of Object.entries(volumes))
      callHAService(helpers, 'media_player', 'volume_set', { entity_id: id }, { volume_level: v });
  }, 150);
  const setVolumes = (volumes: Record<string, number>) => {
    setLocal(l => ({ ...l, ...volumes }));
    send(volumes);
  };

  const toggle = (id: string) =>
    group.includes(id)
      ? callHAService(helpers, 'media_player', 'unjoin', { entity_id: id })
      : callHAService(helpers, 'media_player', 'join', { entity_id: leader }, { group_members: [id] });
  const ungroupAll = () => group.slice(1).forEach(id => callHAService(helpers, 'media_player', 'unjoin', { entity_id: id }));

  const groupVolumes = group.map(volume);
  const names = group.map(id => friendlyName(entities[id]) ?? id);

  const status = (id: string, e: Entity) => {
    if (e.state === 'unavailable') return t('widgets.music.playerOffline');
    if (id === leader) return t(e.state === 'playing' ? 'widgets.music.leaderPlaying' : 'widgets.music.leader');
    if (group.includes(id)) return t('widgets.music.inGroup');
    return t(e.state === 'playing' ? 'widgets.music.playerPlayingShort' : 'widgets.music.inactive');
  };

  return (
    <div className='mt-9 grid items-start gap-10 lg:grid-cols-[1fr_500px]' data-testid='music-speakers'>
      <section className='min-w-0'>
        <h3 className='mb-3.5 text-[22px] font-semibold'>{t('widgets.music.speakersToGroup')}</h3>
        <ul className='flex flex-col gap-3'>
          {speakers.map(({ id, e, name }) => {
            const offline = e.state === 'unavailable';
            const checked = group.includes(id);
            return (
              <li key={id} className='flex h-[92px] items-center gap-5 rounded-[24px] bg-[var(--ds-surface-2)] px-6'>
                <button
                  type='button'
                  role='checkbox'
                  aria-checked={checked}
                  aria-label={name}
                  onClick={() => toggle(id)}
                  disabled={offline || id === leader}
                  className={cn(
                    'flex size-11 shrink-0 items-center justify-center rounded-[14px]',
                    checked
                      ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]'
                      : offline
                        ? 'shadow-[inset_0_0_0_2px_var(--music-raised-2)]'
                        : 'shadow-[inset_0_0_0_2px_var(--music-dim)]'
                  )}
                >
                  {checked && <Check size={26} strokeWidth={3} aria-hidden='true' />}
                </button>
                <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
                  <span className={cn('truncate text-[24px] font-semibold', offline && 'text-[var(--music-dim)]')}>{name}</span>
                  <span className='truncate text-[17px] text-[var(--ds-ink-muted)]'>{status(id, e)}</span>
                </span>
                {!offline && (
                  <>
                    <PillSlider
                      value={Math.round(volume(id) * 100)}
                      onChange={v => setVolumes({ [id]: v / 100 })}
                      label={t('widgets.music.volumeOf', { name })}
                      valueText={`${Math.round(volume(id) * 100)} %`}
                      icon={Volume2}
                      track='var(--music-track)'
                      className='h-12 w-[380px] shrink rounded-[24px]'
                    />
                    <span className='w-12 shrink-0 text-right text-[20px] font-semibold tabular-nums'>{Math.round(volume(id) * 100)}</span>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <aside className='flex flex-col rounded-[32px] bg-[var(--ds-surface-2)] p-8'>
        <span className='text-[16px] font-semibold uppercase text-[var(--ds-ink-muted)]'>{t('widgets.music.currentGroup')}</span>
        <span className='mt-2.5 text-[30px] font-semibold'>{names.join(', ')}</span>
        <span className='mt-2 text-[17px] text-[var(--ds-ink-muted)]'>
          {group.length > 1 ? t('widgets.music.groupSize', { count: group.length }) : t('widgets.music.groupAlone')}
        </span>
        <span className='mt-8 text-[20px] font-semibold'>{t('widgets.music.groupVolume')}</span>
        <div className='mt-3.5 flex items-center gap-4'>
          <PillSlider
            value={groupVolume(groupVolumes)}
            onChange={v => {
              const next = shiftVolumes(groupVolumes, v);
              setVolumes(Object.fromEntries(group.map((id, i) => [id, next[i]])));
            }}
            label={t('widgets.music.groupVolume')}
            valueText={`${groupVolume(groupVolumes)} %`}
            icon={Volume2}
            track='var(--music-track)'
            className='h-[72px] flex-1 rounded-[36px]'
          />
          <span className='w-10 text-right text-[28px] font-semibold tabular-nums'>{groupVolume(groupVolumes)}</span>
        </div>
        {group.length > 1 && <p className='mt-3.5 text-[16px] text-[var(--ds-ink-muted)]'>{t('widgets.music.groupVolumeHint')}</p>}
        <div className='mt-8 flex flex-col gap-3'>
          <button
            type='button'
            onClick={onDone}
            className='flex h-16 items-center justify-center rounded-[32px] bg-[var(--ds-tile-on)] text-[20px] font-semibold text-[var(--ds-tile-on-ink)]'
          >
            {t('widgets.music.done')}
          </button>
          <button
            type='button'
            onClick={ungroupAll}
            disabled={group.length < 2}
            className='flex h-16 items-center justify-center rounded-[32px] bg-[var(--ds-surface-3)] text-[20px] font-semibold disabled:opacity-40'
          >
            {t('widgets.music.ungroupAll')}
          </button>
        </div>
      </aside>
    </div>
  );
}
