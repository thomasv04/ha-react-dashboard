/** Tuile Echo d'un bouton de modale : libellé en haut, icône en bas ; bleue quand il est principal. */
export function buttonTileClass(primary: boolean) {
  return `flex h-full min-h-[120px] w-full flex-col items-start justify-between gap-3 rounded-[var(--ds-radius-lg)] p-4 text-left text-[17px] font-semibold ${
    primary ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-2)] text-[var(--ds-ink)]'
  }`;
}
