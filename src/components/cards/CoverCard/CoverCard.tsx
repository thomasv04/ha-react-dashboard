import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
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
import { coverArrowMotion } from '@/lib/cover-motion';

export function CoverCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<CoverCardConfig>(widgetId || 'cover');
  const entityId = config?.entityId ?? 'cover.living_room';

  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const sliderRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const widgetSize = useWidgetSize(cardRef);
  const isCompact = widgetSize.compact;
  const [isDragging, setIsDragging] = useState(false);
  const [dragPosition, setDragPosition] = useState<number | null>(null);
  const playFeedback = useSoundFeedback();
  const motionAllowed = useLowPowerMotion();

  const openCover = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      helpers.callService({ domain: 'cover', service: 'open_cover', target: { entity_id: entityId } });
      playFeedback('door_open');
    },
    [helpers, entityId, playFeedback]
  );

  const closeCover = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      helpers.callService({ domain: 'cover', service: 'close_cover', target: { entity_id: entityId } });
      playFeedback('door_close');
    },
    [helpers, entityId, playFeedback]
  );

  const stopCover = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      helpers.callService({ domain: 'cover', service: 'stop_cover', target: { entity_id: entityId } });
      playFeedback('warning');
    },
    [helpers, entityId, playFeedback]
  );

  const setPosition = useCallback(
    (pos: number) => {
      helpers.callService({
        domain: 'cover',
        service: 'set_cover_position',
        target: { entity_id: entityId },
        serviceData: { position: Math.round(pos) },
      });
    },
    [helpers, entityId]
  );

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((rect.bottom - e.clientY) / rect.height) * 100));
      setDragPosition(pct);
    },
    [isDragging]
  );

  const handlePointerCancel = useCallback(() => {
    setDragPosition(null);
    setIsDragging(false);
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragPosition !== null) {
      setPosition(dragPosition);
      setDragPosition(null);
    }
    setIsDragging(false);
  }, [dragPosition, setPosition]);

  if (!entity) {
    return (
      <div className='gc rounded-3xl p-4 h-full'>
        <CardPlaceholder icon={Blinds} text={t('widgets.cover.notFound')} />
      </div>
    );
  }

  const name = config?.name ?? (entity.attributes.friendly_name as string) ?? entityId;
  const state = entity.state;
  const position = (entity.attributes.current_position as number | undefined) ?? 0;
  const isOpen = state === 'open' || position > 0;
  const isMoving = state === 'opening' || state === 'closing';

  const displayPosition = dragPosition ?? position;
  // closed portion from top: 0% open = full bar, 100% open = empty bar
  const closedPercent = 100 - displayPosition;

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

  return (
    <div ref={cardRef} className={cn('gc rounded-3xl flex flex-col h-full', isCompact ? 'p-2.5' : 'p-3.5')}>
      {/* Header — l'icône rejoint la ligne du titre : elle occupait sa propre
          rangée et volait de la hauteur au store, qui est le vrai sujet. */}
      <div className={cn('flex items-center justify-between gap-2', isCompact ? 'mb-1.5' : 'mb-2.5')}>
        <div className='flex items-center gap-2 min-w-0'>
          <div
            className={cn(
              'rounded-xl flex items-center justify-center border transition-all duration-300 shrink-0',
              isCompact ? 'w-6 h-6' : 'w-7 h-7'
            )}
            style={
              isOpen
                ? {
                    background: 'rgba(56,189,248,0.12)',
                    borderColor: 'rgba(56,189,248,0.26)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 0 14px -6px rgba(56,189,248,0.9)',
                  }
                : {
                    background: 'rgba(255,255,255,0.05)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)',
                  }
            }
          >
            <Blinds
              size={isCompact ? 12 : 14}
              className={cn('transition-colors duration-300', isMoving && 'animate-pulse', isOpen ? 'text-sky-400' : 'text-white/35')}
            />
          </div>
          <span className={cn('text-white/40 font-medium truncate', isCompact ? 'text-[10px]' : 'text-xs')}>{name}</span>
        </div>
        <motion.span
          key={stateLabel}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 22 }}
          className={cn(
            'text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full border shrink-0 ml-2',
            isMoving
              ? 'bg-sky-500/15 text-sky-300 border-sky-500/25 animate-pulse'
              : isOpen
                ? 'bg-sky-500/12 text-sky-300 border-sky-500/22'
                : 'bg-white/5 text-white/25 border-white/8'
          )}
        >
          {stateLabel}
        </motion.span>
      </div>

      {/* Vertical slider */}
      <div className={cn('flex-1 flex items-stretch min-h-0', isCompact ? 'gap-1.5' : 'gap-3')}>
        <div
          ref={sliderRef}
          className='flex-1 relative rounded-2xl overflow-hidden cursor-ns-resize select-none touch-none'
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.30)',
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {/* Lamelles en filigrane sur toute la hauteur — sans elles, un store
              grand ouvert n'était qu'un rectangle gris uni. */}
          <div aria-hidden className='absolute inset-0 flex flex-col pointer-events-none'>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className='w-full border-b border-white/[0.04]' style={{ height: '10%' }} />
            ))}
          </div>

          {/* Portion fermée, depuis le haut */}
          <motion.div
            className='absolute top-0 left-0 right-0 overflow-hidden'
            animate={{ height: `${closedPercent}%` }}
            transition={isDragging ? { duration: 0 } : { duration: DURATION_ENTRANCE, ease: 'easeOut' }}
            style={{
              background: 'linear-gradient(180deg, rgba(56,189,248,0.30), rgba(56,189,248,0.16))',
              borderBottom: '1px solid rgba(56,189,248,0.45)',
              boxShadow: '0 4px 14px -4px rgba(56,189,248,0.55)',
            }}
          >
            {/* Lamelles de la portion fermée */}
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className='w-full border-b border-sky-400/20' style={{ height: '10%' }} />
            ))}
          </motion.div>

          {/* Poignée sur l'arête du store — rend le glissement évident */}
          <motion.div
            aria-hidden
            className='absolute left-0 right-0 flex justify-center pointer-events-none'
            animate={{ top: `calc(${closedPercent}% - 2px)` }}
            transition={isDragging ? { duration: 0 } : { duration: DURATION_ENTRANCE, ease: 'easeOut' }}
          >
            <span className='h-1 w-7 rounded-full bg-white/50 shadow-md' />
          </motion.div>

          {/* Position label */}
          <div className='absolute inset-0 flex items-center justify-center pointer-events-none'>
            <span className={cn('text-white font-semibold drop-shadow-lg tabular-nums', isCompact ? 'text-sm' : 'text-lg')}>
              {Math.round(displayPosition)}%
            </span>
          </div>
        </div>

        {/* Action buttons column */}
        <div className='flex flex-col justify-center gap-2'>
          <motion.button
            whileTap={{ scale: 0.88 }}
            {...coverArrowMotion(state, 'up', motionAllowed)}
            onClick={openCover}
            className={cn(
              'rounded-xl flex items-center justify-center border transition-all duration-200',
              isCompact ? 'w-7 h-7' : 'w-9 h-9'
            )}
            style={{ background: 'rgba(56,189,248,0.08)', borderColor: 'rgba(56,189,248,0.18)' }}
          >
            <ChevronUp size={isCompact ? 13 : 17} className='text-sky-400' />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={stopCover}
            className={cn(
              'rounded-xl flex items-center justify-center border transition-all duration-200',
              isCompact ? 'w-7 h-7' : 'w-9 h-9'
            )}
            style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.08)' }}
          >
            <Square size={isCompact ? 10 : 13} className='text-white/45' />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.88 }}
            {...coverArrowMotion(state, 'down', motionAllowed)}
            onClick={closeCover}
            className={cn(
              'rounded-xl flex items-center justify-center border transition-all duration-200',
              isCompact ? 'w-7 h-7' : 'w-9 h-9'
            )}
            style={{ background: 'rgba(56,189,248,0.08)', borderColor: 'rgba(56,189,248,0.18)' }}
          >
            <ChevronDown size={isCompact ? 13 : 17} className='text-sky-400' />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
