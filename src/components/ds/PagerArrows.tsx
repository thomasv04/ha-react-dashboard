import { ChevronLeft, ChevronRight, MoreVertical } from 'lucide-react';

/**
 * Précédent / suivant accolés et menu ⋮ à part, posés sur une photo (cadre
 * photo, veille). Couleur fixe : le fond est l'image, pas le thème.
 */
export function PagerArrows({
  onPrev,
  onNext,
  onMore,
  labels,
}: {
  onPrev: () => void;
  onNext: () => void;
  onMore?: () => void;
  labels: { prev: string; next: string; more?: string };
}) {
  const base = 'flex h-[52px] items-center justify-center bg-[var(--ds-control)] text-[var(--ds-control-ink)] active:brightness-125';
  return (
    <div className='flex items-center'>
      <button onClick={onPrev} aria-label={labels.prev} title={labels.prev} className={`${base} w-[60px] rounded-[26px_16px_16px_26px]`}>
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={onNext}
        aria-label={labels.next}
        title={labels.next}
        className={`${base} ml-[var(--ds-space-1)] w-[60px] rounded-[16px_26px_26px_16px]`}
      >
        <ChevronRight size={20} />
      </button>
      {onMore && labels.more && (
        <button onClick={onMore} aria-label={labels.more} title={labels.more} className={`${base} ml-2.5 w-8 rounded-2xl`}>
          <MoreVertical size={16} />
        </button>
      )}
    </div>
  );
}
