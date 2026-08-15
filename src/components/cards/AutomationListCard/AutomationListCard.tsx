import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { Workflow } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useHass, type HassStore } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import type { AutomationListCardConfig, AutomationItem } from '@/types/widget-configs';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import type { SoundPreset } from '@/lib/sounds';

function AutomationRow({
  item,
  helpers,
  soundOverrides,
  t,
}: {
  item: AutomationItem;
  // `HassStore['helpers']` et non `ReturnType<typeof useHass>` : `useHass` est
  // un store zustand surchargé, son type de retour brut se résout en `unknown`.
  helpers: HassStore['helpers'];
  soundOverrides?: Record<string, SoundPreset>;
  t: (key: string) => string;
}) {
  const entity = useSafeEntity(item.entityId);
  const isOn = entity?.state === 'on';
  const playFeedback = useSoundFeedback('automation', soundOverrides);

  const IconComponent = item.icon && !isCustomIcon(item.icon) ? (resolveIcon(item.icon) ?? Workflow) : Workflow;
  const customIconUrl = item.icon && isCustomIcon(item.icon) ? getCustomIconUrl(item.icon) : undefined;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!entity) return;
    helpers.callService({ domain: 'automation', service: 'toggle', target: { entity_id: item.entityId } });
    playFeedback(isOn ? 'toggle_off' : 'toggle_on');
  };

  const name = item.name ?? entity?.attributes.friendly_name ?? item.entityId;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2.5 rounded-2xl border transition-all duration-300 cursor-pointer select-none',
        isOn ? 'border-emerald-500/20' : 'border-white/6'
      )}
      style={isOn ? { background: 'rgba(74,222,128,0.07)' } : { background: 'rgba(255,255,255,0.03)' }}
      onClick={handleToggle}
    >
      {/* Icon bubble */}
      <div
        className='w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 transition-all duration-300'
        style={
          isOn
            ? { background: 'rgba(74,222,128,0.14)', borderColor: 'rgba(74,222,128,0.28)' }
            : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }
        }
      >
        {customIconUrl ? (
          <img src={customIconUrl} alt='' className='w-4 h-4 object-contain' />
        ) : (
          // eslint-disable-next-line react-hooks/static-components
          <IconComponent size={15} className={cn('transition-colors', isOn ? 'text-emerald-400' : 'text-white/30')} />
        )}
      </div>

      {/* Name + status */}
      <div className='flex flex-col min-w-0 flex-1'>
        <span className={cn('text-sm font-medium truncate transition-colors', isOn ? 'text-white/90' : 'text-white/50')}>
          {name as string}
        </span>
        <span
          className={cn('text-[10px] font-bold uppercase tracking-widest leading-none mt-0.5', isOn ? 'text-emerald-400' : 'text-white/25')}
        >
          {isOn ? t('widgets.automation_list.active') : t('widgets.automation_list.inactive')}
        </span>
      </div>

      {/* Toggle switch */}
      <div
        className={cn('relative h-5 w-9 rounded-full shrink-0 transition-colors duration-300', isOn ? 'bg-emerald-500/60' : 'bg-white/10')}
        style={isOn ? { boxShadow: '0 0 8px rgba(74,222,128,0.3)' } : undefined}
      >
        <motion.div
          layout
          className='absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-md'
          animate={{ x: isOn ? 16 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </motion.div>
  );
}

export function AutomationListCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<AutomationListCardConfig>(widgetId || 'automation_list');
  // Sélecteur ciblé : `useHass()` sans sélecteur s'abonne à tout le store et
  // re-rendait la liste à chaque message WebSocket de la maison.
  const helpers = useHass(s => s.helpers);

  const items: AutomationItem[] = config?.automations ?? [];
  const name = config?.name ?? t('widgets.automation_list.label');
  // Sélecteur qui ne renvoie qu'un nombre : la card ne se re-rend que si le
  // décompte change réellement, pas à chaque message du store.
  const activeCount = useHass(s => items.filter(i => s.entities?.[i.entityId]?.state === 'on').length);

  if (items.length === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='gc rounded-3xl p-4 h-full'>
        <CardPlaceholder icon={Workflow} text={t('widgets.automation_list.empty')} hint={t('widgets.automation_list.emptyHint')} />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      className='gc rounded-3xl p-3.5 flex flex-col h-full'
    >
      {/* Header — le compteur d'actives manquait, `TodoCard` a bien le sien */}
      <div className='flex items-center gap-2 mb-2.5'>
        <div
          className='w-7 h-7 rounded-xl flex items-center justify-center border shrink-0'
          style={{
            background: 'rgba(74,222,128,0.10)',
            borderColor: 'rgba(74,222,128,0.22)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
          }}
        >
          <Workflow size={13} className='text-emerald-400' />
        </div>
        <span className='text-white/40 text-xs font-medium truncate'>{name}</span>
        <span
          className={cn(
            'ml-auto text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0 tabular-nums',
            activeCount > 0 ? 'text-emerald-300' : 'bg-white/5 text-white/25 border-white/8'
          )}
          style={activeCount > 0 ? { background: 'rgba(74,222,128,0.12)', borderColor: 'rgba(74,222,128,0.25)' } : undefined}
        >
          {activeCount}/{items.length}
        </span>
      </div>

      {/* List */}
      <div className='flex flex-col gap-1.5 flex-1 overflow-y-auto scrollbar-none' style={{ scrollbarWidth: 'none' }}>
        <AnimatePresence>
          {items.map(item => (
            <AutomationRow key={item.entityId} item={item} helpers={helpers} soundOverrides={config?.soundOverrides} t={t} />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
