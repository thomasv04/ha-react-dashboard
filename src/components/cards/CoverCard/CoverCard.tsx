import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Blinds, ChevronUp, ChevronDown, Square } from 'lucide-react';
import { CardPlaceholder } from '@/components/ui/CardPlaceholder';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { CoverCardConfig } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback';
import { coverArrowMotion } from '@/lib/cover-motion';
import { friendlyName } from '@/lib/ha-service';
import { DeviceTile } from '@/components/ds/DeviceTile';
import { PillSlider } from '@/components/ds/PillSlider';

const ROUND_BUTTON =
  'flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)] text-[var(--ds-ink)] active:scale-95 transition-transform';

export function CoverCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<CoverCardConfig>(widgetId || 'cover');
  const entityId = config?.entityId ?? 'cover.living_room';

  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const cardRef = useRef<HTMLDivElement>(null);
  const widgetSize = useWidgetSize(cardRef);
  const playFeedback = useSoundFeedback();
  const motionAllowed = useLowPowerMotion();

  const haPosition = entity?.attributes.current_position as number | undefined;
  // Position suivie localement pendant le glisser, rendue à HA dès qu'il répond.
  const [localPosition, setLocalPosition] = useState<number | null>(null);
  useEffect(() => setLocalPosition(null), [haPosition]);

  const sendPosition = useDebouncedCallback((position: number) => {
    helpers.callService({
      domain: 'cover',
      service: 'set_cover_position',
      target: { entity_id: entityId },
      serviceData: { position: Math.round(position) },
    });
  }, 250);

  if (!entity) {
    return (
      <div ref={cardRef} className='rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] text-[var(--ds-ink)] h-full p-4'>
        <CardPlaceholder icon={Blinds} text={t('widgets.cover.notFound')} />
      </div>
    );
  }

  const call = (service: 'open_cover' | 'close_cover' | 'stop_cover' | 'toggle') => {
    helpers.callService({ domain: 'cover', service, target: { entity_id: entityId } });
    playFeedback(service === 'open_cover' ? 'door_open' : service === 'close_cover' ? 'door_close' : 'warning');
  };

  const name = config?.name ?? friendlyName(entity) ?? entityId;
  const state = entity.state;
  const position = localPosition ?? haPosition ?? 0;
  const isOpen = state === 'open' || position > 0;
  const supportsPosition = haPosition !== undefined;

  const stateLabel =
    state === 'open'
      ? t('widgets.cover.open')
      : state === 'closed'
        ? t('widgets.cover.closed')
        : state === 'opening'
          ? t('widgets.cover.opening')
          : state === 'closing'
            ? t('widgets.cover.closing')
            : state;
  const stateWithPosition =
    supportsPosition && state === 'open' ? t('widgets.cover.percentOpen', { value: Math.round(position) }) : stateLabel;

  // Une rangée, ou volet sans position : une tuile simple, l'appui ouvre ou ferme.
  if (widgetSize.squat || !supportsPosition) {
    return (
      <div ref={cardRef} className='h-full'>
        <DeviceTile
          name={name}
          state={stateWithPosition}
          icon={Blinds}
          active={isOpen}
          onToggle={() => call('toggle')}
          layout={widgetSize.squat ? 'row' : 'stack'}
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
        <span className='block truncate text-[17px] font-semibold leading-tight'>{name}</span>
        <span className={cn('block truncate text-sm', isOpen ? 'text-[var(--ds-accent)]' : 'text-[var(--ds-ink-muted)]')}>
          {stateWithPosition}
        </span>
      </div>

      <div className='flex min-h-0 flex-1 items-stretch justify-center gap-3'>
        {/* La pilule montre la part ouverte : pleine = grand ouvert. */}
        <PillSlider
          orientation='vertical'
          value={position}
          onChange={value => {
            setLocalPosition(value);
            sendPosition(value);
          }}
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
