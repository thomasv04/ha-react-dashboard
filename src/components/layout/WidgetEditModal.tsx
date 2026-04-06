import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { WIDGET_FIELD_DEFS, type WidgetFieldDef, type WidgetConfig } from '@/types/widget-configs';
import { WIDGET_LABELS, resolveBreakpoint } from '@/components/layout/DashboardGrid';
import { IconPicker, GradientPicker } from '@/components/layout/WidgetPickers';
import { TemplateEditor } from '@/components/layout/TemplateField';
import { CardLayoutTab } from '@/components/layout/CardLayoutTab';
import { WIDGET_DISPOSITIONS } from '@/config/widget-dispositions';
import { cn } from '@/lib/utils';

// ── Widget component map for live preview ────────────────────────────────────
import { WeatherCard } from '@/components/cards/WeatherCard/WeatherCard';
import { CameraCard } from '@/components/cards/CameraCard/CameraCard';
import { ThermostatCard } from '@/components/cards/ThermostatCard/ThermostatCard';
import { RoomsGrid } from '@/components/cards/RoomsGrid/RoomsGrid';
import { ShortcutsCard } from '@/components/cards/ShortcutsCard/ShortcutsCard';
import { TempoCard } from '@/components/cards/TempoCard/TempoCard';
import { EnergyCard } from '@/components/cards/EnergyCard/EnergyCard';
import { GreetingCard } from '@/components/cards/GreetingCard/GreetingCard';
import { ActivityBar } from '@/components/cards/ActivityBar/ActivityBar';
import { SensorCard } from '@/components/cards/SensorCard/SensorCard';
import { LightCard } from '@/components/cards/LightCard/LightCard';
import { PersonStatusCard } from '@/components/cards/PersonStatus/PersonStatusCard';
import { CoverCard } from '@/components/cards/CoverCard/CoverCard';
import { TemplateCard } from '@/components/cards/TemplateCard/TemplateCard';

const WIDGET_COMPONENTS: Record<string, React.ComponentType> = {
  weather: WeatherCard,
  camera: CameraCard,
  thermostat: ThermostatCard,
  rooms: RoomsGrid,
  shortcuts: ShortcutsCard,
  tempo: TempoCard,
  energy: EnergyCard,
  greeting: GreetingCard,
  activity: ActivityBar,
  sensor: SensorCard,
  light: LightCard,
  person: PersonStatusCard,
  cover: CoverCard,
  template: TemplateCard,
};

