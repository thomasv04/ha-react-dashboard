import { Plus, Trash2 } from 'lucide-react';
import { EntityPicker } from './EntityPicker';
import { useI18n } from '@/i18n';

/**
 * Liste d'entités éditable — le champ `entity-list` des manifestes.
 *
 * Extrait de `GroupWidgetsTab`, seul endroit où il était implémenté : la modale
 * d'édition principale, elle, laissait ces champs tomber dans son cas par
 * défaut et affichait un tableau d'identifiants dans une zone de texte. Les
 * agendas de la card Agenda, les lumières d'une pièce et les batteries à
 * ignorer étaient donc impossibles à choisir depuis l'écran prévu pour ça.
 */
export function EntityListField({
  label,
  value,
  onChange,
  domain,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  domain?: string;
}) {
  const { t } = useI18n();

  return (
    <div>
      <label className='mb-2 block text-sm font-semibold text-[var(--ds-ink-muted)]'>{label}</label>

      {value.map((entityId, index) => (
        <div key={index} className='mb-2 flex items-center gap-2'>
          {/* `flex-1 min-w-0` : sans lui le sélecteur se réduit à son contenu,
              et sa liste déroulante — calée sur la largeur du déclencheur —
              rognait les identifiants d'entité. */}
          <div className='flex-1 min-w-0'>
            <EntityPicker
              value={entityId}
              onChange={v => onChange(value.map((current, i) => (i === index ? v : current)))}
              domain={domain}
              label=''
            />
          </div>
          <button
            onClick={() => onChange(value.filter((_, i) => i !== index))}
            title={t('common.delete')}
            className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-[var(--ds-alert)]'
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}

      <button
        onClick={() => onChange([...value, ''])}
        className='flex h-11 items-center gap-2 rounded-full bg-[var(--ds-surface-3)] px-4 text-[15px] font-semibold text-[var(--ds-ink)]'
      >
        <Plus size={16} /> {t('layout.addEntityBtn')}
      </button>
    </div>
  );
}
