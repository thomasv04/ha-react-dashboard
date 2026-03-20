import { motion } from 'framer-motion';
import { Blinds, Lightbulb, Cpu, Flower2, Bell, ShieldHalf, Camera } from 'lucide-react';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { cn } from '@/lib/utils';
import { useHass } from '@hakit/core';

interface Shortcut {
  id: PanelId | null;
  icon: React.ReactNode;
  label: string;
  accentBg: string;
  accentText: string;
  entityState?: string | null;
}

export function ShortcutsCard() {
  const { openPanel } = usePanel();
  const entities = useHass(s => s.entities);

  const alarmArmed = entities?.['alarm_control_panel.alarmo']?.state !== 'disarmed';

  const shortcuts: Shortcut[] = [
    {
      id: 'volets',
      icon: <Blinds size={22} />,
      label: 'Volets',
      accentBg: 'bg-sky-500/15 hover:bg-sky-500/25',
      accentText: 'text-sky-400',
    },
    {
      id: 'lumieres',
      icon: <Lightbulb size={22} />,
      label: 'Lumières',
      accentBg: 'bg-yellow-500/15 hover:bg-yellow-500/25',
      accentText: 'text-yellow-400',
    },
    {
      id: 'security',
      icon: <ShieldHalf size={22} />,
      label: 'Sécurité',
      accentBg: alarmArmed ? 'bg-red-500/20 hover:bg-red-500/30' : 'bg-green-500/15 hover:bg-green-500/25',
      accentText: alarmArmed ? 'text-red-400' : 'text-green-400',
      entityState: alarmArmed ? 'Armée' : 'Désarmée',
    },
    {
      id: 'aspirateur',
      icon: <Cpu size={22} />,
      label: 'Aspirateur',
      accentBg: 'bg-blue-500/15 hover:bg-blue-500/25',
      accentText: 'text-blue-400',
    },
    {
      id: 'flowers',
      icon: <Flower2 size={22} />,
      label: 'Plantes',
      accentBg: 'bg-emerald-500/15 hover:bg-emerald-500/25',
      accentText: 'text-emerald-400',
    },
    {
      id: 'notifications',
      icon: <Bell size={22} />,
      label: 'Notifs',
      accentBg: 'bg-purple-500/15 hover:bg-purple-500/25',
      accentText: 'text-purple-400',
    },
    {
      id: 'cameras',
      icon: <Camera size={22} />,
      label: 'Caméras',
      accentBg: 'bg-zinc-500/15 hover:bg-zinc-500/25',
      accentText: 'text-zinc-300',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className='gc rounded-3xl p-5 h-full'
    >
      <div className='text-white/40 text-xs uppercase tracking-wider mb-4 font-medium'>Raccourcis</div>
      <div className='grid grid-cols-2 gap-2'>
        {shortcuts.map((s, i) => (
          <motion.button
            key={i}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => s.id !== null && openPanel(s.id)}
            className={cn(
              'rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors text-left border border-transparent',
              s.accentBg
            )}
          >
            <span className={s.accentText}>{s.icon}</span>
            <div className='flex flex-col min-w-0'>
              <span className='text-white/90 text-sm font-medium leading-tight'>{s.label}</span>
              {s.entityState && <span className={cn('text-[10px] leading-tight mt-0.5', s.accentText)}>{s.entityState}</span>}
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
