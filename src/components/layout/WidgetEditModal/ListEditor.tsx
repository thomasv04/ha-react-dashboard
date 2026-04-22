import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { WidgetFieldDef } from '@/types/widget-configs';
import { IconPicker, GradientPicker } from '@/components/layout/WidgetPickers';
import { EntityPicker } from './EntityPicker';
import { FieldInput } from './FieldInput';
import { PanelSelectField } from './PanelSelectField';

export function ListEditor({
  items,
  onChange,
  itemFields,
  label,
}: {
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
  itemFields: WidgetFieldDef[];
  label: string;
}) {
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
        <label className='text-[11px] text-white/40'>{label}</label>
        <button
          onClick={addItem}
          className='flex items-center gap-1 px-2 py-1 rounded-md bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 text-[11px]'
        >
          <Plus size={11} /> Ajouter
        </button>
      </div>
      <div className='space-y-1'>
        {items.map((item, idx) => {
          const itemLabel = (item.label || item.name || item.id || `Item ${idx + 1}`) as string;
          const isExpanded = expandedIdx === idx;
          return (
            <div key={idx} className='rounded-lg border border-white/8 overflow-hidden'>
              <div
                className='flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5'
                onClick={() => setExpandedIdx(isExpanded ? null : idx)}
              >
                <span className='text-sm text-white/60 flex-1 truncate'>{itemLabel}</span>
                <button
                  onClick={e => {
                    e.stopPropagation();
                    removeItem(idx);
                  }}
                  className='p-1 rounded hover:bg-red-500/20 text-red-400/50 hover:text-red-400'
                >
                  <Trash2 size={12} />
                </button>
                {isExpanded ? <ChevronUp size={13} className='text-white/25' /> : <ChevronDown size={13} className='text-white/25' />}
              </div>
              {isExpanded && (
                <div className='px-3 pb-3 space-y-2 border-t border-white/6'>
                  {itemFields.map(field => {
                    if (field.fieldType === 'entity') {
                      return (
                        <EntityPicker
                          key={field.key}
                          value={(item[field.key] as string) ?? ''}
                          onChange={v => updateItem(idx, field.key, v)}
                          domain={field.domain}
                          label={field.label}
                        />
                      );
                    }
                    if (field.fieldType === 'entity-list') {
                      const list = (item[field.key] as string[]) ?? [];
                      return (
                        <div key={field.key}>
                          <label className='text-[11px] text-white/40 mb-1 block'>{field.label}</label>
                          {list.map((eid, eidx) => (
                            <div key={eidx} className='flex items-center gap-1 mb-1'>
                              <EntityPicker
                                value={eid}
                                onChange={v => {
                                  const newList = [...list];
                                  newList[eidx] = v;
                                  updateItem(idx, field.key, newList);
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
                                className='p-1 text-red-400/50 hover:text-red-400'
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => updateItem(idx, field.key, [...list, ''])}
                            className='text-[11px] text-blue-400/60 hover:text-blue-400'
                          >
                            + Ajouter entité
                          </button>
                        </div>
                      );
                    }
                    if (field.fieldType === 'icon') {
                      return (
                        <IconPicker
                          key={field.key}
                          value={(item[field.key] as string) ?? ''}
                          onChange={v => updateItem(idx, field.key, v)}
                          label={field.label}
                        />
                      );
                    }
                    if (field.fieldType === 'gradient') {
                      return (
                        <GradientPicker
                          key={field.key}
                          value={(item[field.key] as string) ?? ''}
                          onChange={v => updateItem(idx, field.key, v)}
                          label={field.label}
                        />
                      );
                    }
                    if (field.fieldType === 'panel-select') {
                      return (
                        <PanelSelectField
                          key={field.key}
                          value={(item[field.key] as string) ?? ''}
                          onChange={v => updateItem(idx, field.key, v)}
                          label={field.label}
                        />
                      );
                    }
                    return (
                      <FieldInput
                        key={field.key}
                        value={(item[field.key] as string | number) ?? ''}
                        onChange={v => updateItem(idx, field.key, v)}
                        label={field.label}
                        type={field.fieldType === 'number' ? 'number' : 'text'}
                      />
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
