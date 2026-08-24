import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { ShieldCheck, ShieldAlert, ShieldOff, ShieldQuestion, Delete, X, Home, Plane, Moon, LogOut } from 'lucide-react';
import { useHass } from '@hakit/core';
import { callHAService } from '@/lib/ha-service';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { AlarmCardConfig, ArmMode } from '@/types/widget-types';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { useElementBox } from '@/hooks/useWidgetSize';

type AlarmState =
  | 'disarmed'
  | 'armed_home'
  | 'armed_away'
  | 'armed_night'
  | 'armed_vacation'
  | 'armed_custom_bypass'
  | 'pending'
  | 'arming'
  | 'triggered'
  | string;

interface AlarmVisual {
  label: string;
  Icon: typeof ShieldCheck;
  ringColor: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  pulse: boolean;
}

function getVisual(state: AlarmState, t: (k: string) => string): AlarmVisual {
  switch (state) {
    case 'disarmed':
      return {
        label: t('widgets.alarm.disarmed'),
        Icon: ShieldOff,
        ringColor: '#4ade80',
        bgClass: 'bg-green-400/10',
        textClass: 'text-green-400',
        borderClass: 'border-green-400/20',
        pulse: false,
      };
    case 'armed_home':
      return {
        label: t('widgets.alarm.armed_home'),
        Icon: ShieldCheck,
        ringColor: '#facc15',
        bgClass: 'bg-yellow-400/10',
        textClass: 'text-yellow-400',
        borderClass: 'border-yellow-400/20',
        pulse: false,
      };
    case 'armed_away':
      return {
        label: t('widgets.alarm.armed_away'),
        Icon: ShieldAlert,
        ringColor: '#f87171',
        bgClass: 'bg-red-400/10',
        textClass: 'text-red-400',
        borderClass: 'border-red-400/20',
        pulse: false,
      };
    case 'armed_night':
      return {
        label: t('widgets.alarm.armed_night'),
        Icon: ShieldCheck,
        ringColor: '#c084fc',
        bgClass: 'bg-purple-400/10',
        textClass: 'text-purple-400',
        borderClass: 'border-purple-400/20',
        pulse: false,
      };
    case 'armed_vacation':
      return {
        label: t('widgets.alarm.armed_vacation'),
        Icon: ShieldCheck,
        ringColor: '#60a5fa',
        bgClass: 'bg-blue-400/10',
        textClass: 'text-blue-400',
        borderClass: 'border-blue-400/20',
        pulse: false,
      };
    case 'triggered':
      return {
        label: t('widgets.alarm.triggered'),
        Icon: ShieldAlert,
        ringColor: '#ef4444',
        bgClass: 'bg-red-500/20',
        textClass: 'text-red-400',
        borderClass: 'border-red-500/30',
        pulse: true,
      };
    case 'arming':
    case 'pending':
      return {
        label: t('widgets.alarm.arming'),
        Icon: ShieldQuestion,
        ringColor: '#fb923c',
        bgClass: 'bg-orange-400/10',
        textClass: 'text-orange-400',
        borderClass: 'border-orange-400/20',
        pulse: true,
      };
    default:
      return {
        label: state,
        Icon: ShieldCheck,
        ringColor: 'rgba(255,255,255,0.2)',
        bgClass: 'bg-white/5',
        textClass: 'text-white/50',
        borderClass: 'border-white/10',
        pulse: false,
      };
  }
}

// ── Per-mode metadata ─────────────────────────────────────────────────────────
interface ModeConfig {
  mode: ArmMode;
  service: string;
  labelKey: string;
  Icon: typeof Home;
  textClass: string;
  bgClass: string;
  hoverClass: string;
  borderClass: string;
}

