import { useEffect, useState, type MutableRefObject } from 'react';
import { Play, Plus, Trash2, Clock, Image, Layers, Settings2, Hand, CloudUpload, Loader2 } from 'lucide-react';
import { SwitchTrack } from '@/components/ds/Switch';
import { BUTTON_PRIMARY, INPUT, Segmented } from '@/components/layout/ThemeControlsModal/controls';
import { useWallPanel } from '@/context/WallPanelContext';
import { usePages } from '@/context/PageContext';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { EntityPicker } from '@/components/layout/WidgetEditModal/EntityPicker';
import { PanelSelectField } from '@/components/layout/WidgetEditModal/PanelSelectField';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { gesturesOf, widgetExtentOf, type ImageFit, type MediaOrder, type WallPanelConfig, type WidgetAnchor } from '@/types/wallpanel';
import { layoutWidgets } from '@/lib/panel-grid';

/** Parts d'écran proposées — de la pleine largeur au quart. */
const EXTENTS = [100, 75, 50, 33, 25];

const ANCHORS: Array<{ id: WidgetAnchor; labelKey: string }> = [
  { id: 'top', labelKey: 'layout.wallPanel.anchorTop' },
  { id: 'bottom', labelKey: 'layout.wallPanel.anchorBottom' },
  { id: 'left', labelKey: 'layout.wallPanel.anchorLeft' },
  { id: 'right', labelKey: 'layout.wallPanel.anchorRight' },
];

/** Une durée en secondes, lisible : 300 → « 5 min », 90 → « 1 min 30 s ». */
const duration = (s: number) => {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m === 0 ? `${r} s` : r === 0 ? `${m} min` : `${m} min ${r} s`;
};

/** Un groupe de réglages : un bloc arrondi sur le fond de la feuille. */
const CARD = 'rounded-[var(--ds-radius-xl)] bg-[var(--ds-sheet-section)] p-5';

type Tab = 'activation' | 'background' | 'widgets' | 'style' | 'gestures';

/** Ligne interrupteur — le même bloc revenait cinq fois dans l'onglet Gestes. */
function ToggleRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role='switch'
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(CARD, 'flex w-full items-center justify-between gap-4 text-left', disabled && 'opacity-40')}
    >
      <span className='min-w-0'>
        <span className='block text-lg font-semibold text-[var(--ds-ink)]'>{label}</span>
        {description && <span className='mt-0.5 block text-[15px] text-[var(--ds-ink-muted)]'>{description}</span>}
      </span>
      <SwitchTrack on={checked} />
    </button>
  );
}

interface WallPanelSettingsProps {
  /** Ferme les réglages — la démo les quitte pour montrer la veille. */
  onClose: () => void;
  /**
   * Les réglages se ferment d'ailleurs que d'ici : cette section y dépose une
   * garde qui, brouillon modifié, demande quoi en faire et répond `true`.
   */
  guard: MutableRefObject<(() => boolean) | null>;
}

/**
 * L'écran de veille, parmi les réglages. Elle édite un brouillon : rien ne
 * part sur le serveur sans « Enregistrer ».
 */
