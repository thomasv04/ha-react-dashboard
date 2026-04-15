import { motion } from 'framer-motion';
import { Blinds, Lightbulb, Cpu, Flower2, Bell, ShieldHalf, Camera, ShieldCheck } from 'lucide-react';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { useHass } from '@hakit/core';
import { cn } from '@/lib/utils';

interface Launcher {
  id: PanelId;
  icon: React.ReactNode;
  activeIcon?: React.ReactNode;
  label: string;
  badge?: string | null;
  color: string;
  activeBg: string;
}

export function BottomNav() {
  const { openPanel, activePanel } = usePanel();
  const entities = useHass(s => s.entities);

  const lightsOn = Object.entries(entities ?? {}).filter(
    ([id, e]) => id.startsWith('light.') && !id.includes('group') && e.state === 'on'
  ).length;

  const alarmArmed = entities?.['alarm_control_panel.home_alarm']?.state !== 'disarmed';

  const launchers: Launcher[] = [
    {
      id: 'lumieres',
      icon: <Lightbulb size={19} />,
      label: 'Lumières',
      badge: lightsOn > 0 ? String(lightsOn) : null,
      color: 'text-yellow-400',
      activeBg: 'bg-yellow-500/15',
    },
    {
      id: 'volets',
      icon: <Blinds size={19} />,
      label: 'Volets',
      badge: null,
      color: 'text-sky-400',
      activeBg: 'bg-sky-500/15',
    },
    {
      id: 'security',
      icon: <ShieldHalf size={19} />,
      activeIcon: <ShieldCheck size={19} />,
      label: 'Sécurité',
      badge: alarmArmed ? '!' : null,
      color: alarmArmed ? 'text-red-400' : 'text-green-400',
      activeBg: alarmArmed ? 'bg-red-500/15' : 'bg-green-500/15',
    },
    {
      id: 'aspirateur',
      icon: <Cpu size={19} />,
      label: 'Aspirateur',
      badge: null,
      color: 'text-blue-400',
      activeBg: 'bg-blue-500/15',
    },
    {
      id: 'flowers',
      icon: <Flower2 size={19} />,
      label: 'Plantes',
      badge: null,
      color: 'text-green-400',
      activeBg: 'bg-green-500/15',
    },
    {
      id: 'cameras',
      icon: <Camera size={19} />,
      label: 'Caméras',
      badge: null,
      color: 'text-purple-400',
      activeBg: 'bg-purple-500/15',
    },
    {
      id: 'notifications',
      icon: <Bell size={19} />,
      label: 'Notifs',
      badge: null,
      color: 'text-orange-400',
      activeBg: 'bg-orange-500/15',
    },
  ];

  return (
    <nav className='fixed bottom-0 left-0 right-0 z-50'>
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className='gc-pill border-t border-white/8 px-3 py-2 flex items-center justify-around'
      >
        {launchers.map(launcher => {
          const isActive = launcher.id === activePanel;
          const icon = isActive && launcher.activeIcon ? launcher.activeIcon : launcher.icon;
          return (
            <motion.button
              key={launcher.id}
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => openPanel(launcher.id)}
              className={cn(
                'relative flex flex-col items-center gap-1 px-2 py-1.5 rounded-xl transition-colors',
                isActive ? `${launcher.color} ${launcher.activeBg}` : 'text-white/35 hover:text-white/60 hover:bg-white/5'
              )}
            >
              {launcher.badge && (
                <span className='absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none z-10'>
                  {launcher.badge}
                </span>
              )}
              {icon}
              <span className='text-[9px] font-medium leading-none'>{launcher.label}</span>
            </motion.button>
          );
        })}
      </motion.div>
    </nav>
  );
}
