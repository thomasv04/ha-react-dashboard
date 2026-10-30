import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { X } from 'lucide-react';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import type { WidgetConfig } from '@/types/widget-configs';
import { WIDGET_FIELD_DEFS, WIDGET_META } from '@/widgets';
import { EntityListField } from './EntityListField';
import { WIDGET_LABELS } from '@/components/layout/DashboardGrid';
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
import { AreaControlsField } from './AreaControlsField';
import { MultiSelectField } from './MultiSelectField';
import { SoundTab } from './SoundTab';
import { WIDGET_SOUND_ACTIONS } from '@/config/widget-sound-actions';
import type { SoundPreset } from '@/lib/sounds';
import { GroupWidgetsTab } from './GroupWidgetsTab';
import { ActionsTab } from './ActionsTab';
import { VisibilityTab } from './VisibilityTab';
import { SwitchTrack } from '@/components/ds/Switch';
import { useI18n } from '@/i18n';

/** Un champ de réglage : un bloc arrondi sur le fond de la feuille. */
const FIELD_CARD = 'rounded-[var(--ds-radius-xl)] bg-[var(--ds-sheet-section)] p-4';

type Tab = 'config' | 'widgets' | 'advanced' | 'layout' | 'sound' | 'actions' | 'visibility';

export function WidgetEditModal() {
  const { t } = useI18n();
  const { editingWidgetId, setEditingWidgetId, widgetConfigs, updateWidgetConfig, setPreviewConfig, clearPreviewConfig } =
    useWidgetConfig();

  const config = editingWidgetId ? widgetConfigs[editingWidgetId] : null;
  const fields = config ? WIDGET_FIELD_DEFS[config.type] : null;
  const metaLabel = config ? WIDGET_META.find(m => m.type === config.type)?.label : undefined;
  const label = config ? (metaLabel ? t(metaLabel) : (WIDGET_LABELS[config.type] ?? config.type)) : '';
  const hasDispositions = config ? !!WIDGET_DISPOSITIONS[config.type]?.length : false;
  const hasAdvanced = fields ? fields.some(f => f.fieldType === 'weather-icons') : false;
  const hasSounds = config ? !!WIDGET_SOUND_ACTIONS[config.type]?.length : false;

  const isGroup = config?.type === 'group';

  // Tabs: config vs widgets (group) vs advanced vs layout vs sound
  const [activeTab, setActiveTab] = useState<Tab>('config');

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
    // `config` seul : le brouillon se réinitialise quand on ouvre un autre
    // widget, pas quand l'aperçu que ce même effet alimente se met à jour.
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

  type FieldDef = NonNullable<typeof fields>[number];
  const renderField = (field: FieldDef) => {
    // ── Template fields: always show TemplateEditor ──
    if (field.fieldType === 'template') {
      return (
        <div key={field.key} className='space-y-1'>
          <label className='block text-sm font-semibold text-[var(--ds-ink-muted)]'>{t(field.label)}</label>
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
          label={t(field.label)}
        />
      );
    }
    if (field.fieldType === 'entity-list') {
      return (
        <EntityListField
          key={field.key}
          label={t(field.label)}
          value={(draft[field.key] as string[]) ?? []}
          onChange={v => updateField(field.key, v)}
          domain={field.domain}
        />
      );
    }
    if (field.fieldType === 'icon') {
      return (
        <IconPicker
          key={field.key}
          value={(draft[field.key] as string) ?? ''}
          onChange={v => updateField(field.key, v)}
          label={t(field.label)}
        />
      );
    }
    if (field.fieldType === 'gradient') {
      return (
        <GradientPicker
          key={field.key}
          value={(draft[field.key] as string) ?? ''}
          onChange={v => updateField(field.key, v)}
          label={t(field.label)}
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
          label={t(field.label)}
        />
      );
    }
    if (field.fieldType === 'boolean') {
      const on = (draft[field.key] as boolean) ?? true;
      return (
        <button
          key={field.key}
          role='switch'
          aria-checked={on}
          onClick={() => updateField(field.key, !on)}
          className='flex w-full items-center justify-between gap-4 text-left'
        >
          <span className='text-base font-semibold'>{t(field.label)}</span>
          <SwitchTrack on={on} />
        </button>
      );
    }
    if (field.fieldType === 'area-controls') {
      return (
        <AreaControlsField
          key={field.key}
          label={t(field.label)}
          area={(draft.area as string) ?? ''}
          controls={(draft.areaControls as string[]) ?? []}
          onChange={next => {
            updateField('area', next.area);
            updateField('areaControls', next.controls);
          }}
        />
      );
    }
    if (field.fieldType === 'panel-select') {
      return (
        <PanelSelectField
          key={field.key}
          value={(draft[field.key] as string) ?? ''}
          onChange={v => updateField(field.key, v)}
          label={t(field.label)}
        />
      );
    }
    if (field.fieldType === 'multiselect' && field.options) {
      return (
        <MultiSelectField
          key={field.key}
          label={t(field.label)}
          options={field.options}
          value={draft[field.key] as string[] | undefined}
          onChange={v => updateField(field.key, v)}
        />
      );
    }
    if (field.fieldType === 'select' && field.options) {
      return (
        <div key={field.key}>
          <label className='mb-2 block text-sm font-semibold text-[var(--ds-ink-muted)]'>{t(field.label)}</label>
          <select
            value={(draft[field.key] as string) ?? field.options[0].value}
            onChange={e => updateField(field.key, e.target.value)}
            className='h-12 w-full cursor-pointer rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-3 text-base text-[var(--ds-ink)] outline-none focus:outline-2 focus:outline-[var(--ds-accent)]'
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
    }
    return (
      <FieldInput
        key={field.key}
        value={(draft[field.key] as string | number) ?? ''}
        onChange={v => updateField(field.key, v)}
        label={t(field.label)}
        type={field.fieldType === 'number' ? 'number' : 'text'}
      />
    );
  };

  const tabs = (
    [
      isGroup && { id: 'widgets', label: 'layout.tabs.widgets' },
      { id: 'config', label: 'layout.tabs.config' },
      hasAdvanced && { id: 'advanced', label: 'layout.tabs.advanced' },
      hasDispositions && { id: 'layout', label: 'layout.tabs.layout' },
      { id: 'actions', label: 'layout.tabs.actions' },
      { id: 'visibility', label: 'layout.tabs.visibility' },
      hasSounds && { id: 'sound', label: 'layout.tabs.sound' },
    ] as const
  ).filter(Boolean) as { id: Tab; label: string }[];

  return (
    <>
      {/* Voile léger : la tuile reste visible derrière la feuille, et touche-t-on ailleurs on ferme. */}
      <motion.div
        key='widget-edit-backdrop'
        data-overlay
        className='fixed inset-0 z-[70] bg-black/25'
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      />
      {/* Feuille de réglages, à droite — le même volet que celui d'un panneau. */}
      <motion.section
        key='widget-edit-modal'
        role='dialog'
        aria-modal='true'
        aria-label={label}
        className={cn(
          'fixed bottom-4 right-4 top-4 z-[71] flex flex-col overflow-hidden rounded-[var(--ds-radius-2xl)] bg-[var(--ds-sheet)] text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)]',
          isGroup ? 'w-[min(680px,calc(100vw-32px))]' : 'w-[min(460px,calc(100vw-32px))]'
        )}
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 40 }}
        transition={{ duration: DURATION_FAST }}
      >
        <header className='flex shrink-0 items-start justify-between gap-3 px-6 pb-3 pt-6'>
          <div className='min-w-0'>
            <h2 className='truncate text-[26px] font-bold'>{label}</h2>
            <p className='text-base text-[var(--ds-ink-muted)]'>{t('layout.livePreview')}</p>
          </div>
          <button
            onClick={handleClose}
            aria-label={t('common.close')}
            title={t('common.close')}
            className='flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
          >
            <X size={18} />
          </button>
        </header>

        {/* Aperçu : la card telle qu'elle sera, qui suit chaque réglage. */}
        <div className='mx-6 mb-3 max-h-[210px] shrink-0 overflow-auto rounded-[var(--ds-radius-xl)] bg-[var(--ds-surface-1)] p-3'>
          {PreviewComponent && editingWidgetId ? (
            <WidgetIdProvider id={editingWidgetId}>
              <PreviewComponent />
            </WidgetIdProvider>
          ) : (
            <p className='py-6 text-center text-sm text-[var(--ds-ink-muted)]'>{t('layout.noPreviewAvailable')}</p>
          )}
        </div>

        {/* Onglets : des pastilles, qui défilent s'il y en a trop pour la largeur. */}
        <div role='tablist' className='flex shrink-0 gap-1.5 overflow-x-auto px-6 pb-3 scrollbar-none'>
          {tabs.map(tab => (
            <button
              key={tab.id}
              role='tab'
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'h-11 shrink-0 rounded-full px-5 text-[15px] font-semibold',
                activeTab === tab.id
                  ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]'
                  : 'bg-[var(--ds-surface-1)] text-[var(--ds-ink-muted)]'
              )}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>

        {/* Champs */}
        <div className='min-h-0 flex-1 space-y-3 overflow-y-auto px-6 pb-3'>
          {activeTab === 'config' &&
            fields
              .filter(f => f.fieldType !== 'weather-icons')
              .map(field => (
                <div key={field.key} className={FIELD_CARD}>
                  {renderField(field)}
                </div>
              ))}
          {activeTab === 'widgets' && isGroup && <GroupWidgetsTab groupId={editingWidgetId} draft={draft} updateField={updateField} />}
          {activeTab === 'advanced' &&
            hasAdvanced &&
            fields
              .filter(f => f.fieldType === 'weather-icons')
              .map(field => (
                <div key={field.key} className={FIELD_CARD}>
                  <WeatherIconsEditor
                    value={draft[field.key] as Record<string, string> | undefined}
                    onChange={v => updateField(field.key, v)}
                  />
                </div>
              ))}
          {activeTab === 'actions' && draft && <ActionsTab draft={draft as Record<string, unknown>} updateField={updateField} />}
          {activeTab === 'visibility' && draft && (
            <VisibilityTab draft={draft as Record<string, unknown>} updateField={updateField} widgetType={config?.type} />
          )}
          {activeTab === 'layout' && hasDispositions && <CardLayoutTab widgetId={editingWidgetId} />}
          {activeTab === 'sound' && hasSounds && config && (
            <SoundTab
              widgetType={config.type}
              soundOverrides={draft.soundOverrides as Record<string, SoundPreset> | undefined}
              onChange={overrides => updateField('soundOverrides', Object.keys(overrides).length ? overrides : undefined)}
            />
          )}
        </div>

        <footer className='flex shrink-0 items-center justify-end gap-2 px-6 py-4'>
          <button onClick={handleClose} className='h-12 rounded-full px-5 text-base font-semibold text-[var(--ds-ink-muted)]'>
            {t('layout.cancel')}
          </button>
          <button
            onClick={handleSave}
            className='h-12 rounded-full bg-[var(--ds-tile-on)] px-7 text-base font-bold text-[var(--ds-tile-on-ink)]'
          >
            {t('layout.apply')}
          </button>
        </footer>
      </motion.section>
    </>
  );
}
