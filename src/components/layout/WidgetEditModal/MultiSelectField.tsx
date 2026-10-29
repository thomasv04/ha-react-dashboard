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
      <label className='text-[11px] text-[var(--ds-ink-muted)] mb-2 block'>{label}</label>
      <div className='flex flex-wrap gap-1.5'>
        {options.map(opt => {
          const active = current.includes(opt.value);
          return (
            <button
              key={opt.value}
              type='button'
              onClick={() => onChange(active ? current.filter(v => v !== opt.value) : [...current, opt.value])}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--ds-radius-md)] text-xs font-medium border transition-all',
                active
                  ? 'bg-[var(--ds-tile-on)] border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                  : 'bg-[var(--ds-surface-2)] border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
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
