import { useState } from 'react';
import { GripVertical, X } from 'lucide-react';
import type { FullQueueItem } from '@/hooks/useMusicAssistant';
import { formatMediaTime } from '@/lib/media-player';
import { queueDragShift } from '@/lib/music-assistant';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { MusicCover } from './MusicCover';

/**
 * Les titres à suivre, dans l'ordre (maquette « File d'attente ») : la poignée
 * pour les glisser à une autre place, la croix pour les retirer, un appui pour
 * lancer le titre. Le trait bleu montre où le titre glissé va retomber.
 */
export function MusicQueueList({
  items,
  onPlay,
  onMove,
  onRemove,
}: {
  items: FullQueueItem[];
  /** `position` : la place du titre dans cette liste (0 = le suivant). */
  onPlay: (item: FullQueueItem, position: number) => void;
  onMove: (item: FullQueueItem, shift: number) => void;
  onRemove: (item: FullQueueItem) => void;
}) {
  const { t } = useI18n();
  const [drag, setDrag] = useState<{ index: number; startY: number; dy: number } | null>(null);
  const shift = drag ? queueDragShift(drag.dy, drag.index, items.length) : 0;
  // Le trait se pose au-dessus de la ligne visée (en dessous de la dernière en descendant).
  const target = drag && shift !== 0 ? drag.index + shift + (shift > 0 ? 1 : 0) : null;

  return (
    <ol className='mt-1.5 flex flex-col'>
      {items.map((item, index) => {
        const dragged = drag?.index === index;
        return (
          <li key={item.queue_item_id} className='relative'>
            {target === index && <DropLine />}
            <div
              className={cn(
                'flex h-[76px] items-center gap-3.5 rounded-[18px] px-2',
                dragged && 'relative z-10 -mx-3 bg-[var(--music-raised-2)] px-5 shadow-[0_12px_30px_rgba(0,0,0,0.45)]'
              )}
              style={dragged ? { transform: `translateY(${drag.dy}px)` } : undefined}
            >
              <span
                role='button'
                tabIndex={0}
                aria-label={t('widgets.music.reorder', { name: item.name })}
                className='flex h-[52px] w-10 shrink-0 cursor-grab touch-none items-center justify-center text-[var(--music-dim)]'
                onPointerDown={e => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDrag({ index, startY: e.clientY, dy: 0 });
                }}
                onPointerMove={e => drag?.index === index && setDrag({ ...drag, dy: e.clientY - drag.startY })}
                onPointerUp={() => {
                  if (drag?.index === index && shift !== 0) onMove(item, shift);
                  setDrag(null);
                }}
                onPointerCancel={() => setDrag(null)}
                onKeyDown={e => {
                  // Au clavier : flèches haut et bas, une place à la fois.
                  if (e.key === 'ArrowUp' && index > 0) onMove(item, -1);
                  if (e.key === 'ArrowDown' && index < items.length - 1) onMove(item, 1);
                }}
              >
                <GripVertical size={22} aria-hidden='true' />
              </span>
              <button type='button' onClick={() => onPlay(item, index)} className='flex min-w-0 flex-1 items-center gap-3.5 text-left'>
                <MusicCover image={item.image} name={item.name} type='track' small className='w-14 rounded-[12px]' />
                <span className='min-w-0 flex-1'>
                  <span className='block truncate text-[20px] font-semibold'>{item.name}</span>
                  {item.artists.length > 0 && (
                    <span className='mt-0.5 block truncate text-[16px] text-[var(--ds-ink-muted)]'>{item.artists.join(', ')}</span>
                  )}
                </span>
                {item.duration ? (
                  <span className='w-14 shrink-0 text-right text-[17px] tabular-nums text-[var(--ds-ink-muted)]'>
                    {formatMediaTime(item.duration)}
                  </span>
                ) : null}
              </button>
              <button
                type='button'
                onClick={() => onRemove(item)}
                aria-label={t('widgets.music.removeFromQueue', { name: item.name })}
                className='flex size-[52px] shrink-0 items-center justify-center rounded-full text-[var(--ds-ink-muted)]'
              >
                <X size={22} aria-hidden='true' />
              </button>
            </div>
          </li>
        );
      })}
      {target === items.length && (
        <li className='relative'>
          <DropLine />
        </li>
      )}
    </ol>
  );
}

/** Le trait de la maquette : un point et une ligne bleu clair, là où le titre va tomber. */
function DropLine() {
  return (
    <span aria-hidden='true' className='pointer-events-none absolute inset-x-2 -top-1 z-20 flex items-center'>
      <span className='size-2.5 shrink-0 rounded-full bg-[var(--music-highlight)]' />
      <span className='h-[3px] flex-1 rounded-sm bg-[var(--music-highlight)]' />
    </span>
  );
}
