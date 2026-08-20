import { useState } from 'react';
import { motion } from 'framer-motion';
import { EASE_OUT } from '@/lib/motion-tokens';
import { X, Play, Plus, Trash2, Clock, Image, Layers, Settings2, Hand, CloudUpload, Loader2 } from 'lucide-react';
import { useWallPanel } from '@/context/WallPanelContext';
import { usePages } from '@/context/PageContext';
import { useDashboardLayout } from '@/context/DashboardLayoutContext';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useCustomPanels } from '@/context/CustomPanelContext';
import { useDashboardConfig } from '@/hooks/useDashboardConfig';
import { PanelSelectField } from '@/components/layout/WidgetEditModal/PanelSelectField';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { gesturesOf, widgetExtentOf, type ImageFit, type MediaOrder, type WallPanelConfig, type WidgetAnchor } from '@/types/wallpanel';

/** Parts d'écran proposées — de la pleine largeur au quart. */
const EXTENTS = [100, 75, 50, 33, 25];

const ANCHORS: Array<{ id: WidgetAnchor; labelKey: string }> = [
  { id: 'top', labelKey: 'layout.wallPanel.anchorTop' },
  { id: 'bottom', labelKey: 'layout.wallPanel.anchorBottom' },
  { id: 'left', labelKey: 'layout.wallPanel.anchorLeft' },
  { id: 'right', labelKey: 'layout.wallPanel.anchorRight' },
];

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
    <label className={cn('flex items-center justify-between gap-4', disabled && 'opacity-40')}>
      <div className='min-w-0'>
        <p className='text-white/80 text-sm font-medium'>{label}</p>
        {description && <p className='text-white/28 text-xs mt-0.5'>{description}</p>}
      </div>
      <input
        type='checkbox'
        checked={checked}
        disabled={disabled}
        onChange={e => onChange(e.target.checked)}
        className='w-4 h-4 accent-purple-500 shrink-0'
      />
    </label>
  );
}

interface WallPanelConfigModalProps {
  onClose: () => void;
}

