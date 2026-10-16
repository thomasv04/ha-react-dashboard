import { motion, AnimatePresence } from 'framer-motion';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import React, { useState, useRef, useEffect } from 'react';
import { Power, Home, Moon, Sun } from 'lucide-react';
import { useHass } from '@hakit/core';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { cn, clamp } from '@/lib/utils';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useElementBox } from '@/hooks/useWidgetSize';
import type { ThermostatCardConfig } from '@/types/widget-configs';
import { useI18n } from '@/i18n';
import { useSoundFeedback } from '@/hooks/useSoundFeedback';
import { climateRange, snapTemp } from '@/lib/climate';

// ─── SVG gauge constants ──────────────────────────────────────────────────────
const CX = 135;
const CY = 135;
const STROKE = 25; // épaisseur de la jauge
const R = 130 - STROKE / 2; // rayon: bord extérieur à 130 (marge de 5 dans le viewBox 270)
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

const ACTION_KEYS: Record<string, string> = {
  heating: 'widgets.thermostat.heating',
  cooling: 'widgets.thermostat.cooling',
  idle: 'widgets.thermostat.idle',
  off: 'widgets.thermostat.off',
  fan_only: 'widgets.thermostat.fan_only',
  drying: 'widgets.thermostat.drying',
  preheating: 'widgets.thermostat.preheating',
};

// ─── Preset definitions ───────────────────────────────────────────────────────
const PRESETS = [
  { value: 'away', Icon: Home },
  { value: 'comfort', Icon: Sun },
  { value: 'sleep', Icon: Moon },
] as const;

// ─── Single digit with animation (per position) ──────────────────────────────
// Le sens passe par `custom` : AnimatePresence le transmet aussi au chiffre qui
// sort, qui sinon gardait le sens de son propre rendu et partait à contresens.
const digitVariants = {
  enter: (dir: number) => ({ opacity: 0, translateY: 22 * dir }),
  center: { opacity: 1, translateY: 0 },
  exit: (dir: number) => ({ opacity: 0, translateY: -22 * dir }),
};

