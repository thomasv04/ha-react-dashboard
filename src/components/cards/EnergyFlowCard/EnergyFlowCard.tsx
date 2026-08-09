import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Sun, House, Zap, BatteryCharging } from 'lucide-react';
import { DURATION_ENTRANCE } from '@/lib/motion-tokens';
import { useSafeEntity } from '@/hooks/useSafeEntity';
import { useWidgetConfig } from '@/context/WidgetConfigContext';
import { useWidgetId } from '@/components/layout/DashboardGrid';
import { useWidgetSize } from '@/hooks/useWidgetSize';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import type { EnergyFlowCardConfig } from '@/types/widget-configs';
import { normalizePackState } from '@/lib/battery-state';

// ── Géométrie du schéma ───────────────────────────────────────────────────────
// Repère fixe en unités SVG ; le viewBox fait tout le travail d'adaptation.

const VB = { w: 300, h: 190 };
const NODE = { w: 96, h: 44 };
const CENTER = { x: VB.w / 2, y: VB.h / 2 };

/** Coin de chaque nœud : solaire ↖, maison ↗, batterie ↙, réseau ↘ */
const NODES = {
  solar: { x: 6, y: 8 },
  home: { x: VB.w - NODE.w - 6, y: 8 },
  battery: { x: 6, y: VB.h - NODE.h - 8 },
  grid: { x: VB.w - NODE.w - 6, y: VB.h - NODE.h - 8 },
} as const;

type NodeKey = keyof typeof NODES;

/** Point d'ancrage d'un nœud, côté centre. */
function anchor(key: NodeKey) {
  const n = NODES[key];
  const isLeft = key === 'solar' || key === 'battery';
  return { x: isLeft ? n.x + NODE.w : n.x, y: n.y + NODE.h / 2 };
}

/**
 * Tracé orthogonal nœud → centre : segment horizontal, coude, segment vertical.
 * Les liens se rejoignent sur la croix centrale, ce qui donne la lecture
 * « tout transite par le point de couplage » du schéma d'origine.
 */
function linkPath(key: NodeKey): string {
  const a = anchor(key);
  const isLeft = key === 'solar' || key === 'battery';
  const elbowX = isLeft ? CENTER.x - 46 : CENTER.x + 46;
  return `M ${a.x} ${a.y} H ${elbowX} V ${CENTER.y}`;
}

// ── Rendu ─────────────────────────────────────────────────────────────────────

interface FlowNodeProps {
  nodeKey: NodeKey;
  label: string;
  value: string;
  unit: string;
  color: string;
  Icon: typeof Sun;
}

function FlowNode({ nodeKey, label, value, unit, color, Icon }: FlowNodeProps) {
  const n = NODES[nodeKey];
  return (
    <foreignObject x={n.x} y={n.y} width={NODE.w} height={NODE.h}>
      <div
        className='w-full h-full rounded-xl border flex items-center gap-1.5 px-2'
        style={{ background: `${color}1a`, borderColor: `${color}40` }}
      >
        <Icon size={14} style={{ color }} className='shrink-0' />
        <div className='min-w-0 leading-none'>
          <div className='text-[9px] text-white/50 truncate'>{label}</div>
          <div className='text-[13px] font-semibold text-white tabular-nums truncate'>
            {value}
            <span className='text-[9px] font-normal text-white/45 ml-0.5'>{unit}</span>
          </div>
        </div>
      </div>
    </foreignObject>
  );
}

/** Lien + points animés. `active` pilote l'affichage du flux. */
function FlowLink({ nodeKey, color, active, reverse }: { nodeKey: NodeKey; color: string; active: boolean; reverse?: boolean }) {
  const d = linkPath(nodeKey);
  // Le sens du flux s'obtient en parcourant le tracé à l'envers : c'est le même
  // chemin, décrit du centre vers le nœud.
  const path = reverse ? reversePath(nodeKey) : d;

  return (
    <>
      <path d={d} fill='none' stroke='rgba(255,255,255,0.10)' strokeWidth={1.5} strokeLinecap='round' />
      {active &&
        [0, 1, 2].map(i => (
          <circle
            key={i}
            r={2.6}
            fill={color}
            className='flow-dot'
            style={
              {
                offsetPath: `path('${path}')`,
                offsetRotate: '0deg',
                '--flow-delay': `${i * 0.73}s`,
              } as React.CSSProperties & Record<string, string>
            }
          />
        ))}
    </>
  );
}

/** Même tracé, décrit dans l'autre sens (centre → nœud). */
function reversePath(key: NodeKey): string {
  const a = anchor(key);
  const isLeft = key === 'solar' || key === 'battery';
  const elbowX = isLeft ? CENTER.x - 46 : CENTER.x + 46;
  return `M ${elbowX} ${CENTER.y} V ${a.y} H ${a.x}`;
}

function fmt(w: number): { value: string; unit: string } {
  if (Math.abs(w) >= 1000) return { value: (w / 1000).toFixed(1).replace('.', ','), unit: 'kW' };
  return { value: String(Math.round(w)), unit: 'W' };
}

const num = (s: string | undefined): number => {
  const n = Number.parseFloat(s ?? '');
  return Number.isFinite(n) ? n : 0;
};