export function WallPanelConfigModal({ onClose }: WallPanelConfigModalProps) {
  const { t } = useI18n();
  const { config, updateConfig, activate, wallPanelLayout, wallPanelWidgetConfigs } = useWallPanel();
  const { pages } = usePages();
  const { allLayouts } = useDashboardLayout();
  const { allWidgetConfigsByPage } = useWidgetConfig();
  const { panels: customPanels, dock } = useCustomPanels();
  const { saveConfig, isSaving } = useDashboardConfig();

  const [tab, setTab] = useState<Tab>('activation');
  const [newUrl, setNewUrl] = useState('');

  // Chaque réglage s'appliquait au contexte à la frappe, et n'atteignait le
  // serveur que si l'on repassait le dashboard en édition pour l'enregistrer :
  // fermer la modale donnait une configuration vivante mais perdue au
  // rechargement. Elle édite maintenant un brouillon.
  // Initialiseur paresseux plutôt qu'un ref : la valeur est lue au rendu pour
  // savoir si le brouillon a bougé, et un ref n'a pas le droit de l'être.
  const [initial] = useState(config);
  const [draft, setDraft] = useState<WallPanelConfig>(config);
  const [confirmClose, setConfirmClose] = useState(false);

  const update = (partial: Partial<WallPanelConfig>) => setDraft(d => ({ ...d, ...partial }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const save = async (next: WallPanelConfig = draft) => {
    updateConfig(next);
    await saveConfig({
      version: 2,
      pages,
      layouts: allLayouts,
      widgetConfigs: allWidgetConfigsByPage,
      wallPanel: { config: next, layout: wallPanelLayout, widgetConfigs: wallPanelWidgetConfigs },
      customPanels,
      dock,
    });
  };

  const handleSave = async () => {
    await save();
    onClose();
  };

  /** Fermeture : rien ne sort d'ici sans un choix explicite. */
  const requestClose = () => (dirty ? setConfirmClose(true) : onClose());

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
    <>
      <motion.div
        className='fixed inset-0 z-[110] bg-black/60'
        style={{ backdropFilter: 'blur(6px)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={requestClose}
      />
      <motion.div
        className='fixed inset-0 z-[111] flex items-center justify-center p-4 pointer-events-none'
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.22, ease: EASE_OUT }}
      >
        <div
          className='pointer-events-auto w-full max-w-lg rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col'
          style={{
            background: 'rgba(8,12,35,0.97)',
            backdropFilter: 'blur(24px)',
            maxHeight: 'min(680px,calc(100vh - 32px))',
          }}
        >
          {/* Header */}
          <div className='flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.08] shrink-0'>
            <div>
              <h2 className='text-white font-semibold text-base'>{t('layout.wallPanel.subtitle')}</h2>
              <p className='text-white/25 text-[11px] mt-0.5'>{t('layout.wallPanel.demo')}</p>
            </div>
            <div className='flex items-center gap-2'>
              <button
                onClick={handleDemo}
                className='flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors'
                style={{
                  background: 'rgba(168,85,247,0.18)',
                  border: '1px solid rgba(168,85,247,0.35)',
                  color: '#d8b4fe',
                }}
              >
                <Play size={12} />
                {t('layout.wallPanel.demo')}
              </button>
              <button
                onClick={requestClose}
                aria-label={t('common.close')}
                className='p-1.5 rounded-xl text-white/25 hover:text-white/70 hover:bg-white/[0.08] transition-colors'
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className='flex items-center gap-1 px-4 py-2.5 border-b border-white/[0.06] shrink-0'>
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all',
                  tab === t.id
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'text-white/30 hover:text-white/55 hover:bg-white/5'
                )}
              >
                <t.icon size={12} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className='flex-1 overflow-y-auto px-5 py-4 space-y-5'>
            {/* ── ACTIVATION ── */}
            {tab === 'activation' && (
              <>
                <label className='flex items-center justify-between'>
                  <div>
                    <p className='text-white/80 text-sm font-medium'>{t('layout.wallPanel.enableScreensaver')}</p>
                    <p className='text-white/28 text-xs mt-0.5'>{t('layout.wallPanel.enableScreensaverDesc')}</p>
                  </div>
                  <input
                    type='checkbox'
                    checked={draft.enabled}
                    onChange={e => update({ enabled: e.target.checked })}
                    className='w-4 h-4 accent-purple-500'
                  />
                </label>

                <div>
                  <label className='text-white/55 text-xs font-medium block mb-1.5'>
                    {t('layout.wallPanel.idleDelay')} : <span className='text-white/80'>{draft.idle_time}s</span>
                  </label>
                  <input
                    type='range'
                    min={30}
                    max={1800}
                    step={30}
                    value={draft.idle_time}
                    onChange={e => update({ idle_time: Number(e.target.value) })}
                    className='w-full accent-purple-500'
                    disabled={!draft.enabled}
                  />
                  <div className='flex justify-between text-white/18 text-[10px] mt-0.5'>
                    <span>30s</span>
                    <span>5min</span>
                    <span>15min</span>
                    <span>30min</span>
                  </div>
                </div>

                <div>
                  <label className='text-white/55 text-xs font-medium block mb-1'>{t('layout.wallPanel.haEntity')}</label>
                  <input
                    type='text'
                    value={draft.screensaver_entity ?? ''}
                    onChange={e => update({ screensaver_entity: e.target.value || undefined })}
                    placeholder='input_boolean.wallpanel_screensaver'
                    className='w-full px-3 py-2 rounded-xl bg-white/5 border border-white/[0.08] text-white/70 text-sm outline-none focus:border-white/20'
                  />
                  <p className='text-white/20 text-[10px] mt-1'>{t('layout.wallPanel.haEntityDesc')}</p>
                </div>

                <div className='p-3 rounded-xl border border-purple-500/15 bg-purple-500/5'>
                  <p className='text-white/40 text-xs leading-relaxed'>
                    <span className='text-purple-300/70 font-medium'>{t('layout.wallPanel.forcedActivation')}</span> — ajoutez
                    <code className='mx-1 px-1.5 py-0.5 rounded bg-white/[0.08] text-purple-200/70 text-[10px]'>?hrd_screensaver=true</code>
                    à l'URL pour activer immédiatement (utile pour tablette murale).
                  </p>
                </div>
              </>
            )}

            {/* ── FOND ── */}
            {tab === 'background' && (
              <>
                <div>
                  <p className='text-white/55 text-xs font-medium mb-2'>{t('layout.wallPanel.backgroundImages')}</p>
                  <div className='space-y-1.5 mb-2'>
                    {draft.image_urls.map((url, i) => (
                      <div key={i} className='flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/[0.07] group'>
                        <span className='flex-1 truncate text-white/55 text-xs font-mono'>{url}</span>
                        <button
                          onClick={() => removeImageUrl(i)}
                          className='text-red-400/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100'
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {draft.image_urls.length === 0 && (
                      <p className='text-white/18 text-xs text-center py-3'>{t('layout.wallPanel.noImages')}</p>
                    )}
                  </div>
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      value={newUrl}
                      onChange={e => setNewUrl(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addImageUrl()}
                      placeholder='https://... ou media-source://...'
                      className='flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/[0.08] text-white/70 text-xs outline-none focus:border-white/20'
                    />
                    <button
                      onClick={addImageUrl}
                      className='px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:bg-purple-500/30 transition-colors'
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <label className='text-white/55 text-xs font-medium block mb-1'>{t('layout.wallPanel.imageFit')}</label>
                    <select
                      value={draft.image_fit}
                      onChange={e => update({ image_fit: e.target.value as ImageFit })}
                      className='w-full px-3 py-2 rounded-xl bg-white/5 border border-white/[0.08] text-white/70 text-xs outline-none'
                    >
                      <option value='cover'>{t('layout.wallPanel.fitCover')}</option>
                      <option value='contain'>{t('layout.wallPanel.fitContain')}</option>
                      <option value='fill'>{t('layout.wallPanel.fitFill')}</option>
                    </select>
                    {draft.image_fit === 'contain' && (
                      <label className='flex items-center gap-2 mt-2 cursor-pointer select-none'>
                        <input
                          type='checkbox'
                          checked={draft.style.containBlurBackground ?? false}
                          onChange={e =>
                            update({
                              style: { ...draft.style, containBlurBackground: e.target.checked },
                            })
                          }
                          className='accent-purple-500 w-3.5 h-3.5'
                        />
                        <span className='text-white/50 text-xs'>{t('layout.wallPanel.blurBackground')}</span>
                      </label>
                    )}
                  </div>
                  <div>
                    <label className='text-white/55 text-xs font-medium block mb-1'>{t('layout.wallPanel.imageOrder')}</label>
                    <select
                      value={draft.media_order}
                      onChange={e => update({ media_order: e.target.value as MediaOrder })}
                      className='w-full px-3 py-2 rounded-xl bg-white/5 border border-white/[0.08] text-white/70 text-xs outline-none'
                    >
                      <option value='random'>{t('layout.wallPanel.orderRandom')}</option>
                      <option value='sequential'>{t('layout.wallPanel.orderSequential')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className='text-white/55 text-xs font-medium block mb-1.5'>
                    {t('layout.wallPanel.imageDuration')} : <span className='text-white/80'>{draft.image_duration}s</span>
                  </label>
                  <input
                    type='range'
                    min={5}
                    max={300}
                    step={5}
                    value={draft.image_duration}
                    onChange={e => update({ image_duration: Number(e.target.value) })}
                    className='w-full accent-purple-500'
                  />
                </div>
              </>
            )}

            {/* ── WIDGETS ── */}
            {tab === 'widgets' && (
              <div className='space-y-3'>
                <p className='text-white/35 text-xs leading-relaxed'>{t('layout.wallPanel.widgetsInfo')}</p>

                <div>
                  <p className='text-white/55 text-xs font-medium'>{t('layout.wallPanel.widgetAnchor')}</p>
                  <p className='text-white/28 text-[10px] mt-0.5 mb-2'>{t('layout.wallPanel.widgetAnchorDesc')}</p>
                  <div className='grid grid-cols-4 gap-2'>
                    {ANCHORS.map(a => (
                      <button
                        key={a.id}
                        onClick={() => update({ widgetAnchor: a.id })}
                        className={cn(
                          'px-2 py-2 rounded-xl text-[11px] font-medium border transition-colors',
                          (draft.widgetAnchor ?? 'top') === a.id
                            ? 'bg-purple-500/20 text-purple-200 border-purple-500/40'
                            : 'bg-white/5 text-white/45 border-white/[0.08] hover:text-white/70'
                        )}
                      >
                        {t(a.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className='text-white/55 text-xs font-medium'>{t('layout.wallPanel.widgetSize')}</p>
                  <p className='text-white/28 text-[10px] mt-0.5 mb-2'>{t('layout.wallPanel.widgetSizeDesc')}</p>
                  <div className='grid grid-cols-5 gap-2'>
                    {EXTENTS.map(extent => (
                      <button
                        key={extent}
                        onClick={() => update({ widgetExtent: extent })}
                        className={cn(
                          'px-2 py-2 rounded-xl text-[11px] font-medium border transition-colors',
                          widgetExtentOf(draft) === extent
                            ? 'bg-purple-500/20 text-purple-200 border-purple-500/40'
                            : 'bg-white/5 text-white/45 border-white/[0.08] hover:text-white/70'
                        )}
                      >
                        {extent === 100 ? t('layout.wallPanel.widgetSizeFull') : `${extent} %`}
                      </button>
                    ))}
                  </div>
                </div>

                <div className='p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-center'>
                  <p className='text-white/22 text-xs mb-2'>
                    {wallPanelLayout.widgets.lg.length}{' '}
                    {wallPanelLayout.widgets.lg.length !== 1
                      ? t('layout.wallPanel.widgetCount_other')
                      : t('layout.wallPanel.widgetCount_one')}
                  </p>
                  <button
                    onClick={handleDemo}
                    className='text-xs px-4 py-2 rounded-xl border border-purple-500/30 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 transition-colors'
                  >
                    {t('layout.wallPanel.openPreview')}
                  </button>
                </div>
              </div>
            )}

            {/* ── STYLE ── */}
            {tab === 'style' && (
              <>
                <div>
                  <label className='text-white/55 text-xs font-medium block mb-1.5'>
                    {t('layout.wallPanel.backgroundBlur')} : <span className='text-white/80'>{draft.style.backgroundBlur ?? 0}px</span>
                  </label>
                  <input
                    type='range'
                    min={0}
                    max={40}
                    step={2}
                    value={draft.style.backgroundBlur ?? 0}
                    onChange={e =>
                      update({
                        style: { ...draft.style, backgroundBlur: Number(e.target.value) },
                      })
                    }
                    className='w-full accent-purple-500'
                  />
                </div>
                <div>
                  <label className='text-white/55 text-xs font-medium block mb-1.5'>
                    {t('layout.wallPanel.infoBoxWidth')} : <span className='text-white/80'>{draft.style.infoBoxWidth ?? 380}px</span>
                  </label>
                  <input
                    type='range'
                    min={200}
                    max={600}
                    step={10}
                    value={draft.style.infoBoxWidth ?? 380}
                    onChange={e =>
                      update({
                        style: { ...draft.style, infoBoxWidth: Number(e.target.value) },
                      })
                    }
                    className='w-full accent-purple-500'
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

                <div className={cn('space-y-5', !gestures.enabled && 'pointer-events-none')}>
                  <ToggleRow
                    label={t('layout.wallPanel.gestures.photos')}
                    description={t('layout.wallPanel.gestures.photosDesc')}
                    checked={gestures.photos}
                    disabled={!gestures.enabled || draft.image_urls.length === 0}
                    onChange={photos => setGesture({ photos })}
                  />

                  <div className={cn(!gestures.enabled && 'opacity-40')}>
                    <PanelSelectField
                      label={t('layout.wallPanel.gestures.quickPanel')}
                      value={gestures.quickPanelId}
                      onChange={quickPanelId => setGesture({ quickPanelId })}
                    />
                    <p className='text-white/20 text-[10px] mt-1'>{t('layout.wallPanel.gestures.quickPanelDesc')}</p>
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

                <div className='p-3 rounded-xl border border-purple-500/15 bg-purple-500/5'>
                  <p className='text-white/40 text-xs leading-relaxed'>{t('layout.wallPanel.gestures.help')}</p>
                </div>
              </>
            )}
          </div>

          {/* Pied — l'enregistrement, et lui seul, écrit sur le serveur. */}
          <div className='shrink-0 border-t border-white/[0.08] px-5 py-3'>
            {confirmClose ? (
              <div className='flex items-center justify-between gap-3'>
                <p className='text-amber-200/80 text-xs'>{t('layout.wallPanel.unsavedWarning')}</p>
                <div className='flex items-center gap-2 shrink-0'>
                  <button
                    onClick={discard}
                    className='px-3 py-1.5 rounded-xl text-xs font-medium text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-colors'
                  >
                    {t('layout.wallPanel.discard')}
                  </button>
                  <button
                    onClick={handleSave}
                    className='px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-500/20 border border-purple-500/35 text-purple-200 hover:bg-purple-500/30 transition-colors'
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            ) : (
              <div className='flex items-center justify-between gap-3'>
                <p className={cn('text-[11px]', dirty ? 'text-amber-200/70' : 'text-white/20')}>
                  {dirty ? t('layout.wallPanel.unsavedChanges') : t('layout.wallPanel.saved')}
                </p>
                <button
                  onClick={handleSave}
                  disabled={!dirty || isSaving}
                  className='flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium bg-purple-500/20 border border-purple-500/35 text-purple-200 hover:bg-purple-500/30 disabled:opacity-35 disabled:pointer-events-none transition-colors'
                >
                  {isSaving ? <Loader2 size={12} className='animate-spin' /> : <CloudUpload size={12} />}
                  {t('common.save')}
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
