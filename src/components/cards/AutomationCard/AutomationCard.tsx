import { useRef } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { Workflow, Clock } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useRelativeTime, JUST_NOW } from '@/hooks/useRelativeTime';
import { useHass } from '@hakit/core';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';
import { resolveIcon, isCustomIcon, getCustomIconUrl } from '@/lib/lucide-icon-map';
import type { AutomationCardConfig } from '@/types/widget-configs';
import { useI18n } from '@/i18n';
import { useGroupEmbedded } from '@/components/cards/GroupCard/GroupCard';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';

const ACCENT = '#4ade80';

export function AutomationCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<AutomationCardConfig>(widgetId || 'automation');
  const entityId = config?.entityId ?? 'automation.example';
  const embedded = useGroupEmbedded();

  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);
  const relative = useRelativeTime(entity?.attributes.last_triggered as string | undefined);

  if (!entity) {
    return (
      <motion.div ref={cardRef} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className='gc rounded-3xl p-4 h-full'>
        <CardPlaceholder icon={Workflow} text={t('widgets.automation.notFound')} compact={size.compact} />
      </motion.div>
    );
  }

  const isOn = entity.state === 'on';
  const name = config?.name ?? (entity.attributes.friendly_name as string | undefined) ?? entityId;

  // Seule information qui manquait vraiment sur une automatisation : quand
  // elle s'est déclenchée pour la dernière fois.
  const lastTriggered = !relative
    ? t('widgets.automation.neverTriggered')
    : relative === JUST_NOW
      ? t('widgets.automation.justTriggered')
      : t('widgets.automation.triggeredAgo', { value: relative });

  const IconComponent = config?.icon && !isCustomIcon(config.icon) ? (resolveIcon(config.icon) ?? Workflow) : Workflow;
  const customIconUrl = config?.icon && isCustomIcon(config.icon) ? getCustomIconUrl(config.icon) : undefined;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    helpers.callService({
      domain: 'automation',
      service: 'toggle',
      target: { entity_id: entityId },
    });
    playFeedback(isOn ? 'toggle_off' : 'toggle_on');
  };

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      onClick={handleToggle}
      className={cn(
        'h-full relative overflow-hidden flex items-center justify-between gap-3 cursor-pointer transition-all duration-300 select-none',
        embedded ? 'rounded-2xl p-3' : 'gc rounded-3xl p-4',
        isOn ? 'border border-emerald-500/20' : 'border border-white/5'
      )}
      style={
        embedded
          ? isOn
            ? { background: 'rgba(74,222,128,0.07)', borderColor: 'rgba(74,222,128,0.20)' }
            : { background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)' }
          : isOn
            ? {
                background: `linear-gradient(135deg, ${ACCENT}1c, ${ACCENT}0a)`,
                boxShadow: `var(--dash-elev-card), 0 0 26px -10px ${ACCENT}88`,
              }
            : undefined
      }
    >
      {/* Halo d'accent — même profondeur de verre que les cards actives */}
      {isOn && !embedded && (
        <span
          aria-hidden
          className='-top-12 -left-8 w-36 h-36 rounded-full pointer-events-none'
          // `position` en inline : `.gc > *` force `relative` sur les enfants
          // directs et bat l'utilitaire Tailwind — le halo redeviendrait un
          // élément en flux et pousserait le contenu. Même parade que Ripple.
          style={{ position: 'absolute', background: `radial-gradient(circle, ${ACCENT}22 0%, transparent 70%)` }}
        />
      )}

      {/* Icône + infos */}
      <div className='flex items-center gap-3 min-w-0'>
        <div
          className='rounded-2xl p-2.5 border transition-all duration-300 shrink-0'
          style={
            isOn
              ? {
                  background: `${ACCENT}22`,
                  borderColor: `${ACCENT}3d`,
                  color: ACCENT,
                  boxShadow: `0 0 16px -6px ${ACCENT}, inset 0 1px 0 rgba(255,255,255,0.10)`,
                }
              : {
                  background: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  color: 'rgba(255,255,255,0.3)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                }
          }
        >
          {/* eslint-disable-next-line react-hooks/static-components */}
          {customIconUrl ? <img src={customIconUrl} alt='' className='w-5 h-5 object-contain' /> : <IconComponent size={20} />}
        </div>

        <div className='flex flex-col min-w-0 gap-0.5'>
          <span className='text-sm font-semibold text-white truncate leading-tight'>{name}</span>
          <div className='flex items-center gap-1.5 min-w-0'>
            <span className={cn('text-[10px] font-bold uppercase tracking-widest shrink-0', isOn ? 'text-emerald-400' : 'text-white/30')}>
              {isOn ? t('widgets.automation.active') : t('widgets.automation.inactive')}
            </span>
            {!size.compact && (
              <>
                <span className='w-1 h-1 rounded-full bg-white/15 shrink-0' />
                <span className='text-[10px] text-white/30 truncate flex items-center gap-1 min-w-0'>
                  <Clock size={9} className='shrink-0' />
                  <span className='truncate'>{lastTriggered}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Toggle switch */}
      <div
        className={cn('relative h-6 w-10 rounded-full shrink-0 transition-colors', isOn ? 'bg-emerald-500/60' : 'bg-white/10')}
        style={isOn ? { boxShadow: `0 0 10px -2px ${ACCENT}88` } : { boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.3)' }}
      >
        <motion.div
          className='absolute top-1 h-4 w-4 rounded-full bg-white shadow-md'
          animate={{ x: isOn ? 20 : 4 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
    </motion.div>
  );
}
