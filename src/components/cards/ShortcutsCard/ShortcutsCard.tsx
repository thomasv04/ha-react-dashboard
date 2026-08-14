import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { Blinds, Lightbulb, Cpu, Flower2, Bell, ShieldHalf, Camera, type LucideIcon } from 'lucide-react';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { cn } from '@/lib/utils';
import { useEntities } from '@/hooks/useEntities';
import { useI18n } from '@/i18n';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { ShortcutsCardConfig } from '@/types/widget-configs';
import { resolveIcon, isCustomIcon, getCustomIconUrl, useIconCatalog } from '@/lib/lucide-icon-map';

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

function resolveShortcuts(config: ShortcutsCardConfig | undefined): ResolvedShortcut[] {
  if (!config?.shortcuts?.length) return [];
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
  // Les icones hors du noyau arrivent avec le catalogue complet, charge a la
  // demande : sans cet abonnement elles resteraient sur leur icone de repli.
  useIconCatalog();
  const { openPanel } = usePanel();
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<ShortcutsCardConfig>(widgetId || 'shortcuts');
  const shortcuts = resolveShortcuts(config);
  // Seuls les `statusEntity` des raccourcis sont lus — s'abonner à la map
  // complète re-rendait la card à chaque message WebSocket de la maison.
  const entities = useEntities(shortcuts.map(s => s.statusEntity).filter((id): id is string => !!id));

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE, delay: 0.1 }}
      className='gc rounded-3xl p-5 h-full'
    >
      <div className='text-white/40 text-xs uppercase tracking-wider mb-4 font-medium'>{t('widgets.shortcuts.header')}</div>
      {shortcuts.length === 0 && <p className='text-white/30 text-xs leading-relaxed'>{t('widgets.shortcuts.empty')}</p>}
      <div className='grid grid-cols-2 gap-2'>
        {shortcuts.map((s, i) => {
          // Dynamic status from entity
          let entityState: string | null = null;
          if (s.statusEntity) {
            const state = entities?.[s.statusEntity]?.state;
            if (state) {
              const isArmed = state !== 'disarmed';
              entityState = isArmed ? t('widgets.shortcuts.armed') : t('widgets.shortcuts.disarmed');
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
                transition={{ duration: DURATION_ENTRANCE }}
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