const MODE_CONFIGS: ModeConfig[] = [
  {
    mode: 'disarm',
    service: 'alarm_disarm',
    labelKey: 'widgets.alarm.disarm',
    Icon: ShieldOff,
    textClass: 'text-green-300',
    bgClass: 'bg-green-500/12',
    hoverClass: 'hover:bg-green-500/22',
    borderClass: 'border-green-500/20',
  },
  {
    mode: 'home',
    service: 'alarm_arm_home',
    labelKey: 'widgets.alarm.modeHome',
    Icon: Home,
    textClass: 'text-yellow-300',
    bgClass: 'bg-yellow-500/12',
    hoverClass: 'hover:bg-yellow-500/22',
    borderClass: 'border-yellow-500/20',
  },
  {
    mode: 'away',
    service: 'alarm_arm_away',
    labelKey: 'widgets.alarm.modeAway',
    Icon: LogOut,
    textClass: 'text-red-300',
    bgClass: 'bg-red-500/12',
    hoverClass: 'hover:bg-red-500/22',
    borderClass: 'border-red-500/20',
  },
  {
    mode: 'night',
    service: 'alarm_arm_night',
    labelKey: 'widgets.alarm.modeNight',
    Icon: Moon,
    textClass: 'text-purple-300',
    bgClass: 'bg-purple-500/12',
    hoverClass: 'hover:bg-purple-500/22',
    borderClass: 'border-purple-500/20',
  },
  {
    mode: 'vacation',
    service: 'alarm_arm_vacation',
    labelKey: 'widgets.alarm.modeVacation',
    Icon: Plane,
    textClass: 'text-blue-300',
    bgClass: 'bg-blue-500/12',
    hoverClass: 'hover:bg-blue-500/22',
    borderClass: 'border-blue-500/20',
  },
];

const DEFAULT_MODES: ArmMode[] = ['disarm', 'home', 'away', 'night'];

// ── SVG ring — scales with size prop ─────────────────────────────────────────
function AlarmRing({ size, fill, color, pulse }: { size: number; fill: number; color: string; pulse: boolean }) {
  const cx = size / 2;
  const strokeW = Math.max(3, size * 0.055);
  const R = cx - strokeW / 2 - 2;
  const C = 2 * Math.PI * R;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className='absolute inset-0'>
      <circle cx={cx} cy={cx} r={R} fill='none' stroke='rgba(255,255,255,0.06)' strokeWidth={strokeW} />
      <motion.circle
        cx={cx}
        cy={cx}
        r={R}
        fill='none'
        stroke={color}
        strokeWidth={strokeW}
        strokeLinecap='round'
        strokeDasharray={C}
        initial={{ strokeDashoffset: C }}
        animate={{ strokeDashoffset: C * (1 - fill), opacity: pulse ? [1, 0.35, 1] : 1 }}
        transition={{
          strokeDashoffset: { duration: 0.8, ease: 'easeOut' },
          opacity: pulse ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : {},
        }}
        style={{ transformOrigin: `${cx}px ${cx}px`, rotate: '-90deg' }}
      />
    </svg>
  );
}

// ── Keypad Modal ──────────────────────────────────────────────────────────────
interface AlarmKeypadModalProps {
  open: boolean;
  pendingMode: ArmMode | null;
  onClose: () => void;
  entityId: string;
  name: string;
  requireCode: boolean;
  visual: AlarmVisual;
  activeModes: ArmMode[];
  t: (key: string) => string;
}

