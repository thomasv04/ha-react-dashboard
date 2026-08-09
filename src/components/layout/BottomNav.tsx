import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Blinds, Lightbulb, Cpu, Flower2, Bell, ShieldHalf, Camera, ShieldCheck, GripVertical, EyeOff, Eye, Settings2 } from 'lucide-react';
import { usePanel, type PanelId, type BuiltinPanelId } from '@/context/PanelContext';
import { useHass } from '@hakit/core';
import { cn } from '@/lib/utils';
import { useEditMode } from '@/context/DashboardLayoutContext';
import { useState, useEffect, useRef } from 'react';
import { PanelSelectField } from '@/components/layout/WidgetEditModal/PanelSelectField';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useI18n } from '@/i18n';

interface Launcher {
  id: BuiltinPanelId;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  label: string;
  badge?: string | null;
  color: string;
  activeBg: string;
  activeBorder: string;
}

interface DockItem {
  id: BuiltinPanelId;
  hidden: boolean;
  panelId?: PanelId; // override: what panel to open (defaults to id)
}

const DOCK_STORAGE_KEY = 'ha-dashboard-dock-config';
const DOCK_LABELS_KEY = 'ha-dashboard-dock-labels';

function loadDockConfig(launchers: Launcher[]): DockItem[] {
  try {
    const stored = localStorage.getItem(DOCK_STORAGE_KEY);
    if (stored) {
      const parsed: DockItem[] = JSON.parse(stored);
      const existingIds = new Set(parsed.map(i => i.id));
      return [
        ...parsed.filter(i => launchers.some(l => l.id === i.id)),
        ...launchers.filter(l => !existingIds.has(l.id)).map(l => ({ id: l.id, hidden: false })),
      ];
    }
  } catch {
    // ignore
  }
  return launchers.map(l => ({ id: l.id, hidden: false }));
}

function saveDockConfig(config: DockItem[]) {
  localStorage.setItem(DOCK_STORAGE_KEY, JSON.stringify(config));
}

