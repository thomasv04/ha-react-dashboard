import { Plus, Trash2 } from 'lucide-react';
import { SwitchTrack } from '@/components/ds/Switch';
import { BUTTON_SECONDARY, INPUT, Segmented } from '@/components/layout/ThemeControlsModal/controls';
import { SETTINGS_CARD } from '@/components/layout/ThemeControlsModal/typography';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { NEW_ACTION, parseActionData, type ActionForm } from './event-data';

/** Un intitulé et son champ. */
function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className='flex flex-col gap-1.5'>
      <span className='text-[15px] font-semibold text-[var(--ds-ink-muted)]'>{label}</span>
      {children}
    </label>
  );
}

/**
 * Les boutons d'un événement : autant qu'on veut, chacun avec son style, son
 * service, ses données, et — pour une notification — « garder après l'action ».
 */
export function ActionsEditor({
  actions,
  onChange,
  withKeep,
}: {
  actions: ActionForm[];
  onChange: (actions: ActionForm[]) => void;
  withKeep: boolean;
}) {
  const { t } = useI18n();
  const update = (index: number, patch: Partial<ActionForm>) => onChange(actions.map((a, i) => (i === index ? { ...a, ...patch } : a)));

  return (
    <section className={cn(SETTINGS_CARD, 'flex flex-col gap-4')} aria-label={t('help.devtools.actions')}>
      <h3 className='text-lg font-semibold'>{t('help.devtools.actions')}</h3>
      <p className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('help.devtools.actionsDesc')}</p>

      {actions.map((action, index) => {
        const invalid = !!parseActionData(action.data).error;
        return (
          <div
            key={index}
            role='group'
            aria-label={t('help.devtools.actionN', { value: index + 1 })}
            className='flex flex-col gap-3 rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-4'
          >
            <div className='flex items-center justify-between gap-3'>
              <span className='text-base font-semibold'>{t('help.devtools.actionN', { value: index + 1 })}</span>
              <button
                onClick={() => onChange(actions.filter((_, i) => i !== index))}
                aria-label={t('help.devtools.removeAction', { value: index + 1 })}
                title={t('help.devtools.removeAction', { value: index + 1 })}
                className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
              >
                <Trash2 size={18} />
              </button>
            </div>

            <Labeled label={t('help.devtools.actionLabel')}>
              <input className={INPUT} value={action.label} onChange={e => update(index, { label: e.target.value })} />
            </Labeled>
            <div className='flex flex-col gap-1.5'>
              <span className='text-[15px] font-semibold text-[var(--ds-ink-muted)]'>{t('help.devtools.actionVariant')}</span>
              <Segmented
                label={t('help.devtools.actionVariant')}
                value={action.variant}
                onChange={variant => update(index, { variant })}
                options={(['default', 'primary', 'danger'] as const).map(v => ({ value: v, label: t(`help.devtools.variants.${v}`) }))}
              />
            </div>
            <Labeled label={t('help.devtools.actionService')}>
              <input
                className={INPUT}
                value={action.service}
                onChange={e => update(index, { service: e.target.value })}
                placeholder='light.toggle'
              />
            </Labeled>
            <Labeled label={t('help.devtools.actionEntity')}>
              <input
                className={INPUT}
                value={action.entity}
                onChange={e => update(index, { entity: e.target.value })}
                placeholder='light.salon'
              />
            </Labeled>
            <Labeled label={t('help.devtools.actionData')}>
              <textarea
                rows={2}
                spellCheck={false}
                value={action.data}
                onChange={e => update(index, { data: e.target.value })}
                placeholder='{"brightness_pct": 40}'
                aria-invalid={invalid}
                className={cn(INPUT, 'h-auto py-3 font-mono text-sm', invalid && 'outline-2 outline-[var(--ds-alert)]')}
              />
              {invalid && (
                <span role='alert' className='text-[15px] font-semibold text-[var(--ds-alert)]'>
                  {t('help.devtools.jsonInvalid')}
                </span>
              )}
            </Labeled>
            {withKeep && (
              <button
                role='switch'
                aria-checked={action.keep}
                onClick={() => update(index, { keep: !action.keep })}
                className='flex items-center justify-between gap-4 text-left'
              >
                <span className='min-w-0'>
                  <span className='block text-base font-semibold'>{t('help.devtools.keep')}</span>
                  <span className='block text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('help.devtools.keepDesc')}</span>
                </span>
                <SwitchTrack on={action.keep} />
              </button>
            )}
          </div>
        );
      })}

      <button onClick={() => onChange([...actions, { ...NEW_ACTION }])} data-testid='devtools-add-action' className={BUTTON_SECONDARY}>
        <Plus size={18} /> {t('help.devtools.addAction')}
      </button>
    </section>
  );
}
