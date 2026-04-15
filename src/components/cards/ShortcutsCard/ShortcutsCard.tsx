import { motion } from 'framer-motion';
import { Blinds, Lightbulb, Cpu, Flower2, Bell, ShieldHalf, Camera, type LucideIcon } from 'lucide-react';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { cn } from '@/lib/utils';
import { useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { ShortcutsCardConfig } from '@/types/widget-configs';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';

const FALLBACK_ICON_MAP: Record<string, LucideIcon> = {
  Blinds,
  Lightbulb,
  Cpu,
  Flower2,
  Bell,
  ShieldHalf,
  Camera,
};

/** Map gradient class prefix to accent colors for bg and text */
function gradientToAccent(gradient: string): { bg: string; bgHover: string; text: string } {
  // Extract the "from-xxx-500" part to derive the color family
  const match = gradient.match(/from-(\w+)-/);
  const color = match?.[1] ?? 'blue';
  return {
    bg: `bg-${color}-500/15`,
    bgHover: `hover:bg-${color}-500/25`,
    text: `text-${color}-400`,
  };
}

interface ResolvedShortcut {
  id: PanelId | null;
  Icon: LucideIcon | null;
  customIconUrl?: string;
  label: string;
  accentBg: string;
  accentText: string;
  statusEntity?: string;
}

const DEFAULT_SHORTCUTS: ResolvedShortcut[] = [
  { id: 'volets', Icon: Blinds, label: 'Volets', accentBg: 'bg-sky-500/15 hover:bg-sky-500/25', accentText: 'text-sky-400' },
  {
    id: 'lumieres',
    Icon: Lightbulb,
    label: 'Lumières',
    accentBg: 'bg-yellow-500/15 hover:bg-yellow-500/25',
    accentText: 'text-yellow-400',
  },
  {
    id: 'security',
    Icon: ShieldHalf,
    label: 'Sécurité',
    accentBg: 'bg-green-500/15 hover:bg-green-500/25',
    accentText: 'text-green-400',
    statusEntity: 'alarm_control_panel.home_alarm',
  },
  { id: 'aspirateur', Icon: Cpu, label: 'Aspirateur', accentBg: 'bg-blue-500/15 hover:bg-blue-500/25', accentText: 'text-blue-400' },
  { id: 'flowers', Icon: Flower2, label: 'Plantes', accentBg: 'bg-emerald-500/15 hover:bg-emerald-500/25', accentText: 'text-emerald-400' },
  { id: 'notifications', Icon: Bell, label: 'Notifs', accentBg: 'bg-purple-500/15 hover:bg-purple-500/25', accentText: 'text-purple-400' },
  { id: 'cameras', Icon: Camera, label: 'Caméras', accentBg: 'bg-zinc-500/15 hover:bg-zinc-500/25', accentText: 'text-zinc-300' },
];

function resolveShortcuts(config: ShortcutsCardConfig | undefined): ResolvedShortcut[] {
  if (!config?.shortcuts?.length) return DEFAULT_SHORTCUTS;
  return config.shortcuts.map(s => {
    const accent = gradientToAccent(s.color);
    return {
      id: (s.panelId as PanelId) ?? null,
      Icon: isCustomIcon(s.icon) ? null : (resolveIcon(s.icon) ?? FALLBACK_ICON_MAP[s.icon] ?? Cpu),
      customIconUrl: isCustomIcon(s.icon) ? getCustomIconUrl(s.icon) : undefined,
      label: s.label,
      accentBg: `${accent.bg} ${accent.bgHover}`,
      accentText: accent.text,
      statusEntity: s.statusEntity,
    };
  });
}

export function ShortcutsCard() {
  const { openPanel } = usePanel();
  const entities = useHass(s => s.entities);
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<ShortcutsCardConfig>(widgetId || 'shortcuts');
  const shortcuts = resolveShortcuts(config);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className='gc rounded-3xl p-5 h-full'
    >
      <div className='text-white/40 text-xs uppercase tracking-wider mb-4 font-medium'>Raccourcis</div>
      <div className='grid grid-cols-2 gap-2'>
        {shortcuts.map((s, i) => {
          // Dynamic status from entity
          let entityState: string | null = null;
          if (s.statusEntity) {
            const state = entities?.[s.statusEntity]?.state;
            if (state) {
              const isArmed = state !== 'disarmed';
              entityState = isArmed ? 'Armée' : 'Désarmée';
            }
          }

          return (
            <motion.button
              key={s.id ?? i}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25, delay: i * 0.05 }}
              whileHover={{ scale: 1.03, y: -1 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => s.id !== null && openPanel(s.id)}
              className={cn(
                'rounded-2xl px-4 py-3 flex items-center gap-3 text-left transition-all duration-200',
                'border border-white/8 hover:border-white/15',
                s.accentBg
              )}
            >
              <motion.div
                className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/10')}
                whileHover={{ rotate: [0, -8, 8, 0], scale: 1.1 }}
                whileTap={{ scale: 0.9, rotate: 0 }}
                transition={{ duration: 0.4 }}
              >
                {s.customIconUrl ? (
                  <img src={s.customIconUrl} alt='' className='w-[18px] h-[18px] object-contain' />
                ) : s.Icon ? (
                  <s.Icon size={18} className={s.accentText} />
                ) : null}
              </motion.div>
              <div className='flex flex-col min-w-0'>
                <span className='text-white/90 text-sm font-medium leading-tight'>{s.label}</span>
                {entityState && (
                  <motion.span
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className={cn('text-[10px] leading-tight mt-0.5', s.accentText)}
                  >
                    {entityState}
                  </motion.span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
