import { Blinds, Lightbulb, Cpu, Flower2, Bell, ShieldHalf, Camera, type LucideIcon } from 'lucide-react';
import { usePanel, type PanelId } from '@/context/PanelContext';
import { useEntities } from '@/hooks/useEntities';
import { useI18n } from '@/i18n';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { ShortcutsCardConfig } from '@/types/widget-configs';
import { resolveIcon, isCustomIcon, getCustomIconUrl, useIconCatalog } from '@/lib/lucide-icon-map';
import { gradientAccent } from '@/lib/gradient';

const FALLBACK_ICON_MAP: Record<string, LucideIcon> = {
  Blinds,
  Lightbulb,
  Cpu,
  Flower2,
  Bell,
  ShieldHalf,
  Camera,
};

interface ResolvedShortcut {
  id: PanelId | null;
  Icon: LucideIcon | null;
  customIconUrl?: string;
  label: string;
  /** Couleur d'accent, en hexadécimal — pas une classe. */
  accent: string;
  statusEntity?: string;
}

function resolveShortcuts(config: ShortcutsCardConfig | undefined): ResolvedShortcut[] {
  if (!config?.shortcuts?.length) return [];
  return config.shortcuts.map(s => {
    // `gradientAccent` et non des classes composées à l'exécution : le code
    // fabriquait `bg-${color}-500/15`, que Tailwind ne génère jamais faute de
    // le trouver dans les sources — aucun raccourci n'était teinté.
    const accent = gradientAccent(s.color);
    return {
      id: (s.panelId as PanelId) ?? null,
      Icon: isCustomIcon(s.icon) ? null : (resolveIcon(s.icon) ?? FALLBACK_ICON_MAP[s.icon] ?? Cpu),
      customIconUrl: isCustomIcon(s.icon) ? getCustomIconUrl(s.icon) : undefined,
      label: s.label,
      accent,
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
    <div className='flex h-full flex-col gap-3 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-[var(--ds-space-4)] text-[var(--ds-ink)]'>
      <div className='shrink-0 text-[17px] font-semibold'>{t('widgets.shortcuts.header')}</div>
      {shortcuts.length === 0 && <p className='text-sm text-[var(--ds-ink-muted)]'>{t('widgets.shortcuts.empty')}</p>}
      <div className='grid min-h-0 flex-1 auto-rows-fr grid-cols-2 gap-2.5'>
        {shortcuts.map((s, i) => {
          // État dynamique, lu sur l'entité associée
          let entityState: string | null = null;
          if (s.statusEntity) {
            const state = entities?.[s.statusEntity]?.state;
            if (state) {
              const isArmed = state !== 'disarmed';
              entityState = isArmed ? t('widgets.shortcuts.armed') : t('widgets.shortcuts.disarmed');
            }
          }

          return (
            <button
              key={s.id ?? i}
              onClick={() => s.id !== null && openPanel(s.id)}
              className='flex min-h-[72px] flex-col justify-between rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-3)] p-3.5 text-left transition-transform active:scale-[0.98]'
            >
              {s.customIconUrl ? (
                <img src={s.customIconUrl} alt='' className='size-6 object-contain' />
              ) : s.Icon ? (
                <s.Icon size={22} aria-hidden='true' style={{ color: s.accent }} />
              ) : null}
              <span className='min-w-0'>
                <span className='block truncate text-[15px] font-bold leading-tight'>{s.label}</span>
                {entityState && <span className='block truncate text-[13px] text-[var(--ds-ink-muted)]'>{entityState}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