function loadShowLabels(): boolean {
  try {
    const v = localStorage.getItem(DOCK_LABELS_KEY);
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
}
function saveShowLabels(v: boolean) {
  localStorage.setItem(DOCK_LABELS_KEY, String(v));
}

export function BottomNav() {
  const { t } = useI18n();
  const { openPanel, closePanel, activePanel } = usePanel();
  // Ne s'abonner qu'aux deux valeurs dérivées, pas à la map d'entités entière :
  // le dock est monté en permanence et se re-rendait à chaque message WebSocket
  // de la maison. Un sélecteur qui renvoie un nombre / un booléen ne déclenche
  // un rendu que quand ce nombre change réellement.
  const lightsOn = useHass(
    s => Object.entries(s.entities ?? {}).filter(([id, e]) => id.startsWith('light.') && !id.includes('group') && e.state === 'on').length
  );
  const alarmArmed = useHass(s => (s.entities?.['alarm_control_panel.home_alarm']?.state ?? 'disarmed') !== 'disarmed');
  const { isEditMode } = useEditMode();
  const isWideDock = !useIsMobile(1024);
  const [showDockEditor, setShowDockEditor] = useState(false);
  const [showLabels, setShowLabels] = useState(() => loadShowLabels());
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isEditMode) setShowDockEditor(false);
  }, [isEditMode]);

  useEffect(() => {
    if (!showDockEditor) return;
    const handler = (e: MouseEvent) => {
      if (editorRef.current && !editorRef.current.contains(e.target as Node)) {
        setShowDockEditor(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDockEditor]);

  const launchers: Launcher[] = [
    {
      id: 'lumieres',
      icon: <Lightbulb size={22} />,
      label: t('panels.lights'),
      badge: lightsOn > 0 ? String(lightsOn) : null,
      color: 'text-yellow-400',
      activeBg: 'rgba(251,191,36,0.14)',
      activeBorder: 'rgba(251,191,36,0.28)',
    },
    {
      id: 'volets',
      icon: <Blinds size={22} />,
      label: t('panels.shutters'),
      badge: null,
      color: 'text-sky-400',
      activeBg: 'rgba(56,189,248,0.12)',
      activeBorder: 'rgba(56,189,248,0.26)',
    },
    {
      id: 'security',
      icon: <ShieldHalf size={22} />,
      activeIcon: <ShieldCheck size={22} />,
      label: t('panels.security'),
      badge: alarmArmed ? '!' : null,
      color: alarmArmed ? 'text-red-400' : 'text-green-400',
      activeBg: alarmArmed ? 'rgba(248,113,113,0.12)' : 'rgba(74,222,128,0.12)',
      activeBorder: alarmArmed ? 'rgba(248,113,113,0.26)' : 'rgba(74,222,128,0.26)',
    },
    {
      id: 'aspirateur',
      icon: <Cpu size={22} />,
      label: t('panels.vacuum'),
      badge: null,
      color: 'text-blue-400',
      activeBg: 'rgba(96,165,250,0.12)',
      activeBorder: 'rgba(96,165,250,0.26)',
    },
    {
      id: 'flowers',
      icon: <Flower2 size={22} />,
      label: t('panels.flowers'),
      badge: null,
      color: 'text-green-400',
      activeBg: 'rgba(74,222,128,0.12)',
      activeBorder: 'rgba(74,222,128,0.26)',
    },
    {
      id: 'cameras',
      icon: <Camera size={22} />,
      label: t('panels.camera'),
      badge: null,
      color: 'text-purple-400',
      activeBg: 'rgba(192,132,252,0.12)',
      activeBorder: 'rgba(192,132,252,0.26)',
    },
    {
      id: 'notifications',
      icon: <Bell size={22} />,
      label: t('panels.notifications'),
      badge: null,
      color: 'text-orange-400',
      activeBg: 'rgba(251,146,60,0.12)',
      activeBorder: 'rgba(251,146,60,0.26)',
    },
  ];

  const [dockConfig, setDockConfig] = useState<DockItem[]>(() => loadDockConfig(launchers));

  useEffect(() => {
    saveDockConfig(dockConfig);
  }, [dockConfig]);
  useEffect(() => {
    saveShowLabels(showLabels);
  }, [showLabels]);

  const toggleHidden = (id: BuiltinPanelId) => {
    setDockConfig(prev => prev.map(item => (item.id === id ? { ...item, hidden: !item.hidden } : item)));
  };

  const setPanelOverride = (id: BuiltinPanelId, panelId: PanelId) => {
    setDockConfig(prev => prev.map(item => (item.id === id ? { ...item, panelId } : item)));
  };

  const visibleItems = dockConfig.filter(i => !i.hidden);
  const orderedLaunchers = dockConfig.map(item => launchers.find(l => l.id === item.id)!).filter(Boolean);

  return (
    // z-[55] : au-dessus de la couche des panneaux (z-50), qui posait un
    // capteur de clic plein écran par-dessus le dock — il fallait donc un clic
    // pour fermer le panneau puis un second pour en ouvrir un autre. Le dock
    // reste sous les modales plein écran (z-60+). Le <nav> est
    // `pointer-events-none` : seule la pastille capte les clics, le reste de la
    // bande laisse passer la fermeture au clic extérieur.
    <nav className='fixed bottom-0 left-0 right-0 z-[55] flex flex-col items-center pointer-events-none'>
      {/* Dock editor popover */}
      <AnimatePresence>
        {showDockEditor && (
          <motion.div
            ref={editorRef}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className='pointer-events-auto mb-3 w-80'
          >
            <div
              className='rounded-2xl px-3 py-3 flex flex-col gap-1'
              style={{
                background: 'var(--dash-bg-card, rgba(6,6,24,0.72))',
                backdropFilter: 'blur(48px) saturate(160%)',
                WebkitBackdropFilter: 'blur(48px) saturate(160%)',
                border: '1px solid rgba(255,255,255,0.10)',
                boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset',
              }}
            >
              {/* Header + labels toggle */}
              <div className='flex items-center gap-2 px-1 mb-1'>
                <p className='text-white/40 text-[10px] font-semibold uppercase tracking-wider flex-1'>{t('layout.customizeDock')}</p>
                <button
                  onClick={() => setShowLabels(v => !v)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors',
                    showLabels ? 'bg-white/10 text-white/60 hover:bg-white/15' : 'bg-white/5 text-white/30 hover:bg-white/8'
                  )}
                >
                  <span>{showLabels ? 'Labels on' : 'Labels off'}</span>
                  <div className={cn('w-6 h-3.5 rounded-full transition-colors relative', showLabels ? 'bg-blue-500/70' : 'bg-white/15')}>
                    <div
                      className={cn(
                        'absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all',
                        showLabels ? 'right-0.5' : 'left-0.5'
                      )}
                    />
                  </div>
                </button>
              </div>
              <Reorder.Group axis='y' values={dockConfig} onReorder={setDockConfig} className='flex flex-col gap-1'>
                {orderedLaunchers.map(launcher => {
                  const item = dockConfig.find(i => i.id === launcher.id)!;
                  const isHidden = item?.hidden ?? false;
                  const currentPanelId: PanelId = item?.panelId ?? launcher.id;

                  return (
                    <Reorder.Item
                      key={launcher.id}
                      value={item}
                      className={cn(
                        'flex flex-col gap-1.5 px-2 py-2 rounded-xl transition-colors hover:bg-white/5',
                        isHidden ? 'opacity-40' : 'opacity-100'
                      )}
                    >
                      {/* Row: drag + icon + label + eye */}
                      <div className='flex items-center gap-2 cursor-grab active:cursor-grabbing'>
                        <GripVertical size={13} className='text-white/25 shrink-0' />
                        <span className={cn('shrink-0', launcher.color)} style={{ fontSize: 0, lineHeight: 0 }}>
                          <span style={{ display: 'inline-flex', transform: 'scale(0.75)' }}>{launcher.icon}</span>
                        </span>
                        <span className='text-white/75 text-sm font-medium flex-1'>{launcher.label}</span>
                        <button
                          onClick={() => toggleHidden(launcher.id)}
                          className='p-1 rounded-lg hover:bg-white/10 transition-colors text-white/35 hover:text-white/70 shrink-0'
                        >
                          {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                      </div>

                      {/* Panel selector */}
                      {!isHidden && (
                        <div className='ml-7'>
                          <PanelSelectField
                            label=''
                            value={currentPanelId ?? ''}
                            onChange={v => setPanelOverride(launcher.id, v as PanelId)}
                          />
                        </div>
                      )}
                    </Reorder.Item>
                  );
                })}
              </Reorder.Group>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dock pill
          Chaque item n'affichait qu'une icône de 36 px surmontée d'un libellé de
          9 px masqué sous 640 px : sur téléphone, sept icônes anonymes collées
          bord à bord. Désormais seul l'item actif porte son libellé, dans une
          pastille qui se déplie — lisible à toutes les largeurs, et la barre
          défile horizontalement si le dock déborde. */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className='pointer-events-auto mb-3 px-3 max-w-full'
        style={{ marginBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div
          className='flex items-center gap-1 p-1.5 rounded-[26px] max-w-full overflow-x-auto scrollbar-none'
          style={{
            background: 'var(--dash-bg-card, rgba(6,6,24,0.78))',
            backdropFilter: 'blur(56px) saturate(180%)',
            WebkitBackdropFilter: 'blur(56px) saturate(180%)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: 'var(--dash-elev-overlay)',
          }}
        >
          {visibleItems.map(({ id, panelId }) => {
            const launcher = launchers.find(l => l.id === id);
            if (!launcher) return null;
            const targetPanel: PanelId = panelId ?? id;
            const isActive = targetPanel === activePanel;
            const icon = isActive && launcher.activeIcon ? launcher.activeIcon : launcher.icon;

            // Au-delà de 1024 px (tablette murale en paysage) tout tient :
            // chaque pastille porte son libellé. En dessous, seul l'item actif
            // se déplie — sept icônes anonymes ne se distinguent pas.
            const showLabel = showLabels && (isActive || isWideDock);

            return (
              <motion.button
                key={launcher.id}
                layout
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                whileTap={{ scale: 0.93 }}
                // Un panneau ouvert se remplace directement par un autre ; et
                // retaper l'item actif le referme (bascule).
                onClick={() => {
                  if (isEditMode) return;
                  if (isActive) closePanel();
                  else openPanel(targetPanel);
                }}
                className={cn(
                  'relative h-11 shrink-0 rounded-[18px] flex items-center justify-center select-none border transition-colors duration-200',
                  showLabel ? 'gap-2 px-3' : 'w-11',
                  !isActive && 'hover:bg-white/8'
                )}
                style={
                  isActive
                    ? { background: launcher.activeBg, borderColor: launcher.activeBorder }
                    : { background: 'transparent', borderColor: 'transparent' }
                }
                title={launcher.label}
                aria-label={launcher.label}
                aria-current={isActive ? 'page' : undefined}
              >
                <span className={cn('transition-colors duration-200 shrink-0', isActive ? launcher.color : 'text-white/55')}>{icon}</span>

                {showLabel && (
                  <motion.span
                    layout='position'
                    className={cn('text-[13px] font-semibold leading-none whitespace-nowrap', isActive ? launcher.color : 'text-white/55')}
                  >
                    {launcher.label}
                  </motion.span>
                )}

                {launcher.badge && (
                  <span className='absolute top-0.5 right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none z-10 ring-2 ring-black/40'>
                    {launcher.badge}
                  </span>
                )}
              </motion.button>
            );
          })}

          {/* Settings button — edit mode only */}
          <AnimatePresence>
            {isEditMode && (
              <motion.button
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 44 }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                whileTap={{ scale: 0.93 }}
                onClick={() => setShowDockEditor(v => !v)}
                className='relative h-11 shrink-0 rounded-[18px] flex items-center justify-center select-none overflow-hidden border transition-colors'
                style={
                  showDockEditor
                    ? { background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.20)' }
                    : { background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)' }
                }
                title={t('layout.customizeDock')}
                aria-label={t('layout.customizeDock')}
              >
                <motion.span
                  animate={{ rotate: showDockEditor ? 45 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className='text-white/70'
                >
                  <Settings2 size={20} />
                </motion.span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </nav>
  );
}
