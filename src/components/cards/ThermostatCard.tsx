import { motion } from 'framer-motion';
import { Power, Home, Moon, Sun } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn } from '@/lib/utils';
import { useRef, useState } from 'react';

// ─── SVG gauge constants ──────────────────────────────────────────────────────
const CX = 135;
const CY = 135;
const R = 108;
const START_DEG = 225; // clockwise from north (7-8 o'clock)
const SWEEP_DEG = 270; // total arc sweep
const MIN_T = 10;
const MAX_T = 30;

/** Convert clockwise-from-north angle to SVG x,y */
function gaugePoint(deg: number) {
  const rad = (deg * Math.PI) / 180;
  return {
    x: CX + R * Math.sin(rad),
    y: CY - R * Math.cos(rad),
  };
}

/** SVG arc path string from startDeg to endDeg */
function arcPath(startDeg: number, endDeg: number) {
  const s = gaugePoint(startDeg);
  const e = gaugePoint(endDeg);
  const sweep = endDeg - startDeg;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${R} ${R} 0 ${largeArc} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

// ─── French action labels ─────────────────────────────────────────────────────
const ACTION_FR: Record<string, string> = {
  heating: 'Chauffe',
  cooling: 'Refroidit',
  idle: 'En veille',
  off: 'Éteint',
  fan_only: 'Ventilation',
  drying: 'Séchage',
  preheating: 'Préchauffe',
};

// ─── Preset definitions ───────────────────────────────────────────────────────
const PRESETS = [
  { value: 'away', Icon: Home },
  { value: 'comfort', Icon: Sun },
  { value: 'sleep', Icon: Moon },
] as const;

// ─── Helper: pointer position → clockwise-from-north angle ──────────────────
function pointerToAngle(e: React.PointerEvent<SVGSVGElement>): number {
  const svg = e.currentTarget;
  const rect = svg.getBoundingClientRect();
  const scaleX = 270 / rect.width;
  const scaleY = 270 / rect.height;
  const svgX = (e.clientX - rect.left) * scaleX;
  const svgY = (e.clientY - rect.top) * scaleY;
  const angleDeg = Math.atan2(svgX - CX, -(svgY - CY)) * (180 / Math.PI);
  return angleDeg < 0 ? angleDeg + 360 : angleDeg;
}

/** Returns temp in 0.5°C steps, or null if angle is in the dead zone */
function angleToTemp(angleDeg: number): number | null {
  let normalized = angleDeg - START_DEG;
  if (normalized < 0) normalized += 360;
  if (normalized > SWEEP_DEG) return null;
  const fraction = normalized / SWEEP_DEG;
  const raw = MIN_T + fraction * (MAX_T - MIN_T);
  return Math.round(raw * 2) / 2; // 0.5 °C steps
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ThermostatCard() {
  const thermostat = useSafeEntity('climate.pellet');
  const { helpers } = useHass();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragTemp, setDragTemp] = useState<number | null>(null);
  const isDragging = dragTemp !== null;

  if (!thermostat) return null;

  const target = (thermostat.attributes.temperature as number | undefined) ?? 20;
  const current = (thermostat.attributes.current_temperature as number | undefined) ?? 20;
  const action = (thermostat.attributes.hvac_action as string | undefined) ?? thermostat.state;
  const activePreset = (thermostat.attributes.preset_mode as string | undefined) ?? 'none';
  const isOff = thermostat.state === 'off';

  // Use drag temp for live visual, fall back to HA state
  const displayTemp = dragTemp ?? target;

  // Arc geometry
  const fraction = Math.max(0, Math.min(1, (displayTemp - MIN_T) / (MAX_T - MIN_T)));
  const endDeg = START_DEG + Math.max(1, fraction * SWEEP_DEG);
  const dot = gaugePoint(endDeg);

  // Colour
  const isHeating = action === 'heating';
  const isCooling = action === 'cooling';
  const arcColor = isHeating ? '#fb923c' : isCooling ? '#60a5fa' : 'rgba(255,255,255,0.30)';

  // Temperature split for display
  const tempInt = Math.floor(displayTemp);
  const tempDec = Math.round((displayTemp - tempInt) * 10);

  // ── Drag handlers ────────────────────────────────────────────────────────────
  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const temp = angleToTemp(pointerToAngle(e));
    if (temp === null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragTemp(temp);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!isDragging) return;
    const temp = angleToTemp(pointerToAngle(e));
    if (temp !== null) setDragTemp(temp);
  }

  function handlePointerUp(_e: React.PointerEvent<SVGSVGElement>) {
    if (!isDragging) return;
    const finalTemp = dragTemp;
    setDragTemp(null);
    if (finalTemp !== null && finalTemp !== target) {
      helpers.callService({
        domain: 'climate',
        service: 'set_temperature',
        target: { entity_id: 'climate.pellet' },
        serviceData: { temperature: finalTemp },
      });
    }
  }

  function selectPreset(option: string) {
    helpers.callService({
      domain: 'climate',
      service: 'set_preset_mode',
      target: { entity_id: 'climate.pellet' },
      serviceData: { preset_mode: option },
    });
  }

  function togglePower() {
    helpers.callService({
      domain: 'climate',
      service: isOff ? 'turn_on' : 'turn_off',
      target: { entity_id: 'climate.pellet' },
    });
  }

  const actionLabel = ACTION_FR[action] ?? action;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className='gc rounded-3xl p-4 flex flex-col h-full'
    >
      {/* ── Circular gauge ── */}
      <div className='w-full'>
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <svg
          ref={svgRef}
          viewBox='0 0 270 270'
          className='w-full h-auto'
          style={{ touchAction: 'none', userSelect: 'none', cursor: isDragging ? 'grabbing' : 'grab' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <defs>
            <linearGradient id='thermoArcGrad' x1='0%' y1='100%' x2='100%' y2='0%'>
              <stop offset='0%' stopColor='#f97316' />
              <stop offset='100%' stopColor='#fbbf24' />
            </linearGradient>
          </defs>

          {/* Track (background arc) */}
          <path
            d={arcPath(START_DEG, START_DEG + SWEEP_DEG)}
            fill='none'
            stroke='rgba(255,255,255,0.10)'
            strokeWidth='11'
            strokeLinecap='round'
          />

          {/* Active arc */}
          <path
            d={arcPath(START_DEG, endDeg)}
            fill='none'
            stroke={isHeating ? 'url(#thermoArcGrad)' : arcColor}
            strokeWidth='11'
            strokeLinecap='round'
          />

          {/* Dot at target position */}
          <circle cx={dot.x} cy={dot.y} r={isDragging ? 9 : 7} fill='white' opacity={isDragging ? 1 : 0.9} />

          {/* HVAC action label */}
          <text x={CX} y={CY - 22} textAnchor='middle' fill='rgba(255,255,255,0.50)' fontSize='13' fontFamily='inherit'>
            {actionLabel}
          </text>

          {/* Target temperature — centered */}
          <text x={CX} y={CY + 30} textAnchor='middle' fill='white' fontSize='52' fontWeight='600' fontFamily='inherit'>
            {tempInt}
          </text>

          {/* °C — top-right of number */}
          <text x={CX + 30} y={CY - 2} textAnchor='start' fill='white' fontSize='15' fontWeight='500' fontFamily='inherit'>
            °C
          </text>

          {/* Decimal part — bottom-right of number */}
          <text x={CX + 30} y={CY + 18} textAnchor='start' fill='rgba(255,255,255,0.45)' fontSize='13' fontFamily='inherit'>
            .{tempDec}
          </text>

          {/* Current temperature */}
          <text x={CX} y={CY + 46} textAnchor='middle' fill='rgba(255,255,255,0.35)' fontSize='12' fontFamily='inherit'>
            ● {current.toFixed(1)} °C
          </text>
        </svg>
      </div>

      {/* ── Preset buttons ── */}
      <div className='grid grid-cols-4 gap-2 mt-1'>
        {/* Power toggle */}
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

        {/* Preset buttons */}
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