export function EnergyFlowCard() {
  const { t } = useI18n();
  const { getWidgetConfig } = useWidgetConfig();
  const widgetId = useWidgetId();
  const config = getWidgetConfig<EnergyFlowCardConfig>(widgetId || 'energy_flow');
  const cardRef = useRef<HTMLDivElement>(null);
  const size = useWidgetSize(cardRef);

  const solarE = useSafeEntity(config?.solarProductionEntity ?? '');
  const homeE = useSafeEntity(config?.homeOutputPowerEntity ?? '');
  const gridE = useSafeEntity(config?.gridInputPowerEntity ?? '');
  const battLevelE = useSafeEntity(config?.batteryLevelEntity ?? '');
  const battStateE = useSafeEntity(config?.batteryStateEntity ?? '');

  const solar = num(solarE?.state);
  const home = num(homeE?.state);
  // `gridInvert` : les onduleurs ne s'accordent pas sur le signe de la
  // puissance réseau. Positif = soutirage ici ; l'option inverse la convention
  // sans qu'il faille créer un capteur template côté Home Assistant.
  const grid = (config?.gridInvert ? -1 : 1) * num(gridE?.state);
  const battLevel = num(battLevelE?.state);
  // Certains onduleurs publient un code numérique (`1` / `2`) plutôt qu'un
  // libellé — c'est le cas ici : la normalisation est partagée avec EnergyCard.
  const battState = normalizePackState(battStateE?.state ?? '');
  const charging = battState === 'charging';
  const discharging = battState === 'discharging';

  // Autoconsommation : part de la consommation qui ne vient pas du réseau.
  // Sans consommation, le taux n'a pas de sens — afficher 100 % laissait croire
  // à une autonomie parfaite alors qu'il n'y a simplement rien à couvrir.
  const gridImport = Math.max(0, grid);
  const selfUse = home > 0 ? Math.round(Math.max(0, Math.min(1, (home - gridImport) / home)) * 100) : null;
  const selfUseLabel = selfUse === null ? '—' : `${selfUse}%`;

  const COLORS = { solar: '#fbbf24', home: '#38bdf8', battery: '#34d399', grid: '#f87171' };

  const solarF = fmt(solar);
  const homeF = fmt(home);
  const gridF = fmt(Math.abs(grid));

  // Une seule rangée : le schéma n'a pas la place, on garde les chiffres.
  if (size.squat) {
    return (
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DURATION_ENTRANCE }}
        className='gc rounded-3xl px-3.5 py-2 h-full flex items-center gap-3 overflow-hidden'
      >
        {(
          [
            [Sun, COLORS.solar, solarF],
            [House, COLORS.home, homeF],
            [Zap, COLORS.grid, gridF],
          ] as const
        ).map(([Icon, color, v], i) => (
          <div key={i} className='flex items-center gap-1.5 min-w-0'>
            <Icon size={15} style={{ color }} className='shrink-0' />
            <span className='text-sm font-semibold text-white tabular-nums'>
              {v.value}
              <span className='text-[10px] text-white/45 ml-0.5'>{v.unit}</span>
            </span>
          </div>
        ))}
        <div className='ml-auto text-xs font-bold tabular-nums shrink-0' style={{ color: COLORS.battery }}>
          {selfUseLabel}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION_ENTRANCE }}
      className={cn('gc rounded-3xl h-full flex flex-col overflow-hidden', size.h === 'short' ? 'p-2.5' : 'p-3.5')}
    >
      {config?.name && <div className='text-white/40 text-xs font-medium truncate mb-1 shrink-0'>{config.name}</div>}

      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className='w-full flex-1 min-h-0' preserveAspectRatio='xMidYMid meet'>
        {/* Liens — le sens de circulation traduit l'état réel de l'installation */}
        <FlowLink nodeKey='solar' color={COLORS.solar} active={solar > 5} />
        <FlowLink nodeKey='home' color={COLORS.home} active={home > 5} reverse />
        <FlowLink nodeKey='battery' color={COLORS.battery} active={charging || discharging} reverse={charging} />
        <FlowLink nodeKey='grid' color={COLORS.grid} active={Math.abs(grid) > 5} reverse={grid < 0} />

        {/* Pastille centrale : autoconsommation */}
        <circle cx={CENTER.x} cy={CENTER.y} r={26} fill='rgba(8,8,15,0.85)' stroke='rgba(255,255,255,0.12)' />
        <text x={CENTER.x} y={CENTER.y - 1} textAnchor='middle' fill='#fff' fontSize={15} fontWeight={600}>
          {selfUseLabel}
        </text>
        <text x={CENTER.x} y={CENTER.y + 11} textAnchor='middle' fill='rgba(255,255,255,0.45)' fontSize={7} letterSpacing={0.5}>
          {t('widgets.energy_flow.selfUse')}
        </text>

        {/* Nœuds */}
        <FlowNode nodeKey='solar' label={t('widgets.energy_flow.solar')} {...solarF} color={COLORS.solar} Icon={Sun} />
        <FlowNode nodeKey='home' label={t('widgets.energy_flow.home')} {...homeF} color={COLORS.home} Icon={House} />
        <FlowNode
          nodeKey='battery'
          label={t('widgets.energy_flow.battery')}
          value={String(Math.round(battLevel))}
          unit='%'
          color={COLORS.battery}
          Icon={BatteryCharging}
        />
        <FlowNode nodeKey='grid' label={t('widgets.energy_flow.grid')} {...gridF} color={COLORS.grid} Icon={Zap} />
      </svg>
    </motion.div>
  );
}
