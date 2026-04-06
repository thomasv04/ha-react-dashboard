import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Plus, Trash2, Clock, Image, Layers, Settings2 } from 'lucide-react';
import { useWallPanel } from '@/context/WallPanelContext';
import { cn } from '@/lib/utils';
import type { ImageFit, MediaOrder } from '@/types/wallpanel';

type Tab = 'activation' | 'background' | 'widgets' | 'style';

interface WallPanelConfigModalProps {
  onClose: () => void;
}

export function WallPanelConfigModal({ onClose }: WallPanelConfigModalProps) {
  const { config, updateConfig, activate, wallPanelLayout } = useWallPanel();
  const [tab, setTab] = useState<Tab>('activation');
  const [newUrl, setNewUrl] = useState('');

  const handleDemo = () => {
    onClose();
    setTimeout(activate, 300);
  };

  const addImageUrl = () => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    updateConfig({ image_urls: [...config.image_urls, trimmed] });
    setNewUrl('');
  };

  const removeImageUrl = (idx: number) => {
    updateConfig({ image_urls: config.image_urls.filter((_, i) => i !== idx) });
  };

  type TabEntry = { id: Tab; label: string; icon: React.ComponentType<{ size?: number }> };
  const TABS: TabEntry[] = [
    { id: 'activation', label: 'Activation', icon: Clock },
    { id: 'background', label: 'Fond', icon: Image },
    { id: 'widgets', label: 'Widgets', icon: Layers },
    { id: 'style', label: 'Style', icon: Settings2 },
  ];

  return (
    <>
      <motion.div
          className='fixed inset-0 z-[110] bg-black/60'
          style={{ backdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        />
        <motion.div
          className='fixed inset-0 z-[111] flex items-center justify-center p-4 pointer-events-none'
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
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
                <h2 className='text-white font-semibold text-base'>WallPanel</h2>
                <p className='text-white/25 text-[11px] mt-0.5'>Écran de veille avec widgets</p>
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
                  Démo
                </button>
                <button
                  onClick={onClose}
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
                      : 'text-white/30 hover:text-white/55 hover:bg-white/5',
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
                      <p className='text-white/80 text-sm font-medium'>
                        Activer l'écran de veille
                      </p>
                      <p className='text-white/28 text-xs mt-0.5'>
                        Activation automatique après inactivité
                      </p>
                    </div>
                    <input
                      type='checkbox'
                      checked={config.enabled}
                      onChange={e => updateConfig({ enabled: e.target.checked })}
                      className='w-4 h-4 accent-purple-500'
                    />
                  </label>

                  <div>
                    <label className='text-white/55 text-xs font-medium block mb-1.5'>
                      Délai d'inactivité :{' '}
                      <span className='text-white/80'>{config.idle_time}s</span>
                    </label>
                    <input
                      type='range'
                      min={30}
                      max={1800}
                      step={30}
                      value={config.idle_time}
                      onChange={e => updateConfig({ idle_time: Number(e.target.value) })}
                      className='w-full accent-purple-500'
                      disabled={!config.enabled}
                    />
                    <div className='flex justify-between text-white/18 text-[10px] mt-0.5'>
                      <span>30s</span>
                      <span>5min</span>
                      <span>15min</span>
                      <span>30min</span>
                    </div>
                  </div>

                  <div>
                    <label className='text-white/55 text-xs font-medium block mb-1'>
                      Entité HA (optionnelle)
                    </label>
                    <input
                      type='text'
                      value={config.screensaver_entity ?? ''}
                      onChange={e =>
                        updateConfig({ screensaver_entity: e.target.value || undefined })
                      }
                      placeholder='input_boolean.wallpanel_screensaver'
                      className='w-full px-3 py-2 rounded-xl bg-white/5 border border-white/[0.08] text-white/70 text-sm outline-none focus:border-white/20'
                    />
                    <p className='text-white/20 text-[10px] mt-1'>
                      Si définie, HA peut déclencher l'écran de veille via cette entité
                    </p>
                  </div>

                  <div className='p-3 rounded-xl border border-purple-500/15 bg-purple-500/5'>
                    <p className='text-white/40 text-xs leading-relaxed'>
                      <span className='text-purple-300/70 font-medium'>Activation forcée</span>{' '}
                      — ajoutez
                      <code className='mx-1 px-1.5 py-0.5 rounded bg-white/[0.08] text-purple-200/70 text-[10px]'>
                        ?wp_enabled=true
                      </code>
                      à l'URL pour activer immédiatement (utile pour tablette murale).
                    </p>
                  </div>
                </>
              )}

              {/* ── FOND ── */}
              {tab === 'background' && (
                <>
                  <div>
                    <p className='text-white/55 text-xs font-medium mb-2'>Images de fond</p>
                    <div className='space-y-1.5 mb-2'>
                      {config.image_urls.map((url, i) => (
                        <div
                          key={i}
                          className='flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/[0.07] group'
                        >
                          <span className='flex-1 truncate text-white/55 text-xs font-mono'>
                            {url}
                          </span>
                          <button
                            onClick={() => removeImageUrl(i)}
                            className='text-red-400/40 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100'
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                      {config.image_urls.length === 0 && (
                        <p className='text-white/18 text-xs text-center py-3'>
                          Aucune image — fond dégradé utilisé
                        </p>
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
                      <label className='text-white/55 text-xs font-medium block mb-1'>
                        Ajustement
                      </label>
                      <select
                        value={config.image_fit}
                        onChange={e => updateConfig({ image_fit: e.target.value as ImageFit })}
                        className='w-full px-3 py-2 rounded-xl bg-white/5 border border-white/[0.08] text-white/70 text-xs outline-none'
                      >
                        <option value='cover'>Cover (recadré)</option>
                        <option value='contain'>Contain (entier)</option>
                        <option value='fill'>Fill (étiré)</option>
                      </select>
                      {config.image_fit === 'contain' && (
                        <label className='flex items-center gap-2 mt-2 cursor-pointer select-none'>
                          <input
                            type='checkbox'
                            checked={config.style.containBlurBackground ?? false}
                            onChange={e =>
                              updateConfig({
                                style: { ...config.style, containBlurBackground: e.target.checked },
                              })
                            }
                            className='accent-purple-500 w-3.5 h-3.5'
                          />
                          <span className='text-white/50 text-xs'>Fond flou (remplir les bandes)</span>
                        </label>
                      )}
                    </div>
                    <div>
                      <label className='text-white/55 text-xs font-medium block mb-1'>
                        Ordre
                      </label>
                      <select
                        value={config.media_order}
                        onChange={e =>
                          updateConfig({ media_order: e.target.value as MediaOrder })
                        }
                        className='w-full px-3 py-2 rounded-xl bg-white/5 border border-white/[0.08] text-white/70 text-xs outline-none'
                      >
                        <option value='random'>Aléatoire</option>
                        <option value='sequential'>Séquentiel</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className='text-white/55 text-xs font-medium block mb-1.5'>
                      Durée par image :{' '}
                      <span className='text-white/80'>{config.image_duration}s</span>
                    </label>
                    <input
                      type='range'
                      min={5}
                      max={300}
                      step={5}
                      value={config.image_duration}
                      onChange={e =>
                        updateConfig({ image_duration: Number(e.target.value) })
                      }
                      className='w-full accent-purple-500'
                    />
                  </div>
                </>
              )}

              {/* ── WIDGETS ── */}
              {tab === 'widgets' && (
                <div className='space-y-3'>
                  <p className='text-white/35 text-xs leading-relaxed'>
                    Les widgets sont disposés librement sur l'écran de veille via le même
                    système de grille que le dashboard principal. Cliquez sur{' '}
                    <strong className='text-white/55'>Démo</strong> pour prévisualiser
                    l'overlay et ajouter des widgets.
                  </p>
                  <div className='p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] text-center'>
                    <p className='text-white/22 text-xs mb-2'>
                      {wallPanelLayout.widgets.lg.length} widget
                      {wallPanelLayout.widgets.lg.length !== 1 ? 's' : ''} configuré
                      {wallPanelLayout.widgets.lg.length !== 1 ? 's' : ''}
                    </p>
                    <button
                      onClick={handleDemo}
                      className='text-xs px-4 py-2 rounded-xl border border-purple-500/30 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 transition-colors'
                    >
                      Ouvrir l'aperçu
                    </button>
                  </div>
                </div>
              )}

              {/* ── STYLE ── */}
              {tab === 'style' && (
                <>
                  <div>
                    <label className='text-white/55 text-xs font-medium block mb-1.5'>
                      Flou de fond :{' '}
                      <span className='text-white/80'>{config.style.backgroundBlur ?? 0}px</span>
                    </label>
                    <input
                      type='range'
                      min={0}
                      max={40}
                      step={2}
                      value={config.style.backgroundBlur ?? 0}
                      onChange={e =>
                        updateConfig({
                          style: { ...config.style, backgroundBlur: Number(e.target.value) },
                        })
                      }
                      className='w-full accent-purple-500'
                    />
                  </div>
                  <div>
                    <label className='text-white/55 text-xs font-medium block mb-1.5'>
                      Largeur boîte info :{' '}
                      <span className='text-white/80'>
                        {config.style.infoBoxWidth ?? 380}px
                      </span>
                    </label>
                    <input
                      type='range'
                      min={200}
                      max={600}
                      step={10}
                      value={config.style.infoBoxWidth ?? 380}
                      onChange={e =>
                        updateConfig({
                          style: { ...config.style, infoBoxWidth: Number(e.target.value) },
                        })
                      }
                      className='w-full accent-purple-500'
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </motion.div>
      </>
  );
}
