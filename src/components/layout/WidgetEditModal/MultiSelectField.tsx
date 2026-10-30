import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

/**
 * Choix multiple sous forme de pastilles.
 *
 * Sorti de la modale d'édition pour que l'éditeur de widgets embarqués (groupes
 * et blocs de panneau) s'en serve aussi : il n'en avait pas et rendait un champ
 * texte à la place, dans lequel on ne pouvait rien saisir d'utile.
 */
export function MultiSelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string; icon?: string }[];
  /** Tout coché par défaut : c'est ce qu'attend un champ que l'on vient d'ajouter. */
  value?: string[];
  onChange: (next: string[]) => void;
}) {
  const { t } = useI18n();
  const current = value ?? options.map(o => o.value);

  return (
    <div>
      <label className='mb-2 block text-sm font-semibold text-[var(--ds-ink-muted)]'>{label}</label>
      <div className='flex flex-wrap gap-2'>
        {options.map(opt => {
          const active = current.includes(opt.value);
          return (
            <button
              key={opt.value}
              type='button'
              onClick={() => onChange(active ? current.filter(v => v !== opt.value) : [...current, opt.value])}
              className={cn(
                'flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors',
                active ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
              )}
            >
              {opt.icon && <span>{opt.icon}</span>}
              {t(opt.label)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
