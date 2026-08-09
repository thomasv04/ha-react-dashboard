import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { X } from 'lucide-react';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import type { WidgetConfig } from '@/types/widget-configs';
import { WIDGET_FIELD_DEFS } from '@/widgets';
import { WIDGET_LABELS, resolveBreakpoint } from '@/components/layout/DashboardGrid';
import { IconPicker, GradientPicker } from '@/components/layout/WidgetPickers';
import { TemplateEditor } from '@/components/layout/TemplateField';
import { CardLayoutTab } from '@/components/layout/CardLayoutTab';
import { WIDGET_DISPOSITIONS } from '@/widgets';
import { cn } from '@/lib/utils';
import { WIDGET_COMPONENTS } from '@/widgets';
import { WidgetIdProvider } from '@/components/layout/DashboardGrid';
import { EntityPicker } from './EntityPicker';
import { FieldInput } from './FieldInput';
import { ListEditor } from './ListEditor';
import { WeatherIconsEditor } from './WeatherIconsEditor';
import { PanelSelectField } from './PanelSelectField';
import { SoundTab } from './SoundTab';
import { WIDGET_SOUND_ACTIONS } from '@/config/widget-sound-actions';
import type { SoundPreset } from '@/lib/sounds';
import { GroupWidgetsTab } from './GroupWidgetsTab';
import { useI18n } from '@/i18n';

