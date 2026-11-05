import { cn } from '@/lib/utils';

/**
 * Gabarit des onglets de la fiche d'édition d'un widget — celui de l'onglet
 * Configuration, repris par tous : chaque réglage dans une section arrondie,
 * libellé en gras, champs et pastilles à la taille du doigt.
 */

/** Une section de réglage, sur le fond bleu de la feuille. */
export const FIELD_CARD = 'rounded-[var(--ds-radius-xl)] bg-[var(--ds-sheet-section)] p-4';
/** Un bloc imbriqué dans une section (une condition dans une règle…). */
export const NESTED_CARD = 'rounded-[var(--ds-radius-lg)] bg-[var(--ds-sheet)] p-3';
export const SECTION_TITLE = 'text-base font-semibold';
export const INTRO = 'text-sm leading-relaxed text-[var(--ds-ink-muted)]';
export const LABEL = 'mb-2 block text-sm font-semibold text-[var(--ds-ink-muted)]';
export const INPUT =
  'h-12 w-full rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-4 text-base text-[var(--ds-ink)] outline-none placeholder:text-[var(--ds-ink-muted)] focus:outline-2 focus:outline-[var(--ds-accent)]';
/** « + Ajouter… » */
export const ADD_BUTTON = 'flex h-11 items-center gap-2 self-start rounded-full bg-[var(--ds-surface-3)] px-5 text-[15px] font-semibold';
export const ROUND = 'flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)]';

/** Une pastille de choix, comme les onglets de la fiche. */
export const chip = (on: boolean) =>
  cn(
    'h-11 rounded-full px-4 text-[15px] font-semibold',
    on ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
  );
