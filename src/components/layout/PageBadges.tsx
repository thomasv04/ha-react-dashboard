import { useRef, useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useI18n } from '@/i18n';
import { usePages } from '@/context/PageContext';
import { useEditMode } from '@/context/DashboardLayoutContext';
import { useEntities } from '@/hooks/useEntities';
import { useMoreInfo } from '@/context/MoreInfoContext';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { resolveIcon, useIconCatalog } from '@/lib/lucide-icon-map';
import { MORE_INFO_COMPONENTS } from '@/components/modals/more-info-registry';

/** Domaines dont le nom diffère de la clé du registre de modales. */
const DOMAIN_TO_MODAL: Record<string, string> = {
  climate: 'thermostat',
  binary_sensor: 'sensor',
  switch: 'sensor',
  input_boolean: 'sensor',
};

function modalTypeFor(entityId: string): string {
  const mapped = DOMAIN_TO_MODAL[entityId.split('.')[0]] ?? entityId.split('.')[0];
  return mapped in MORE_INFO_COMPONENTS ? mapped : 'sensor';
}

/**
 * Rend l'icône d'une pastille.
 *
 * Hors composant : `resolveIcon` *fabrique* un composant, et l'appeler pendant
 * le rendu en créerait un nouveau type à chaque passe — React remonterait le
 * sous-arbre à chaque changement d'état.
 */
function renderBadgeIcon(icon: string | undefined) {
  if (!icon) return null;
  const Icon = resolveIcon(icon);
  return Icon ? <Icon size={12} /> : null;
}

/** Une pastille : icône, nom court, état. */
function Badge({ entityId, state, attributes }: { entityId: string; state?: string; attributes?: Record<string, unknown> }) {
  const { openMoreInfo } = useMoreInfo();
  const ref = useRef<HTMLButtonElement>(null);

  const iconNode = renderBadgeIcon(attributes?.icon as string | undefined);
  const name = (attributes?.friendly_name as string) ?? entityId;
  const unit = attributes?.unit_of_measurement as string | undefined;

  // Un état absent veut dire que Home Assistant n'a pas (encore) l'entité : on
  // l'affiche grisée plutôt que de la faire disparaître, sinon l'utilisateur ne
  // saurait pas que sa pastille pointe dans le vide.
  const missing = state === undefined;

  return (
    <button
      ref={ref}
      onClick={() => openMoreInfo(entityId, modalTypeFor(entityId), entityId, ref.current?.getBoundingClientRect() ?? null)}
      title={name}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs transition-colors cursor-pointer ${
        missing
          ? 'bg-white/3 border-white/8 text-white/25'
          : 'bg-white/8 border-white/12 text-white/70 hover:bg-white/14 hover:text-white'
      }`}
    >
      {iconNode}
      <span className='max-w-[9rem] truncate'>{name}</span>
      <span className='font-medium tabular-nums'>
        {state ?? '—'}
        {unit ? ` ${unit}` : ''}
      </span>
    </button>
  );
}

/**
 * Rangée de pastilles d'état en haut d'une page — l'équivalent des badges de
 * Home Assistant (2024.8).
 *
 * Ce qu'une card ne fait pas bien : montrer d'un coup d'œil une poignée
 * d'entités hétéroclites (présence, batteries faibles, alarme) sans leur
 * consacrer une case de la grille chacune.
 *
 * Les badges appartiennent à la page, donc à la configuration du dashboard :
 * ils suivent l'export, l'historique et la restauration comme le reste.
 */
export function PageBadges() {
  useIconCatalog();
  const { t } = useI18n();
  const { currentPage, updatePage } = usePages();
  const { isEditMode } = useEditMode();
  const [adding, setAdding] = useState(false);

  const badges = currentPage?.badges ?? [];
  const entities = useEntities(badges);

  // Hors édition, une page sans badge n'occupe aucune place.
  if (!currentPage || (badges.length === 0 && !isEditMode)) return null;

  const set = (next: string[]) => updatePage(currentPage.id, { badges: next.length ? next : undefined });

  return (
    <div className='flex flex-wrap items-center gap-1.5 mb-3'>
      {badges.map(entityId => (
        <div key={entityId} className='relative'>
          <Badge entityId={entityId} state={entities[entityId]?.state} attributes={entities[entityId]?.attributes} />
          {isEditMode && (
            <button
              onClick={() => set(badges.filter(b => b !== entityId))}
              title={t('common.delete')}
              className='absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-red-500/80 text-white hover:bg-red-500 transition-colors'
            >
              <X size={10} />
            </button>
          )}
        </div>
      ))}

      {isEditMode && !adding && (
        <button
          onClick={() => setAdding(true)}
          className='flex items-center gap-1 px-2.5 py-1 rounded-full border border-dashed border-white/20 text-white/40 hover:text-white/70 hover:border-white/35 text-xs transition-colors cursor-pointer'
        >
          <Plus size={12} /> {t('layout.badges.add')}
        </button>
      )}

      {isEditMode && adding && (
        <div className='w-64'>
          <EntityPicker
            label={t('layout.badges.add')}
            value=''
            onChange={v => {
              // Pas de doublon : deux pastilles identiques n'apprendraient rien
              // de plus et se marcheraient dessus à la suppression.
              if (v && !badges.includes(v)) set([...badges, v]);
              setAdding(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
