import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Blinds, ChevronUp, ChevronDown, Square } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useHideTitle } from '@/hooks/useHideTitle';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { CoverCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import { coverArrowMotion } from '@/lib/cover-motion';
import { friendlyName } from '@/lib/ha-service';
import { DeviceTile } from '@/components/ds/DeviceTile';
import { PillSlider } from '@/components/ds/PillSlider';
import { ROUND_BUTTON, useCover } from './useCover';

export function CoverCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const hideTitle = useHideTitle();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<CoverCardConfig>(widgetId || 'cover');
  const entityId = config?.entityId ?? 'cover.living_room';

  const cardRef = useRef<HTMLDivElement>(null);
  const widgetSize = useWidgetSize(cardRef);
  const motionAllowed = useLowPowerMotion();
  const { entity, state, position, supportsPosition, isOpen, stateWithPosition, holdPosition, sendPosition, call } = useCover(entityId);

  if (!entity) {
    return (
      <div ref={cardRef} className='rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)] h-full p-4'>
        <CardPlaceholder icon={Blinds} text={t('widgets.cover.notFound')} />
      </div>
    );
  }

  const name = config?.name ?? friendlyName(entity) ?? entityId;

  // Une rangée, ou volet sans position : une tuile simple, l'appui ouvre ou ferme.
  if (widgetSize.squat || !supportsPosition) {
    return (
      <div ref={cardRef} className='h-full'>
        <DeviceTile
          name={hideTitle ? '' : name}
          state={stateWithPosition}
          icon={Blinds}
          active={isOpen}
          onToggle={() => call('toggle')}
          layout={widgetSize.squat ? 'row' : 'stack'}
          // Glisser sur la rangée règle la position par crans de 5 %, envoyée au relâchement.
          drag={
            supportsPosition
              ? {
                  value: position,
                  onChange: value => holdPosition(value, 60_000),
                  onCommit: sendPosition,
                  bubble: value => t('widgets.cover.percentOpen', { value }),
                  inset: 16,
                  step: 5,
                }
              : undefined
          }
        />
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className='flex h-full select-none flex-col gap-3 overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-[var(--ds-space-4)] text-[var(--ds-ink)]'
    >
      <div className='min-w-0'>
        {!hideTitle && <span className='block truncate text-[17px] font-semibold leading-tight'>{name}</span>}
        <span className={cn('block truncate text-sm', isOpen ? 'text-[var(--ds-accent)]' : 'text-[var(--ds-ink-muted)]')}>
          {stateWithPosition}
        </span>
      </div>

      <div className='flex min-h-0 flex-1 items-stretch justify-center gap-3'>
        {/* La pilule montre la part ouverte : pleine = grand ouvert. */}
        <PillSlider
          orientation='vertical'
          value={position}
          // Doigt posé : tenue jusqu'au relâchement, même immobile (sinon la pilule
          // reviendrait sous le doigt et le relâchement enverrait l'ancienne position).
          onChange={value => holdPosition(value, 60_000)}
          onCommit={sendPosition}
          bubble={value => t('widgets.cover.percentOpen', { value: Math.round(value) })}
          label={name}
          valueText={t('widgets.cover.percentOpen', { value: Math.round(position) })}
          icon={Blinds}
          className={cn('min-h-0', widgetSize.compact ? 'w-16' : 'w-[min(96px,45%)]')}
        />

        <div className='flex flex-col justify-center gap-2'>
          <motion.button
            {...coverArrowMotion(state, 'up', motionAllowed)}
            onClick={() => call('open_cover')}
            aria-label={t('widgets.cover.openAction')}
            title={t('widgets.cover.openAction')}
            className={ROUND_BUTTON}
          >
            <ChevronUp size={20} />
          </motion.button>
          <button
            onClick={() => call('stop_cover')}
            aria-label={t('widgets.cover.stopAction')}
            title={t('widgets.cover.stopAction')}
            className={ROUND_BUTTON}
          >
            <Square size={14} />
          </button>
          <motion.button
            {...coverArrowMotion(state, 'down', motionAllowed)}
            onClick={() => call('close_cover')}
            aria-label={t('widgets.cover.closeAction')}
            title={t('widgets.cover.closeAction')}
            className={ROUND_BUTTON}
          >
            <ChevronDown size={20} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
