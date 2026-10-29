import { useState, useRef, useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldOff, ShieldQuestion, Delete, X, Home, Plane, Moon, LogOut } from 'lucide-react';
import { useHass } from '@hakit/core';
import { callHAService, friendlyName } from '@/lib/ha-service';
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

/**
 * Quatre tons, pas une couleur par mode : désarmée (neutre), armée (la tuile
 * passe en `tile-on`), en cours d'armement, déclenchée (`alert`). Le mode
 * précis se lit dans le libellé.
 */
type AlarmTone = 'idle' | 'armed' | 'pending' | 'alert';

interface AlarmVisual {
  label: string;
  Icon: typeof ShieldCheck;
  tone: AlarmTone;
}

function getVisual(state: AlarmState, t: (k: string) => string): AlarmVisual {
  switch (state) {
    case 'disarmed':
      return { label: t('widgets.alarm.disarmed'), Icon: ShieldOff, tone: 'idle' };
    case 'armed_home':
    case 'armed_away':
    case 'armed_night':
    case 'armed_vacation':
      return { label: t(`widgets.alarm.${state}`), Icon: ShieldCheck, tone: 'armed' };
    case 'triggered':
      return { label: t('widgets.alarm.triggered'), Icon: ShieldAlert, tone: 'alert' };
    case 'arming':
    case 'pending':
      return { label: t('widgets.alarm.arming'), Icon: ShieldQuestion, tone: 'pending' };
    default:
      return { label: state, Icon: ShieldCheck, tone: 'idle' };
  }
}

// ── Per-mode metadata ─────────────────────────────────────────────────────────
interface ModeConfig {
  mode: ArmMode;
  /** État de l'entité une fois ce mode pris. */
  state: AlarmState;
  service: string;
  labelKey: string;
  Icon: typeof Home;
}

const MODE_CONFIGS: ModeConfig[] = [
  { mode: 'disarm', state: 'disarmed', service: 'alarm_disarm', labelKey: 'widgets.alarm.disarm', Icon: ShieldOff },
  { mode: 'home', state: 'armed_home', service: 'alarm_arm_home', labelKey: 'widgets.alarm.modeHome', Icon: Home },
  { mode: 'away', state: 'armed_away', service: 'alarm_arm_away', labelKey: 'widgets.alarm.modeAway', Icon: LogOut },
  { mode: 'night', state: 'armed_night', service: 'alarm_arm_night', labelKey: 'widgets.alarm.modeNight', Icon: Moon },
  { mode: 'vacation', state: 'armed_vacation', service: 'alarm_arm_vacation', labelKey: 'widgets.alarm.modeVacation', Icon: Plane },
];

const DEFAULT_MODES: ArmMode[] = ['disarm', 'home', 'away', 'night'];

/** Bits des `supported_features` d'une alarme (`AlarmControlPanelEntityFeature` de HA). */
const ARM_FEATURES: [ArmMode, number][] = [
  ['home', 1],
  ['away', 2],
  ['night', 4],
  ['vacation', 32],
];

/** Les modes que sait prendre une alarme, d'après ses `supported_features` — ceux par défaut, sans elles. */
const alarmModes = (features: unknown): ArmMode[] =>
  typeof features === 'number' ? ['disarm', ...ARM_FEATURES.flatMap(([mode, bit]) => (features & bit ? [mode] : []))] : DEFAULT_MODES;

/** Pastille du bouclier, selon le ton : sur une tuile armée elle passe en blanc. */
const PEBBLE: Record<AlarmTone, string> = {
  idle: 'bg-[var(--ds-surface-3)] text-[var(--ds-ink-muted)]',
  armed: 'bg-white text-[var(--ds-tile-on)]',
  pending: 'bg-[var(--ds-surface-3)] text-[var(--ds-heat-ink)]',
  alert: 'bg-[var(--ds-alert)] text-white',
};

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
  /** Au-dessus des modes : ce qu'il faut savoir avant d'armer — une fenêtre restée ouverte. */
  notice?: ReactNode;
}

