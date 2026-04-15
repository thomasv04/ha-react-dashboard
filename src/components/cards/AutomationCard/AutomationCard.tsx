import { motion } from 'framer-motion';
import { Workflow } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import type { AutomationCardConfig } from '@/types/widget-configs';

export function AutomationCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<AutomationCardConfig>(widgetId || 'automation');
  const entityId = config?.entityId ?? 'automation.example';

  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();

  if (!entity) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className='gc rounded-3xl p-4 flex items-center justify-center h-full'
      >
        <span className='text-white/30 text-sm'>Automatisation introuvable</span>
      </motion.div>
    );
  }

  const isOn = entity.state === 'on';
  const name = config?.name ?? (entity.attributes.friendly_name as string | undefined) ?? entityId;

  // eslint-disable-next-line react-hooks/static-components
  const IconComponent = config?.icon && !isCustomIcon(config.icon) ? (resolveIcon(config.icon) ?? Workflow) : Workflow;
  const customIconUrl = config?.icon && isCustomIcon(config.icon) ? getCustomIconUrl(config.icon) : undefined;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    helpers.callService({
      domain: 'automation',
      service: 'toggle',
      target: { entity_id: entityId },
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      onClick={handleToggle}
      className={cn(
        'gc rounded-3xl p-4 h-full flex items-center justify-between gap-4 cursor-pointer',
        'transition-all duration-300',
        isOn ? 'border border-emerald-500/20 bg-emerald-500/5' : 'border border-white/5'
      )}
    >
      {/* Icône + infos */}
      <div className='flex items-center gap-3 min-w-0'>
        <div
          className={cn(
            'rounded-2xl p-2.5 transition-colors shrink-0',
            isOn ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-white/30'
          )}
        >
          {/* eslint-disable-next-line react-hooks/static-components */}
          {customIconUrl ? <img src={customIconUrl} alt='' className='w-5 h-5 object-contain' /> : <IconComponent size={20} />}
        </div>

        <div className='flex flex-col min-w-0'>
          <span className='text-sm font-semibold text-white truncate'>{name}</span>
          <span className={cn('text-[10px] font-bold uppercase tracking-widest', isOn ? 'text-emerald-400' : 'text-white/30')}>
            {isOn ? 'Actif' : 'Inactif'}
          </span>
        </div>
      </div>

      {/* Toggle switch */}
      <div className={cn('relative h-6 w-10 rounded-full shrink-0 transition-colors', isOn ? 'bg-emerald-500/60' : 'bg-white/10')}>
        <div
          className={cn(
            'absolute top-1 h-4 w-4 rounded-full bg-white shadow-md transition-all',
            isOn ? 'left-[calc(100%-20px)]' : 'left-1'
          )}
        />
      </div>
    </motion.div>
  );
}
