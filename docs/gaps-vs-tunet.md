# Gaps : ha-dashboard vs Tunet

Analyse comparative des deux dashboards HA. Ce document liste ce qui manque ou ce qui peut être amélioré dans `ha-dashboard` en s'inspirant de `Tunet-main`.

---

## Table des matières

1. ✅ [Performance — Throttling RAF des entités HA](#1-performance--throttling-raf-des-entités-ha)
2. [Thème contextuel automatique (jour/nuit/météo)](#2-thème-contextuel-automatique-journuitmétéo)
3. ✅ [Effets météo animés (pluie / neige)](#3-effets-météo-animés-pluie--neige)
4. ✅ [Backgrounds animés (Aurora, LavaLamp, Silk)](#4-backgrounds-animés-aurora-lavalamp-silk)
5. ✅ [Hook useLowPowerMotion](#5-hook-uselowpowermotion)
6. [SensorCard — variantes gauge / donut / bar + sparkline](#6-sensorcard--variantes-gauge--donut--bar--sparkline)
7. [Status Pills configurables](#7-status-pills-configurables)
8. [Cartes manquantes](#8-cartes-manquantes)
9. [Charts — SparkLine SVG Bezier](#9-charts--sparkline-svg-bezier)
10. ✅ [Cache entités sessionStorage](#10-cache-entités-sessionstorage)
11. ✅ [Synchronisation multi-device (useSettingsSync)](#11-synchronisation-multi-device-usesettingssync)
12. [i18n — langues supplémentaires](#12-i18n--langues-supplémentaires)

---

## 1. Performance — Throttling RAF des entités HA

**Problème :** Chaque message WebSocket HA déclenche un `setState` → re-render de tout l'arbre React. Sur un dashboard avec 50+ entités, ça peut générer plusieurs dizaines de renders/sec.

**Solution Tunet :** Un hook `useThrottledEntities` qui batche les updates en un seul render par animation frame via `requestAnimationFrame`.

**Où implémenter :** `src/context/` (là où les entités HA sont gérées, via `@hakit/core` ou directement).

```typescript
// src/hooks/useThrottledEntities.ts
import { useState, useRef, useCallback, useEffect } from 'react';

const ENTITY_CACHE_KEY = 'ha_dashboard_entity_snapshot';
const ENTITY_CACHE_MAX_AGE_MS = 5 * 60_000; // 5 min

function loadCachedEntities<T extends object>(): T {
  try {
    const raw = globalThis.sessionStorage?.getItem(ENTITY_CACHE_KEY);
    if (!raw) return {} as T;
    const { ts, data } = JSON.parse(raw);
    if (Date.now() - ts > ENTITY_CACHE_MAX_AGE_MS) {
      globalThis.sessionStorage.removeItem(ENTITY_CACHE_KEY);
      return {} as T;
    }
    return data ?? ({} as T);
  } catch {
    return {} as T;
  }
}

function saveCachedEntities<T>(entities: T): void {
  try {
    globalThis.sessionStorage?.setItem(
      ENTITY_CACHE_KEY,
      JSON.stringify({ ts: Date.now(), data: entities })
    );
  } catch {
    // Storage full / private mode — ignore
  }
}

export function useThrottledEntities<T extends object>() {
  const [entities, setEntities] = useState<T>(loadCachedEntities<T>);
  const pendingRef = useRef<T | null>(null);
  const rafRef = useRef<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setEntitiesThrottled = useCallback((updated: T) => {
    pendingRef.current = updated;
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        if (pendingRef.current) {
          setEntities(pendingRef.current);
          // Debounce sessionStorage writes à 10s
          if (saveTimerRef.current == null) {
            saveTimerRef.current = setTimeout(() => {
              saveTimerRef.current = null;
              if (pendingRef.current) saveCachedEntities(pendingRef.current);
            }, 10_000);
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      if (saveTimerRef.current != null) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return [entities, setEntitiesThrottled] as const;
}
```

**Bénéfice :** 1 render/frame max au lieu de N renders/sec. Sur 60Hz → max 60 renders/sec, mais en pratique les updates HA arrivent moins souvent, donc c'est quasi transparent.

---

## 2. Thème contextuel automatique (jour/nuit/météo)

**Problème :** Les thèmes dans `ha-dashboard` sont statiques. Il faut changer manuellement.

**Solution Tunet :** `useSmartTheme` lit `sun.sun` + l'entité météo et applique des CSS custom properties dynamiques selon l'heure et la météo.

**Où implémenter :** Nouveau hook `src/hooks/useSmartTheme.ts`, à appeler dans `ThemeContext`.

```typescript
// src/hooks/useSmartTheme.ts
import { useEffect, useRef } from 'react';

type Entities = Record<string, { state: string; attributes?: Record<string, unknown> }>;

interface SmartThemeParams {
  enabled: boolean;          // seulement si thème "contextual" actif
  entities: Entities;
  now: Date;
}

export function useSmartTheme({ enabled, entities, now }: SmartThemeParams) {
  const weatherEntityIdRef = useRef<string | null>(null);
  const lastAppliedRef = useRef('');

  useEffect(() => {
    if (!enabled) {
      lastAppliedRef.current = '';
      return;
    }

    // Trouve l'entité météo
    let weatherEntity = weatherEntityIdRef.current ? entities[weatherEntityIdRef.current] : null;
    if (!weatherEntity?.entity_id?.startsWith('weather.')) {
      weatherEntity = Object.values(entities).find((e) =>
        (e as any).entity_id?.startsWith('weather.')
      ) ?? null;
      weatherEntityIdRef.current = (weatherEntity as any)?.entity_id ?? null;
    }

    const weatherState = weatherEntity?.state;
    const sunEntity = entities['sun.sun'];
    const hour = now.getHours();

    let bgGradientFrom: string;
    let bgGradientTo: string;
    let bgPrimary: string;

    if (sunEntity) {
      const isUp = sunEntity.state === 'above_horizon';
      const elevation = Number(sunEntity.attributes?.elevation ?? 0);

      if (!isUp) {
        bgGradientFrom = '#0f172a'; bgGradientTo = '#020617'; bgPrimary = '#020617';
      } else if (elevation < 10) {
        if (hour < 12) {
          // Lever de soleil
          bgGradientFrom = '#3b82f6'; bgGradientTo = '#fdba74'; bgPrimary = '#1e293b';
        } else {
          // Coucher de soleil
          bgGradientFrom = '#6366f1'; bgGradientTo = '#f472b6'; bgPrimary = '#312e81';
        }
      } else {
        // Jour
        bgGradientFrom = '#38bdf8'; bgGradientTo = '#3b82f6'; bgPrimary = '#0f172a';
      }
    } else {
      // Fallback sans sun.sun
      if (hour >= 6 && hour < 10) {
        bgGradientFrom = '#3b82f6'; bgGradientTo = '#fdba74'; bgPrimary = '#1e293b';
      } else if (hour >= 10 && hour < 17) {
        bgGradientFrom = '#38bdf8'; bgGradientTo = '#3b82f6'; bgPrimary = '#0f172a';
      } else if (hour >= 17 && hour < 21) {
        bgGradientFrom = '#6366f1'; bgGradientTo = '#f472b6'; bgPrimary = '#312e81';
      } else {
        bgGradientFrom = '#0f172a'; bgGradientTo = '#020617'; bgPrimary = '#020617';
      }
    }

    // Override par météo mauvaise
    if (['rainy', 'pouring', 'snowy', 'hail'].includes(weatherState ?? '')) {
      bgGradientFrom = '#334155'; bgGradientTo = '#1e293b';
    } else if (['cloudy', 'partlycloudy', 'fog'].includes(weatherState ?? '')) {
      bgGradientFrom = '#475569'; bgGradientTo = '#64748b';
    }

    const next = `${bgGradientFrom}|${bgGradientTo}|${bgPrimary}`;
    if (lastAppliedRef.current === next) return;
    lastAppliedRef.current = next;

    const root = document.documentElement;
    root.style.setProperty('--bg-gradient-from', bgGradientFrom);
    root.style.setProperty('--bg-gradient-to', bgGradientTo);
    root.style.setProperty('--bg-primary', bgPrimary);
  }, [enabled, now, entities]);
}
```

**Intégration :** Ajouter un thème `"contextual"` dans `src/context/ThemeContext.tsx` et appeler `useSmartTheme` avec `enabled = currentTheme === 'contextual'`.

---

## 3. Effets météo animés (pluie / neige)

**Problème :** `WeatherCard` dans `ha-dashboard` n'a pas d'effets visuels dynamiques.

**Solution Tunet :** Un composant `WeatherEffects` avec un canvas animé (pluie / neige) qui se rend par-dessus la card météo. 30 FPS plafonné, pause si l'onglet est en arrière-plan, tient compte de `prefers-reduced-motion`.

**Fichier à créer :** `src/components/effects/WeatherEffects.tsx`

```tsx
// src/components/effects/WeatherEffects.tsx
import { useEffect, useRef, useState } from 'react';
import { useLowPowerMotion } from '@/hooks/useLowPowerMotion';

const FRAME_INTERVAL_MS = 1000 / 30;

type EffectType = 'rain' | 'snow';

function getEffectType(condition: string | undefined): EffectType | null {
  if (!condition) return null;
  const c = condition.toLowerCase();
  if (['rainy', 'pouring', 'lightning-rainy'].includes(c)) return 'rain';
  if (['snowy', 'snowy-rainy'].includes(c)) return 'snow';
  return null;
}

const PARTICLE_CONFIG = {
  rain: {
    count: 36,
    speed: { min: 2.5, max: 5.5 },
    angle: { min: 0, max: 0.1 },
    color: 'rgba(174, 194, 224, 0.4)',
    width: 1.5,
    length: { min: 8, max: 14 },
  },
  snow: {
    count: 24,
    speed: { min: 0.5, max: 1.5 },
    angle: { min: -0.5, max: 0.5 },
    color: 'rgba(255, 255, 255, 0.5)',
    radius: { min: 1, max: 2.5 },
  },
} as const;

interface Particle {
  x: number; y: number; speed: number;
  length: number; radius: number; opacity: number;
}

interface WeatherEffectsProps {
  condition: string | undefined;
}

export default function WeatherEffects({ condition }: WeatherEffectsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionAllowed = useLowPowerMotion();
  const [isVisible, setIsVisible] = useState(true);

  const effectType = getEffectType(condition);

  // IntersectionObserver — pause quand hors viewport
  useEffect(() => {
    if (!effectType || !motionAllowed) return;
    const canvas = canvasRef.current;
    const target = canvas?.parentElement;
    if (!target || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: '80px' }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [effectType, motionAllowed]);

  // Animation loop
  useEffect(() => {
    if (!motionAllowed || !isVisible || !effectType) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let animationFrameId: number;
    let particles: Particle[] = [];

    const resizeCanvas = () => {
      if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = canvas.parentElement.clientHeight;
      }
    };
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    const cfg = PARTICLE_CONFIG[effectType];
    particles = Array.from({ length: cfg.count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      speed: cfg.speed.min + Math.random() * (cfg.speed.max - cfg.speed.min),
      length: 'length' in cfg ? cfg.length.min + Math.random() * (cfg.length.max - cfg.length.min) : 0,
      radius: 'radius' in cfg ? cfg.radius.min + Math.random() * (cfg.radius.max - cfg.radius.min) : 0,
      opacity: Math.random(),
    }));

    let lastFrameAt = 0;
    const draw = (time: number) => {
      if (time - lastFrameAt < FRAME_INTERVAL_MS) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      lastFrameAt = time;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = cfg.color;
      ctx.strokeStyle = cfg.color;
      ctx.lineWidth = 'width' in cfg ? cfg.width : 1;

      for (const p of particles) {
        ctx.beginPath();
        if (effectType === 'rain') {
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + p.length);
          ctx.stroke();
          p.y += p.speed;
          if (p.y > canvas.height) { p.y = -p.length; p.x = Math.random() * canvas.width; }
        } else {
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          p.y += p.speed;
          p.x += Math.sin(p.y * 0.05) * 0.5;
          if (p.y > canvas.height) { p.y = -5; p.x = Math.random() * canvas.width; }
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    animationFrameId = requestAnimationFrame(draw);
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [effectType, isVisible, motionAllowed]);

  if (!effectType || !motionAllowed) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-3xl">
      <canvas ref={canvasRef} className="block h-full w-full" style={{ opacity: 0.8 }} />
    </div>
  );
}
```

**Intégration dans WeatherCard :**

```tsx
// Dans src/components/cards/WeatherCard/WeatherCard.tsx
import WeatherEffects from '@/components/effects/WeatherEffects';

// Dans le JSX de la card (position: relative requis sur le container) :
<div className="relative overflow-hidden ...">
  <WeatherEffects condition={weatherEntity.state} />
  {/* ... reste de la card */}
</div>
```

---

## 4. Backgrounds animés (Aurora, LavaLamp, Silk)

**Problème :** `ha-dashboard` a des backgrounds gradient statiques. Tunet a 3 backgrounds animés Canvas.

**Ce qu'il faudrait :**

| Mode | Description |
|------|-------------|
| `aurora` | Orbes flottants indigo/sky/violet/teal sur fond sombre |
| `lavaLamp` | Blobs organiques rouge/orange/magenta en mouvement lent |
| `silk` | Dégradé ondulant façon soie |

**Où créer :**
- `src/components/effects/AuroraBackground.tsx`
- `src/components/effects/LavaLampBackground.tsx`

Tous deux utilisent le même pattern :
- Canvas fullscreen, `devicePixelRatio` max 1.5 pour perf
- 30 FPS (`FRAME_INTERVAL_MS = 1000/30`)
- `useLowPowerMotion()` — si false, rendu statique via CSS gradient
- `window.addEventListener('resize', ...)` + cleanup

**Intégration :** Dans `src/context/ThemeContext.tsx`, ajouter `bgMode: 'theme' | 'solid' | 'gradient' | 'aurora' | 'lavaLamp'` et rendre le composant approprié dans le `BackgroundLayer`.

---

## 5. ✅ Hook useLowPowerMotion

**Problème :** Les animations dans `ha-dashboard` n'écoutent pas les préférences d'accessibilité de l'OS, ni l'état d'arrière-plan de l'onglet.

**Fichier à créer :** `src/hooks/useLowPowerMotion.ts`

```typescript
// src/hooks/useLowPowerMotion.ts
import { useEffect, useState } from 'react';

const hasBrowserApis = () =>
  typeof globalThis.window !== 'undefined' && typeof globalThis.document !== 'undefined';

const getMotionAllowed = (): boolean => {
  if (!hasBrowserApis()) return false;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const slowUpdate = window.matchMedia?.('(update: slow)')?.matches;
  return !document.hidden && !prefersReducedMotion && !slowUpdate;
};

function addMediaListener(
  query: MediaQueryList | null,
  listener: () => void
): () => void {
  if (!query) return () => {};
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', listener);
    return () => query.removeEventListener('change', listener);
  }
  return () => {};
}

export function useLowPowerMotion(): boolean {
  const [motionAllowed, setMotionAllowed] = useState(getMotionAllowed);

  useEffect(() => {
    if (!hasBrowserApis()) return;
    const reducedMotionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const slowUpdateQuery = window.matchMedia?.('(update: slow)');
    const update = () => setMotionAllowed(getMotionAllowed());

    const r1 = addMediaListener(reducedMotionQuery, update);
    const r2 = addMediaListener(slowUpdateQuery, update);
    document.addEventListener('visibilitychange', update);
    update();

    return () => { r1(); r2(); document.removeEventListener('visibilitychange', update); };
  }, []);

  return motionAllowed;
}
```

**Utilisation :** Wrap toutes les animations canvas + Framer Motion lourdes :
```tsx
const motionAllowed = useLowPowerMotion();
// Dans framer-motion :
<motion.div animate={motionAllowed ? { scale: [1, 1.05, 1] } : {}} />
```

---

## 6. SensorCard — variantes gauge / donut / bar + sparkline

**Problème :** `SensorCard` dans `ha-dashboard` n'a qu'un affichage basique. Tunet a 4 variantes visuelles avec graphiques SVG pur (0 dépendance externe).

### 6a. Composants SVG Gauge/Donut/Bar

**Fichier à créer :** `src/components/charts/SensorGauge.tsx`

```tsx
// src/components/charts/SensorGauge.tsx

interface GaugeProps {
  value: number;
  min: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export function Gauge({ value, min, max, size = 80, strokeWidth = 8, color = 'var(--accent-color)' }: GaugeProps) {
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(1, (value - min) / range));
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <svg width={size} height={size / 2 + strokeWidth / 2} className="overflow-visible">
      {/* Track */}
      <path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
        fill="none" stroke="var(--glass-bg)" strokeWidth={strokeWidth} strokeLinecap="round"
      />
      {/* Value */}
      <path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
        fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={dashOffset}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
}

export function Donut({ value, min, max, size = 80, strokeWidth = 10, color = 'var(--accent-color)' }: GaugeProps) {
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(1, (value - min) / range));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <svg width={size} height={size} className="overflow-visible">
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke="var(--glass-bg)" strokeWidth={strokeWidth}
      />
      <circle cx={size / 2} cy={size / 2} r={radius}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={dashOffset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.4s ease' }}
      />
    </svg>
  );
}

export function Bar({ value, min, max, width = 120, height = 8, color = 'var(--accent-color)' }: Omit<GaugeProps, 'size' | 'strokeWidth'> & { width?: number; height?: number }) {
  const range = max - min || 1;
  const pct = Math.max(0, Math.min(1, (value - min) / range));

  return (
    <svg width={width} height={height} className="overflow-visible">
      <rect x={0} y={0} width={width} height={height} rx={height / 2}
        fill="var(--glass-bg)"
      />
      <rect x={0} y={0} width={width * pct} height={height} rx={height / 2}
        fill={color} style={{ transition: 'width 0.4s ease' }}
      />
    </svg>
  );
}
```

### 6b. SparkLine SVG Bezier

**Fichier à créer :** `src/components/charts/SparkLine.tsx`

```tsx
// src/components/charts/SparkLine.tsx — courbe bezier lissée
import { useMemo } from 'react';

interface DataPoint { value: number; time: number }

interface SparkLineProps {
  data: DataPoint[];
  height?: number;
  color?: string;
  fade?: boolean;
}

function createBezierPath(points: [number, number][], smoothing = 0.3): string {
  const line = (p1: [number, number], p2: [number, number]) => {
    const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
    return { length: Math.sqrt(dx * dx + dy * dy), angle: Math.atan2(dy, dx) };
  };
  const cp = (cur: [number, number], prev: [number, number] | undefined, next: [number, number] | undefined, reverse: boolean): [number, number] => {
    const p = prev ?? cur, n = next ?? cur;
    const l = line(p, n);
    const angle = l.angle + (reverse ? Math.PI : 0);
    const len = l.length * smoothing;
    return [cur[0] + Math.cos(angle) * len, cur[1] + Math.sin(angle) * len];
  };
  return points.reduce((acc, point, i, a) => {
    if (i === 0) return `M ${point[0]},${point[1]}`;
    const [cpsX, cpsY] = cp(a[i - 1], a[i - 2], point, false);
    const [cpeX, cpeY] = cp(point, a[i - 1], a[i + 1], true);
    return `${acc} C ${cpsX.toFixed(2)},${cpsY.toFixed(2)} ${cpeX.toFixed(2)},${cpeY.toFixed(2)} ${point[0].toFixed(2)},${point[1].toFixed(2)}`;
  }, '');
}

export default function SparkLine({ data, height = 40, color = 'var(--accent-color)', fade = false }: SparkLineProps) {
  const idSuffix = useMemo(() => Math.random().toString(36).slice(2, 9), []);

  if (data.length < 2) return null;

  const values = data.map((d) => d.value);
  let min = Math.min(...values), max = Math.max(...values);
  if (min === max) { min -= 1; max += 1; }

  const w = 100; // viewBox width
  const pad = 4;
  const innerH = height - pad * 2;

  const pts: [number, number][] = values.map((v, i) => [
    (i / (values.length - 1)) * w,
    pad + innerH * (1 - (v - min) / (max - min)),
  ]);

  const linePath = createBezierPath(pts);
  const areaPath = `${linePath} L ${w},${height} L 0,${height} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${idSuffix}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fade ? 0.3 : 0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#sg-${idSuffix})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </svg>
  );
}
```

### 6c. Seuils de couleur dans SensorCard

```typescript
// À ajouter dans src/types/widget-fields.ts
const SENSOR_COLOR_THRESHOLDS = [
  { limit: 20, color: 'red' },    // 0-20% → rouge
  { limit: 60, color: 'amber' },  // 20-60% → ambre
  { limit: 100, color: 'green' }, // 60-100% → vert
] as const;

const SENSOR_THRESHOLD_COLOR_MAP: Record<string, string> = {
  red: 'var(--color-red-500)',
  amber: 'var(--color-amber-400)',
  green: 'var(--color-green-400)',
};

function getSensorColor(value: number, thresholds: typeof SENSOR_COLOR_THRESHOLDS): string {
  for (const t of thresholds) {
    if (value <= t.limit) return SENSOR_THRESHOLD_COLOR_MAP[t.color];
  }
  return SENSOR_THRESHOLD_COLOR_MAP.green;
}
```

**Config à ajouter dans `SensorCardConfig` :**
```typescript
interface SensorCardConfig {
  // ... existant ...
  variant: 'default' | 'gauge' | 'donut' | 'bar'; // nouveau
  showSparkline: boolean;                           // nouveau
  colorThresholds?: { limit: number; color: 'red' | 'amber' | 'green' }[]; // nouveau
  min?: number;
  max?: number;
}
```

---

## 7. Status Pills configurables

**Problème :** `ha-dashboard` n'a pas de composant "pills" configurable pour afficher l'état de groupes d'entités en haut du dashboard (lumières allumées, ouvertures, lecteurs médias actifs...).

**Solution Tunet :** `StatusPill` — composant polymorphe avec 4 modes :
- `group_status` : compte d'entités dans un état (ex: "3 lumières allumées")
- `alarm` : état alarme avec couleurs et icônes shield
- `media_player` : lecteur en cours avec pochette
- `conditional` : basé sur une condition évaluée

**Fichiers à créer :**
- `src/components/ui/StatusPill/StatusPill.tsx`
- `src/utils/statusGroupPills.ts` (presets)

```typescript
// src/utils/statusGroupPills.ts
export const STATUS_PILL_PRESETS = {
  lights_on: {
    label: 'Lumières',
    entityDomain: 'light',
    matchState: 'on',
    icon: 'mdi:lightbulb',
  },
  covers_open: {
    label: 'Volets',
    entityDomain: 'cover',
    matchState: 'open',
    icon: 'mdi:window-shutter-open',
  },
  doors_open: {
    label: 'Portes',
    entityDomain: 'binary_sensor',
    deviceClass: 'door',
    matchState: 'on',
    icon: 'mdi:door-open',
  },
  media_playing: {
    label: 'Médias',
    entityDomain: 'media_player',
    matchState: 'playing',
    icon: 'mdi:music',
  },
} as const;

export type StatusPillPresetId = keyof typeof STATUS_PILL_PRESETS;
```

---

## 8. Cartes manquantes

Tunet a 20 types de cartes. `ha-dashboard` en a ~16. Voici les cartes absentes :

| Carte Tunet | Description | Difficulté |
|-------------|-------------|------------|
| `TodoCard` | Liste de tâches HA (todo domain) | Moyenne |
| `CalendarCard` | Événements calendrier HA (3 vues) | Haute |
| `FanCard` | Contrôle ventilateur (vitesse, oscillation) | Faible |
| `LockCard` | Verrou (lock/unlock + état) | Faible |
| `CarCard` | Voiture électrique (batterie, localisation) | Haute |
| `MowerCard` | Tondeuse robotique (zones, état) | Haute |
| `GenericNordpoolCard` | Prix électricité Nordpool | Haute |
| `GenericEnergyCostCard` | Coût énergie (kWh × tarif) | Moyenne |

### Exemple — FanCard (carte simple)

```tsx
// src/components/cards/FanCard/FanCard.tsx
import { useHass } from '@hakit/core';
import { useI18n } from '@/i18n';

interface FanCardProps {
  entityId: string;
}

export function FanCard({ entityId }: FanCardProps) {
  const { t } = useI18n();
  const { useStore, callService } = useHass();
  const entity = useStore((s) => s.entities[entityId]);

  if (!entity) return null;

  const isOn = entity.state === 'on';
  const percentage = entity.attributes.percentage ?? 0;
  const presetModes: string[] = entity.attributes.preset_modes ?? [];
  const currentPreset: string = entity.attributes.preset_mode ?? '';

  const toggle = () =>
    callService('fan', isOn ? 'turn_off' : 'turn_on', { entity_id: entityId });

  const setSpeed = (pct: number) =>
    callService('fan', 'set_percentage', { entity_id: entityId, percentage: pct });

  return (
    <div className="...">
      <button onClick={toggle}>{t(isOn ? 'widgets.fan.off' : 'widgets.fan.on')}</button>
      {isOn && (
        <input
          type="range" min={0} max={100} value={percentage}
          onChange={(e) => setSpeed(Number(e.target.value))}
        />
      )}
    </div>
  );
}
```

### Exemple — TodoCard (logique clé)

```typescript
// Appels WebSocket HA spécifiques (via home-assistant-js-websocket)
// À passer par le contexte HA existant ou @hakit/core

const getTodoItems = (conn: Connection, entityId: string) =>
  conn.sendMessagePromise({
    type: 'todo/item/list',
    entity_id: entityId,
  });

const updateTodoItem = (conn: Connection, entityId: string, uid: string, status: 'needs_action' | 'completed') =>
  conn.sendMessagePromise({
    type: 'todo/item/update',
    entity_id: entityId,
    item: { uid, status },
  });

const addTodoItem = (conn: Connection, entityId: string, summary: string) =>
  conn.sendMessagePromise({
    type: 'todo/item/create',
    entity_id: entityId,
    item: { summary },
  });
```

---

## 9. Charts — SparkLine SVG Bezier

Voir [section 6b](#6b-sparkline-svg-bezier) — le composant est réutilisable dans WeatherCard, SensorCard, etc.

**Avantage vs recharts :** 0 dépendance, 100% SVG, < 60 lignes, responsive via `viewBox`.

---

## 10. ✅ Cache entités sessionStorage

**Implémenté dans `src/components/HAThrottlePatch.tsx`.**

Cache les entités dans `sessionStorage` avec TTL 5 min. Au démarrage, `useHass.setState({ entities: cached })` injecte le snapshot avant la connexion WebSocket → affichage instantané, puis mise à jour en arrière-plan.

---

## 11. Synchronisation multi-device (useSettingsSync)

**Problème :** Si tu utilises le dashboard sur plusieurs appareils (téléphone + tablette + PC), chaque device a sa propre config locale indépendante.

**Solution Tunet :** `useSettingsSync` — synchronisation bi-directionnelle avec le backend :
- Device ID unique (`crypto.randomUUID()`) persisté en localStorage
- Système de révisions pour détecter les conflits
- Auto-sync toutes les 4s si changements détectés (hash SHA comparison)
- Historique des versions (keep last N)
- Publication vers tous les devices d'un même compte HA

**API backend côté serveur (déjà existante dans `ha-dashboard`) :**
```
GET  /api/settings/current?device_id=xxx   → { revision, data, device_label }
PUT  /api/settings/current                 → { ha_user_id, device_id, data, base_revision }
GET  /api/profiles                         → liste devices
```

**Skeleton du hook :**

```typescript
// src/hooks/useSettingsSync.ts (version simplifiée)
import { useEffect, useRef, useCallback } from 'react';

const DEVICE_ID_KEY = 'ha_dashboard_device_id';
const SYNC_INTERVAL_MS = 4_000;
const DEBOUNCE_MS = 3_500;

function getOrCreateDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `device-${Date.now()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function useSettingsSync<T extends object>(
  settings: T,
  onRemoteUpdate: (settings: T) => void,
  haUserId: string | null
) {
  const deviceId = useRef(getOrCreateDeviceId());
  const lastRevisionRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pushToServer = useCallback(async (data: T) => {
    if (!haUserId) return;
    try {
      const res = await fetch('/api/settings/current', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ha_user_id: haUserId,
          device_id: deviceId.current,
          data,
          base_revision: lastRevisionRef.current,
        }),
      });
      if (res.ok) {
        const { revision } = await res.json();
        lastRevisionRef.current = revision;
      }
    } catch { /* network error — retry next cycle */ }
  }, [haUserId]);

  const pullFromServer = useCallback(async () => {
    if (!haUserId) return;
    try {
      const res = await fetch(`/api/settings/current?device_id=${deviceId.current}`);
      if (!res.ok) return;
      const { revision, data } = await res.json();
      if (revision > lastRevisionRef.current) {
        lastRevisionRef.current = revision;
        onRemoteUpdate(data as T);
      }
    } catch { /* ignore */ }
  }, [haUserId, onRemoteUpdate]);

  // Debounce push local → server
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => pushToServer(settings), DEBOUNCE_MS);
    return () => { if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current); };
  }, [settings, pushToServer]);

  // Poll server pour changements depuis autres devices
  useEffect(() => {
    syncIntervalRef.current = setInterval(pullFromServer, SYNC_INTERVAL_MS);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [pullFromServer]);
}
```

---

## 12. i18n — langues supplémentaires

**Situation actuelle :** 2 langues (EN + FR).

**Tunet :** 8 langues (EN, FR, DE, NB, NN, SV, ZH).

**Langues à fort intérêt :** Allemand (DE), Suédois (SV), Néerlandais (NL).

**Aucun changement de code requis** — le système i18n de `ha-dashboard` supporte déjà le fallback vers EN. Il suffit d'ajouter les dossiers :

```
src/i18n/locales/
├── de/
│   ├── widgets.json
│   ├── common.json
│   └── ...
├── sv/
│   └── ...
```

Et d'exporter les nouvelles locales dans `src/i18n/index.ts`.

---

## Résumé par priorité

| # | Fonctionnalité | Impact UX | Effort | Priorité |
|---|----------------|-----------|--------|----------|
| 1 | ✅ [Throttling RAF entités](#1) | Perf critique | Faible (1 hook) | 🔴 Haute |
| 2 | ✅ [Cache sessionStorage entités](#10) | Chargement instantané | Faible | 🔴 Haute |
| 3 | ✅ [useLowPowerMotion](#5) | Accessibilité | Faible (1 hook) | 🟡 Moyenne |
| 4 | [SparkLine SVG Bezier](#9) | Visuel | Faible | 🟡 Moyenne |
| 5 | [Gauge/Donut/Bar SVG](#6a) | Visuel SensorCard | Faible | 🟡 Moyenne |
| 6 | ✅ [WeatherEffects pluie/neige](#3) | Visuel wow | Moyen | 🟡 Moyenne |
| 7 | [useSmartTheme contextuel](#2) | UX fond dynamique | Moyen | 🟡 Moyenne |
| 8 | ✅ [Backgrounds Aurora/LavaLamp](#4) | Visuel wow | Moyen | 🟢 Faible |
| 9 | [FanCard / LockCard](#8) | Cards manquantes | Faible | 🟡 Moyenne |
| 10 | [TodoCard](#8) | Fonctionnalité | Haute | 🟢 Faible |
| 11 | [StatusPills](#7) | Dashboard overview | Haute | 🟢 Faible |
| 12 | ✅ [useSettingsSync multi-device](#11) | Multi-device | Haute | 🟢 Faible |
| 13 | [i18n supplémentaires](#12) | Internationalisation | Faible | 🟢 Faible |