// ── Entity picker with autocomplete ──────────────────────────────────────────
function EntityPicker({
  value,
  onChange,
  domain,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  domain?: string;
  label: string;
}) {
  const allEntities = useHass(s => s.entities);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);

  const entities = useMemo(() => {
    const list = Object.keys(allEntities ?? {}).sort();
    if (domain) return list.filter(id => id.startsWith(`${domain}.`));
    return list;
  }, [allEntities, domain]);

  const filtered = useMemo(() => {
    if (!search) return entities.slice(0, 50);
    const q = search.toLowerCase();
    return entities.filter(id => id.toLowerCase().includes(q)).slice(0, 50);
  }, [entities, search]);

  return (
    <div className='relative'>
      <label className='text-[11px] text-white/40 mb-1 block'>{label}</label>
      <div
        className='flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer'
        onClick={() => setOpen(!open)}
      >
        <span className={`text-sm flex-1 truncate ${value ? 'text-white/80' : 'text-white/30'}`}>
          {value || 'Sélectionner...'}
        </span>
        {open ? <ChevronUp size={14} className='text-white/30' /> : <ChevronDown size={14} className='text-white/30' />}
      </div>
      {open && (
        <div className='absolute z-50 mt-1 w-full rounded-lg border border-white/12 shadow-xl overflow-hidden'
          style={{ background: 'rgba(12, 16, 40, 0.98)', backdropFilter: 'blur(20px)', maxHeight: 240 }}
        >
          <div className='sticky top-0 p-2 border-b border-white/8' style={{ background: 'rgba(12, 16, 40, 0.98)' }}>
            <div className='flex items-center gap-2 px-2 py-1.5 rounded-md bg-white/5'>
              <Search size={13} className='text-white/30' />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                className='bg-transparent text-sm text-white/80 outline-none flex-1 placeholder:text-white/20'
                placeholder='Rechercher...'
              />
            </div>
          </div>
          <div className='overflow-y-auto' style={{ maxHeight: 180 }}>
            {filtered.map(id => (
              <button
                key={id}
                onClick={() => { onChange(id); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-white/8 transition-colors truncate ${
                  id === value ? 'text-blue-400 bg-blue-500/10' : 'text-white/60'
                }`}
              >
                {id}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className='px-3 py-2 text-white/25 text-xs'>Aucune entité trouvée</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Simple text/number input ─────────────────────────────────────────────────
function FieldInput({
  value,
  onChange,
  label,
  type = 'text',
}: {
  value: string | number;
  onChange: (v: string | number) => void;
  label: string;
  type?: 'text' | 'number';
}) {
  return (
    <div>
      <label className='text-[11px] text-white/40 mb-1 block'>{label}</label>
      <input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        className='w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80 outline-none focus:border-blue-500/50'
      />
    </div>
  );
}

// ── List editor (rooms, cameras, shortcuts, pills) ───────────────────────────
function ListEditor({
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
                  onClick={e => { e.stopPropagation(); removeItem(idx); }}
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
                                onClick={() => updateItem(idx, field.key, list.filter((_, i) => i !== eidx))}
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

// ── Main modal ───────────────────────────────────────────────────────────────
export function WidgetEditModal() {
  const { editingWidgetId, setEditingWidgetId, widgetConfigs, updateWidgetConfig, setPreviewConfig, clearPreviewConfig } = useDashboardLayout();

  const config = editingWidgetId ? widgetConfigs[editingWidgetId] : null;
  const fields = config ? WIDGET_FIELD_DEFS[config.type] : null;
  const label = editingWidgetId ? (WIDGET_LABELS[editingWidgetId] ?? editingWidgetId) : '';
  const hasDispositions = config ? !!WIDGET_DISPOSITIONS[config.type]?.length : false;
  const breakpoint = resolveBreakpoint(window.innerWidth);

  // Tabs: config vs layout
  const [activeTab, setActiveTab] = useState<'config' | 'layout'>('config');

  // Local draft so we can cancel
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (config) setDraft({ ...config } as Record<string, unknown>);
    else setDraft(null);
    setActiveTab('config');
  }, [config]);

  // Push draft into preview config whenever it changes → live preview
  useEffect(() => {
    if (editingWidgetId && draft) {
      setPreviewConfig(editingWidgetId, draft as unknown as WidgetConfig);
    }
    return () => { clearPreviewConfig(); };
  }, [editingWidgetId, draft, setPreviewConfig, clearPreviewConfig]);

  if (!editingWidgetId || !draft || !fields) return null;

  const PreviewComponent = WIDGET_COMPONENTS[editingWidgetId];

  const handleSave = () => {
    if (draft) {
      updateWidgetConfig(editingWidgetId, draft as unknown as WidgetConfig);
    }
    clearPreviewConfig();
    setEditingWidgetId(null);
  };

  const handleClose = () => {
    clearPreviewConfig();
    setEditingWidgetId(null);
  };

  const updateField = (key: string, value: unknown) => {
    setDraft(prev => prev ? { ...prev, [key]: value } : prev);
  };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        key='widget-edit-backdrop'
        className='fixed inset-0 z-[70] bg-black/60'
        style={{ backdropFilter: 'blur(8px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      />
      {/* Modal */}
      <motion.div
        key='widget-edit-modal'
        className='fixed inset-0 z-[71] flex items-center justify-center pointer-events-none'
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
      >
        <div
          className='pointer-events-auto w-full max-w-4xl mx-4 rounded-2xl border border-white/12 shadow-2xl flex flex-col md:flex-row overflow-hidden'
          style={{ background: 'rgba(12, 16, 40, 0.97)', backdropFilter: 'blur(20px)', maxHeight: '85vh' }}
        >
          {/* ── Left: Live preview ── */}
          <div className='md:w-1/2 flex flex-col border-b md:border-b-0 md:border-r border-white/8'>
            {/* Preview header */}
            <div className='flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/8'>
              <div className='flex items-center gap-3'>
                <div className='w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center'>
                  <span className='text-white text-xs font-bold'>{label.charAt(0)}</span>
                </div>
                <div>
                  <h2 className='text-white font-semibold text-base'>{label}</h2>
                  <p className='text-white/30 text-[11px]'>Aperçu en direct</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className='p-1.5 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors'
              >
                <X size={16} />
              </button>
            </div>

            {/* Preview area */}
            <div className='flex-1 flex items-center justify-center p-6 min-h-[200px] overflow-hidden'>
              {PreviewComponent ? (
                <div className='w-full max-h-[50vh] overflow-auto rounded-2xl'>
                  <PreviewComponent />
                </div>
              ) : (
                <p className='text-white/20 text-sm'>Pas d'aperçu disponible</p>
              )}
            </div>
          </div>

          {/* ── Right: Settings form ── */}
          <div className='md:w-1/2 flex flex-col'>
            {/* Tab bar */}
            <div className='flex border-b border-white/10'>
              <button
                onClick={() => setActiveTab('config')}
                className={cn(
                  'px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
                  activeTab === 'config'
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-white/40 hover:text-white/60',
                )}
              >
                Configuration
              </button>
              {hasDispositions && (
                <button
                  onClick={() => setActiveTab('layout')}
                  className={cn(
                    'px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
                    activeTab === 'layout'
                      ? 'text-blue-400 border-b-2 border-blue-400'
                      : 'text-white/40 hover:text-white/60',
                  )}
                >
                  Mise en page
                </button>
              )}
            </div>

            {/* Fields / Layout tab */}
            <div className='flex-1 overflow-y-auto px-5 py-4 space-y-4'>
              {activeTab === 'config' && fields.map(field => {
                // ── Template fields: always show TemplateEditor ──
                if (field.fieldType === 'template') {
                  return (
                    <div key={field.key} className="space-y-1">
                      <label className="block text-xs text-white/40 font-medium">{field.label}</label>
                      <TemplateEditor
                        value={(draft[field.key] as string) ?? ''}
                        onChange={v => updateField(field.key, v)}
                        entityId={draft.entityId as string | undefined}
                      />
                    </div>
                  );
                }

                // ── Standard fields ──
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
                if (field.fieldType === 'list' && field.itemFields) {
                  return (
                    <ListEditor
                      key={field.key}
                      items={(draft[field.key] as Record<string, unknown>[]) ?? []}
                      onChange={v => updateField(field.key, v)}
                      itemFields={field.itemFields}
                      label={field.label}
                    />
                  );
                }
                return (
                  <FieldInput
                    key={field.key}
                    value={(draft[field.key] as string | number) ?? ''}
                    onChange={v => updateField(field.key, v)}
                    label={field.label}
                    type={field.fieldType === 'number' ? 'number' : 'text'}
                  />
                );
              })}
              {activeTab === 'layout' && hasDispositions && (
                <CardLayoutTab widgetId={editingWidgetId} breakpoint={breakpoint} />
              )}
            </div>

            {/* Footer */}
            <div className='flex items-center justify-end gap-2 px-5 py-3 border-t border-white/8'>
              <button
                onClick={handleClose}
                className='px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/70 hover:bg-white/8 transition-colors'
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                className='px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-sm font-medium transition-colors'
              >
                Appliquer
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
