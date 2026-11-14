import { useState } from 'react';
import { Heart, ListMusic, Music, Radio, type LucideIcon } from 'lucide-react';
import { useHaUrl } from '@/hooks/useHaUrl';
import { monogram, monogramHue, type MassMediaType } from '@/lib/music-assistant';
import { cn } from '@/lib/utils';

const FALLBACK_ICON: Partial<Record<MassMediaType, LucideIcon>> = { playlist: ListMusic, radio: Radio };

/**
 * Pochette d'un élément MA. Sans image : un monogramme coloré pour un artiste
 * (MA a rarement sa photo), une icône du type pour le reste.
 */
export function MusicCover({
  image,
  name,
  type,
  favorite,
  small,
  className,
}: {
  image?: string | null;
  name: string;
  type: MassMediaType;
  favorite?: boolean;
  /** Vignette d'une rangée : monogramme et icône plus petits. */
  small?: boolean;
  className?: string;
}) {
  const resolveUrl = useHaUrl();
  const url = resolveUrl(image ?? undefined);
  // Une pochette qui ne charge pas (lien mort chez le fournisseur) retombe sur l'icône.
  const [failed, setFailed] = useState<string>();
  const src = url && url !== failed ? url : undefined;
  const round = type === 'artist';
  const Icon = FALLBACK_ICON[type] ?? Music;

  return (
    <span
      className={cn(
        'relative flex aspect-square w-full shrink-0 items-center justify-center overflow-hidden bg-[var(--ds-surface-3)]',
        round ? 'rounded-full' : 'rounded-[18px]',
        className
      )}
      style={!src && round ? { background: `hsl(${monogramHue(name)} 32% 34%)` } : undefined}
    >
      {src ? (
        <img src={src} alt='' loading='lazy' onError={() => setFailed(src)} className='size-full object-cover' />
      ) : round ? (
        <span className={cn('font-bold text-white', small ? 'text-sm' : 'text-4xl')}>{monogram(name)}</span>
      ) : (
        <Icon size={small ? 18 : 32} aria-hidden='true' className='text-[var(--ds-ink-muted)]' />
      )}
      {/* Le voile clair en biais des pochettes de la maquette. */}
      {src && !round && (
        <span
          aria-hidden='true'
          className='pointer-events-none absolute inset-0 bg-[linear-gradient(155deg,rgba(255,255,255,0.14),rgba(0,0,0,0.18))]'
        />
      )}
      {favorite && (
        <span className='absolute bottom-2.5 right-2.5 flex size-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--ds-ground)_66%,transparent)]'>
          <Heart size={20} aria-hidden='true' className='fill-[#ff6b8b] text-[#ff6b8b]' />
        </span>
      )}
    </span>
  );
}
