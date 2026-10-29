import { useI18n } from '@/i18n';
import { PanelSelectField } from './PanelSelectField';
import { EntityPicker } from './EntityPicker';
import type { CardAction, CardActionType } from '@/types/card-actions';

const ACTION_TYPES: CardActionType[] = ['default', 'more-info', 'navigate', 'call-service', 'url', 'none'];

/** Gestes configurables, dans l'ordre où on les découvre. */
const GESTURES = [
  { key: 'tapAction', label: 'layout.actions.tap' },
  { key: 'holdAction', label: 'layout.actions.hold' },
] as const;

const inputClass =
  'w-full bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] rounded-[var(--ds-radius-sm)] px-3 py-2 text-[var(--ds-ink)] text-sm focus:outline-none focus:border-[var(--ds-accent)] placeholder:text-[var(--ds-ink-muted)]';

function ActionEditor({ value, onChange }: { value: CardAction | undefined; onChange: (v: CardAction | undefined) => void }) {
  const { t } = useI18n();
  const action = value?.action ?? 'default';

  const patch = (updates: Partial<CardAction>) => onChange({ ...(value ?? { action: 'default' }), ...updates });

  return (
    <div className='space-y-3'>
      <div className='grid grid-cols-3 gap-1.5'>
        {ACTION_TYPES.map(type => (
          <button
            key={type}
            onClick={() =>
              // `default` est l'absence de configuration, pas une valeur à
              // stocker : le remettre nettoie l'entrée au lieu de figer le
              // comportement actuel dans la config.
              type === 'default' ? onChange(undefined) : patch({ action: type })
            }
            className={`px-2 py-1.5 rounded-[var(--ds-radius-sm)] border text-xs font-medium transition-colors cursor-pointer ${
              action === type
                ? 'bg-[var(--ds-tile-on)] border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                : 'bg-[var(--ds-surface-2)] border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
            }`}
          >
            {t(`layout.actions.type.${type}`)}
          </button>
        ))}
      </div>

      {action === 'navigate' && (
        <PanelSelectField label={t('layout.actions.target')} value={value?.target ?? ''} onChange={v => patch({ target: v })} />
      )}

      {action === 'call-service' && (
        <>
          <label className='block'>
            <span className='block text-[var(--ds-ink-muted)] text-xs mb-1.5'>{t('layout.actions.service')}</span>
            <input
              value={value?.service ?? ''}
              onChange={e => patch({ service: e.target.value })}
              placeholder='light.turn_on'
              className={inputClass}
            />
          </label>
          <div>
            <EntityPicker label={t('layout.actions.entity')} value={value?.entityId ?? ''} onChange={v => patch({ entityId: v })} />
            <p className='text-[var(--ds-ink-muted)] text-[11px] mt-1'>{t('layout.actions.entityHint')}</p>
          </div>
          <label className='block'>
            <span className='block text-[var(--ds-ink-muted)] text-xs mb-1.5'>{t('layout.actions.serviceData')}</span>
            <textarea
              value={value?.serviceData ?? ''}
              onChange={e => patch({ serviceData: e.target.value })}
              rows={2}
              placeholder='{"brightness": 180}'
              className={`${inputClass} font-mono resize-none`}
            />
          </label>
        </>
      )}

      {action === 'url' && (
        <label className='block'>
          <span className='block text-[var(--ds-ink-muted)] text-xs mb-1.5'>{t('layout.actions.url')}</span>
          <input value={value?.url ?? ''} onChange={e => patch({ url: e.target.value })} placeholder='https://…' className={inputClass} />
        </label>
      )}
    </div>
  );
}

/**
 * Onglet « Actions » — le pendant de `tap_action` / `hold_action` de Home
 * Assistant, commun à toutes les cards.
 *
 * Rendu ici et lu par `GridItem` : rien à ajouter dans un composant de card
 * pour qu'il en bénéficie.
 */
export function ActionsTab({ draft, updateField }: { draft: Record<string, unknown>; updateField: (key: string, value: unknown) => void }) {
  const { t } = useI18n();

  return (
    <div className='space-y-6'>
      <p className='text-[var(--ds-ink-muted)] text-xs leading-relaxed'>{t('layout.actions.intro')}</p>
      {GESTURES.map(({ key, label }) => (
        <div key={key}>
          <h4 className='text-[var(--ds-ink-muted)] text-[11px] font-semibold tracking-widest uppercase mb-2.5'>{t(label)}</h4>
          <ActionEditor value={draft[key] as CardAction | undefined} onChange={v => updateField(key, v)} />
        </div>
      ))}
    </div>
  );
}
