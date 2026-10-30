import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Play, Pause, Square, LocateFixed, Home, ChevronRight, Battery, MapPin, ListOrdered, ChevronDown } from 'lucide-react';
import { useHass } from '@hakit/core';
import { callHAService, friendlyName } from '@/lib/ha-service';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { VacuumCardConfig, VacuumSelectEntity } from '@/types/widget-configs';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { SwitchTrack } from '@/components/ds/Switch';

type VacuumState = 'cleaning' | 'docked' | 'idle' | 'paused' | 'returning' | 'error' | string;

/** Humanize raw HA option values: "custom_water_flow" → "Custom water flow" */
function humanizeOption(raw: string): string {
  return raw.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

// ── Select entity dropdown control ────────────────────────────────────────────
function VacuumSelectControl({ entityId, label }: VacuumSelectEntity) {
  const entity = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
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
  const displayLabel = label || friendlyName(entity) || entityId;

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
        aria-expanded={open}
        className='flex w-full items-center justify-between gap-2 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-3 py-2 text-left'
      >
        <div className='min-w-0 flex-1'>
          <div className='truncate text-xs text-[var(--ds-ink-muted)]'>{displayLabel}</div>
          <div className='truncate text-sm font-semibold'>{humanizeOption(currentValue)}</div>
        </div>
        <ChevronDown
          size={16}
          aria-hidden='true'
          className={cn('shrink-0 text-[var(--ds-ink-muted)] transition-transform', open && 'rotate-180')}
        />
      </button>

      {createPortal(
        open && options.length > 0 && pos && (
          <>
            {/* Fond invisible : un clic à côté referme la liste */}
            <div className='fixed inset-0 z-[120]' onClick={() => setOpen(false)} />
            <div
              ref={portalRef}
              className='fixed z-[121] max-h-52 overflow-y-auto rounded-[var(--ds-radius-md)] bg-[var(--ds-sheet)] text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)]'
              style={{ bottom: window.innerHeight - pos.top + 4, left: pos.left, width: pos.width }}
            >
              {options.map(option => (
                <button
                  key={option}
                  onClick={() => selectOption(option)}
                  className={cn('w-full px-4 py-3 text-left text-sm', option === currentValue && 'font-semibold text-[var(--ds-accent)]')}
                >
                  {humanizeOption(option)}
                </button>
              ))}
            </div>
          </>
        ),
        document.body
      )}
    </>
  );
}

