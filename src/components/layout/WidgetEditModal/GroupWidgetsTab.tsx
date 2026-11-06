import { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { DEFAULT_WIDGET_CONFIGS, WIDGET_FIELD_DEFS } from '@/widgets';
import type { GroupChild, WidgetConfig, WidgetFieldDef } from '@/types/widget-configs';
import { WIDGET_META } from '@/widgets';
import { IconPicker, GradientPicker } from '@/components/layout/WidgetPickers';
import { EntityPicker } from './EntityPicker';
import { EntityListField } from './EntityListField';
import { FieldInput } from './FieldInput';
import { ListEditor } from './ListEditor';
import { PanelSelectField } from './PanelSelectField';
import { AreaControlsField } from './AreaControlsField';
import { MultiSelectField } from './MultiSelectField';
import { TemplateEditor } from '@/components/layout/TemplateField';
import { SwitchTrack } from '@/components/ds/Switch';
import { FIELD_CARD, INTRO, ROUND, SECTION_TITLE } from './ui';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

const EXCLUDED_TYPES = new Set(['group', 'activity', 'camera']);

/**
 * Champs qui prennent la ligne entière dans une grille à deux colonnes.
 *
 * Partagée avec l'éditeur de blocs des panneaux, qui rendait les mêmes champs
 * avec sa propre copie de la liste — et les deux avaient déjà divergé.
 */
export const WIDE_FIELD_TYPES: string[] = ['list', 'entity-list', 'multiselect', 'weather-icons', 'template'];

// ── Inline field renderer (mirrors WidgetEditModal field rendering) ─────────────

export function ChildFieldRenderer({
  field,
  draft,
  onPatch,
}: {
  field: WidgetFieldDef;
  draft: Record<string, unknown>;
  /**
   * Un correctif d'objet et non un couple clé/valeur : `area-controls` écrit
   * deux clés d'un coup, et deux appels successifs partaient tous les deux du
   * même brouillon — le premier était perdu.
   */
  onPatch: (patch: Record<string, unknown>) => void;
}) {
  const { t } = useI18n();
  if (field.fieldType === 'entity') {
    return (
      <EntityPicker
        key={field.key}
        value={(draft[field.key] as string) ?? ''}
        onChange={v => onPatch({ [field.key]: v })}
        domain={field.domain}
        label={t(field.label)}
      />
    );
  }
  if (field.fieldType === 'icon') {
    return (
      <IconPicker
        key={field.key}
        value={(draft[field.key] as string) ?? ''}
        onChange={v => onPatch({ [field.key]: v })}
        label={t(field.label)}
      />
    );
  }
  if (field.fieldType === 'gradient') {
    return (
      <GradientPicker
        key={field.key}
        value={(draft[field.key] as string) ?? ''}
        onChange={v => onPatch({ [field.key]: v })}
        label={t(field.label)}
      />
    );
  }
  if (field.fieldType === 'panel-select') {
    return (
      <PanelSelectField
        key={field.key}
        value={(draft[field.key] as string) ?? ''}
        onChange={v => onPatch({ [field.key]: v })}
        label={t(field.label)}
      />
    );
  }
  // Interrupteur et liste : le gabarit de la fiche d'édition principale
  // (`WidgetEditModal/index.tsx`), pour qu'un réglage ait la même allure partout.
  if (field.fieldType === 'boolean') {
    const on = (draft[field.key] as boolean) ?? false;
    return (
      <button
        key={field.key}
        role='switch'
        aria-checked={on}
        onClick={() => onPatch({ [field.key]: !on })}
        className='flex min-h-12 w-full items-center justify-between gap-3 text-left'
      >
        <span className='text-base font-semibold'>{t(field.label)}</span>
        <SwitchTrack on={on} />
      </button>
    );
  }
  if (field.fieldType === 'select' && field.options) {
    return (
      <div key={field.key}>
        <label className='mb-2 block text-sm font-semibold text-[var(--ds-ink-muted)]'>{t(field.label)}</label>
        <select
          value={(draft[field.key] as string) ?? field.options[0].value}
          onChange={e => onPatch({ [field.key]: e.target.value })}
          className='h-12 w-full cursor-pointer rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-3 text-base text-[var(--ds-ink)] outline-none focus:outline-2 focus:outline-[var(--ds-accent)]'
        >
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {t(opt.label)}
            </option>
          ))}
        </select>
      </div>
    );
  }
  if (field.fieldType === 'list' && field.itemFields) {
    return (
      <ListEditor
        key={field.key}
        items={(draft[field.key] as Record<string, unknown>[]) ?? []}
        onChange={v => onPatch({ [field.key]: v })}
        itemFields={field.itemFields}
        label={t(field.label)}
        twoCol
      />
    );
  }
  if (field.fieldType === 'entity-list') {
    return (
      <EntityListField
        key={field.key}
        label={t(field.label)}
        value={(draft[field.key] as string[]) ?? []}
        onChange={(v: string[]) => onPatch({ [field.key]: v })}
        domain={field.domain}
      />
    );
  }
  if (field.fieldType === 'area-controls') {
    // Deux clés jumelles : la zone HA et les commandes qu'elle apporte.
    return (
      <AreaControlsField
        key={field.key}
        label={t(field.label)}
        area={(draft.area as string) ?? ''}
        controls={(draft.areaControls as string[]) ?? []}
        onChange={next => onPatch({ area: next.area, areaControls: next.controls })}
      />
    );
  }
  if (field.fieldType === 'template') {
    return (
      <div key={field.key}>
        <label className='mb-2 block text-sm font-semibold text-[var(--ds-ink-muted)]'>{t(field.label)}</label>
        <TemplateEditor
          value={(draft[field.key] as string) ?? ''}
          onChange={v => onPatch({ [field.key]: v })}
          entityId={draft.entityId as string | undefined}
        />
      </div>
    );
  }
  if (field.fieldType === 'multiselect' && field.options) {
    return (
      <MultiSelectField
        key={field.key}
        label={t(field.label)}
        options={field.options}
        value={draft[field.key] as string[] | undefined}
        onChange={v => onPatch({ [field.key]: v })}
      />
    );
  }
  // default: text / number
  return (
    <FieldInput
      key={field.key}
      value={(draft[field.key] as string | number) ?? ''}
      onChange={v => onPatch({ [field.key]: v })}
      label={t(field.label)}
      type={field.fieldType === 'number' ? 'number' : 'text'}
    />
  );
}

