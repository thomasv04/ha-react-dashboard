import { motion, AnimatePresence } from 'framer-motion';
import React, { useState, useRef, useEffect } from 'react';
import { Power, Home, Moon, Sun } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import type { ThermostatCardConfig } from '@/types/widget-configs';

// ─── SVG gauge constants ──────────────────────────────────────────────────────
const CX = 135;
const CY = 135;
const STROKE = 25;           // épaisseur de la jauge
const R = 130 - STROKE / 2;  // rayon: bord extérieur à 130 (marge de 5 dans le viewBox 270)
const START_DEG = 225;
const SWEEP_DEG = 270;
const MIN_T = 10;
const MAX_T = 30;

function gaugePoint(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: CX + R * Math.sin(rad), y: CY - R * Math.cos(rad) };
}

function arcPath(startDeg: number, endDeg: number) {
  const s = gaugePoint(startDeg);
  const e = gaugePoint(endDeg);
  const sweep = endDeg - startDeg;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

// ─── Action labels ────────────────────────────────────────────────────────────
const ACTION_LABEL: Record<string, string> = {
  heating:    'CHAUFFER À',
  cooling:    'REFROIDIR À',
  idle:       'EN VEILLE',
  off:        'ÉTEINT', 
  fan_only:   'VENTILATION',
  drying:     'SÉCHAGE',
  preheating: 'PRÉCHAUFFE',
};

// ─── Preset definitions ───────────────────────────────────────────────────────
const PRESETS = [
  { value: 'away',    Icon: Home },
  { value: 'comfort', Icon: Sun  },
  { value: 'sleep',   Icon: Moon },
] as const;

// ─── usePrevious ──────────────────────────────────────────────────────────────
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => { ref.current = value; });
  return ref.current;
}

