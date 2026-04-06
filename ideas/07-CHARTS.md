# 07 — Charts : SparkLine, Gauge, BinaryTimeline

## Objectif

Créer une bibliothèque de composants graphiques réutilisables pour enrichir les widgets existants (SensorCard) et futurs. Pure SVG, zero dépendance externe, léger et performant.

## Composants à créer

1. **SparkLine** — Mini-graphe linéaire avec gradient (pour SensorCard variant `sparkline`)
2. **SensorGauge** — Jauge circulaire demi-cercle (pour SensorCard variant `gauge`)
3. **ProgressBar** — Barre de progression horizontale avec couleur dynamique

---

## Étape 1 : SparkLine

### `src/components/charts/SparkLine.tsx`

```typescript
import { useMemo } from 'react';

interface SparkLineProps {
  /** Données : tableau de nombres */
  data: number[];
  /** Largeur SVG */
  width?: number;
  /** Hauteur SVG */
  height?: number;
  /** Couleur de la ligne (CSS color) */
  color?: string;
  /** Afficher le gradient sous la courbe */
  showArea?: boolean;
  /** Épaisseur de la ligne */
  strokeWidth?: number;
  /** ID unique pour les gradients SVG (nécessaire si plusieurs SparkLine sur la même page) */
  id?: string;
}

/**
 * Génère un chemin SVG avec courbes de Bézier (smooth) à partir de points x,y.
 * Inspiré de la SparkLine de Tunet.
 */
function bezierPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';
  
  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    // Courbes de Bézier cubiques pour le lissage
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpy1 = prev.y;
    const cpx2 = curr.x - (curr.x - prev.x) * 0.4;
    const cpy2 = curr.y;
    path += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${curr.x} ${curr.y}`;
  }
  
  return path;
}

export function SparkLine({
  data,
  width = 200,
  height = 60,
  color = '#60a5fa',
  showArea = true,
  strokeWidth = 2,
  id = 'sparkline',
}: SparkLineProps) {
  const points = useMemo(() => {
    if (data.length < 2) return [];
    
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 4; // marge intérieure pour la ligne
    
    return data.map((val, i) => ({
      x: padding + (i / (data.length - 1)) * (width - padding * 2),
      y: padding + (1 - (val - min) / range) * (height - padding * 2),
    }));
  }, [data, width, height]);

  if (points.length < 2) return null;

  const linePath = bezierPath(points);
  
  // Path pour le gradient (area) : même courbe + fermeture en bas
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <defs>
        {/* Gradient vertical pour l'area */}
        <linearGradient id={`${id}-grad`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        
        {/* Masque pour un fade smooth en bas */}
        <mask id={`${id}-mask`}>
          <rect width={width} height={height} fill="white" />
          <rect y={height - 10} width={width} height={10} fill="url(#fade-mask)" />
        </mask>
        <linearGradient id="fade-mask" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </linearGradient>
      </defs>

      {/* Area gradient */}
      {showArea && (
        <path
          d={areaPath}
          fill={`url(#${id}-grad)`}
          opacity={0.8}
        />
      )}

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Current value dot (dernier point) */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill={color}
      />
    </svg>
  );
}
```

---

## Étape 2 : SensorGauge (demi-cercle)

### `src/components/charts/SensorGauge.tsx`

```typescript
interface SensorGaugeProps {
  /** Valeur courante */
  value: number;
  /** Valeur min */
  min?: number;
  /** Valeur max */
  max?: number;
  /** Unité d'affichage */
  unit?: string;
  /** Couleur de la jauge */
  color?: string;
  /** Taille (diamètre) */
  size?: number;
  /** Label sous la valeur */
  label?: string;
}