// ── Child row with expandable config ──────────────────────────────────────────

function ChildRow({ child, onRemove }: { child: GroupChild; onRemove: () => void }) {
  const { t } = useI18n();
  const { getWidgetConfig, updateWidgetConfig } = useWidgetConfig();
  const [expanded, setExpanded] = useState(false);

  const meta = WIDGET_META.find(m => m.type === child.type);
  const fields = (WIDGET_FIELD_DEFS[child.type] ?? []).filter(f => f.fieldType !== 'weather-icons');

  // Read child's own config from context
  const childConfig = getWidgetConfig(child.id) ?? ({} as Record<string, unknown>);
  const [draft, setDraft] = useState<Record<string, unknown>>({ ...(childConfig as Record<string, unknown>) });

  const patch = (p: Record<string, unknown>) => {
    const next = { ...draft, ...p };
    setDraft(next);
    // Le brouillon est un sac de clés dynamiques : le passage par `unknown` est
    // requis, les deux types ne se recouvrent pas assez pour un cast direct.
    updateWidgetConfig(child.id, next as unknown as WidgetConfig);
  };

  return (
    <Reorder.Item value={child} className={cn(FIELD_CARD, 'overflow-hidden p-0', expanded && 'ring-2 ring-[var(--ds-tile-on)]')}>
      {/* Row header */}
      <div className='flex min-h-16 items-center gap-3 px-3 py-2'>
        {/* Drag handle — only this part is draggable */}
        <GripVertical size={18} className='shrink-0 cursor-grab text-[var(--ds-ink-muted)] active:cursor-grabbing' />

        {/* Type icon — la pastille des apps du lanceur */}
        <span
          className='flex size-10 shrink-0 items-center justify-center rounded-[var(--ds-radius-sm)] text-white'
          style={{ background: meta?.color ?? 'var(--ds-surface-3)' }}
        >
          {meta && <meta.icon size={20} />}
        </span>

        {/* Name */}
        <div className='flex min-w-0 flex-1 flex-col'>
          <span className='truncate text-base font-semibold'>{meta ? t(meta.label) : child.type}</span>
          {(draft.name as string) || (draft.label as string) ? (
            <span className='truncate text-sm text-[var(--ds-ink-muted)]'>{(draft.name as string) || (draft.label as string)}</span>
          ) : null}
        </div>

        {/* Actions */}
        {fields.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-label={t('common.edit')}
            title={t('common.edit')}
            className={cn(ROUND, expanded && 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]')}
          >
            {expanded ? <ChevronUp size={18} /> : <Pencil size={16} />}
          </button>
        )}
        <button
          onClick={onRemove}
          aria-label={t('common.delete')}
          title={t('common.delete')}
          className={cn(ROUND, 'text-[var(--ds-alert)]')}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Expanded config fields */}
      <AnimatePresence>
        {expanded && fields.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className='overflow-hidden'
          >
            <div className='px-4 pb-4 pt-1'>
              {/* Simple fields in 2-col grid, complex ones full width */}
              <div className='grid grid-cols-2 gap-x-3 gap-y-4'>
                {fields.map(field => {
                  const isWide = WIDE_FIELD_TYPES.includes(field.fieldType);
                  return (
                    <div key={field.key} className={isWide ? 'col-span-2' : 'col-span-1'}>
                      <ChildFieldRenderer field={field} draft={draft} onPatch={patch} />
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

// ── Main tab ──────────────────────────────────────────────────────────────────

interface GroupWidgetsTabProps {
  groupId: string;
  draft: Record<string, unknown>;
  updateField: (key: string, value: unknown) => void;
}

export function GroupWidgetsTab({ groupId: _groupId, draft, updateField }: GroupWidgetsTabProps) {
  const { t } = useI18n();
  const { updateWidgetConfig } = useWidgetConfig();
  const [pickerOpen, setPickerOpen] = useState(false);

  const children = (draft.children as GroupChild[]) ?? [];
  const available = WIDGET_META.filter(m => !EXCLUDED_TYPES.has(m.type));

  const addChild = (type: string) => {
    // eslint-disable-next-line react-hooks/purity
    const id = `${type}-${Date.now()}`;
    const defaultCfg = DEFAULT_WIDGET_CONFIGS[type as keyof typeof DEFAULT_WIDGET_CONFIGS];
    if (defaultCfg) updateWidgetConfig(id, { ...defaultCfg } as WidgetConfig);
    updateField('children', [...children, { id, type: type as GroupChild['type'] }]);
    setPickerOpen(false);
  };

  const removeChild = (id: string) => {
    updateField(
      'children',
      children.filter(c => c.id !== id)
    );
  };

  const reorder = (newOrder: GroupChild[]) => {
    updateField('children', newOrder);
  };

  return (
    <div className='space-y-3'>
      <h3 className={SECTION_TITLE}>
        {t('widgets.group.widgets')}
        <span className='ml-2 font-normal text-[var(--ds-ink-muted)]'>{children.length}</span>
      </h3>

      {/* Empty state */}
      {children.length === 0 && !pickerOpen && (
        <div className={cn(FIELD_CARD, 'text-center')}>
          <p className='text-base font-semibold'>{t('widgets.group.noWidgets')}</p>
          <p className={cn(INTRO, 'mt-1')}>{t('widgets.group.addHint')}</p>
        </div>
      )}

      {/* Children — drag to reorder, click ✏ to edit */}
      {children.length > 0 && (
        <Reorder.Group axis='y' values={children} onReorder={reorder} className='flex flex-col gap-2'>
          {children.map(child => (
            <ChildRow key={child.id} child={child} onRemove={() => removeChild(child.id)} />
          ))}
        </Reorder.Group>
      )}

      {children.length > 0 && <p className={cn(INTRO, 'text-center')}>{t('widgets.group.dragToReorder')}</p>}

      {/* Add toggle */}
      <button
        onClick={() => setPickerOpen(v => !v)}
        aria-expanded={pickerOpen}
        className={cn(
          'flex min-h-14 w-full items-center justify-center gap-2 rounded-[var(--ds-radius-lg)] px-4 text-base font-semibold',
          pickerOpen
            ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]'
            : 'border-2 border-dashed border-[var(--ds-sheet-section)] text-[var(--ds-ink-muted)]'
        )}
      >
        <Plus size={18} />
        {t('widgets.group.addWidget')}
        <ChevronDown size={18} className={cn('ml-auto transition-transform', pickerOpen && 'rotate-180')} />
      </button>

      {/* Inline type grid */}
      <AnimatePresence>
        {pickerOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.18 }}
            className='overflow-hidden'
          >
            <div className='grid grid-cols-2 gap-2 pt-1'>
              {available.map(meta => (
                <button
                  key={meta.type}
                  onClick={() => addChild(meta.type)}
                  className='flex min-h-14 items-center gap-3 rounded-[var(--ds-radius-md)] bg-[var(--ds-sheet-section)] px-2.5 text-left'
                >
                  <span
                    className='flex size-9 shrink-0 items-center justify-center rounded-[var(--ds-radius-sm)] text-white'
                    style={{ background: meta.color }}
                  >
                    <meta.icon size={18} />
                  </span>
                  <span className='text-sm font-semibold leading-tight'>{t(meta.label)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