function AlarmKeypadModal({
  open,
  pendingMode,
  onClose,
  entityId,
  name,
  requireCode,
  visual,
  activeModes,
  t,
  notice,
}: AlarmKeypadModalProps) {
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
            className='fixed inset-0 z-[100] bg-black/50'
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
              className='pointer-events-auto flex w-full max-w-sm flex-col gap-4 rounded-[var(--ds-radius-2xl)] bg-[var(--ds-sheet)] p-6 text-[var(--ds-ink)] shadow-[var(--ds-shadow-sheet)]'
            >
              <header className='flex items-center gap-3'>
                <span className={cn('flex size-12 shrink-0 items-center justify-center rounded-full', PEBBLE[visual.tone])}>
                  <visual.Icon size={22} />
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-lg font-semibold'>{name}</div>
                  <div className='text-sm text-[var(--ds-ink-muted)]'>{visual.label}</div>
                </div>
                <button
                  onClick={onClose}
                  aria-label={t('common.close')}
                  className='flex size-11 items-center justify-center rounded-full bg-[var(--ds-surface-3)]'
                >
                  <X size={18} />
                </button>
              </header>

              {notice}

              {/* ── Mode selector ── */}
              <div>
                <div className='mb-2 text-sm text-[var(--ds-ink-muted)]'>{t('widgets.alarm.selectMode')}</div>
                <div className='grid gap-2' style={{ gridTemplateColumns: `repeat(${Math.min(visibleModes.length, 3)}, 1fr)` }}>
                  {visibleModes.map(m => (
                    <button
                      key={m.mode}
                      onClick={() => setSelected(m.mode)}
                      aria-pressed={selected === m.mode}
                      className={cn(
                        'flex min-h-[64px] flex-col items-center justify-center gap-1 rounded-[var(--ds-radius-lg)] text-sm font-semibold transition-colors',
                        selected === m.mode
                          ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]'
                          : 'bg-[var(--ds-surface-2)] text-[var(--ds-ink)]'
                      )}
                    >
                      <m.Icon size={18} />
                      {t(m.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Code display ── */}
              {requireCode && (
                <div className='flex h-14 items-center justify-between rounded-[var(--ds-radius-pill)] bg-[var(--ds-surface-2)] px-5'>
                  <span className='flex min-h-[28px] items-center font-mono text-xl tracking-[0.45em]'>
                    {code ? (
                      '•'.repeat(code.length)
                    ) : (
                      <span className='font-sans text-sm tracking-normal text-[var(--ds-ink-muted)]'>
                        {t('widgets.alarm.pinPlaceholder')}
                      </span>
                    )}
                  </span>
                  {code && (
                    <button
                      onClick={() => setCode(c => c.slice(0, -1))}
                      aria-label={t('widgets.alarm.backspace')}
                      className='flex size-10 items-center justify-center rounded-full'
                    >
                      <Delete size={18} />
                    </button>
                  )}
                </div>
              )}

              {/* ── Numpad ── */}
              {requireCode && (
                <div className='grid grid-cols-3 gap-2'>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((k, i) => {
                    if (k === null) return <div key={i} />;
                    const isDel = k === 'del';
                    return (
                      <button
                        key={i}
                        onClick={() => {
                          if (isDel) setCode(c => c.slice(0, -1));
                          else setCode(c => (c.length < 8 ? c + String(k) : c));
                        }}
                        aria-label={isDel ? t('widgets.alarm.backspace') : String(k)}
                        className='flex h-14 items-center justify-center rounded-[var(--ds-radius-md)] bg-[var(--ds-surface-2)] text-xl font-semibold active:scale-95 transition-transform'
                      >
                        {isDel ? <Delete size={20} /> : k}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Confirm button ── */}
              <button
                onClick={callAlarm}
                className='flex h-14 items-center justify-center gap-2 rounded-[var(--ds-radius-pill)] bg-[var(--ds-tile-on)] text-base font-bold text-[var(--ds-tile-on-ink)]'
              >
                <selectedCfg.Icon size={18} />
                {t(selectedCfg.labelKey)}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

/**
 * Le choix du mode d'une alarme, hors de sa card — le bouclier du plan : ses
 * modes, son code et son état viennent de l'entité elle-même.
 */
export function AlarmModeModal({
  entityId,
  open,
  onClose,
  notice,
}: {
  entityId: string;
  open: boolean;
  onClose: () => void;
  notice?: ReactNode;
}) {
  const { t } = useI18n();
  const alarm = useSafeEntity(entityId);
  if (!alarm) return null;
  const modes = alarmModes(alarm.attributes.supported_features);
  return (
    <AlarmKeypadModal
      open={open}
      // Désarmée, on vient l'armer ; armée, la désarmer.
      pendingMode={alarm.state === 'disarmed' ? (modes.find(m => m !== 'disarm') ?? 'disarm') : 'disarm'}
      onClose={onClose}
      entityId={entityId}
      name={friendlyName(alarm) ?? entityId}
      requireCode={!!alarm.attributes.code_format}
      visual={getVisual(alarm.state, t)}
      activeModes={modes}
      t={t}
      notice={notice}
    />
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
  const name = config?.name ?? friendlyName(alarm) ?? t('widgets.alarm.label');
  const requireCode = config?.requireCode !== false;
  const activeModes = config?.armModes ?? DEFAULT_MODES;
  const armed = visual.tone === 'armed';

  // Une rangée de grille (80 px) ne peut pas contenir en-tête + bouclier + modes
  // empilés : sous ~120 px on bascule sur une disposition en ligne.
  const isRow = cardH < 120;
  const isSmall = cardW < 240 || cardH < 240;
  const showModes = cardH >= 200 && cardW >= 180;
  const pebble = Math.round(Math.max(56, Math.min(150, Math.min(cardW, cardH) * 0.38)));

  const visibleModes = MODE_CONFIGS.filter(m => activeModes.includes(m.mode));
  // Libellés des modes seulement si chaque segment garde ~92 px (icône +
  // « Désarmer ») : en deçà ils se tronquaient ; les icônes restent.
  const showModeLabels = (cardW - 50) / Math.max(visibleModes.length, 1) >= 92;

  function openModal(mode: ArmMode) {
    setPendingMode(mode);
    setModalOpen(true);
  }

  return (
    <>
      <div
        ref={containerRef}
        onClick={() => openModal(activeModes[0] ?? 'disarm')}
        className={cn(
          'flex h-full cursor-pointer select-none overflow-hidden rounded-[var(--ds-radius-lg)] transition-colors',
          armed ? 'bg-[var(--ds-tile-on)] text-[var(--ds-tile-on-ink)]' : 'bg-[var(--ds-surface-2)] text-[var(--ds-ink)]',
          visual.tone === 'alert' && 'shadow-[inset_0_0_0_3px_var(--ds-alert)]',
          isRow ? 'items-center gap-3 px-4' : 'flex-col gap-3 p-[var(--ds-space-4)]'
        )}
      >
        {/* Bouclier : un toucher ouvre le pavé, comme la card. Premier bouton
            de la card : c'est l'action principale. */}
        <motion.button
          animate={visual.tone === 'alert' || visual.tone === 'pending' ? { scale: [1, 1.06, 1] } : {}}
          transition={visual.tone === 'alert' || visual.tone === 'pending' ? { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } : {}}
          onClick={e => {
            e.stopPropagation();
            openModal(activeModes[0] ?? 'disarm');
          }}
          aria-label={visual.label}
          className={cn(
            'flex shrink-0 items-center justify-center rounded-full',
            PEBBLE[visual.tone],
            isRow ? 'order-first size-11' : 'order-2 mx-auto my-auto'
          )}
          style={isRow ? undefined : { width: pebble, height: pebble }}
        >
          <visual.Icon size={isRow ? 20 : Math.round(pebble * 0.42)} />
        </motion.button>

        <div className={cn('min-w-0', isRow ? 'flex-1' : 'order-1')}>
          <div className='truncate text-[17px] font-semibold leading-tight'>{name}</div>
          <div
            className={cn(
              'truncate text-sm',
              armed ? 'text-[var(--ds-tile-on-muted)]' : visual.tone === 'alert' ? 'text-[var(--ds-alert)]' : 'text-[var(--ds-ink-muted)]'
            )}
          >
            {visual.label}
          </div>
        </div>

        {/* Modes : une pilule segmentée, le mode en vigueur ressort. Sur une
            rangée, icônes seules, ce qui tient dans la largeur. */}
        {(isRow || showModes) && visibleModes.length > 0 && (
          <div
            className={cn(
              'flex shrink-0 gap-1 rounded-[var(--ds-radius-pill)] p-1',
              isRow ? 'order-last' : 'order-3',
              armed ? 'bg-black/20' : 'bg-[var(--ds-surface-1)]'
            )}
          >
            {visibleModes.slice(0, isRow ? (cardW < 300 ? 2 : 4) : undefined).map(m => {
              const current = m.state === alarm.state;
              return (
                <button
                  key={m.mode}
                  onClick={e => {
                    e.stopPropagation();
                    openModal(m.mode);
                  }}
                  title={t(m.labelKey)}
                  aria-label={isRow || !showModeLabels ? t(m.labelKey) : undefined}
                  aria-pressed={current}
                  className={cn(
                    'flex min-w-0 items-center justify-center gap-1.5 rounded-[var(--ds-radius-pill)] font-semibold transition-colors',
                    isRow ? 'size-10' : cn('h-11 flex-1', isSmall ? 'text-xs' : 'text-sm'),
                    current
                      ? armed
                        ? 'bg-white text-[var(--ds-tile-on)]'
                        : 'bg-[var(--ds-surface-3)] text-[var(--ds-ink)]'
                      : armed
                        ? 'text-[var(--ds-tile-on-muted)]'
                        : 'text-[var(--ds-ink-muted)]'
                  )}
                >
                  <m.Icon size={16} className='shrink-0' />
                  {!isRow && showModeLabels && <span className='truncate'>{t(m.labelKey)}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

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