export function WidgetEditModal() {
  const { t } = useI18n();
  const { editingWidgetId, setEditingWidgetId, widgetConfigs, updateWidgetConfig, setPreviewConfig, clearPreviewConfig } =
    useWidgetConfig();

  const config = editingWidgetId ? widgetConfigs[editingWidgetId] : null;
  const fields = config ? WIDGET_FIELD_DEFS[config.type] : null;
  const label = config ? (WIDGET_LABELS[config.type] ?? config.type) : '';
  const hasDispositions = config ? !!WIDGET_DISPOSITIONS[config.type]?.length : false;
  const hasAdvanced = fields ? fields.some(f => f.fieldType === 'weather-icons') : false;
  const hasSounds = config ? !!WIDGET_SOUND_ACTIONS[config.type]?.length : false;

  const [breakpoint, setBreakpoint] = useState(() => resolveBreakpoint(window.innerWidth));

  useEffect(() => {
    const handler = () => setBreakpoint(resolveBreakpoint(window.innerWidth));
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const isGroup = config?.type === 'group';

  // Tabs: config vs widgets (group) vs advanced vs layout vs sound
  const [activeTab, setActiveTab] = useState<'config' | 'widgets' | 'advanced' | 'layout' | 'sound'>('config');

  // Local draft so we can cancel
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (config) {
      const d = { ...config } as Record<string, unknown>;
      setDraft(d);
      // Prime preview immediately so the left panel shows on open
      if (editingWidgetId) setPreviewConfig(editingWidgetId, d as unknown as WidgetConfig);
    } else {
      setDraft(null);
    }
    setActiveTab(config?.type === 'group' ? 'widgets' : 'config');
  }, [config]); // eslint-disable-line react-hooks/exhaustive-deps

  // Push draft into preview config whenever it changes → live preview
  useEffect(() => {
    if (editingWidgetId && draft) {
      setPreviewConfig(editingWidgetId, draft as unknown as WidgetConfig);
    }
    return () => {
      clearPreviewConfig();
    };
  }, [editingWidgetId, draft, setPreviewConfig, clearPreviewConfig]);

  if (!editingWidgetId || !draft || !fields) return null;

  // `config.type` couvre aussi `rooms`, qui n'a pas de widget enregistré :
  // l'accès est volontairement tolérant, le rendu gère déjà le cas absent.
  const PreviewComponent = config ? (WIDGET_COMPONENTS as Record<string, React.ComponentType | undefined>)[config.type] : null;

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
    setDraft(prev => (prev ? { ...prev, [key]: value } : prev));
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
        transition={{ duration: DURATION_FAST }}
      >
        <div
          className={cn(
            'pointer-events-auto w-full mx-4 rounded-2xl border border-white/12 shadow-2xl overflow-hidden flex flex-col md:flex-row',
            isGroup ? 'max-w-5xl' : 'max-w-4xl'
          )}
          style={{ background: 'rgba(12, 16, 40, 0.97)', backdropFilter: 'blur(20px)', maxHeight: '90vh' }}
        >
          {/* ── Left: Live preview ── */}
          <div className={cn('flex flex-col border-b md:border-b-0 md:border-r border-white/8', isGroup ? 'md:w-2/5' : 'md:w-1/2')}>
            {/* Header */}
            <div className='flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/8'>
              <div className='flex items-center gap-3'>
                <div
                  className={cn(
                    'w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br',
                    isGroup ? 'from-indigo-500 to-blue-400' : 'from-blue-500 to-cyan-400'
                  )}
                >
                  <span className='text-white text-xs font-bold'>{label.charAt(0)}</span>
                </div>
                <div>
                  <h2 className='text-white font-semibold text-base'>{label}</h2>
                  <p className='text-white/30 text-[11px]'>{t('layout.livePreview')}</p>
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
              {PreviewComponent && editingWidgetId ? (
                <div className='w-full max-h-[50vh] overflow-auto rounded-2xl'>
                  <WidgetIdProvider id={editingWidgetId}>
                    <PreviewComponent />
                  </WidgetIdProvider>
                </div>
              ) : (
                <p className='text-white/20 text-sm'>{t('layout.noPreviewAvailable')}</p>
              )}
            </div>
          </div>

          {/* ── Right: Settings form ── */}
          <div className={cn('flex flex-col', isGroup ? 'md:w-3/5' : 'md:w-1/2')}>
            {/* Tab bar */}
            <div className='flex border-b border-white/10'>
              {isGroup && (
                <button
                  onClick={() => setActiveTab('widgets')}
                  className={cn(
                    'px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
                    activeTab === 'widgets' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-white/40 hover:text-white/60'
                  )}
                >
                  {t('layout.tabs.widgets')}
                </button>
              )}
              <button
                onClick={() => setActiveTab('config')}
                className={cn(
                  'px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
                  activeTab === 'config' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/40 hover:text-white/60'
                )}
              >
                {t('layout.tabs.config')}
              </button>
              {hasAdvanced && (
                <button
                  onClick={() => setActiveTab('advanced')}
                  className={cn(
                    'px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
                    activeTab === 'advanced' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/40 hover:text-white/60'
                  )}
                >
                  {t('layout.tabs.advanced')}
                </button>
              )}
              {hasDispositions && (
                <button
                  onClick={() => setActiveTab('layout')}
                  className={cn(
                    'px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
                    activeTab === 'layout' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/40 hover:text-white/60'
                  )}
                >
                  {t('layout.tabs.layout')}
                </button>
              )}
              {hasSounds && (
                <button
                  onClick={() => setActiveTab('sound')}
                  className={cn(
                    'px-4 py-3 text-sm font-medium transition-colors cursor-pointer',
                    activeTab === 'sound' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-white/40 hover:text-white/60'
                  )}
                >
                  {t('layout.tabs.sound')}
                </button>
              )}
            </div>

            {/* Fields / Layout tab */}
            <div className='flex-1 overflow-y-auto px-5 py-4 space-y-4'>
              {activeTab === 'config' &&
                fields
                  .filter(f => f.fieldType !== 'weather-icons')
                  .map(field => {
                    // ── Template fields: always show TemplateEditor ──
                    if (field.fieldType === 'template') {
                      return (
                        <div key={field.key} className='space-y-1'>
                          <label className='block text-xs text-white/40 font-medium'>{field.label}</label>
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
                    if (field.fieldType === 'boolean') {
                      return (
                        <label key={field.key} className='flex items-center gap-3 cursor-pointer select-none py-1'>
                          <div className='relative'>
                            <input
                              type='checkbox'
                              checked={(draft[field.key] as boolean) ?? true}
                              onChange={e => updateField(field.key, e.target.checked)}
                              className='sr-only peer'
                            />
                            <div className='w-9 h-5 rounded-full bg-white/10 peer-checked:bg-blue-500/60 transition-colors' />
                            <div className='absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-md transition-transform peer-checked:translate-x-4' />
                          </div>
                          <span className='text-xs text-white/60'>{field.label}</span>
                        </label>
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
                    if (field.fieldType === 'multiselect' && field.options) {
                      const current: string[] = (draft[field.key] as string[]) ?? field.options.map(o => o.value);
                      return (
                        <div key={field.key}>
                          <label className='text-[11px] text-white/40 mb-2 block'>{field.label}</label>
                          <div className='flex flex-wrap gap-1.5'>
                            {field.options.map(opt => {
                              const active = current.includes(opt.value);
                              return (
                                <button
                                  key={opt.value}
                                  type='button'
                                  onClick={() => {
                                    const next = active ? current.filter(v => v !== opt.value) : [...current, opt.value];
                                    updateField(field.key, next);
                                  }}
                                  className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all',
                                    active
                                      ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                      : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white/60'
                                  )}
                                >
                                  {opt.icon && <span>{opt.icon}</span>}
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
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
              {activeTab === 'widgets' && isGroup && <GroupWidgetsTab groupId={editingWidgetId} draft={draft} updateField={updateField} />}
              {activeTab === 'advanced' &&
                hasAdvanced &&
                fields
                  .filter(f => f.fieldType === 'weather-icons')
                  .map(field => (
                    <WeatherIconsEditor
                      key={field.key}
                      value={draft[field.key] as Record<string, string> | undefined}
                      onChange={v => updateField(field.key, v)}
                    />
                  ))}
              {activeTab === 'layout' && hasDispositions && <CardLayoutTab widgetId={editingWidgetId} breakpoint={breakpoint} />}
              {activeTab === 'sound' && hasSounds && config && (
                <SoundTab
                  widgetType={config.type}
                  soundOverrides={draft.soundOverrides as Record<string, SoundPreset> | undefined}
                  onChange={overrides => updateField('soundOverrides', Object.keys(overrides).length ? overrides : undefined)}
                />
              )}
            </div>

            {/* Footer */}
            <div className='flex items-center justify-end gap-2 px-5 py-3 border-t border-white/8'>
              <button
                onClick={handleClose}
                className='px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/70 hover:bg-white/8 transition-colors'
              >
                {t('layout.cancel')}
              </button>
              <button
                onClick={handleSave}
                className='px-4 py-2 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 text-sm font-medium transition-colors'
              >
                {t('layout.apply')}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
