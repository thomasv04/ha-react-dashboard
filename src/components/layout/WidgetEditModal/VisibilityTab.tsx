import { Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { EntityPicker } from './EntityPicker';
import { ADD_BUTTON, FIELD_CARD, INPUT, INTRO, LABEL, NESTED_CARD, ROUND, SECTION_TITLE, chip } from './ui';
import type { VisibilityCondition } from '@/types/card-visibility';
import type { CardStateStyle } from '@/types/card-state-styles';
import { WIDGET_FIELD_DEFS } from '@/widgets';
import type { Breakpoint } from '@/components/layout/DashboardGrid';

const BREAKPOINTS: Breakpoint[] = ['lg', 'md', 'sm'];

function ConditionEditor({
  condition,
  onChange,
  onRemove,
  nested = false,
}: {
  condition: VisibilityCondition;
  onChange: (c: VisibilityCondition) => void;
  onRemove: () => void;
  /** Dans une règle de style : un bloc dans la section, plutôt qu'une section. */
  nested?: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className={cn(nested ? NESTED_CARD : FIELD_CARD, 'space-y-4')}>
      <div className='flex items-center gap-2'>
        <div className='flex flex-1 gap-2'>
          {(['state', 'screen'] as const).map(kind => (
            <button
              key={kind}
              aria-pressed={condition.condition === kind}
              onClick={() =>
                onChange(kind === 'state' ? { condition: 'state', entityId: '', state: '' } : { condition: 'screen', breakpoints: [] })
              }
              className={chip(condition.condition === kind)}
            >
              {t(`layout.visibility.kind.${kind}`)}
            </button>
          ))}
        </div>
        <button
          onClick={onRemove}
          title={t('common.delete')}
          aria-label={t('common.delete')}
          className={cn(ROUND, 'text-[var(--ds-alert)]')}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {condition.condition === 'state' && (
        <>
          <EntityPicker
            label={t('layout.visibility.entity')}
            value={condition.entityId}
            onChange={v => onChange({ ...condition, entityId: v })}
          />
          <div className='grid grid-cols-2 gap-3'>
            <label className='block'>
              <span className={LABEL}>{t('layout.visibility.stateIs')}</span>
              <input
                value={condition.state ?? ''}
                // Les deux champs s'excluent : renseigner l'un vide l'autre,
                // sinon « égal à on » et « différent de on » cohabiteraient et
                // la card ne s'afficherait jamais.
                onChange={e => onChange({ ...condition, state: e.target.value, stateNot: '' })}
                placeholder='on'
                className={INPUT}
              />
            </label>
            <label className='block'>
              <span className={LABEL}>{t('layout.visibility.stateIsNot')}</span>
              <input
                value={condition.stateNot ?? ''}
                onChange={e => onChange({ ...condition, stateNot: e.target.value, state: '' })}
                placeholder='unavailable'
                className={INPUT}
              />
            </label>
          </div>
        </>
      )}

      {condition.condition === 'screen' && (
        <div className='flex gap-2'>
          {BREAKPOINTS.map(bp => {
            const active = condition.breakpoints.includes(bp);
            return (
              <button
                key={bp}
                aria-pressed={active}
                onClick={() =>
                  onChange({
                    ...condition,
                    breakpoints: active ? condition.breakpoints.filter(b => b !== bp) : [...condition.breakpoints, bp],
                  })
                }
                className={cn(chip(active), 'flex-1')}
              >
                {t(`layout.visibility.screen.${bp}`)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Onglet « Visibilité » — l'équivalent du `visibility:` de Home Assistant.
 *
 * Lu par `GridItem`, comme les actions : aucun composant de card n'a à en
 * connaître l'existence.
 */
export function VisibilityTab({
  draft,
  updateField,
  widgetType,
}: {
  draft: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
  widgetType?: string;
}) {
  const { t } = useI18n();
  const conditions = (draft.visibility as VisibilityCondition[] | undefined) ?? [];

  // Le manifeste dit si la card a une icône remplaçable. C'est précisément ce
  // que les registres historiques ne permettaient pas de savoir de façon
  // fiable — d'où le report de cette fonctionnalité jusqu'à leur suppression.
  const supportsIcon = !!widgetType && (WIDGET_FIELD_DEFS[widgetType] ?? []).some(f => f.fieldType === 'icon');

  const set = (next: VisibilityCondition[]) => updateField('visibility', next.length ? next : undefined);

  return (
    <div className='flex flex-col gap-3'>
      <p className={INTRO}>{t('layout.visibility.intro')}</p>

      {conditions.map((condition, i) => (
        <ConditionEditor
          key={i}
          condition={condition}
          onChange={c => set(conditions.map((old, j) => (j === i ? c : old)))}
          onRemove={() => set(conditions.filter((_, j) => j !== i))}
        />
      ))}

      {conditions.length === 0 && <p className={INTRO}>{t('layout.visibility.empty')}</p>}

      <button onClick={() => set([...conditions, { condition: 'state', entityId: '', state: '' }])} className={ADD_BUTTON}>
        <Plus size={18} /> {t('layout.visibility.add')}
      </button>

      {supportsIcon && <StateStylesEditor draft={draft} updateField={updateField} />}
    </div>
  );
}

/**
 * Icône et couleur selon l'état.
 *
 * **Affiché seulement si le widget expose un champ « icône »** dans son
 * manifeste : les autres n'ont pas d'icône configurable à remplacer, et un
 * réglage qui ne fait rien serait pire que pas de réglage du tout.
 */
function StateStylesEditor({ draft, updateField }: { draft: Record<string, unknown>; updateField: (key: string, value: unknown) => void }) {
  const { t } = useI18n();
  const styles = (draft.stateStyles as CardStateStyle[] | undefined) ?? [];

  const set = (next: CardStateStyle[]) => updateField('stateStyles', next.length ? next : undefined);
  const patch = (i: number, changes: Partial<CardStateStyle>) => set(styles.map((s, j) => (j === i ? { ...s, ...changes } : s)));

  return (
    <div className='mt-4 flex flex-col gap-3'>
      <div>
        <h3 className={cn(SECTION_TITLE, 'mb-1')}>{t('layout.stateStyles.title')}</h3>
        <p className={INTRO}>{t('layout.stateStyles.intro')}</p>
      </div>

      {styles.map((style, i) => (
        <section key={i} className={cn(FIELD_CARD, 'flex flex-col gap-3')}>
          <div className='flex items-center justify-between'>
            {/* L'ordre affiché est l'ordre de priorité, comme une suite de `if`. */}
            <h4 className={SECTION_TITLE}>{t('layout.stateStyles.rule', { value: i + 1 })}</h4>
            <button
              onClick={() => set(styles.filter((_, j) => j !== i))}
              title={t('common.delete')}
              aria-label={t('common.delete')}
              className={cn(ROUND, 'text-[var(--ds-alert)]')}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {style.when.map((condition, ci) => (
            <ConditionEditor
              key={ci}
              nested
              condition={condition}
              onChange={c => patch(i, { when: style.when.map((old, cj) => (cj === ci ? c : old)) })}
              onRemove={() => patch(i, { when: style.when.filter((_, cj) => cj !== ci) })}
            />
          ))}

          <button
            onClick={() => patch(i, { when: [...style.when, { condition: 'state', entityId: '', state: '' }] })}
            className={ADD_BUTTON}
          >
            <Plus size={18} /> {t('layout.visibility.add')}
          </button>

          <div className='grid grid-cols-2 gap-3'>
            <label className='block'>
              <span className={LABEL}>{t('layout.stateStyles.icon')}</span>
              <input
                value={style.icon ?? ''}
                onChange={e => patch(i, { icon: e.target.value })}
                placeholder='Lightbulb'
                className={INPUT}
              />
            </label>
            <label className='block'>
              <span className={LABEL}>{t('layout.stateStyles.color')}</span>
              <div className='flex gap-2'>
                <input
                  type='color'
                  value={style.color ?? '#3b82f6'}
                  onChange={e => patch(i, { color: e.target.value })}
                  aria-label={t('layout.stateStyles.color')}
                  className='size-12 shrink-0 cursor-pointer rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] p-1.5'
                />
                <input
                  value={style.color ?? ''}
                  onChange={e => patch(i, { color: e.target.value })}
                  placeholder='#f97316'
                  className={INPUT}
                />
              </div>
            </label>
          </div>
        </section>
      ))}

      <button onClick={() => set([...styles, { when: [{ condition: 'state', entityId: '', state: 'on' }] }])} className={ADD_BUTTON}>
        <Plus size={18} /> {t('layout.stateStyles.add')}
      </button>
    </div>
  );
}