export function WallPanelSettings({ onClose, guard }: WallPanelSettingsProps) {
  const { t } = useI18n();
  const { config, updateConfig, activate, enterWallPanelEditMode, wallPanelLayout, wallPanelWidgetConfigs } = useWallPanel();
  const widgetTotal = layoutWidgets(wallPanelLayout).length;
  const { pages } = usePages();
  const { allLayouts } = useDashboardLayout();
  const { allWidgetConfigsByPage } = useWidgetConfig();
  const { panels: customPanels, dock } = useCustomPanels();
  const { saveConfig, isSaving } = useDashboardConfig();

  const [tab, setTab] = useState<Tab>('activation');
  /** Pages Plan d'une maquette : chacune peut servir de fond, à la place des photos. */
  const planPages = pages.filter(p => p.type === 'floorplan' && p.floorplan?.model);
  const [newUrl, setNewUrl] = useState('');

  // Chaque réglage s'appliquait au contexte à la frappe, et n'atteignait le
  // serveur que si l'on repassait le dashboard en édition pour l'enregistrer :
  // fermer la modale donnait une configuration vivante mais perdue au
  // rechargement. Elle édite maintenant un brouillon.
  // Initialiseur paresseux plutôt qu'un ref : la valeur est lue au rendu pour
  // savoir si le brouillon a bougé, et un ref n'a pas le droit de l'être.
  const [initial, setInitial] = useState(config);
  const [draft, setDraft] = useState<WallPanelConfig>(config);
  const [confirmClose, setConfirmClose] = useState(false);

  const update = (partial: Partial<WallPanelConfig>) => setDraft(d => ({ ...d, ...partial }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const save = async (next: WallPanelConfig = draft) => {
    updateConfig(next);
    const saved = await saveConfig({
      version: 2,
      pages,
      layouts: allLayouts,
      widgetConfigs: allWidgetConfigsByPage,
      wallPanel: { config: next, layout: wallPanelLayout, widgetConfigs: wallPanelWidgetConfigs },
      customPanels,
      dock,
    });
    if (saved) setInitial(next);
    return saved;
  };

  const handleSave = () => save();

  // Fermer les réglages brouillon modifié : un choix explicite, jamais une perte silencieuse.
  useEffect(() => {
    const ref = guard;
    ref.current = () => {
      if (dirty) setConfirmClose(true);
      return dirty;
    };
    return () => {
      ref.current = null;
    };
  }, [dirty, guard]);

  const discard = () => {
    updateConfig(initial);
    onClose();
  };

  // La démo enregistre d'abord : prévisualiser une configuration que la
  // tablette ne gardera pas montrerait autre chose que ce qui l'attend.
  const handleDemo = async () => {
    if (dirty) await save();
    else updateConfig(draft);
    onClose();
    setTimeout(activate, 300);
  };

  // Même chemin que la démo, mais la veille s'ouvre directement en édition.
  const handleEditWidgets = async () => {
    if (dirty) await save();
    else updateConfig(draft);
    onClose();
    setTimeout(() => {
      activate();
      enterWallPanelEditMode();
    }, 300);
  };

  const addImageUrl = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    update({ image_urls: [...draft.image_urls, trimmed] });
    setNewUrl('');
  };

  const removeImageUrl = (idx: number) => {
    update({ image_urls: draft.image_urls.filter((_, i) => i !== idx) });
  };

  type TabEntry = { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> };
  const TABS: TabEntry[] = [
    { id: 'activation', label: t('layout.wallPanel.tabActivation'), icon: Clock },
    { id: 'background', label: t('layout.wallPanel.tabBackground'), icon: Image },
    { id: 'widgets', label: t('layout.wallPanel.tabWidgets'), icon: Layers },
    { id: 'style', label: t('layout.wallPanel.tabStyle'), icon: Settings2 },
    { id: 'gestures', label: t('layout.wallPanel.gestures.tab'), icon: Hand },
  ];

  const gestures = gesturesOf(draft);
  const setGesture = (partial: Partial<typeof gestures>) => update({ gestures: { ...gestures, ...partial } });

  return (
    <div className='flex h-full min-h-0 flex-col'>
      {/* Tabs */}
      <div className='flex shrink-0 flex-wrap items-center gap-1.5 pb-3'>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold transition-colors',
              tab === t.id ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-1)] text-[var(--ds-ink-muted)]'
            )}
          >
            <t.icon size={16} />
            {t.label}
          </button>
        ))}
        <button
          onClick={handleDemo}
          className='ml-auto flex h-11 items-center gap-2 rounded-full bg-[var(--ds-tile-on)] px-5 text-[15px] font-bold text-[var(--ds-tile-on-ink)]'
        >
          <Play size={16} />
          {t('layout.wallPanel.demo')}
        </button>
      </div>

      {/* Tab content */}
      <div className='flex-1 overflow-y-auto space-y-3 pr-1'>
        {/* ── ACTIVATION ── */}
        {tab === 'activation' && (
          <>
            <ToggleRow
              label={t('layout.wallPanel.enableScreensaver')}
              description={t('layout.wallPanel.enableScreensaverDesc')}
              checked={draft.enabled}
              onChange={enabled => update({ enabled })}
            />

            <div className={cn(CARD, 'flex flex-col gap-3', !draft.enabled && 'opacity-40')}>
              <div className='flex items-baseline justify-between'>
                <label htmlFor='wp-idle' className='text-lg font-semibold'>
                  {t('layout.wallPanel.idleDelay')}
                </label>
                <span className='text-[28px] font-bold text-[var(--ds-accent)]'>{duration(draft.idle_time)}</span>
              </div>
              <input
                id='wp-idle'
                type='range'
                min={30}
                max={1800}
                step={30}
                value={draft.idle_time}
                onChange={e => update({ idle_time: Number(e.target.value) })}
                className='h-8 w-full accent-[var(--ds-accent)]'
                disabled={!draft.enabled}
              />
              <div className='flex justify-between text-[var(--ds-ink-muted)] text-sm'>
                <span>30 s</span>
                <span>5 min</span>
                <span>15 min</span>
                <span>30 min</span>
              </div>
            </div>

            <div className={CARD}>
              <label className='mb-2 block text-lg font-semibold'>{t('layout.wallPanel.haEntity')}</label>
              <input
                type='text'
                value={draft.screensaver_entity ?? ''}
                onChange={e => update({ screensaver_entity: e.target.value || undefined })}
                placeholder='input_boolean.wallpanel_screensaver'
                className={INPUT}
              />
              <p className='mt-2 text-[15px] text-[var(--ds-ink-muted)]'>{t('layout.wallPanel.haEntityDesc')}</p>
            </div>

            <div className='rounded-[var(--ds-radius-xl)] bg-[var(--ds-tile-on)] p-5 text-[var(--ds-tile-on-ink)]'>
              <p className='text-[15px] leading-relaxed'>
                <span className='font-semibold'>{t('layout.wallPanel.forcedActivation')}</span> — ajoutez
                <code className='mx-1 rounded bg-black/25 px-2 py-0.5 font-mono text-sm'>?hrd_screensaver=true</code>à l'URL pour activer
                immédiatement (utile pour tablette murale).
              </p>
            </div>
          </>
        )}

        {/* ── FOND ── */}
        {tab === 'background' && (
          <>
            {planPages.length > 0 && (
              <div className={cn(CARD, 'flex flex-col gap-3')}>
                <p className='text-lg font-semibold'>{t('layout.wallPanel.backgroundSource')}</p>
                <Segmented
                  value={draft.floorplan_page ?? ''}
                  onChange={floorplan_page => update({ floorplan_page })}
                  label={t('layout.wallPanel.backgroundSource')}
                  options={[
                    { value: '', label: t('layout.wallPanel.backgroundPhotos') },
                    ...planPages.map(p => ({ value: p.id, label: p.label })),
                  ]}
                />
                {draft.floorplan_page && (
                  <p className='text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('layout.wallPanel.backgroundPlanHint')}</p>
                )}
              </div>
            )}
            {!draft.floorplan_page && (
              <>
                <div className={cn(CARD, 'flex flex-col gap-3')}>
                  <p className='text-lg font-semibold'>{t('layout.wallPanel.backgroundImages')}</p>
                  <div className='flex flex-col gap-2'>
                    {draft.image_urls.map((url, i) => (
                      <div key={i} className='flex items-center gap-3 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-4 py-3'>
                        <span className='flex-1 truncate font-mono text-sm text-[var(--ds-ink-muted)]'>{url}</span>
                        <button
                          onClick={() => removeImageUrl(i)}
                          aria-label={t('common.delete')}
                          className='flex size-9 items-center justify-center rounded-full text-[var(--ds-alert)]'
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                    {draft.image_urls.length === 0 && (
                      <p className='py-3 text-center text-[15px] text-[var(--ds-ink-muted)]'>{t('layout.wallPanel.noImages')}</p>
                    )}
                  </div>
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      value={newUrl}
                      onChange={e => setNewUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addImageUrl()}
                      placeholder='https://... ou media-source://...'
                      aria-label={t('layout.wallPanel.backgroundImages')}
                      className={INPUT}
                    />
                    <button onClick={addImageUrl} aria-label={t('common.add')} className={cn(BUTTON_PRIMARY, 'size-12 shrink-0 px-0')}>
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div className={cn(CARD, 'flex flex-col gap-3')}>
                    <label htmlFor='wp-fit' className='text-lg font-semibold'>
                      {t('layout.wallPanel.imageFit')}
                    </label>
                    <select
                      id='wp-fit'
                      value={draft.image_fit}
                      onChange={e => update({ image_fit: e.target.value as ImageFit })}
                      className={INPUT}
                    >
                      <option value='cover'>{t('layout.wallPanel.fitCover')}</option>
                      <option value='contain'>{t('layout.wallPanel.fitContain')}</option>
                      <option value='fill'>{t('layout.wallPanel.fitFill')}</option>
                    </select>
                    {draft.image_fit === 'contain' && (
                      <button
                        role='switch'
                        aria-checked={draft.style.containBlurBackground ?? false}
                        onClick={() => update({ style: { ...draft.style, containBlurBackground: !draft.style.containBlurBackground } })}
                        className='flex items-center justify-between gap-3 text-left'
                      >
                        <span className='text-[15px] text-[var(--ds-ink-muted)]'>{t('layout.wallPanel.blurBackground')}</span>
                        <SwitchTrack on={draft.style.containBlurBackground ?? false} />
                      </button>
                    )}
                  </div>
                  <div className={cn(CARD, 'flex flex-col gap-3')}>
                    <label htmlFor='wp-order' className='text-lg font-semibold'>
                      {t('layout.wallPanel.imageOrder')}
                    </label>
                    <select
                      id='wp-order'
                      value={draft.media_order}
                      onChange={e => update({ media_order: e.target.value as MediaOrder })}
                      className={INPUT}
                    >
                      <option value='random'>{t('layout.wallPanel.orderRandom')}</option>
                      <option value='sequential'>{t('layout.wallPanel.orderSequential')}</option>
                    </select>
                  </div>
                </div>

                <div className={cn(CARD, 'flex flex-col gap-3')}>
                  <div className='flex items-baseline justify-between'>
                    <label htmlFor='wp-duration' className='text-lg font-semibold'>
                      {t('layout.wallPanel.imageDuration')}
                    </label>
                    <span className='text-[28px] font-bold text-[var(--ds-accent)]'>{duration(draft.image_duration)}</span>
                  </div>
                  <input
                    id='wp-duration'
                    type='range'
                    min={5}
                    max={300}
                    step={5}
                    value={draft.image_duration}
                    onChange={e => update({ image_duration: Number(e.target.value) })}
                    className='h-8 w-full accent-[var(--ds-accent)]'
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* ── WIDGETS ── */}
        {tab === 'widgets' && (
          <>
            <p className='px-1 text-[15px] leading-relaxed text-[var(--ds-ink-muted)]'>{t('layout.wallPanel.widgetsInfo')}</p>

            <div className={cn(CARD, 'flex flex-col gap-3')}>
              <div>
                <p className='text-lg font-semibold'>{t('layout.wallPanel.widgetAnchor')}</p>
                <p className='mt-0.5 text-[15px] text-[var(--ds-ink-muted)]'>{t('layout.wallPanel.widgetAnchorDesc')}</p>
              </div>
              <Segmented
                value={draft.widgetAnchor ?? 'top'}
                onChange={widgetAnchor => update({ widgetAnchor })}
                label={t('layout.wallPanel.widgetAnchor')}
                options={ANCHORS.map(a => ({ value: a.id, label: t(a.labelKey) }))}
              />
            </div>

            <div className={cn(CARD, 'flex flex-col gap-3')}>
              <div>
                <p className='text-lg font-semibold'>{t('layout.wallPanel.widgetSize')}</p>
                <p className='mt-0.5 text-[15px] text-[var(--ds-ink-muted)]'>{t('layout.wallPanel.widgetSizeDesc')}</p>
              </div>
              <Segmented
                value={widgetExtentOf(draft)}
                onChange={widgetExtent => update({ widgetExtent })}
                label={t('layout.wallPanel.widgetSize')}
                options={EXTENTS.map(extent => ({
                  value: extent,
                  label: extent === 100 ? t('layout.wallPanel.widgetSizeFull') : `${extent} %`,
                }))}
              />
            </div>

            <div className={cn(CARD, 'flex flex-col gap-3')}>
              <div>
                <p className='text-lg font-semibold'>{t('layout.wallPanel.presenceEntity')}</p>
                <p className='mt-0.5 text-[15px] text-[var(--ds-ink-muted)]'>{t('layout.wallPanel.presenceEntityDesc')}</p>
              </div>
              <div className='flex items-center gap-2'>
                <div className='min-w-0 flex-1'>
                  <EntityPicker
                    label=''
                    value={draft.presence_entity ?? ''}
                    domain='binary_sensor'
                    onChange={presence_entity => update({ presence_entity })}
                  />
                </div>
                {draft.presence_entity && (
                  <button
                    onClick={() => update({ presence_entity: undefined })}
                    aria-label={t('common.delete')}
                    className='flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            {/* Les widgets se rangent sur la veille elle-même, comme sur le dashboard. */}
            <div className={cn(CARD, 'flex items-center justify-between gap-4')}>
              <div className='min-w-0'>
                <p className='text-lg font-semibold'>{t('layout.wallPanel.editWidgets')}</p>
                <p className='mt-0.5 text-[15px] text-[var(--ds-ink-muted)]'>
                  {t(widgetTotal === 1 ? 'layout.wallPanel.widgetCount_one' : 'layout.wallPanel.widgetCount_other', { count: widgetTotal })}
                </p>
              </div>
              <button onClick={handleEditWidgets} className={cn(BUTTON_PRIMARY, 'shrink-0 font-bold')}>
                <Layers size={18} />
                {t('layout.wallPanel.editWidgetsAction')}
              </button>
            </div>
          </>
        )}

        {/* ── STYLE ── */}
        {tab === 'style' && (
          <>
            <div className={cn(CARD, 'flex flex-col gap-3')}>
              <div className='flex items-baseline justify-between'>
                <label htmlFor='wp-blur' className='text-lg font-semibold'>
                  {t('layout.wallPanel.backgroundBlur')}
                </label>
                <span className='text-[28px] font-bold text-[var(--ds-accent)]'>{draft.style.backgroundBlur ?? 0} px</span>
              </div>
              <input
                id='wp-blur'
                type='range'
                min={0}
                max={40}
                step={2}
                value={draft.style.backgroundBlur ?? 0}
                onChange={e => update({ style: { ...draft.style, backgroundBlur: Number(e.target.value) } })}
                className='h-8 w-full accent-[var(--ds-accent)]'
              />
            </div>
            <div className={cn(CARD, 'flex flex-col gap-3')}>
              <p className='text-lg font-semibold'>{t('layout.wallPanel.clockLayout')}</p>
              <Segmented
                value={draft.clock_layout ?? 'clock'}
                onChange={clock_layout => update({ clock_layout })}
                label={t('layout.wallPanel.clockLayout')}
                options={[
                  { value: 'clock' as const, label: t('layout.wallPanel.clockLarge') },
                  { value: 'photo' as const, label: t('layout.wallPanel.clockPhoto') },
                ]}
              />
            </div>
          </>
        )}

        {/* ── GESTES ── */}
        {tab === 'gestures' && (
          <>
            <ToggleRow
              label={t('layout.wallPanel.gestures.enable')}
              description={t('layout.wallPanel.gestures.enableDesc')}
              checked={gestures.enabled}
              onChange={enabled => setGesture({ enabled })}
            />

            <div className={cn('space-y-3', !gestures.enabled && 'pointer-events-none')}>
              <ToggleRow
                label={t('layout.wallPanel.gestures.photos')}
                description={t('layout.wallPanel.gestures.photosDesc')}
                checked={gestures.photos}
                disabled={!gestures.enabled || draft.image_urls.length === 0}
                onChange={photos => setGesture({ photos })}
              />

              <div className={cn(CARD, !gestures.enabled && 'opacity-40')}>
                <PanelSelectField
                  label={t('layout.wallPanel.gestures.quickPanel')}
                  value={gestures.quickPanelId}
                  onChange={quickPanelId => setGesture({ quickPanelId })}
                />
                <p className='mt-2 text-[15px] text-[var(--ds-ink-muted)]'>{t('layout.wallPanel.gestures.quickPanelDesc')}</p>
              </div>

              <ToggleRow
                label={t('layout.wallPanel.gestures.notifications')}
                description={t('layout.wallPanel.gestures.notificationsDesc')}
                checked={gestures.notifications}
                disabled={!gestures.enabled}
                onChange={notifications => setGesture({ notifications })}
              />

              <ToggleRow
                label={t('layout.wallPanel.gestures.hints')}
                description={t('layout.wallPanel.gestures.hintsDesc')}
                checked={gestures.hints}
                disabled={!gestures.enabled}
                onChange={hints => setGesture({ hints })}
              />
            </div>

            <div className='rounded-[var(--ds-radius-xl)] bg-[var(--ds-tile-on)] p-5 text-[var(--ds-tile-on-ink)]'>
              <p className='text-[15px] leading-relaxed'>{t('layout.wallPanel.gestures.help')}</p>
            </div>
          </>
        )}
      </div>

      {/* Pied — l'enregistrement, et lui seul, écrit sur le serveur. */}
      <div className='shrink-0 py-4'>
        {confirmClose ? (
          <div className='flex items-center justify-between gap-3'>
            <p className='text-[var(--ds-warm-light)] text-sm'>{t('layout.wallPanel.unsavedWarning')}</p>
            <div className='flex items-center gap-2 shrink-0'>
              <button onClick={discard} className='h-11 rounded-full px-4 text-[15px] font-semibold text-[var(--ds-ink-muted)]'>
                {t('layout.wallPanel.discard')}
              </button>
              <button
                onClick={handleSave}
                className='h-11 rounded-full px-5 text-[15px] font-bold bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]'
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        ) : (
          <div className='flex items-center justify-between gap-3'>
            <p className={cn('text-sm', dirty ? 'text-[var(--ds-warm-light)]' : 'text-[var(--ds-ink-muted)]')}>
              {dirty ? t('layout.wallPanel.unsavedChanges') : t('layout.wallPanel.saved')}
            </p>
            <button
              onClick={handleSave}
              disabled={!dirty || isSaving}
              className='flex h-12 items-center gap-2 rounded-full px-6 text-base font-bold bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)] disabled:opacity-35 disabled:pointer-events-none'
            >
              {isSaving ? <Loader2 size={16} className='animate-spin' /> : <CloudUpload size={16} />}
              {t('common.save')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