function AnimatedDigit({
  digit,
  x,
  y,
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
  // Sens du dernier changement, dérivé pendant le rendu (et non dans un effet,
  // qui avait un rendu de retard) : 1 = monte, -1 = descend.
  const [last, setLast] = useState({ digit, dir: -1 });
  const dir = digit === last.digit ? last.dir : digit > last.digit ? 1 : -1;
  if (digit !== last.digit) setLast({ digit, dir });

  return (
    <AnimatePresence mode='sync' custom={dir}>
      <motion.g
        key={digit}
        custom={dir}
        variants={digitVariants}
        initial='enter'
        animate='center'
        exit='exit'
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
  value,
  rightX,
  y,
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
        return <AnimatedDigit key={`pos-${offset}`} digit={d} x={cx} y={y} fontSize={fontSize} fontWeight={fontWeight} fill={fill} />;
      })}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function ThermostatCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const cardRef = useRef<HTMLDivElement>(null);
  // La jauge est carrée : dans une card large et basse, elle se cale sur la
  // hauteur et laisse la largeur vide (523×90 → jauge de 90 px, 433 px perdus).
  // Au-delà de ce rapport, on bascule en disposition paysage : jauge à gauche
  // sur toute la hauteur, commandes à droite.
  const [isLandscape, setIsLandscape] = useState(false);
  useElementBox(cardRef, (w, h) => setIsLandscape(w / h > 1.7));
  const config = getWidgetConfig<ThermostatCardConfig>(widgetId || 'thermostat');
  const entityId = config?.entityId ?? 'climate.living_room';
  const thermostat = useSafeEntity(entityId);
  const helpers = useHass(s => s.helpers);
  const playFeedback = useSoundFeedback();

  const svgRef = useRef<SVGSVGElement>(null);
  const isDraggingRef = useRef(false);
  // Le geste en cours a-t-il commencé sur l'anneau ? Lu par le `click` qui le termine.
  const ownsGestureRef = useRef(false);
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

  // La jauge ne doit jamais permettre de composer une consigne que Home
  // Assistant refusera : `climateRange` intersecte la plage d'affichage voulue
  // avec celle que l'entité accepte vraiment. Cf. `@/lib/climate`.
  const range = climateRange(thermostat.attributes, config?.minTemp ?? MIN_T, config?.maxTemp ?? MAX_T);
  const { min: minT, max: maxT } = range;

  const current = (thermostat.attributes.current_temperature as number | undefined) ?? 20;
  const action = (thermostat.attributes.hvac_action as string | undefined) ?? thermostat.state;
  const activePreset = (thermostat.attributes.preset_mode as string | undefined) ?? 'none';
  const isOff = thermostat.state === 'off';
  const actionLabel = ACTION_KEYS[action] ? t(ACTION_KEYS[action]) : action.toUpperCase();

  const fraction = clamp((localTarget - minT) / (maxT - minT), 0, 1);
  const endDeg = START_DEG + Math.max(1, fraction * SWEEP_DEG);
  const dot = gaugePoint(endDeg);

  const currentFraction = clamp((current - minT) / (maxT - minT), 0, 1);
  const currentDeg = START_DEG + Math.max(1, currentFraction * SWEEP_DEG);

  // Par dixièmes entiers : `21.96` donnait sinon « 21.10 ».
  const tenths = Math.round(localTarget * 10);
  const tempInt = Math.floor(tenths / 10);
  const tempDec = tenths - tempInt * 10;

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
      // Ouverture en bas du cadran : on se cale sur la borne la plus proche.
      // Figer la valeur rendait le min et le max inatteignables d'un geste vif.
      normalized = deg >= START_DEG - (360 - SWEEP_DEG) / 2 ? 0 : SWEEP_DEG;
    }

    const frac = clamp(normalized / SWEEP_DEG, 0, 1);
    return snapTemp(minT + frac * (maxT - minT), range);
  }

  function updateLocalTarget(t: number) {
    localTargetRef.current = t;
    setLocalTarget(t);
  }

  /** Le pointeur est-il sur l'anneau ? Le centre (les chiffres) n'est pas une poignée. */
  function isOnRing(clientX: number, clientY: number): boolean {
    const svg = svgRef.current;
    if (!svg) return false;
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) * (270 / rect.width) - CX;
    const y = (clientY - rect.top) * (270 / rect.height) - CY;
    return Math.hypot(x, y) >= R - STROKE * 1.5;
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    ownsGestureRef.current = e.button === 0 && isOnRing(e.clientX, e.clientY);
    if (!ownsGestureRef.current) return;
    // Le geste appartient à la jauge : sans ça, la case de la grille lance son
    // appui long, et un réglage lent (moins de 10 px en 500 ms) ouvre la fiche.
    e.stopPropagation();
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
    // Un simple appui sur la valeur déjà réglée ne déclenche aucun appel.
    if (localTargetRef.current === haTemp) return;
    helpers.callService({
      domain: 'climate',
      service: 'set_temperature',
      target: { entity_id: entityId },
      serviceData: { temperature: localTargetRef.current },
    });
    playFeedback('slider_tick');
  }
  /** Geste interrompu par le système : on revient à la consigne réelle, sans rien envoyer. */
  function onPointerCancel() {
    isDraggingRef.current = false;
    updateLocalTarget(haTemp ?? 20);
  }
  /** Le `click` de fin de réglage ne doit pas remonter jusqu'à la case, qui ouvrirait la fiche. */
  function onClick(e: React.MouseEvent) {
    if (ownsGestureRef.current) e.stopPropagation();
  }

  function selectPreset(e: React.MouseEvent, option: string) {
    e.stopPropagation();
    helpers.callService({
      domain: 'climate',
      service: 'set_preset_mode',
      target: { entity_id: entityId },
      serviceData: { preset_mode: option },
    });
    playFeedback('click');
  }
  function togglePower(e: React.MouseEvent) {
    e.stopPropagation();
    helpers.callService({
      domain: 'climate',
      service: isOff ? 'turn_on' : 'turn_off',
      target: { entity_id: entityId },
    });
    playFeedback(isOff ? 'toggle_on' : 'toggle_off');
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE, delay: 0.25 }}
      ref={cardRef}
      className={cn('gc rounded-3xl p-4 h-full', isLandscape ? 'flex flex-row items-stretch gap-3' : 'flex flex-col')}
    >
      {/* `aspect-square` en paysage : la jauge occupe toute la hauteur et
          n'est plus bridée par la largeur restante. */}
      <div className={cn('min-h-0 overflow-hidden', isLandscape ? 'h-full aspect-square shrink-0' : 'flex-1')}>
        <svg
          ref={svgRef}
          viewBox='0 0 270 270'
          className='w-full h-full touch-none cursor-grab active:cursor-grabbing select-none'
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
          onClick={onClick}
        >
          <defs>
            <linearGradient id='tempGradient' gradientUnits='userSpaceOnUse' x1='17' y1='0' x2='253' y2='0'>
              <stop offset='0%' stopColor='#1a56ff' />
              <stop offset='28%' stopColor='#00c6ff' />
              <stop offset='65%' stopColor='#fbbf24' />
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
          <path d={arcPath(START_DEG, endDeg)} fill='none' stroke='url(#tempGradient)' strokeWidth={STROKE} strokeLinecap='round' />
          {/* Ronds de rattrapage : entre current et target, seulement si target > current */}
          {endDeg > currentDeg &&
            endDeg - currentDeg > 5 &&
            (() => {
              const dots: React.ReactNode[] = [];
              const step = 10;
              for (let deg = currentDeg + step; deg < endDeg - step * 0.5; deg += step) {
                const pt = gaugePoint(deg);
                dots.push(<circle key={deg} cx={pt.x.toFixed(2)} cy={pt.y.toFixed(2)} r='3.5' fill='white' opacity='0.65' />);
              }
              return <>{dots}</>;
            })()}
          {/* Petit cercle blanc = marqueur de température actuelle */}
          <circle cx={gaugePoint(currentDeg).x} cy={gaugePoint(currentDeg).y} r='5' fill='white' opacity='0.8' />
          {/* Curseur cible */}
          <motion.circle
            cx={dot.x}
            cy={dot.y}
            // `initial={false}` : sans état initial explicite, framer-motion
            // tente d'animer cx/cy depuis une valeur qu'il n'a pas encore lue
            // et écrit littéralement `cx="undefined"` au premier rendu
            // (« <circle> attribute cx: Expected length, "undefined" »).
            initial={false}
            animate={{ cx: dot.x, cy: dot.y }}
            transition={{ type: 'tween', duration: 0.05, ease: 'linear' }}
            r='10'
            fill='white'
            filter='url(#thumbShadow)'
          />
          {/* Zone texte centrale */}
          <g clipPath='url(#centerClip)'>
            <text x={CX} y={CY - 28} textAnchor='middle' fill='rgba(255,255,255,0.55)' fontSize='11' letterSpacing='2' fontFamily='inherit'>
              {actionLabel}
            </text>
            <AnimatedSvgDigits value={tempInt} rightX={CX + 9} y={CY + 28} />
            <text
              x={CX + 9}
              y={CY + 28}
              textAnchor='start'
              fill='rgba(255,255,255,0.85)'
              fontSize={64}
              fontWeight='700'
              fontFamily='inherit'
            >
              .
            </text>
            <AnimatedDigit digit={tempDec} x={CX + 28 + DIGIT_W / 2} y={CY + 28} fill='rgba(255,255,255,0.85)' />
            <text x={CX + 68} y={CY - 8} textAnchor='start' fill='white' fontSize='16' fontWeight='500' fontFamily='inherit'>
              °C
            </text>
            <text x={CX} y={CY + 54} textAnchor='middle' fill='rgba(255,255,255,0.35)' fontSize='11' fontFamily='inherit'>
              ● {current.toFixed(1)} °C
            </text>
          </g>
        </svg>
      </div>

      {/* Paysage : rangée de boutons carrés, centrée verticalement à droite de
          la jauge. Un 2×2 étiré sur la largeur restante donnait des pavés de
          190×66 px, disproportionnés à côté du cadran. */}
      <div className={cn('gap-2', isLandscape ? 'flex flex-1 min-w-0 items-center justify-center' : 'grid grid-cols-4 mt-1')}>
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={togglePower}
          className={cn(
            'flex items-center justify-center rounded-[15px] transition-all duration-200',
            isLandscape ? 'aspect-square flex-1 max-w-[62px]' : 'h-[50px]',
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
              onClick={e => selectPreset(e, value)}
              className={cn(
                'flex items-center justify-center rounded-[15px] transition-all duration-200',
                isLandscape ? 'aspect-square flex-1 max-w-[62px]' : 'h-[50px]',
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
