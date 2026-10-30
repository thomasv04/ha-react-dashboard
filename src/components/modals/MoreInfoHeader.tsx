import type { LucideIcon } from 'lucide-react';

interface MoreInfoHeaderProps {
  icon: LucideIcon;
  name: string;
  state: string;
  unit?: string;
  /** Teinte de l'icône. */
  stateColor?: string;
  /** Optional image URL (e.g. person avatar) */
  image?: string;
}

/**
 * En-tête du panneau d'appareil : le nom centré en gras, l'état dessous. Le
 * bouton de fermeture de la coque occupe le coin droit — la marge gauche le
 * compense pour que le titre reste au milieu.
 */
export function MoreInfoHeader({ icon: Icon, name, state, unit, stateColor, image }: MoreInfoHeaderProps) {
  return (
    <div className='mb-5 flex flex-col items-center gap-2 px-12 text-center'>
      {image ? (
        <img src={image} alt={name} className='size-16 rounded-full object-cover' />
      ) : (
        <Icon size={28} aria-hidden='true' style={{ color: stateColor }} className='text-[var(--ds-ink-muted)]' />
      )}
      <div className='min-w-0 max-w-full'>
        <h2 className='truncate text-[22px] font-bold leading-tight'>{name}</h2>
        <p className='text-[15px] font-semibold text-[var(--ds-ink-muted)]'>
          {state}
          {unit && ` ${unit}`}
        </p>
      </div>
    </div>
  );
}