export function SensorGauge({
  value,
  min = 0,
  max = 100,
  unit = '',
  color = '#60a5fa',
  size = 120,
  label,
}: SensorGaugeProps) {
  const cx = size / 2;
  const cy = size / 2;
  const r = (size / 2) - 10; // rayon avec marge
  const strokeW = 8;

  // Arc : demi-cercle (180°) de gauche à droite
  const startAngle = Math.PI;      // 9h
  const endAngle = 2 * Math.PI;    // 3h
  const totalArc = endAngle - startAngle;

  // Fraction remplie
  const fraction = Math.max(0, Math.min(1, (value - min) / (max - min || 1)));
  const valueAngle = startAngle + fraction * totalArc;

  // Conversion angle → coordonnées SVG
  const toXY = (angle: number) => ({
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  });

  const arcStart = toXY(startAngle);
  const arcEnd = toXY(endAngle);
  const arcValue = toXY(valueAngle);

  // SVG arc path
  const bgArc = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 1 1 ${arcEnd.x} ${arcEnd.y}`;
  
  const largeArc = fraction > 0.5 ? 1 : 0;
  const valueArc = `M ${arcStart.x} ${arcStart.y} A ${r} ${r} 0 ${largeArc} 1 ${arcValue.x} ${arcValue.y}`;

  const displayValue = Number.isInteger(value) ? value : value.toFixed(1);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 15} viewBox={`0 0 ${size} ${size / 2 + 15}`}>
        {/* Background arc (track) */}
        <path
          d={bgArc}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* Value arc */}
        <path
          d={valueArc}
          fill="none"
          stroke={color}
          strokeWidth={strokeW}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.4s ease',
          }}
        />

        {/* Value text au centre */}
        <text
          x={cx}
          y={cy - 2}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-white font-bold"
          fontSize={size * 0.22}
        >
          {displayValue}
          {unit && (
            <tspan className="fill-white/40" fontSize={size * 0.12}> {unit}</tspan>
          )}
        </text>
      </svg>

      {label && (
        <span className="text-white/40 text-xs uppercase tracking-wider -mt-1">
          {label}
        </span>
      )}
    </div>
  );
}
```

---

## Étape 3 : ProgressBar

### `src/components/charts/ProgressBar.tsx`

```typescript
interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  /** Afficher le % à droite */
  showValue?: boolean;
  height?: number;
}

export function ProgressBar({
  value,
  max = 100,
  color = '#60a5fa',
  showValue = false,
  height = 6,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div className="flex items-center gap-2">
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{
          height,
          backgroundColor: 'rgba(255,255,255,0.08)',
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
          }}
        />
      </div>
      {showValue && (
        <span className="text-white/50 text-xs font-medium min-w-[3ch] text-right">
          {Math.round(pct)}%
        </span>
      )}
    </div>
  );
}
```

---

## Étape 4 : Barrel export

### `src/components/charts/index.ts`

```typescript
export { SparkLine } from './SparkLine';
export { SensorGauge } from './SensorGauge';
export { ProgressBar } from './ProgressBar';
```

---

## Étape 5 : Intégrer dans SensorCard

Une fois ces charts créés et le SensorCard implémenté (guide 01), modifier le SensorCard pour supporter les variantes :

```typescript
// Dans SensorCard.tsx, dans le body section :
import { SparkLine } from '@/components/charts/SparkLine';
import { SensorGauge } from '@/components/charts/SensorGauge';

// ...

const variant = config?.variant ?? 'default';

// Dans le rendu :
{variant === 'sparkline' && historyData.length > 0 && (
  <div className="mt-2">
    <SparkLine
      data={historyData}
      width={200}
      height={40}
      color={thresholdColor ?? '#60a5fa'}
      id={`spark-${entityId}`}
    />
  </div>
)}

{variant === 'gauge' && isNumeric && (
  <SensorGauge
    value={numericValue}
    min={config?.min ?? 0}
    max={config?.max ?? 100}
    unit={unit}
    color={thresholdColor ?? '#60a5fa'}
    size={100}
  />
)}
```

---

## Étape 6 : Hook pour les données historiques

Pour alimenter le SparkLine, il faut un hook qui récupère l'historique d'une entité depuis HA :

### `src/hooks/useSensorHistory.ts`

```typescript
import { useState, useEffect, useRef } from 'react';
import { useHass } from '@hakit/core';

interface HistoryEntry {
  last_changed: string;
  state: string;
}

/**
 * Récupère les N dernières heures d'historique d'un sensor numérique.
 * Retourne un tableau de nombres (états parsés).
 */
export function useSensorHistory(
  entityId: string,
  hours: number = 24,
  refreshInterval: number = 5 * 60 * 1000, // 5 min
): number[] {
  const [data, setData] = useState<number[]>([]);
  const { connection } = useHass();
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  useEffect(() => {
    if (!connection || !entityId) return;

    const fetchHistory = async () => {
      try {
        const now = new Date();
        const start = new Date(now.getTime() - hours * 60 * 60 * 1000);

        // Appel API HA WebSocket
        const result = await connection.sendMessagePromise<HistoryEntry[][]>({
          type: 'history/history_during_period',
          start_time: start.toISOString(),
          end_time: now.toISOString(),
          entity_ids: [entityId],
          minimal_response: true,
          significant_changes_only: true,
        });

        if (result && result[0]) {
          const values = result[0]
            .map(entry => parseFloat(entry.state))
            .filter(v => !isNaN(v));
          
          // Downsample si trop de points (garder ~50 points max)
          const maxPoints = 50;
          if (values.length > maxPoints) {
            const step = Math.ceil(values.length / maxPoints);
            setData(values.filter((_, i) => i % step === 0));
          } else {
            setData(values);
          }
        }
      } catch (err) {
        console.error(`Error fetching history for ${entityId}:`, err);
      }
    };

    fetchHistory();
    intervalRef.current = setInterval(fetchHistory, refreshInterval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [connection, entityId, hours, refreshInterval]);

  return data;
}
```

---

## Tests

### `src/components/charts/SparkLine.test.tsx`

```typescript
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { SparkLine } from './SparkLine';

describe('SparkLine', () => {
  it('renders SVG with path', () => {
    const { container } = render(
      <SparkLine data={[10, 20, 15, 30, 25]} width={200} height={60} />
    );
    expect(container.querySelector('svg')).toBeTruthy();
    expect(container.querySelector('path')).toBeTruthy();
  });

  it('returns null for insufficient data', () => {
    const { container } = render(<SparkLine data={[10]} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders end dot', () => {
    const { container } = render(<SparkLine data={[10, 20]} />);
    expect(container.querySelector('circle')).toBeTruthy();
  });
});
```

---

## Vérification

- [ ] SparkLine affiche une courbe lisse avec gradient
- [ ] SensorGauge affiche une jauge demi-cercle avec valeur centrée
- [ ] ProgressBar affiche une barre de progression animée
- [ ] Tous les SVG sont responsive et légers
- [ ] Les couleurs dynamiques (thresholds) fonctionnent
- [ ] Pas de dépendance externe (pure SVG + React)

## Améliorations futures

- [ ] BinaryTimeline — timeline horizontale pour les binary_sensor
- [ ] InteractivePowerGraph — graphe interactif avec tooltip au hover
- [ ] WeatherGraph — graphe de prévisions météo
- [ ] Animation d'entrée sur les gauges (strokeDashoffset animé)