// ─── Single digit with animation (per position) ──────────────────────────────
function AnimatedDigit({
  digit, x, y,
  fontSize = 64,
  fontWeight = '700',
  fill = 'white',
}: {
  digit: number;
  x: number;
  y: number;
  fontSize?: number;
  fontWeight?: string;
  fill?: string;
}) {
  const prev = usePrevious(digit);
  const direction = prev !== undefined && digit > prev ? 'up' : 'down';

  return (
    <AnimatePresence mode='sync'>
      <motion.g
        key={digit}
        initial={{ opacity: 0, translateY: direction === 'up' ? 22 : -22 }}
        animate={{ opacity: 1, translateY: 0 }}
        exit={{ opacity: 0, translateY: direction === 'up' ? -22 : 22 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      >
        <text x={x} y={y} textAnchor='middle' fill={fill} fontSize={fontSize} fontWeight={fontWeight} fontFamily='inherit'>
          {digit}
        </text>
      </motion.g>
    </AnimatePresence>
  );
}

// ─── Integer split per digit, each position animated independently ────────────
const DIGIT_W = 38; // approximate character width at fontSize=64 bold

function AnimatedSvgDigits({
  value, rightX, y,
  fontSize = 64,
  fontWeight = '700',
  fill = 'white',
}: {
  value: number;
  rightX: number;
  y: number;
  fontSize?: number;
  fontWeight?: string;
  fill?: string;
}) {
  const digits = String(value).split('').map(Number);
  const count = digits.length;
  return (
    <>
      {digits.map((d, i) => {
        const offset = count - 1 - i; // 0 = rightmost (units), 1 = tens, etc.
        const cx = rightX - DIGIT_W / 2 - offset * DIGIT_W;
        return (
          <AnimatedDigit
            key={`pos-${offset}`}
            digit={d}
            x={cx}
            y={y}
            fontSize={fontSize}
            fontWeight={fontWeight}
            fill={fill}
          />
        );
      })}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ThermostatCard() {
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<ThermostatCardConfig>(widgetId || 'thermostat');
  const entityId = config?.entityId ?? 'climate.living_room';
  const minT = config?.minTemp ?? MIN_T;
  const maxT = config?.maxTemp ?? MAX_T;

  const thermostat = useSafeEntity(entityId);
  const { helpers } = useHass();

  const svgRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);
  const localTargetRef = useRef<number>(20);
  const [localTarget, setLocalTarget] = useState<number>(20);

  const haTemp = thermostat?.attributes.temperature as number | undefined;
  useEffect(() => {
    if (!isDraggingRef.current) {
      const t = haTemp ?? 20;
      localTargetRef.current = t;
      setLocalTarget(t);
    }
  }, [haTemp]);

  if (!thermostat) return null;

  const current      = (thermostat.attributes.current_temperature as number | undefined) ?? 20;
  const action       = (thermostat.attributes.hvac_action as string | undefined) ?? thermostat.state;
  const activePreset = (thermostat.attributes.preset_mode as string | undefined) ?? 'none';
  const isOff        = thermostat.state === 'off';
  const actionLabel  = ACTION_LABEL[action] ?? action.toUpperCase();

  const fraction    = Math.max(0, Math.min(1, (localTarget - minT) / (maxT - minT)));
  const endDeg      = START_DEG + Math.max(1, fraction * SWEEP_DEG);
  const dot         = gaugePoint(endDeg);

  const currentFraction = Math.max(0, Math.min(1, (current - minT) / (maxT - minT)));
  const currentDeg  = START_DEG + Math.max(1, currentFraction * SWEEP_DEG);

  const tempInt = Math.floor(localTarget);
  const tempDec = Math.round((localTarget - tempInt) * 10);

  function coordToTemp(clientX: number, clientY: number): number {
    const svg = svgRef.current;
    if (!svg) return localTargetRef.current;
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) * (270 / rect.width) - CX;
    const y = (clientY - rect.top) * (270 / rect.height) - CY;
    const rawDeg = (Math.atan2(x, -y) * 180) / Math.PI;
    const deg = rawDeg < 0 ? rawDeg + 360 : rawDeg;

    let normalized: number;
    if (deg >= START_DEG) {
      normalized = deg - START_DEG;
    } else if (deg <= START_DEG - 360 + SWEEP_DEG) {
      normalized = deg + 360 - START_DEG;
    } else {
      return localTargetRef.current;
    }

    const frac = Math.max(0, Math.min(1, normalized / SWEEP_DEG));
    const raw  = minT + frac * (maxT - minT);
    return Math.round(raw / 0.5) * 0.5;
  }

  function updateLocalTarget(t: number) {
    localTargetRef.current = t;
    setLocalTarget(t);
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDraggingRef.current = true;
    updateLocalTarget(coordToTemp(e.clientX, e.clientY));
  }
  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!isDraggingRef.current) return;
    updateLocalTarget(coordToTemp(e.clientX, e.clientY));
  }
  function onPointerUp() {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    helpers.callService({
      domain: 'climate',
      service: 'set_temperature',
      target: { entity_id: entityId },
      serviceData: { temperature: localTargetRef.current },
    });
  }

  function selectPreset(option: string) {
    helpers.callService({
      domain: 'climate',
      service: 'set_preset_mode',
      target: { entity_id: entityId },
      serviceData: { preset_mode: option },
    });
  }
  function togglePower() {
    helpers.callService({
      domain: 'climate',
      service: isOff ? 'turn_on' : 'turn_off',
      target: { entity_id: entityId },
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className='gc rounded-3xl p-4 flex flex-col h-full'
    >
      <div className='flex-1 min-h-0 overflow-hidden'>
        <svg
          ref={svgRef}
          viewBox='0 0 270 270'
          className='w-full h-full touch-none cursor-grab active:cursor-grabbing select-none'
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <defs>
            <linearGradient id='tempGradient' gradientUnits='userSpaceOnUse' x1='17' y1='0' x2='253' y2='0'>
              <stop offset='0%'   stopColor='#1a56ff' />
              <stop offset='28%'  stopColor='#00c6ff' />
              <stop offset='65%'  stopColor='#fbbf24' />
              <stop offset='100%' stopColor='#ff7b00' />
            </linearGradient>
            <filter id='thumbShadow' x='-50%' y='-50%' width='200%' height='200%'>
              <feDropShadow dx='0' dy='2' stdDeviation='4' floodColor='black' floodOpacity='0.3' />
            </filter>
            <clipPath id='centerClip'>
              <circle cx={CX} cy={CY} r={R - STROKE / 2 - 8} />
            </clipPath>
          </defs>

          {/* Track */}
          <path
            d={arcPath(START_DEG, START_DEG + SWEEP_DEG)}
            fill='none'
            stroke='url(#tempGradient)'
            strokeWidth={STROKE}
            strokeLinecap='round'
            opacity='0.15'
          />
          {/* Arc actif — jusqu'à la cible (endDeg) */}
          <path
            d={arcPath(START_DEG, endDeg)}
            fill='none'
            stroke='url(#tempGradient)'
            strokeWidth={STROKE}
            strokeLinecap='round'
          />
          {/* Ronds de rattrapage : entre current et target, seulement si target > current */}
          {endDeg > currentDeg && endDeg - currentDeg > 5 && (() => {
            const dots: React.ReactNode[] = [];
            const step = 10;
            for (let deg = currentDeg + step; deg < endDeg - step * 0.5; deg += step) {
              const pt = gaugePoint(deg);
              dots.push(
                <circle key={deg} cx={pt.x.toFixed(2)} cy={pt.y.toFixed(2)} r='3.5' fill='white' opacity='0.65' />
              );
            }
            return <>{dots}</>;
          })()}
          {/* Petit cercle blanc = marqueur de température actuelle */}
          <circle cx={gaugePoint(currentDeg).x} cy={gaugePoint(currentDeg).y} r='5' fill='white' opacity='0.8' />
          {/* Curseur cible */}
          <motion.circle
            cx={dot.x}
            cy={dot.y}
            animate={{ cx: dot.x, cy: dot.y }}
            transition={{ type: 'tween', duration: 0.05, ease: 'linear' }}
            r='10'
            fill='white'
            filter='url(#thumbShadow)'
          />
          {/* Zone texte centrale */}
          <g clipPath='url(#centerClip)'>
            <text
              x={CX} y={CY - 28}
              textAnchor='middle'
              fill='rgba(255,255,255,0.55)'
              fontSize='11'
              letterSpacing='2'
              fontFamily='inherit'
            >
              {actionLabel}
            </text>
            <AnimatedSvgDigits value={tempInt} rightX={CX + 9} y={CY + 28} />
            <text x={CX + 9} y={CY + 28} textAnchor='start' fill='rgba(255,255,255,0.85)' fontSize={64} fontWeight='700' fontFamily='inherit'>.</text>
            <AnimatedDigit digit={tempDec} x={CX + 28 + DIGIT_W / 2} y={CY + 28} fill='rgba(255,255,255,0.85)' />
            <text x={CX + 68} y={CY - 8} textAnchor='start' fill='white' fontSize='16' fontWeight='500' fontFamily='inherit'>°C</text>
            <text x={CX} y={CY + 54} textAnchor='middle' fill='rgba(255,255,255,0.35)' fontSize='11' fontFamily='inherit'>
              ● {current.toFixed(1)} °C
            </text>
          </g>
        </svg>
      </div>

      <div className='grid grid-cols-4 gap-2 mt-1'>
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={togglePower}
          className={cn(
            'flex items-center justify-center h-[50px] rounded-[15px] transition-all duration-200',
            !isOff
              ? 'bg-gradient-to-br from-white/5 to-white/20 border border-white/30 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.3),2px_2px_6px_rgba(0,0,0,0.2)]'
              : 'bg-gradient-to-br from-black/10 to-black/20 border border-transparent hover:border-white/10'
          )}
        >
          <Power size={22} className={!isOff ? 'text-white' : 'text-white/60'} />
        </motion.button>
        {PRESETS.map(({ value, Icon }) => {
          const isActive = activePreset === value;
          return (
            <motion.button
              key={value}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.94 }}
              onClick={() => selectPreset(value)}
              className={cn(
                'flex items-center justify-center h-[50px] rounded-[15px] transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-br from-white/5 to-white/20 border border-white/30 shadow-[inset_1px_1px_3px_rgba(255,255,255,0.3),2px_2px_6px_rgba(0,0,0,0.2)]'
                  : 'bg-gradient-to-br from-black/10 to-black/20 border border-transparent hover:border-white/10'
              )}
            >
              <Icon size={22} className={isActive ? 'text-white' : 'text-white/60'} />
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}
