import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { WIDGET_FIELD_DEFS, type WidgetConfig } from '@/types/widget-configs';
import { WIDGET_LABELS, resolveBreakpoint } from '@/components/layout/DashboardGrid';
import { IconPicker, GradientPicker } from '@/components/layout/WidgetPickers';
import { TemplateEditor } from '@/components/layout/TemplateField';
import { CardLayoutTab } from '@/components/layout/CardLayoutTab';
import { WIDGET_DISPOSITIONS } from '@/config/widget-dispositions';
import { cn } from '@/lib/utils';
import { PREVIEW_COMPONENTS } from '@/config/widget-registry';
import { EntityPicker } from './EntityPicker';
import { FieldInput } from './FieldInput';
import { ListEditor } from './ListEditor';

export function WidgetEditModal() {
  const { editingWidgetId, setEditingWidgetId, widgetConfigs, updateWidgetConfig, setPreviewConfig, clearPreviewConfig } = useWidgetConfig();

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

  const PreviewComponent = PREVIEW_COMPONENTS[editingWidgetId];

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
