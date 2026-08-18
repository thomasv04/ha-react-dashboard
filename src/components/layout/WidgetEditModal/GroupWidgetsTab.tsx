import { useState } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Settings2, Pencil } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

const EXCLUDED_TYPES = new Set(['group', 'activity', 'camera']);

// ── Inline field renderer (mirrors WidgetEditModal field rendering) ─────────────

function ChildFieldRenderer({
  field,
  draft,
  updateField,
}: {
  field: WidgetFieldDef;
  draft: Record<string, unknown>;
  updateField: (key: string, val: unknown) => void;
}) {
  if (field.fieldType === 'entity') {
    return (
      <EntityPicker
        key={field.key}
        value={(draft[field.key] as string) ?? ''}
        onChange={v => updateField(field.key, v)}
        domain={field.domain}
        label={field.label}
      />
    );
  }
  if (field.fieldType === 'icon') {
    return (
      <IconPicker
        key={field.key}
        value={(draft[field.key] as string) ?? ''}
        onChange={v => updateField(field.key, v)}
        label={field.label}
      />
    );
  }
  if (field.fieldType === 'gradient') {
    return (
      <GradientPicker
        key={field.key}
        value={(draft[field.key] as string) ?? ''}
        onChange={v => updateField(field.key, v)}
        label={field.label}
      />
    );
  }
  if (field.fieldType === 'panel-select') {
    return (
      <PanelSelectField
        key={field.key}
        value={(draft[field.key] as string) ?? ''}
        onChange={v => updateField(field.key, v)}
        label={field.label}
      />
    );
  }
  if (field.fieldType === 'boolean') {
    return (
      <label key={field.key} className='flex items-center gap-3 cursor-pointer select-none py-1'>
        <div className='relative'>
          <input
            type='checkbox'
            checked={(draft[field.key] as boolean) ?? false}
            onChange={e => updateField(field.key, e.target.checked)}
            className='sr-only peer'
          />
          <div className='w-8 h-4 rounded-full bg-white/10 peer-checked:bg-blue-500/60 transition-colors' />
          <div className='absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-md transition-transform peer-checked:translate-x-4' />
        </div>
        <span className='text-xs text-white/55'>{field.label}</span>
      </label>
    );
  }
  if (field.fieldType === 'select' && field.options) {
    return (
      <div key={field.key}>
        <label className='text-[11px] text-white/40 mb-1 block'>{field.label}</label>
        <select
          value={(draft[field.key] as string) ?? field.options[0].value}
          onChange={e => updateField(field.key, e.target.value)}
          className='w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-blue-500/50 cursor-pointer'
          style={{ colorScheme: 'dark' }}
        >
          {field.options.map(opt => (
            <option key={opt.value} value={opt.value} className='bg-[#0c1028]'>
              {opt.label}
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
        onChange={v => updateField(field.key, v)}
        itemFields={field.itemFields}
        label={field.label}
        twoCol
      />
    );
  }
  if (field.fieldType === 'entity-list') {
    return (
      <EntityListField
        key={field.key}
        label={field.label}
        value={(draft[field.key] as string[]) ?? []}
        onChange={(v: string[]) => updateField(field.key, v)}
        domain={field.domain}
      />
    );
  }
  // default: text / number
  return (
    <FieldInput
      key={field.key}
      value={(draft[field.key] as string | number) ?? ''}
      onChange={v => updateField(field.key, v)}
      label={field.label}
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

  const updateField = (key: string, val: unknown) => {
    const next = { ...draft, [key]: val };
    setDraft(next);
    // Le brouillon est un sac de clés dynamiques : le passage par `unknown` est
    // requis, les deux types ne se recouvrent pas assez pour un cast direct.
    updateWidgetConfig(child.id, next as unknown as WidgetConfig);
  };

  return (
    <Reorder.Item
      value={child}
      className={cn(
        'rounded-xl border transition-colors overflow-hidden',
        expanded ? 'border-indigo-500/30 bg-indigo-500/4' : 'border-white/8 bg-white/3'
      )}
    >
      {/* Row header */}
      <div className='flex items-center gap-2.5 px-3 py-2.5'>
        {/* Drag handle — only this part is draggable */}
        <GripVertical size={14} className='text-white/20 shrink-0 cursor-grab active:cursor-grabbing' />

        {/* Type icon */}
        {meta ? (
          <div
            className='w-7 h-7 rounded-xl flex items-center justify-center shrink-0'
            style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}35` }}
          >
            <meta.icon size={14} style={{ color: meta.color }} />
          </div>
        ) : (
          <div className='w-7 h-7 rounded-xl bg-white/5 border border-white/8 shrink-0' />
        )}

        {/* Name */}
        <div className='flex flex-col min-w-0 flex-1'>
          <span className='text-white/75 text-sm font-medium leading-tight'>{meta ? t(meta.label) : child.type}</span>
          {(draft.name as string) || (draft.label as string) ? (
            <span className='text-white/30 text-[10px] truncate'>{(draft.name as string) || (draft.label as string)}</span>
          ) : null}
        </div>

        {/* Actions */}
        {fields.length > 0 && (
          <button
            onClick={() => setExpanded(v => !v)}
            className={cn(
              'p-1.5 rounded-lg transition-colors shrink-0',
              expanded ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-white/8 text-white/25 hover:text-white/60'
            )}
          >
            {expanded ? <ChevronUp size={13} /> : <Pencil size={13} />}
          </button>
        )}
        <button
          onClick={onRemove}
          className='p-1.5 rounded-lg hover:bg-red-500/15 text-white/20 hover:text-red-400 transition-colors shrink-0'
        >
          <Trash2 size={13} />
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
            <div className='px-3 pb-3 pt-2 border-t border-white/6'>
              {/* Simple fields in 2-col grid, complex ones full width */}
              <div className='grid grid-cols-2 gap-x-3 gap-y-3'>
                {fields.map(field => {
                  const isWide = ['list', 'entity-list', 'multiselect', 'weather-icons', 'template'].includes(field.fieldType);
                  return (
                    <div key={field.key} className={isWide ? 'col-span-2' : 'col-span-1'}>
                      <ChildFieldRenderer field={field} draft={draft} updateField={updateField} />
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
      {/* Header */}
      <div className='flex items-center gap-2 pb-2 border-b border-white/8'>
        <Settings2 size={14} className='text-indigo-400' />
        <span className='text-sm font-semibold text-white/70'>
          {t('widgets.group.widgets')} ({children.length})
        </span>
      </div>

      {/* Empty state */}
      {children.length === 0 && !pickerOpen && (
        <div className='text-center py-4'>
          <p className='text-white/25 text-sm'>{t('widgets.group.noWidgets')}</p>
          <p className='text-white/15 text-xs mt-1'>{t('widgets.group.addHint')}</p>
        </div>
      )}

      {/* Children — drag to reorder, click ✏ to edit */}
      {children.length > 0 && (
        <Reorder.Group axis='y' values={children} onReorder={reorder} className='flex flex-col gap-1.5'>
          {children.map(child => (
            <ChildRow key={child.id} child={child} onRemove={() => removeChild(child.id)} />
          ))}
        </Reorder.Group>
      )}

      {children.length > 0 && <p className='text-white/18 text-[11px] text-center'>{t('widgets.group.dragToReorder')}</p>}

      {/* Add toggle */}
      <button
        onClick={() => setPickerOpen(v => !v)}
        className={cn(
          'w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all',
          pickerOpen
            ? 'border-indigo-500/50 text-indigo-400 bg-indigo-500/8'
            : 'border-dashed border-white/14 text-white/40 hover:border-indigo-500/40 hover:text-indigo-400 hover:bg-indigo-500/6'
        )}
      >
        <Plus size={15} />
        {t('widgets.group.addWidget')}
        <ChevronDown size={13} className={cn('ml-auto transition-transform', pickerOpen && 'rotate-180')} />
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
            <div className='grid grid-cols-2 gap-1.5 pt-1'>
              {available.map(meta => (
                <button
                  key={meta.type}
                  onClick={() => addChild(meta.type)}
                  className='flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-white/8 bg-white/3 hover:bg-white/6 hover:border-white/14 transition-all text-left'
                >
                  <div
                    className='w-7 h-7 rounded-xl flex items-center justify-center shrink-0'
                    style={{ background: `${meta.color}20`, border: `1px solid ${meta.color}35` }}
                  >
                    <meta.icon size={14} style={{ color: meta.color }} />
                  </div>
                  <span className='text-white/65 text-xs font-medium leading-tight'>{t(meta.label)}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
