import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Blinds, Lightbulb, Cpu, Flower2, Bell, ShieldHalf, Camera, ShieldCheck, GripVertical, EyeOff, Eye, Settings2 } from 'lucide-react';
import { usePanel, type PanelId, type BuiltinPanelId } from '@/context/PanelContext';
import { useHass } from '@hakit/core';
import { cn } from '@/lib/utils';
import { useEditMode } from '@/context/DashboardLayoutContext';
import { useState, useEffect, useRef } from 'react';
import { PanelSelectField } from '@/components/layout/WidgetEditModal/PanelSelectField';

interface Launcher {
  id: BuiltinPanelId;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  label: string;
  badge?: string | null;
  color: string;
  activeIconBg: string;
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
  const { openPanel, activePanel } = usePanel();
  const entities = useHass(s => s.entities);
  const { isEditMode } = useEditMode();
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

  const lightsOn = Object.entries(entities ?? {}).filter(
    ([id, e]) => id.startsWith('light.') && !id.includes('group') && e.state === 'on'
  ).length;

  const alarmArmed = entities?.['alarm_control_panel.home_alarm']?.state !== 'disarmed';

  const launchers: Launcher[] = [
    {
      id: 'lumieres',
      icon: <Lightbulb size={22} />,
      label: 'Lumières',
      badge: lightsOn > 0 ? String(lightsOn) : null,
      color: 'text-yellow-400',
      activeIconBg: 'bg-yellow-400/25',
    },
    {
      id: 'volets',
      icon: <Blinds size={22} />,
      label: 'Volets',
      badge: null,
      color: 'text-sky-400',
      activeIconBg: 'bg-sky-400/25',
    },
    {
      id: 'security',
      icon: <ShieldHalf size={22} />,
      activeIcon: <ShieldCheck size={22} />,
      label: 'Sécurité',
      badge: alarmArmed ? '!' : null,
      color: alarmArmed ? 'text-red-400' : 'text-green-400',
      activeIconBg: alarmArmed ? 'bg-red-400/25' : 'bg-green-400/25',
    },
    {
      id: 'aspirateur',
      icon: <Cpu size={22} />,
      label: 'Aspirateur',
      badge: null,
      color: 'text-blue-400',
      activeIconBg: 'bg-blue-400/25',
    },
    {
      id: 'flowers',
      icon: <Flower2 size={22} />,
      label: 'Plantes',
      badge: null,
      color: 'text-green-400',
      activeIconBg: 'bg-green-400/25',
    },
    {
      id: 'cameras',
      icon: <Camera size={22} />,
      label: 'Caméras',
      badge: null,
      color: 'text-purple-400',
      activeIconBg: 'bg-purple-400/25',
    },
    {
      id: 'notifications',
      icon: <Bell size={22} />,
      label: 'Notifs',
      badge: null,
      color: 'text-orange-400',
      activeIconBg: 'bg-orange-400/25',
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
    <nav className='fixed bottom-0 left-0 right-0 z-50 flex flex-col items-center pointer-events-none'>
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
                <p className='text-white/40 text-[10px] font-semibold uppercase tracking-wider flex-1'>Personnaliser le dock</p>
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

      {/* Dock pill */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className='pointer-events-auto mb-4'
      >
        <div
          className={cn('flex items-center gap-1 px-3 rounded-[28px]', showLabels ? 'py-2.5 items-end' : 'py-3 items-center')}
          style={{
            background: 'var(--dash-bg-card, rgba(6,6,24,0.72))',
            backdropFilter: 'blur(48px) saturate(160%)',
            WebkitBackdropFilter: 'blur(48px) saturate(160%)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 1px 0 rgba(255,255,255,0.06) inset',
          }}
        >
          {visibleItems.map(({ id, panelId }) => {
            const launcher = launchers.find(l => l.id === id);
            if (!launcher) return null;
            const targetPanel: PanelId = panelId ?? id;
            const isActive = targetPanel === activePanel;
            const icon = isActive && launcher.activeIcon ? launcher.activeIcon : launcher.icon;

            return (
              <motion.button
                key={launcher.id}
                whileHover={{ scale: 1.12, y: showLabels ? -4 : -3 }}
                whileTap={{ scale: 0.92, y: 0 }}
                onClick={() => !isEditMode && openPanel(targetPanel)}
                className={cn(
                  'relative flex flex-col items-center rounded-2xl transition-all duration-200 select-none',
                  showLabels ? 'gap-1.5 px-2.5 py-1' : 'px-1.5 py-0'
                )}
                title={launcher.label}
              >
                <div
                  className={cn(
                    'rounded-2xl flex items-center justify-center transition-all duration-200',
                    showLabels ? 'w-12 h-12' : 'w-11 h-11',
                    isActive ? launcher.activeIconBg : 'bg-white/5 hover:bg-white/10'
                  )}
                >
                  <span className={cn('transition-colors duration-200', isActive ? launcher.color : 'text-white/50')}>{icon}</span>
                </div>
                {showLabels && (
                  <span
                    className={cn(
                      'text-[9px] font-semibold leading-none transition-colors duration-200',
                      isActive ? launcher.color : 'text-white/35'
                    )}
                  >
                    {launcher.label}
                  </span>
                )}
                {launcher.badge && (
                  <span className='absolute top-0.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none z-10 shadow-lg'>
                    {launcher.badge}
                  </span>
                )}
                {isActive && (
                  <motion.div
                    layoutId='dock-active-dot'
                    className={cn('absolute -bottom-0.5 w-1 h-1 rounded-full', launcher.color.replace('text-', 'bg-'))}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
              </motion.button>
            );
          })}

          {/* Settings button — edit mode only */}
          <AnimatePresence>
            {isEditMode && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: 'auto' }}
                exit={{ opacity: 0, scale: 0.8, width: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                whileHover={{ scale: 1.12, y: -4 }}
                whileTap={{ scale: 0.92, y: 0 }}
                onClick={() => setShowDockEditor(v => !v)}
                className='relative flex flex-col items-center gap-1.5 px-2.5 py-1 rounded-2xl transition-all duration-200 select-none overflow-hidden'
                title='Personnaliser le dock'
              >
                <div
                  className={cn(
                    'w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200',
                    showDockEditor ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'
                  )}
                >
                  <motion.span
                    animate={{ rotate: showDockEditor ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className='text-white/60'
                  >
                    <Settings2 size={22} />
                  </motion.span>
                </div>
                <span className='text-[9px] font-semibold leading-none text-white/35'>Dock</span>
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </nav>
  );
}