function AlarmKeypadModal({ open, pendingMode, onClose, entityId, name, requireCode, visual, activeModes, t }: AlarmKeypadModalProps) {
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();
  const [code, setCode] = useState('');
  const [selected, setSelected] = useState<ArmMode>(pendingMode ?? 'disarm');

  // Sync selected when pendingMode changes
  useEffect(() => {
    if (pendingMode) setSelected(pendingMode);
  }, [pendingMode]);

  const visibleModes = MODE_CONFIGS.filter(m => activeModes.includes(m.mode));
  const selectedCfg = MODE_CONFIGS.find(m => m.mode === selected) ?? MODE_CONFIGS[0];

  function callAlarm() {
    callHAService(helpers, 'alarm_control_panel', selectedCfg.service, { entity_id: entityId }, requireCode && code ? { code } : undefined);
    playFeedback(selected === 'disarm' ? 'disarm' : 'arm');
    setCode('');
    onClose();
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            data-overlay
            className='fixed inset-0 z-[100] bg-black/60 backdrop-blur-md'
          />
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 340 }}
            className='fixed inset-0 z-[101] flex items-end sm:items-center justify-center p-3 pointer-events-none'
          >
            <div
              role='dialog'
              aria-modal='true'
              aria-label={name}
              className='gc rounded-3xl w-full max-w-sm pointer-events-auto shadow-2xl overflow-hidden'
            >
              {/* ── Coloured header ── */}
              <div className={cn('px-5 pt-5 pb-4 border-b border-white/6', visual.bgClass)}>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='relative w-10 h-10 flex items-center justify-center'>
                      <AlarmRing size={40} fill={1} color={visual.ringColor} pulse={visual.pulse} />
                      <visual.Icon size={16} className={visual.textClass} />
                    </div>
                    <div>
                      <div className='text-white/40 text-[10px] font-medium uppercase tracking-wider'>{name}</div>
                      <div className={cn('font-bold text-base leading-tight', visual.textClass)}>{visual.label}</div>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={onClose}
                    className='w-8 h-8 rounded-2xl gc-inner flex items-center justify-center text-white/30 hover:text-white/70 transition-colors'
                  >
                    <X size={15} />
                  </motion.button>
                </div>
              </div>

              <div className='p-4 space-y-3'>
                {/* ── Mode selector ── */}
                <div>
                  <div className='text-[10px] text-white/30 uppercase tracking-wider mb-2'>{t('widgets.alarm.selectMode')}</div>
                  <div className='grid gap-1.5' style={{ gridTemplateColumns: `repeat(${Math.min(visibleModes.length, 3)}, 1fr)` }}>
                    {visibleModes.map(m => (
                      <motion.button
                        key={m.mode}
                        whileTap={{ scale: 0.93 }}
                        onClick={() => setSelected(m.mode)}
                        className={cn(
                          'flex flex-col items-center gap-1 py-2.5 px-2 rounded-2xl text-[11px] font-semibold border transition-all',
                          selected === m.mode
                            ? cn(m.bgClass, m.borderClass, m.textClass, 'ring-1 ring-inset', m.borderClass)
                            : 'bg-white/4 border-white/8 text-white/35 hover:bg-white/8 hover:text-white/55'
                        )}
                      >
                        <m.Icon size={16} className={selected === m.mode ? m.textClass : 'text-white/30'} />
                        {t(m.labelKey)}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* ── Code display ── */}
                {requireCode && (
                  <div className='gc-inner rounded-2xl px-4 py-3 flex items-center justify-between'>
                    <span className='text-white font-mono tracking-[0.45em] text-xl min-h-[28px] flex items-center'>
                      {code ? (
                        '•'.repeat(code.length)
                      ) : (
                        <span className='text-white/20 text-sm tracking-normal font-sans'>{t('widgets.alarm.pinPlaceholder')}</span>
                      )}
                    </span>
                    <AnimatePresence>
                      {code && (
                        <motion.button
                          initial={{ opacity: 0, scale: 0.7 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.7 }}
                          whileTap={{ scale: 0.85 }}
                          onClick={() => setCode(c => c.slice(0, -1))}
                          aria-label={t('widgets.alarm.backspace')}
                          className='touch-target w-8 h-8 rounded-xl gc-btn flex items-center justify-center'
                        >
                          <Delete size={14} className='text-white/50' />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* ── Numpad ── */}
                {requireCode && (
                  <div className='grid grid-cols-3 gap-2'>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((k, i) => {
                      if (k === null) return <div key={i} />;
                      const isDel = k === 'del';
                      return (
                        <motion.button
                          key={i}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            if (isDel) setCode(c => c.slice(0, -1));
                            else setCode(c => (c.length < 8 ? c + String(k) : c));
                          }}
                          aria-label={isDel ? t('widgets.alarm.backspace') : String(k)}
                          className='py-3.5 rounded-2xl gc-btn font-semibold text-white text-lg hover:bg-white/10 transition-colors flex items-center justify-center'
                        >
                          {isDel ? <Delete size={18} className='text-white/50' /> : k}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* ── Confirm button ── */}
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={callAlarm}
                  className={cn(
                    'w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 border transition-all',
                    selectedCfg.bgClass,
                    selectedCfg.hoverClass,
                    selectedCfg.borderClass,
                    selectedCfg.textClass
                  )}
                >
                  <selectedCfg.Icon size={15} />
                  {t(selectedCfg.labelKey)}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ── AlarmCard widget ──────────────────────────────────────────────────────────
export function AlarmCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<AlarmCardConfig>(widgetId || 'alarm');
  const entityId = config?.entityId ?? '';

  const alarm = useSafeEntity(entityId);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState<ArmMode | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [cardW, setCardW] = useState(300);
  const [cardH, setCardH] = useState(300);
  useElementBox(containerRef, (width, height) => {
    setCardW(width);
    setCardH(height);
  });

  if (!alarm) return null;

  const visual = getVisual(alarm.state, t);
  const name = config?.name ?? (alarm.attributes.friendly_name as string) ?? t('widgets.alarm.label');
  const isArmed = alarm.state.startsWith('armed_');
  const requireCode = config?.requireCode !== false;
  const activeModes = config?.armModes ?? DEFAULT_MODES;
  const ringFill = isArmed || alarm.state === 'triggered' ? 1 : alarm.state === 'arming' || alarm.state === 'pending' ? 0.5 : 0.15;

  // Une rangée de grille (80 px) ne peut pas contenir en-tête + anneau + label
  // empilés : sous ~120 px on bascule sur une disposition en ligne.
  const isRow = cardH < 120;
  const isTiny = cardW < 180 || cardH < 180;
  const isSmall = cardW < 240 || cardH < 240;
  const showButtons = cardH >= 200 && !isTiny;
  const ringSize = isTiny ? 64 : isSmall ? 80 : 96;
  const iconSize = isTiny ? 20 : isSmall ? 22 : 26;
  const iconBubble = isTiny ? 'w-9 h-9 rounded-xl' : isSmall ? 'w-11 h-11 rounded-2xl' : 'w-14 h-14 rounded-2xl';

  const visibleModes = MODE_CONFIGS.filter(m => activeModes.includes(m.mode));

  function openModal(mode: ArmMode) {
    setPendingMode(mode);
    setModalOpen(true);
  }

  return (
    <>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION_ENTRANCE, delay: 0.1 }}
        onClick={() => openModal(activeModes[0] ?? 'disarm')}
        className={cn(
          'gc rounded-3xl h-full cursor-pointer hover:ring-1 hover:ring-white/10 transition-all select-none overflow-hidden',
          isRow ? 'px-3.5 py-2 flex items-center gap-3' : 'p-3.5 flex flex-col'
        )}
      >
        {isRow ? (
          <>
            {/* Pastille d'état */}
            <div
              className={cn('w-10 h-10 rounded-2xl flex items-center justify-center border shrink-0', visual.bgClass, visual.borderClass)}
            >
              <visual.Icon size={19} className={visual.textClass} />
            </div>

            {/* Nom + état */}
            <div className='flex-1 min-w-0'>
              <div className='text-white/40 text-[11px] font-medium truncate leading-tight'>{name}</div>
              <div className={cn('text-sm font-semibold truncate leading-tight', visual.textClass)}>{visual.label}</div>
            </div>

            {/* Modes en pastilles — icône seule, ce qui tient dans la largeur.
                40 px : le maximum qu'autorise une rangée de 80 px une fois le
                padding retiré, et une cible confortable au doigt. */}
            {visibleModes.length > 0 && (
              <div className='flex items-center gap-1.5 shrink-0'>
                {visibleModes.slice(0, cardW < 300 ? 2 : 4).map(m => (
                  <motion.button
                    key={m.mode}
                    whileTap={{ scale: 0.9 }}
                    onClick={e => {
                      e.stopPropagation();
                      openModal(m.mode);
                    }}
                    title={t(m.labelKey)}
                    aria-label={t(m.labelKey)}
                    className={cn(
                      'w-10 h-10 rounded-xl border flex items-center justify-center transition-colors active:scale-90',
                      m.bgClass,
                      m.hoverClass,
                      m.borderClass,
                      m.textClass
                    )}
                  >
                    <m.Icon size={16} />
                  </motion.button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Header */}
            <div className='flex items-center justify-between mb-1'>
              <span className={cn('text-white/40 font-medium truncate', isTiny ? 'text-[10px]' : 'text-xs')}>{name}</span>
              <div className={cn('rounded-lg flex items-center justify-center shrink-0', visual.bgClass, isTiny ? 'w-5 h-5' : 'w-6 h-6')}>
                <visual.Icon size={isTiny ? 10 : 13} className={visual.textClass} />
              </div>
            </div>

            {/* Ring + icon */}
            <div className='flex-1 flex items-center justify-center min-h-0'>
              <div className='relative flex items-center justify-center' style={{ width: ringSize, height: ringSize }}>
                <AlarmRing size={ringSize} fill={ringFill} color={visual.ringColor} pulse={visual.pulse} />
                <div
                  className='absolute rounded-full opacity-15 blur-2xl pointer-events-none'
                  style={{ width: ringSize * 0.7, height: ringSize * 0.7, background: visual.ringColor }}
                />
                <motion.div
                  animate={visual.pulse ? { scale: [1, 1.08, 1] } : {}}
                  transition={visual.pulse ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : {}}
                  className={cn('flex items-center justify-center border', iconBubble, visual.bgClass, visual.borderClass)}
                >
                  <visual.Icon size={iconSize} className={visual.textClass} />
                </motion.div>
              </div>
            </div>

            {/* Status label */}
            <div className='text-center mt-1'>
              <span className={cn('font-semibold', visual.textClass, isTiny ? 'text-[10px]' : isSmall ? 'text-xs' : 'text-sm')}>
                {visual.label}
              </span>
            </div>

            {/* Mode buttons — dynamic */}
            {showButtons && visibleModes.length > 0 && (
              <div
                className='mt-2.5 grid gap-1'
                style={{ gridTemplateColumns: `repeat(${Math.min(visibleModes.length, isSmall ? 2 : 4)}, 1fr)` }}
              >
                {visibleModes.map(m => (
                  <motion.button
                    key={m.mode}
                    whileTap={{ scale: 0.91 }}
                    onClick={e => {
                      e.stopPropagation();
                      openModal(m.mode);
                    }}
                    className={cn(
                      'flex flex-col items-center gap-0.5 rounded-xl border transition-colors',
                      isSmall ? 'py-1.5 text-[9px]' : 'py-2 text-[10px]',
                      m.bgClass,
                      m.hoverClass,
                      m.borderClass,
                      m.textClass
                    )}
                  >
                    <m.Icon size={isSmall ? 10 : 12} />
                    <span className='font-semibold leading-tight'>{t(m.labelKey)}</span>
                  </motion.button>
                ))}
              </div>
            )}
          </>
        )}
      </motion.div>

      <AlarmKeypadModal
        open={modalOpen}
        pendingMode={pendingMode}
        onClose={() => {
          setModalOpen(false);
          setPendingMode(null);
        }}
        entityId={entityId}
        name={name}
        requireCode={requireCode}
        visual={visual}
        activeModes={activeModes}
        t={t}
      />
    </>
  );
}
