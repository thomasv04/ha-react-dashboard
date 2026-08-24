import { cn } from '@/lib/utils';

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
  const current = value ?? options.map(o => o.value);

  return (
    <div>
      <label className='text-[11px] text-white/40 mb-2 block'>{label}</label>
      <div className='flex flex-wrap gap-1.5'>
        {options.map(opt => {
          const active = current.includes(opt.value);
          return (
            <button
              key={opt.value}
              type='button'
              onClick={() => onChange(active ? current.filter(v => v !== opt.value) : [...current, opt.value])}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                active
                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                  : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
              )}
            >
              {opt.icon && <span>{opt.icon}</span>}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