// ── Robot ─────────────────────────────────────────────────────────────────────
/** Le robot vu de dessus ; l'anneau pointillé tourne pendant le ménage. */
function VacuumDisc({ state }: { state: VacuumState }) {
  const isCleaning = state === 'cleaning' || state === 'segment_cleaning';
  return (
    <div aria-hidden='true' className='relative flex size-28 items-center justify-center'>
      <div
        className={cn(
          'absolute inset-0 rounded-full border-2 border-dashed',
          isCleaning ? 'animate-[spin_8s_linear_infinite] border-[var(--ds-accent)]' : 'border-[var(--ds-surface-3)]'
        )}
      />
      <div className='flex size-20 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'>
        <div className={cn('size-4 rounded-full border-2', isCleaning ? 'border-[var(--ds-accent)]' : 'border-[var(--ds-ink-muted)]')} />
      </div>
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
    <div className='flex h-full flex-col gap-3'>
      <div className='flex items-center gap-3'>
        <button
          onClick={onBack}
          aria-label={t('widgets.vacuum.back')}
          title={t('widgets.vacuum.back')}
          className='flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
        >
          <ChevronRight size={18} className='rotate-180' />
        </button>
        <div className='truncate text-[17px] font-semibold'>{t('widgets.vacuum.cleanAreas')}</div>
      </div>

      {/* Les pièces : le numéro dit l'ordre de passage */}
      <div className='grid flex-1 grid-cols-3 content-start gap-2 overflow-y-auto'>
        {rooms.map(room => {
          const isSelected = selectedRooms.includes(room.id);
          return (
            <button
              key={room.id}
              onClick={() => onToggle(room.id)}
              aria-pressed={isSelected}
              className={cn(
                'relative flex min-h-[64px] flex-col items-center justify-center gap-1.5 rounded-[var(--ds-radius-md)] px-2 py-3 text-sm font-semibold',
                isSelected ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-3)]'
              )}
            >
              <MapPin size={18} aria-hidden='true' />
              <span className='text-center leading-tight'>{room.name}</span>
              {isSelected && (
                <span className='absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[var(--ds-tile-on)]'>
                  {selectedRooms.indexOf(room.id) + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        role='switch'
        aria-checked={sequentialMode}
        onClick={onToggleSequential}
        className='flex items-center gap-3 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-3 py-2 text-left'
      >
        <ListOrdered size={18} aria-hidden='true' className='shrink-0' />
        <div className='min-w-0 flex-1'>
          <div className='text-sm font-semibold'>{t('widgets.vacuum.sequentialMode')}</div>
          <div className='text-xs text-[var(--ds-ink-muted)]'>{t('widgets.vacuum.sequentialDesc')}</div>
        </div>
        <SwitchTrack on={sequentialMode} />
      </button>

      <div className='text-center text-xs text-[var(--ds-ink-muted)]'>
        {sequentialMode ? t('widgets.vacuum.sequentialNote') : t('widgets.vacuum.orderNote')}
      </div>

      <button
        onClick={onStart}
        disabled={selectedRooms.length === 0}
        className={cn(
          'flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-[var(--ds-radius-pill)] text-[15px] font-semibold',
          selectedRooms.length > 0
            ? 'bg-[var(--ds-accent)] text-white'
            : 'cursor-not-allowed bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]'
        )}
      >
        <Play size={18} fill='currentColor' aria-hidden='true' />
        {t('widgets.vacuum.startCleaning', { count: selectedRooms.length })}
      </button>
    </div>
  );
}

// ── Main VacuumCard ───────────────────────────────────────────────────────────
export function VacuumCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<VacuumCardConfig>(widgetId || 'vacuum');
  const entityId = config?.entityId ?? '';

  const vacuum = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
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
  const name = config?.name ?? friendlyName(vacuum) ?? t('widgets.vacuum.label');
  const rooms = config?.rooms ?? [];
  const selects = config?.selects ?? [];
  const hasRooms = rooms.length > 0;
  const playFeedback = useSoundFeedback('vacuum', config?.soundOverrides);

  // ── Sequential cleaning: watch state changes ──
  /* eslint-disable react-hooks/preserve-manual-memoization -- mémoïsation
     conservée volontairement : ces callbacks alimentent les dépendances de
     l'effet de file d'attente, leur identité doit rester stable. */
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
  /* eslint-enable react-hooks/preserve-manual-memoization */

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

  // Le geste principal — lancer, mettre en pause, reprendre — en grand et en
  // couleur ; les autres en ronds neutres.
  const CONTROLS = [
    isPaused
      ? { icon: Play, action: 'start', label: t('widgets.vacuum.resume') }
      : isCleaning
        ? { icon: Pause, action: 'pause', label: t('widgets.vacuum.pause') }
        : { icon: Play, action: 'start', label: t('widgets.vacuum.start') },
    { icon: Square, action: 'stop', label: t('widgets.vacuum.stop') },
    { icon: Home, action: 'return_to_base', label: t('widgets.vacuum.dock') },
    { icon: LocateFixed, action: 'locate', label: t('widgets.vacuum.locate') },
  ];
  const batteryColor =
    battery === undefined ? undefined : battery > 50 ? 'var(--ds-good)' : battery > 20 ? 'var(--ds-warm-light)' : 'var(--ds-alert)';

  return (
    <div className='flex h-full flex-col overflow-hidden rounded-[var(--ds-radius-lg)] bg-[var(--ds-surface-2)] p-[var(--ds-space-4)] text-[var(--ds-ink)]'>
      {step === 'rooms' ? (
        <RoomSelect
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
        <div className='flex h-full flex-col gap-3'>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <div className='truncate text-[17px] font-semibold leading-tight'>{name}</div>
              <div className='truncate text-sm text-[var(--ds-ink-muted)]'>{stateLabel}</div>
            </div>
            {battery !== undefined && (
              <div className='flex shrink-0 items-center gap-1.5 text-sm text-[var(--ds-ink-muted)]'>
                <span>{battery} %</span>
                <Battery size={18} aria-hidden='true' style={{ color: batteryColor }} />
              </div>
            )}
          </div>

          {/* Ménage pièce par pièce : où en est la file */}
          {/* eslint-disable-next-line react-hooks/refs */}
          {queueActive && queueRef.current.length > 0 && (
            <div className='flex h-9 items-center gap-2 self-start rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-3)] px-3.5 text-sm font-semibold'>
              <ListOrdered size={16} aria-hidden='true' className='text-[var(--ds-accent)]' />
              {/* eslint-disable-next-line react-hooks/refs */}
              {t('widgets.vacuum.queueProgress', { current: queueIndex + 1, total: queueRef.current.length })}
            </div>
          )}

          <div className='flex min-h-[100px] flex-1 items-center justify-center'>
            <VacuumDisc state={stateKey} />
          </div>

          <div className='flex shrink-0 items-center justify-center gap-3'>
            {CONTROLS.map(({ icon: Icon, action, label }, i) => (
              <button
                key={action}
                onClick={() => call(action)}
                aria-label={label}
                title={label}
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full transition-transform active:scale-95',
                  i === 0 ? 'size-14 bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'size-12 bg-[var(--ds-surface-3)]'
                )}
              >
                <Icon size={i === 0 ? 24 : 20} fill={i === 0 ? 'currentColor' : 'none'} />
              </button>
            ))}
          </div>

          {/* Les sélecteurs : puissance d'aspiration, débit d'eau, parcours… */}
          {selects.length > 0 && (
            <div className={cn('grid shrink-0 gap-2', selects.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
              {selects.map(sel => (
                <VacuumSelectControl key={sel.entityId} entityId={sel.entityId} label={sel.label} />
              ))}
            </div>
          )}

          {hasRooms && (
            <button
              onClick={() => {
                setSelectedRooms([]);
                setStep('rooms');
              }}
              className='flex w-full shrink-0 items-center justify-between gap-3 rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-3)] px-4 py-3 text-left'
            >
              <MapPin size={18} aria-hidden='true' className='shrink-0' />
              <div className='min-w-0 flex-1'>
                <div className='text-sm font-semibold'>{t('widgets.vacuum.cleaning')}</div>
                <div className='text-xs text-[var(--ds-ink-muted)]'>{t('widgets.vacuum.byArea')}</div>
              </div>
              <ChevronRight size={18} aria-hidden='true' className='shrink-0 text-[var(--ds-ink-muted)]' />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
