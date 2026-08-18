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
      <label className='text-[11px] text-white/40 mb-1 block'>{label}</label>

      {value.map((entityId, index) => (
        <div key={index} className='flex items-center gap-1 mb-1'>
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
            className='p-1 text-red-400/50 hover:text-red-400'
          >
            <Trash2 size={11} />
          </button>
        </div>
      ))}

      <button onClick={() => onChange([...value, ''])} className='flex items-center gap-1 text-[11px] text-blue-400/60 hover:text-blue-400'>
        <Plus size={11} /> {t('layout.addEntityBtn')}
      </button>
    </div>
  );
}
