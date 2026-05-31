import { createContext, useContext } from 'react';
import { motion } from 'framer-motion';
import { DURATION_FAST } from '@/lib/motion-tokens';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId, WidgetIdProvider } from '@/components/layout/DashboardGrid';
import { WIDGET_COMPONENTS } from '@/config/widget-registry';
import type { GroupCardConfig, GroupChild } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

/** Context that child widgets can read to know they're inside a GroupCard */
export const GroupEmbeddedCtx = createContext(false);
export function useGroupEmbedded() {
  return useContext(GroupEmbeddedCtx);
}

// ── Child renderer ─────────────────────────────────────────────────────────────

function GroupChildRenderer({ child }: { child: GroupChild }) {
  const Component = WIDGET_COMPONENTS[child.type as keyof typeof WIDGET_COMPONENTS];
  if (!Component) return null;
  return (
    <GroupEmbeddedCtx.Provider value={true}>
      <WidgetIdProvider id={child.id}>
        <Component />
      </WidgetIdProvider>
    </GroupEmbeddedCtx.Provider>
  );
}

// ── Main GroupCard ─────────────────────────────────────────────────────────────

export function GroupCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<GroupCardConfig>(widgetId || 'group');

  const children: GroupChild[] = config?.children ?? [];
  const columns = config?.columns ?? 2;
  const gap = config?.gap ?? 8;
  const title = config?.title;

  const gridCols = columns === 1 ? 'grid-cols-1' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2';

  return (
    <div className='gc rounded-3xl h-full flex flex-col overflow-hidden'>
      {/* Header */}
      {title && (
        <div className='px-3.5 pt-3 pb-1.5 shrink-0'>
          <span className='text-white/40 text-xs font-semibold uppercase tracking-wider'>{title}</span>
        </div>
      )}

      {/* Children grid */}
      {children.length === 0 ? (
        <div className='flex-1 flex items-center justify-center'>
          <p className='text-white/20 text-sm'>{t('widgets.group.empty')}</p>
        </div>
      ) : (
        <div
          className={cn('flex-1 overflow-y-auto scrollbar-none grid min-h-0', gridCols, title ? 'px-3 pb-3' : 'p-3')}
          style={{ gap, scrollbarWidth: 'none', alignContent: 'start' }}
        >
          {children.map((child, i) => (
            <motion.div
              key={child.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: DURATION_FAST, delay: i * 0.04 }}
              className='min-h-0 overflow-hidden rounded-2xl'
            >
              <GroupChildRenderer child={child} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
