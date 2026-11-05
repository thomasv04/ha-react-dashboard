import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { PanelSelectField } from './PanelSelectField';
import { EntityPicker } from './EntityPicker';
import { FIELD_CARD, INPUT, INTRO, LABEL, SECTION_TITLE, chip } from './ui';
import type { CardAction, CardActionType } from '@/types/card-actions';

const ACTION_TYPES: CardActionType[] = ['default', 'more-info', 'navigate', 'call-service', 'url', 'none'];

/** Gestes configurables, dans l'ordre où on les découvre. */
const GESTURES = [
  { key: 'tapAction', label: 'layout.actions.tap' },
  { key: 'holdAction', label: 'layout.actions.hold' },
] as const;

function ActionEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: CardAction | undefined;
  onChange: (v: CardAction | undefined) => void;
}) {
  const { t } = useI18n();
  const action = value?.action ?? 'default';

  const patch = (updates: Partial<CardAction>) => onChange({ ...(value ?? { action: 'default' }), ...updates });

  return (
    <div className='space-y-4'>
      <div role='radiogroup' aria-label={label} className='grid grid-cols-2 gap-2'>
        {ACTION_TYPES.map(type => (
          <button
            key={type}
            role='radio'
            aria-checked={action === type}
            onClick={() =>
              // `default` est l'absence de configuration, pas une valeur à
              // stocker : le remettre nettoie l'entrée au lieu de figer le
              // comportement actuel dans la config.
              type === 'default' ? onChange(undefined) : patch({ action: type })
            }
            className={cn(chip(action === type), 'px-3')}
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
            <span className={LABEL}>{t('layout.actions.service')}</span>
            <input
              value={value?.service ?? ''}
              onChange={e => patch({ service: e.target.value })}
              placeholder='light.turn_on'
              className={INPUT}
            />
          </label>
          <div>
            <EntityPicker label={t('layout.actions.entity')} value={value?.entityId ?? ''} onChange={v => patch({ entityId: v })} />
            <p className='mt-2 text-sm text-[var(--ds-ink-muted)]'>{t('layout.actions.entityHint')}</p>
          </div>
          <label className='block'>
            <span className={LABEL}>{t('layout.actions.serviceData')}</span>
            <textarea
              value={value?.serviceData ?? ''}
              onChange={e => patch({ serviceData: e.target.value })}
              rows={2}
              placeholder='{"brightness": 180}'
              className={cn(INPUT, 'h-auto resize-none py-3 font-mono')}
            />
          </label>
        </>
      )}

      {action === 'url' && (
        <label className='block'>
          <span className={LABEL}>{t('layout.actions.url')}</span>
          <input value={value?.url ?? ''} onChange={e => patch({ url: e.target.value })} placeholder='https://…' className={INPUT} />
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
    <div className='space-y-3'>
      <p className={INTRO}>{t('layout.actions.intro')}</p>
      {GESTURES.map(({ key, label }) => (
        <section key={key} className={FIELD_CARD}>
          <h3 className={cn(SECTION_TITLE, 'mb-3')}>{t(label)}</h3>
          <ActionEditor label={t(label)} value={draft[key] as CardAction | undefined} onChange={v => updateField(key, v)} />
        </section>
      ))}
    </div>
  );
}
