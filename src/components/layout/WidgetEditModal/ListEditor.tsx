import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { WidgetFieldDef } from '@/types/widget-configs';
import { IconPicker, GradientPicker } from '@/components/layout/WidgetPickers';
import { EntityPicker } from './EntityPicker';
import { FieldInput } from './FieldInput';
import { PanelSelectField } from './PanelSelectField';
import { useI18n } from '@/i18n';

export function ListEditor({
  items,
  onChange,
  itemFields,
  label,
  twoCol = false,
}: {
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
  itemFields: WidgetFieldDef[];
  label: string;
  twoCol?: boolean;
}) {
  const { t } = useI18n();
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const addItem = () => {
    const newItem: Record<string, unknown> = {};
    itemFields.forEach(f => {
      if (f.fieldType === 'entity-list') newItem[f.key] = [];
      else if (f.fieldType === 'number') newItem[f.key] = 0;
      else newItem[f.key] = '';
    });
    onChange([...items, newItem]);
    setExpandedIdx(items.length);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
    if (expandedIdx === idx) setExpandedIdx(null);
  };

  const updateItem = (idx: number, key: string, value: unknown) => {
    const updated = items.map((item, i) => (i === idx ? { ...item, [key]: value } : item));
    onChange(updated);
  };

  return (
    <div>
      <div className='flex items-center justify-between mb-2'>
        <label className='text-sm text-[var(--ds-ink-muted)]'>{label}</label>
        <button
          onClick={addItem}
          className='flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)] text-sm'
        >
          <Plus size={11} /> {t('common.add')}
        </button>
      </div>
      <div className='space-y-1'>
        {items.map((item, idx) => {
          const itemLabel = (item.label || item.name || item.id || `Item ${idx + 1}`) as string;
          const isExpanded = expandedIdx === idx;
          return (
            <div key={idx} className='rounded-[var(--ds-radius-sm)] border border-[var(--ds-surface-3)] overflow-hidden'>
              <div className='flex items-center gap-2 px-3 py-2 cursor-pointer' onClick={() => setExpandedIdx(isExpanded ? null : idx)}>
                <span className='text-sm text-[var(--ds-ink-muted)] flex-1 truncate'>{itemLabel}</span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    removeItem(idx);
                  }}
                  className='p-1 rounded text-[var(--ds-alert)]'
                >
                  <Trash2 size={12} />
                </button>
                {isExpanded ? (
                  <ChevronUp size={13} className='text-[var(--ds-ink-muted)]' />
                ) : (
                  <ChevronDown size={13} className='text-[var(--ds-ink-muted)]' />
                )}
              </div>
              {isExpanded && (
                <div
                  className={
                    twoCol
                      ? 'px-3 pb-3 pt-2 border-t border-[var(--ds-surface-3)] grid grid-cols-2 gap-x-3 gap-y-2'
                      : 'px-3 pb-3 space-y-2 border-t border-[var(--ds-surface-3)]'
                  }
                >
                  {itemFields.map(field => {
                    const wide = twoCol && ['list', 'entity-list', 'multiselect', 'template'].includes(field.fieldType);
                    let content: React.ReactNode;

                    if (field.fieldType === 'entity') {
                      content = (
                        <EntityPicker
                          value={(item[field.key] as string) ?? ''}
                          onChange={v => updateItem(idx, field.key, v)}
                          domain={field.domain}
                          label={t(field.label)}
                        />
                      );
                    } else if (field.fieldType === 'entity-list') {
                      const list = (item[field.key] as string[]) ?? [];
                      content = (
                        <div>
                          <label className='text-sm text-[var(--ds-ink-muted)] mb-1 block'>{t(field.label)}</label>
                          {list.map((eid, eidx) => (
                            <div key={eidx} className='flex items-center gap-1 mb-1'>
                              <EntityPicker
                                value={eid}
                                onChange={v => {
                                  const nl = [...list];
                                  nl[eidx] = v;
                                  updateItem(idx, field.key, nl);
                                }}
                                domain={field.domain}
                                label=''
                              />
                              <button
                                onClick={() =>
                                  updateItem(
                                    idx,
                                    field.key,
                                    list.filter((_, i) => i !== eidx)
                                  )
                                }
                                className='p-1 text-[var(--ds-alert)]'
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                          <button onClick={() => updateItem(idx, field.key, [...list, ''])} className='text-sm text-[var(--ds-accent)]'>
                            + {t('layout.addEntityBtn')}
                          </button>
                        </div>
                      );
                    } else if (field.fieldType === 'icon') {
                      content = (
                        <IconPicker
                          value={(item[field.key] as string) ?? ''}
                          onChange={v => updateItem(idx, field.key, v)}
                          label={t(field.label)}
                        />
                      );
                    } else if (field.fieldType === 'gradient') {
                      content = (
                        <GradientPicker
                          value={(item[field.key] as string) ?? ''}
                          onChange={v => updateItem(idx, field.key, v)}
                          label={t(field.label)}
                        />
                      );
                    } else if (field.fieldType === 'select' && field.options) {
                      content = (
                        <div>
                          <label className='text-sm text-[var(--ds-ink-muted)] mb-1 block'>{t(field.label)}</label>
                          <select
                            value={(item[field.key] as string) || field.options[0].value}
                            onChange={e => updateItem(idx, field.key, e.target.value)}
                            className='w-full px-3 py-2 rounded-[var(--ds-radius-sm)] bg-[var(--ds-surface-2)] border border-[var(--ds-surface-3)] text-sm text-[var(--ds-ink)] outline-none focus:border-[var(--ds-accent)] cursor-pointer'
                            style={{ colorScheme: 'dark' }}
                          >
                            {field.options.map(opt => (
                              <option key={opt.value} value={opt.value} className='bg-[#0c1028]'>
                                {t(opt.label)}
                              </option>
                            ))}
                          </select>
                        </div>
                      );
                    } else if (field.fieldType === 'boolean') {
                      content = (
                        <label className='flex items-center gap-3 cursor-pointer select-none py-1'>
                          <div className='relative'>
                            <input
                              type='checkbox'
                              checked={Boolean(item[field.key])}
                              onChange={e => updateItem(idx, field.key, e.target.checked)}
                              className='sr-only peer'
                            />
                            <div className='w-9 h-5 rounded-full bg-[var(--ds-surface-3)] peer-checked:bg-[var(--ds-tile-on)] transition-colors' />
                            <div className='absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-[var(--ds-surface-3)] shadow-md transition-transform peer-checked:translate-x-4' />
                          </div>
                          <span className='text-xs text-[var(--ds-ink-muted)]'>{t(field.label)}</span>
                        </label>
                      );
                    } else if (field.fieldType === 'panel-select') {
                      content = (
                        <PanelSelectField
                          value={(item[field.key] as string) ?? ''}
                          onChange={v => updateItem(idx, field.key, v)}
                          label={t(field.label)}
                        />
                      );
                    } else {
                      content = (
                        <FieldInput
                          value={(item[field.key] as string | number) ?? ''}
                          onChange={v => updateItem(idx, field.key, v)}
                          label={t(field.label)}
                          type={field.fieldType === 'number' ? 'number' : 'text'}
                        />
                      );
                    }

                    return twoCol ? (
                      <div key={field.key} className={wide ? 'col-span-2' : 'col-span-1'}>
                        {content}
                      </div>
                    ) : (
                      <React.Fragment key={field.key}>{content}</React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
