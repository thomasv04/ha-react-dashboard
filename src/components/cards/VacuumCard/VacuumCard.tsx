import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_ENTRANCE, DURATION_MICRO } from '@/lib/motion-tokens';
import { Play, Pause, Square, LocateFixed, Home, ChevronRight, Battery, MapPin, ListOrdered, ChevronDown } from 'lucide-react';
import { useHass } from '@hakit/core';
import { callHAService } from '@/lib/ha-service';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { VacuumCardConfig, VacuumSelectEntity } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';

type VacuumState = 'cleaning' | 'docked' | 'idle' | 'paused' | 'returning' | 'error' | string;

/** Humanize raw HA option values: "custom_water_flow" → "Custom water flow" */
function humanizeOption(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

// ── Select entity dropdown control ────────────────────────────────────────────
function VacuumSelectControl({ entityId, label }: VacuumSelectEntity) {
  const entity = useSafeEntity(entityId);
  const { helpers } = useHass();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);

  // Compute dropdown position when opening
  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.top, left: rect.left, width: rect.width });
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || portalRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (!entity) return null;

  const options = (entity.attributes.options as string[]) ?? [];
  const currentValue = entity.state;
  const displayLabel = label || (entity.attributes.friendly_name as string) || entityId;

  function callSvc(domain: string, service: string, target: Record<string, unknown>, serviceData?: Record<string, unknown>) {
    callHAService(helpers, domain, service, target, serviceData);
  }

  function selectOption(option: string) {
    callSvc('select', 'select_option', { entity_id: entityId }, { option });
    setOpen(false);
  }

  return (
    <>
      <button
        ref={triggerRef}
        onClick={() => setOpen(o => !o)}
        className='w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl gc-inner hover:bg-white/8 transition-colors text-left'
      >
        <div className='min-w-0 flex-1'>
          <div className='text-white/40 text-[10px] truncate'>{displayLabel}</div>
          <div className='text-white text-xs font-medium truncate'>{humanizeOption(currentValue)}</div>
        </div>
        <ChevronDown size={14} className={cn('text-white/30 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && options.length > 0 && pos && (
            <>
              {/* Invisible backdrop to close on click */}
              <div className='fixed inset-0 z-[120]' onClick={() => setOpen(false)} />
              <motion.div
                ref={portalRef}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.15 }}
                className='fixed z-[121] gc rounded-xl shadow-2xl border border-white/10 overflow-hidden max-h-52 overflow-y-auto'
                style={{ bottom: window.innerHeight - pos.top + 4, left: pos.left, width: pos.width }}
              >
                {options.map(option => (
                  <button
                    key={option}
                    onClick={() => selectOption(option)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-white/8',
                      option === currentValue ? 'text-blue-400 font-semibold bg-blue-500/10' : 'text-white/70'
                    )}
                  >
                    {humanizeOption(option)}
                  </button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}

// ── Vacuum SVG animation ──────────────────────────────────────────────────────
function VacuumAnimation({ state, className }: { state: VacuumState; className?: string }) {
  const isCleaning = state === 'cleaning' || state === 'segment_cleaning';
  return (
    <div className={cn('relative flex items-center justify-center', className)}>
      {/* Outer ring */}
      <motion.div
        animate={isCleaning ? { rotate: 360 } : { rotate: 0 }}
        transition={isCleaning ? { duration: 8, repeat: Infinity, ease: 'linear' } : {}}
        className='absolute w-28 h-28 rounded-full border-2 border-dashed border-teal-400/20'
      />
      {/* Inner ring */}
      <motion.div
        animate={isCleaning ? { scale: [1, 1.05, 1] } : {}}
        transition={isCleaning ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : {}}
        className='w-20 h-20 rounded-full border-2 border-teal-400/40 flex items-center justify-center bg-teal-400/5'
      >
        <div className='w-4 h-4 rounded-full border-2 border-teal-400/60' />
      </motion.div>
      {/* Cleaning dots */}
      {isCleaning && (
        <>
          <motion.div
            animate={{ opacity: [0, 1, 0], y: [0, -8, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0 }}
            className='absolute w-1.5 h-1.5 rounded-full bg-teal-400/40'
            style={{ top: '20%', right: '30%' }}
          />
          <motion.div
            animate={{ opacity: [0, 1, 0], y: [0, 6, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.5 }}
            className='absolute w-1 h-1 rounded-full bg-teal-400/30'
            style={{ bottom: '25%', left: '35%' }}
          />
        </>
      )}
    </div>
  );
}

// ── Room selection step ───────────────────────────────────────────────────────
interface RoomSelectProps {
  rooms: VacuumCardConfig['rooms'];
  selectedRooms: string[];
  sequentialMode: boolean;
  onToggle: (roomId: string) => void;
  onToggleSequential: () => void;
  onStart: () => void;
  onBack: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function RoomSelect({ rooms, selectedRooms, sequentialMode, onToggle, onToggleSequential, onStart, onBack, t }: RoomSelectProps) {
  if (!rooms?.length) return null;

  return (
    <motion.div
      initial={{ x: 50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 50, opacity: 0 }}
      transition={{ duration: 0.25 }}
      className='flex flex-col gap-3 h-full'
    >
      {/* Header */}
      <div className='flex items-center gap-2'>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className='w-8 h-8 rounded-xl gc-btn flex items-center justify-center text-white/40'
        >
          <ChevronRight size={16} className='rotate-180' />
        </motion.button>
        <div className='flex-1'>
          <div className='text-white font-semibold text-sm'>{t('widgets.vacuum.cleanAreas')}</div>
        </div>
      </div>

      {/* Room grid */}
      <div className='grid grid-cols-3 gap-2 flex-1 overflow-y-auto'>
        {rooms.map(room => {
          const isSelected = selectedRooms.includes(room.id);
          return (
            <motion.button
              key={room.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => onToggle(room.id)}
              className={cn(
                'relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-medium transition-all border',
                isSelected
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                  : 'gc-inner border-transparent text-white/40 hover:text-white/60 hover:border-white/10'
              )}
            >
              <MapPin size={18} className={isSelected ? 'text-blue-400' : 'text-white/30'} />
              <span className='text-center leading-tight'>{room.name}</span>
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className='absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center'
                >
                  {selectedRooms.indexOf(room.id) + 1}
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Sequential mode toggle */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onToggleSequential}
        className={cn(
          'flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-medium transition-all border',
          sequentialMode
            ? 'bg-orange-500/15 border-orange-500/30 text-orange-300'
            : 'gc-inner border-transparent text-white/40 hover:text-white/60'
        )}
      >
        <ListOrdered size={16} className={sequentialMode ? 'text-orange-400' : 'text-white/30'} />
        <div className='flex-1 text-left'>
          <div className={sequentialMode ? 'text-orange-300' : 'text-white/60'}>{t('widgets.vacuum.sequentialMode')}</div>
          <div className='text-[10px] text-white/30 mt-0.5'>{t('widgets.vacuum.sequentialDesc')}</div>
        </div>
        <div className={cn('w-8 h-5 rounded-full relative transition-colors', sequentialMode ? 'bg-orange-500' : 'bg-white/10')}>
          <motion.div
            animate={{ x: sequentialMode ? 14 : 2 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className='absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm'
          />
        </div>
      </motion.button>

      {/* Note */}
      <div className='text-white/30 text-[10px] text-center'>
        {sequentialMode ? t('widgets.vacuum.sequentialNote') : t('widgets.vacuum.orderNote')}
      </div>

      {/* Start cleaning */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onStart}
        disabled={selectedRooms.length === 0}
        className={cn(
          'w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors',
          selectedRooms.length > 0 ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-400' : 'bg-white/5 text-white/20 cursor-not-allowed'
        )}
      >
        <Play size={16} />
        {t('widgets.vacuum.startCleaning', { count: selectedRooms.length })}
      </motion.button>
    </motion.div>
  );
}

// ── Main VacuumCard ───────────────────────────────────────────────────────────
export function VacuumCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<VacuumCardConfig>(widgetId || 'vacuum');
  const entityId = config?.entityId ?? 'vacuum.robot';

  const vacuum = useSafeEntity(entityId);
  const { helpers } = useHass();
  const [step, setStep] = useState<'main' | 'rooms'>('main');
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [sequentialMode, setSequentialMode] = useState(false);

  // Sequential cleaning queue
  const queueRef = useRef<number[]>([]);
  const [queueActive, setQueueActive] = useState(false);
  const [queueIndex, setQueueIndex] = useState(0);
  const prevStateRef = useRef<string>('');

  const stateKey = (vacuum?.state ?? 'idle') as VacuumState;

  const stateLabel = useMemo(() => {
    const key = `widgets.vacuum.states.${stateKey}`;
    const translated = t(key);
    return translated !== key ? translated : stateKey;
  }, [stateKey, t]);

  const battery = vacuum?.attributes.battery_level as number | undefined;
  const name = config?.name ?? (vacuum?.attributes.friendly_name as string) ?? t('widgets.vacuum.label');
  const rooms = config?.rooms ?? [];
  const selects = config?.selects ?? [];
  const hasRooms = rooms.length > 0;
  const playFeedback = useSoundFeedback('vacuum', config?.soundOverrides);

  // ── Sequential cleaning: watch state changes ──
  const callVacuumSvc = useCallback(
    (service: string, serviceData?: Record<string, unknown>) => {
      callHAService(helpers, 'vacuum', service, { entity_id: entityId }, serviceData);
    },
    [helpers, entityId]
  );

  const sendSegment = useCallback(
    (segmentId: number) => {
      callVacuumSvc('send_command', { command: 'app_segment_clean', params: [segmentId] });
    },
    [callVacuumSvc]
  );

  useEffect(() => {
    if (!queueActive || queueRef.current.length === 0) return;

    const prevState = prevStateRef.current;
    const currentState = stateKey;
    prevStateRef.current = currentState;

    // Robot just came back to base or went idle/docked after cleaning → send next
    const wasCleaningOrReturning =
      prevState === 'cleaning' || prevState === 'segment_cleaning' || prevState === 'returning' || prevState === 'returning_home';
    const isNowReady = currentState === 'docked' || currentState === 'idle';

    if (wasCleaningOrReturning && isNowReady) {
      const nextIdx = queueIndex + 1;
      if (nextIdx < queueRef.current.length) {
        setQueueIndex(nextIdx);
        // Small delay to let the vacuum settle
        setTimeout(() => sendSegment(queueRef.current[nextIdx]), 3000);
      } else {
        // Queue finished
        queueRef.current = [];
        setQueueActive(false);
        setQueueIndex(0);
      }
    }
  }, [stateKey, queueActive, queueIndex, sendSegment]);

  if (!vacuum) return null;

  function call(service: string) {
    if (service === 'stop' || service === 'return_to_base') {
      queueRef.current = [];
      setQueueActive(false);
      setQueueIndex(0);
    }
    callVacuumSvc(service);
    const actionMap: Record<string, string> = {
      start: 'start',
      pause: 'pause',
      stop: 'stop',
      return_to_base: 'dock',
      locate: 'locate',
    };
    if (actionMap[service]) playFeedback(actionMap[service]);
  }

  function toggleRoom(roomId: string) {
    setSelectedRooms(prev => (prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]));
  }

  function startRoomCleaning() {
    if (selectedRooms.length === 0) return;
    // Map room IDs to their segment numbers for Roborock
    const segmentIds = selectedRooms.map(id => rooms.find(r => r.id === id)?.segmentId).filter((s): s is number => s !== undefined);

    if (segmentIds.length === 0) {
      call('start');
      setSelectedRooms([]);
      setStep('main');
      return;
    }

    if (sequentialMode && segmentIds.length > 1) {
      // Sequential mode: clean one room at a time
      queueRef.current = segmentIds;
      setQueueIndex(0);
      setQueueActive(true);
      prevStateRef.current = stateKey;
      // Start first segment immediately
      sendSegment(segmentIds[0]);
    } else {
      callVacuumSvc('send_command', { command: 'app_segment_clean', params: segmentIds });
    }
    setSelectedRooms([]);
    setStep('main');
  }

  const isCleaning = stateKey === 'cleaning' || stateKey === 'segment_cleaning';
  const isPaused = stateKey === 'paused';

  const CONTROLS = [
    ...(isPaused
      ? [
          {
            icon: <Play size={16} />,
            action: 'start',
            label: t('widgets.vacuum.resume'),
            color: 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30',
          },
        ]
      : isCleaning
        ? [
            {
              icon: <Pause size={16} />,
              action: 'pause',
              label: t('widgets.vacuum.pause'),
              color: 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30',
            },
          ]
        : [
            {
              icon: <Play size={16} />,
              action: 'start',
              label: t('widgets.vacuum.start'),
              color: 'bg-teal-500/20 text-teal-400 hover:bg-teal-500/30',
            },
          ]),
    {
      icon: <Square size={14} />,
      action: 'stop',
      label: t('widgets.vacuum.stop'),
      color: 'bg-red-500/15 text-red-400 hover:bg-red-500/25',
    },
    {
      icon: <Home size={14} />,
      action: 'return_to_base',
      label: t('widgets.vacuum.dock'),
      color: 'gc-btn text-white/60 hover:text-white/80',
    },
    {
      icon: <LocateFixed size={14} />,
      action: 'locate',
      label: t('widgets.vacuum.locate'),
      color: 'bg-blue-500/15 text-blue-400 hover:bg-blue-500/25',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE, delay: 0.15 }}
      className='gc rounded-3xl p-4 h-full flex flex-col overflow-hidden'
    >
      <AnimatePresence mode='wait'>
        {step === 'rooms' ? (
          <RoomSelect
            key='rooms'
            rooms={rooms}
            selectedRooms={selectedRooms}
            sequentialMode={sequentialMode}
            onToggle={toggleRoom}
            onToggleSequential={() => setSequentialMode(s => !s)}
            onStart={startRoomCleaning}
            onBack={() => setStep('main')}
            t={t}
          />
        ) : (
          <motion.div
            key='main'
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className='flex flex-col h-full'
          >
            {/* Status header */}
            <div className='flex items-center justify-between mb-1'>
              <div>
                <div className='text-white font-semibold text-lg'>{stateLabel}</div>
                <div className='text-white/40 text-xs'>{name}</div>
              </div>
              {battery !== undefined && (
                <div className='flex items-center gap-1.5 text-white/50 text-xs'>
                  <span>{battery}%</span>
                  <Battery size={16} className={cn(battery > 50 ? 'text-green-400' : battery > 20 ? 'text-yellow-400' : 'text-red-400')} />
                </div>
              )}
            </div>

            {/* Sequential queue indicator */}
            {queueActive && queueRef.current.length > 0 && (
              <div className='flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-500/10 border border-orange-500/20 mb-2'>
                <ListOrdered size={14} className='text-orange-400' />
                <span className='text-orange-300 text-xs font-medium'>
                  {t('widgets.vacuum.queueProgress', { current: queueIndex + 1, total: queueRef.current.length })}
                </span>
              </div>
            )}

            {/* Vacuum animation */}
            <div className='flex-1 flex items-center justify-center min-h-[100px]'>
              <VacuumAnimation state={stateKey} />
            </div>

            {/* Control buttons */}
            <div className='flex items-center justify-center gap-3 my-3'>
              {CONTROLS.map(({ icon, action, label, color }) => (
                <motion.button
                  key={action}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => call(action)}
                  className={cn('w-11 h-11 rounded-full flex items-center justify-center transition-colors', color)}
                  title={label}
                >
                  {icon}
                </motion.button>
              ))}
            </div>

            {/* Select controls (fan speed, scrub intensity, mop route…) */}
            {selects.length > 0 && (
              <div className={cn('grid gap-1.5 mb-2', selects.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
                {selects.map(sel => (
                  <VacuumSelectControl key={sel.entityId} entityId={sel.entityId} label={sel.label} />
                ))}
              </div>
            )}

            {/* Room cleaning shortcut */}
            {hasRooms && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  setSelectedRooms([]);
                  setStep('rooms');
                }}
                className='w-full py-2.5 rounded-2xl gc-inner hover:bg-white/10 transition-colors flex items-center justify-between px-4'
              >
                <div className='flex items-center gap-2 text-white/60'>
                  <MapPin size={16} />
                  <div className='text-left'>
                    <div className='text-xs font-semibold text-white/70'>{t('widgets.vacuum.cleaning')}</div>
                    <div className='text-[10px] text-white/40'>{t('widgets.vacuum.byArea')}</div>
                  </div>
                </div>
                <ChevronRight size={16} className='text-white/30' />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
