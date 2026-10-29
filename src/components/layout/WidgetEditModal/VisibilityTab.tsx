import { Plus, Trash2 } from 'lucide-react';
import { useI18n } from '@/i18n';
import { EntityPicker } from './EntityPicker';
import type { VisibilityCondition } from '@/types/card-visibility';
import type { CardStateStyle } from '@/types/card-state-styles';
import { WIDGET_FIELD_DEFS } from '@/widgets';
import type { Breakpoint } from '@/components/layout/DashboardGrid';

const BREAKPOINTS: Breakpoint[] = ['lg', 'md', 'sm'];

const inputClass =
  'w-full bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] rounded-[var(--ds-radius-sm)] px-3 py-2 text-[var(--ds-ink)] text-sm focus:outline-none focus:border-[var(--ds-accent)] placeholder:text-[var(--ds-ink-muted)]';

function ConditionEditor({
  condition,
  onChange,
  onRemove,
}: {
  condition: VisibilityCondition;
  onChange: (c: VisibilityCondition) => void;
  onRemove: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className='rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] p-3 space-y-3'>
      <div className='flex items-center gap-2'>
        <div className='flex-1 flex gap-1.5'>
          {(['state', 'screen'] as const).map(kind => (
            <button
              key={kind}
              onClick={() =>
                onChange(kind === 'state' ? { condition: 'state', entityId: '', state: '' } : { condition: 'screen', breakpoints: [] })
              }
              className={`px-2.5 py-1.5 rounded-[var(--ds-radius-sm)] border text-xs font-medium transition-colors cursor-pointer ${
                condition.condition === kind
                  ? 'bg-[var(--ds-tile-on)] border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                  : 'bg-[var(--ds-surface-2)] border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
              }`}
            >
              {t(`layout.visibility.kind.${kind}`)}
            </button>
          ))}
        </div>
        <button
          onClick={onRemove}
          title={t('common.delete')}
          className='p-1.5 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-3)] text-[var(--ds-alert)] transition-colors cursor-pointer'
        >
          <Trash2 size={12} />
        </button>
      </div>

      {condition.condition === 'state' && (
        <>
          <EntityPicker
            label={t('layout.visibility.entity')}
            value={condition.entityId}
            onChange={v => onChange({ ...condition, entityId: v })}
          />
          <div className='grid grid-cols-2 gap-2'>
            <label className='block'>
              <span className='block text-[var(--ds-ink-muted)] text-xs mb-1.5'>{t('layout.visibility.stateIs')}</span>
              <input
                value={condition.state ?? ''}
                // Les deux champs s'excluent : renseigner l'un vide l'autre,
                // sinon « égal à on » et « différent de on » cohabiteraient et
                // la card ne s'afficherait jamais.
                onChange={e => onChange({ ...condition, state: e.target.value, stateNot: '' })}
                placeholder='on'
                className={inputClass}
              />
            </label>
            <label className='block'>
              <span className='block text-[var(--ds-ink-muted)] text-xs mb-1.5'>{t('layout.visibility.stateIsNot')}</span>
              <input
                value={condition.stateNot ?? ''}
                onChange={e => onChange({ ...condition, stateNot: e.target.value, state: '' })}
                placeholder='unavailable'
                className={inputClass}
              />
            </label>
          </div>
        </>
      )}

      {condition.condition === 'screen' && (
        <div className='flex gap-1.5'>
          {BREAKPOINTS.map(bp => {
            const active = condition.breakpoints.includes(bp);
            return (
              <button
                key={bp}
                onClick={() =>
                  onChange({
                    ...condition,
                    breakpoints: active ? condition.breakpoints.filter(b => b !== bp) : [...condition.breakpoints, bp],
                  })
                }
                className={`flex-1 px-2 py-1.5 rounded-[var(--ds-radius-sm)] border text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[var(--ds-tile-on)] border-[var(--ds-accent)] text-[var(--ds-tile-on-ink)]'
                    : 'bg-[var(--ds-surface-2)] border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
                }`}
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
    <div className='space-y-4'>
      <p className='text-[var(--ds-ink-muted)] text-xs leading-relaxed'>{t('layout.visibility.intro')}</p>

      {conditions.map((condition, i) => (
        <ConditionEditor
          key={i}
          condition={condition}
          onChange={c => set(conditions.map((old, j) => (j === i ? c : old)))}
          onRemove={() => set(conditions.filter((_, j) => j !== i))}
        />
      ))}

      {conditions.length === 0 && <p className='text-[var(--ds-ink-muted)] text-xs italic'>{t('layout.visibility.empty')}</p>}

      <button
        onClick={() => set([...conditions, { condition: 'state', entityId: '', state: '' }])}
        className='flex items-center gap-1.5 px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-3)] border border-[var(--ds-surface-3)] text-[var(--ds-ink)] transition-colors text-xs font-semibold cursor-pointer'
      >
        <Plus size={12} /> {t('layout.visibility.add')}
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
    <div className='pt-5 mt-2 border-t border-[var(--ds-surface-3)] space-y-4'>
      <div>
        <h4 className='text-[var(--ds-ink-muted)] text-[11px] font-semibold tracking-widest uppercase mb-1.5'>
          {t('layout.stateStyles.title')}
        </h4>
        <p className='text-[var(--ds-ink-muted)] text-xs leading-relaxed'>{t('layout.stateStyles.intro')}</p>
      </div>

      {styles.map((style, i) => (
        <div key={i} className='rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] p-3 space-y-3'>
          <div className='flex items-center justify-between'>
            {/* L'ordre affiché est l'ordre de priorité, comme une suite de `if`. */}
            <span className='text-[var(--ds-ink-muted)] text-[11px] font-medium'>{t('layout.stateStyles.rule', { value: i + 1 })}</span>
            <button
              onClick={() => set(styles.filter((_, j) => j !== i))}
              title={t('common.delete')}
              className='p-1.5 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-3)] text-[var(--ds-alert)] transition-colors cursor-pointer'
            >
              <Trash2 size={12} />
            </button>
          </div>

          {style.when.map((condition, ci) => (
            <ConditionEditor
              key={ci}
              condition={condition}
              onChange={c => patch(i, { when: style.when.map((old, cj) => (cj === ci ? c : old)) })}
              onRemove={() => patch(i, { when: style.when.filter((_, cj) => cj !== ci) })}
            />
          ))}

          <button
            onClick={() => patch(i, { when: [...style.when, { condition: 'state', entityId: '', state: '' }] })}
            className='flex items-center gap-1.5 px-2.5 py-1.5 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] text-[var(--ds-ink-muted)] transition-colors text-xs cursor-pointer'
          >
            <Plus size={11} /> {t('layout.visibility.add')}
          </button>

          <div className='grid grid-cols-2 gap-2'>
            <label className='block'>
              <span className='block text-[var(--ds-ink-muted)] text-xs mb-1.5'>{t('layout.stateStyles.icon')}</span>
              <input
                value={style.icon ?? ''}
                onChange={e => patch(i, { icon: e.target.value })}
                placeholder='Lightbulb'
                className={inputClass}
              />
            </label>
            <label className='block'>
              <span className='block text-[var(--ds-ink-muted)] text-xs mb-1.5'>{t('layout.stateStyles.color')}</span>
              <div className='flex gap-1.5'>
                <input
                  type='color'
                  value={style.color ?? '#3b82f6'}
                  onChange={e => patch(i, { color: e.target.value })}
                  className='w-9 h-9 rounded-[var(--ds-radius-sm)] bg-transparent border border-[var(--ds-surface-3)] cursor-pointer flex-shrink-0'
                />
                <input
                  value={style.color ?? ''}
                  onChange={e => patch(i, { color: e.target.value })}
                  placeholder='#f97316'
                  className={inputClass}
                />
              </div>
            </label>
          </div>
        </div>
      ))}

      <button
        onClick={() => set([...styles, { when: [{ condition: 'state', entityId: '', state: 'on' }] }])}
        className='flex items-center gap-1.5 px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-3)] border border-[var(--ds-surface-3)] text-[var(--ds-ink)] transition-colors text-xs font-semibold cursor-pointer'
      >
        <Plus size={12} /> {t('layout.stateStyles.add')}
      </button>
    </div>
  );
}
