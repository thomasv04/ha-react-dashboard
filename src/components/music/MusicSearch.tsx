import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { useMassSearch } from '@/hooks/useMusicAssistant';
import type { MassItem, MassMediaType, MassSearchResponse } from '@/lib/music-assistant';
import { useI18n } from '@/i18n';
import { EmptyState, GridSkeleton, ItemGrid, Pill, TrackList } from './MusicItems';

/** Ordre des groupes, et la clé de chacun dans la réponse de `music_assistant.search`. */
const GROUPS: [MassMediaType, keyof MassSearchResponse][] = [
  ['track', 'tracks'],
  ['album', 'albums'],
  ['artist', 'artists'],
  ['playlist', 'playlists'],
  ['radio', 'radio'],
];
/** En vue « Tout » : deux rangées de titres, une rangée de pochettes. */
const PREVIEW: Partial<Record<MassMediaType, number>> = { track: 4 };
const PREVIEW_DEFAULT = 8;

/**
 * Les résultats d'une recherche, groupés par type. « Tout » montre le début de
 * chaque groupe et son « Voir tout » ; une pastille ne garde qu'un type.
 */
export function MusicSearch({
  entryId,
  query,
  onOpen,
  onPlay,
}: {
  entryId: string | null;
  query: string;
  onOpen: (item: MassItem) => void;
  onPlay: (item: MassItem) => void;
}) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<MassMediaType | 'all'>('all');
  const { data, loading, error } = useMassSearch(entryId, query);

  const groups = GROUPS.map(([type, key]) => ({ type, items: data?.[key] ?? [] })).filter(
    g => g.items.length > 0 && (filter === 'all' || g.type === filter)
  );

  return (
    <>
      <div
        role='group'
        aria-label={t('widgets.music.typesLabel')}
        className='mb-6 flex w-fit rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-2)] p-1'
      >
        <Pill active={filter === 'all'} onClick={() => setFilter('all')}>
          {t('widgets.music.all')}
        </Pill>
        {GROUPS.map(([type]) => (
          <Pill key={type} active={filter === type} onClick={() => setFilter(type)}>
            {t(`widgets.music.tabs.${type}`)}
          </Pill>
        ))}
      </div>

      {error ? (
        <EmptyState title={t('widgets.music.error')} hint={error} />
      ) : loading || !data ? (
        <GridSkeleton />
      ) : groups.length === 0 ? (
        <EmptyState title={t('widgets.music.noResults', { query })} hint={t('widgets.music.noResultsHint')} />
      ) : (
        groups.map(({ type, items }) => {
          const limit = filter === 'all' ? (PREVIEW[type] ?? PREVIEW_DEFAULT) : items.length;
          const shown = items.slice(0, limit);
          return (
            <section key={type} className='mb-8'>
              <div className='mb-3 flex items-center justify-between'>
                <h3 className='text-[17px] font-semibold'>{t(`widgets.music.tabs.${type}`)}</h3>
                {items.length > limit && (
                  <button
                    type='button'
                    onClick={() => setFilter(type)}
                    className='flex h-11 items-center gap-1 px-2 text-[15px] font-semibold text-[var(--ds-accent)]'
                  >
                    {t('widgets.music.seeAll')}
                    <ChevronRight size={16} aria-hidden='true' />
                  </button>
                )}
              </div>
              {type === 'track' ? <TrackList items={shown} onPlay={onPlay} /> : <ItemGrid items={shown} onOpen={onOpen} />}
            </section>
          );
        })
      )}
    </>
  );
}
